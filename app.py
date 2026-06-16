from flask import Flask, jsonify, render_template, request
import requests
import xml.etree.ElementTree as ET
import re
import html
import time
from datetime import datetime

app = Flask(__name__)

# Simple in-memory cache
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_TTL = 300 # 5 minutes cache lifetime in seconds

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html_to_text(html_content):
    """Converts HTML content to plain text, stripping tags and unescaping entities."""
    if not html_content:
        return ""
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', html_content)
    # Unescape HTML entities
    text = html.unescape(text)
    # Collapse multiple whitespaces and trim
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def extract_headline(plain_text):
    """Extracts the first sentence of the text to serve as a headline/title."""
    if not plain_text:
        return "BigQuery Update"
    
    # Split by first period followed by a space
    parts = plain_text.split('. ')
    if parts:
        headline = parts[0].strip()
        # Add period back if it was stripped
        if headline and not headline.endswith('.'):
            headline += '.'
        # Truncate if it's too long for a headline
        if len(headline) > 120:
            headline = headline[:117] + "..."
        return headline
    return plain_text[:120]

def parse_xml_feed(xml_content):
    """Parses the Atom XML feed into a structured list of release note items."""
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as e:
        print(f"XML Parse Error: {e}")
        return []

    # Atom feed uses the namespace
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    entries = root.findall("atom:entry", ns)
    
    release_notes = []
    
    for entry_idx, entry in enumerate(entries):
        # Extract base fields
        entry_title = entry.find("atom:title", ns)
        entry_title_text = entry_title.text if entry_title is not None else "Unknown Date"
        
        entry_id = entry.find("atom:id", ns)
        entry_id_text = entry_id.text if entry_id is not None else f"tag:bigquery-release-note-{entry_idx}"
        
        entry_updated = entry.find("atom:updated", ns)
        entry_updated_text = entry_updated.text if entry_updated is not None else ""
        
        content_elem = entry.find("atom:content", ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Split content by <h3> tags
        matches = list(re.finditer(r'<h3>(.*?)</h3>', content_html))
        
        # If no <h3> tags found, treat the entire content as one item
        if not matches:
            plain_text = clean_html_to_text(content_html)
            headline = extract_headline(plain_text)
            release_notes.append({
                "id": f"{entry_id_text}_0",
                "date_str": entry_title_text,
                "updated_iso": entry_updated_text,
                "category": "Update",
                "headline": headline,
                "content_html": content_html,
                "content_text": plain_text
            })
            continue
            
        # Parse each h3 section as a separate release note item
        for i in range(len(matches)):
            category = matches[i].group(1).strip()
            start_idx = matches[i].end()
            end_idx = matches[i+1].start() if i + 1 < len(matches) else len(content_html)
            item_html = content_html[start_idx:end_idx].strip()
            
            # Clean text for search/tweet purposes
            plain_text = clean_html_to_text(item_html)
            headline = extract_headline(plain_text)
            
            # Ensure unique ID
            item_id = f"{entry_id_text}_{i}"
            
            release_notes.append({
                "id": item_id,
                "date_str": entry_title_text,
                "updated_iso": entry_updated_text,
                "category": category,
                "headline": headline,
                "content_html": item_html,
                "content_text": plain_text
            })
            
    return release_notes

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/releases")
def get_releases():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    current_time = time.time()
    
    # Check cache
    if not force_refresh and cache["data"] is not None and (current_time - cache["last_fetched"] < CACHE_TTL):
        return jsonify({
            "source": "cache",
            "last_fetched_epoch": cache["last_fetched"],
            "release_notes": cache["data"]
        })
        
    # Fetch from Google Docs RSS feed
    try:
        response = requests.get(FEED_URL, timeout=10)
        if response.status_code != 200:
            return jsonify({"error": f"Failed to fetch feed, status code {response.status_code}"}), 502
            
        notes = parse_xml_feed(response.content)
        
        # Update cache
        cache["data"] = notes
        cache["last_fetched"] = current_time
        
        return jsonify({
            "source": "network",
            "last_fetched_epoch": current_time,
            "release_notes": notes
        })
        
    except requests.RequestException as e:
        # If network call fails but we have cached data, fallback to cache
        if cache["data"] is not None:
            return jsonify({
                "source": "cache_fallback",
                "error": f"Network error: {str(e)}. Displaying cached data.",
                "last_fetched_epoch": cache["last_fetched"],
                "release_notes": cache["data"]
            })
        return jsonify({"error": f"Failed to fetch release notes: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(debug=True, host="127.0.0.1", port=5000)

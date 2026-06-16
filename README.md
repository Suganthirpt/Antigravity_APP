# BQ Pulse: BigQuery Release Notes Explorer

BQ Pulse is a modern, responsive web application built using **Python Flask** and **plain vanilla HTML, CSS, and JavaScript**. It fetches, parses, and formats the official BigQuery Release Notes RSS feed, allowing you to browse updates, search, filter by category, and easily share updates on X (formerly Twitter) using an interactive, custom-designed tweet composer.

---

## Key Features

- **Granular Entry Parsing**: Google's feed clumps updates by date. BQ Pulse splits dates into individual, card-based release note items for easier reading.
- **Dynamic Categories & Filtering**: Automatically tallies categories (e.g., *Feature*, *Change*, *Deprecation*, *Issue*, *Fixed*) from the live feed and creates filtering tabs on-the-fly.
- **Search & Sort**: Real-time keyword search across update headlines and contents, with sorting options (Newest or Oldest first).
- **Interactive Tweet Composer**:
  - **Live Preview Card**: Shows a visual mockup of how the tweet will look.
  - **SVG Progress Ring & Counter**: Circular, color-changing progress bar (Blue → Amber → Red) matching Twitter's 280-character limit.
  - **AI Rephrasing Templates**: Click "Enhance Text" to cycle through three different rephrased templates (bulleted highlight, announcement style, or minimalist) to find the perfect format.
  - **Actions**: One-click text copying or direct routing to X's sharing intent.
- **Smart Caching**: In-memory caching for 5 minutes to avoid redundant network overhead, with a loading spinner showing active refresh status.
- **Premium Dark Mode Design**: Sleek glassmorphic UI using standard CSS variables, modern typography (Outfit & Plus Jakarta Sans), and full responsiveness.

---

## Tech Stack

- **Backend**: Python 3, Flask, Requests
- **Frontend**: Plain Vanilla HTML5, CSS3, JavaScript (ES6)
- **Data Source**: [Official Google Cloud BigQuery Feed](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml)

---

## Getting Started

### Prerequisites

- Python 3.3+ (includes the built-in `venv` module)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Suganthirpt/Antigravity_APP.git
   cd Antigravity_APP
   ```

2. **Initialize a Virtual Environment**:
   ```bash
   python -m venv .venv
   ```

3. **Activate the Virtual Environment**:
   * **Windows (PowerShell)**:
     ```powershell
     .\.venv\Scripts\Activate.ps1
     ```
   * **Windows (CMD)**:
     ```cmd
     .\.venv\Scripts\activate.bat
     ```
   * **macOS/Linux**:
     ```bash
     source .venv/bin/activate
     ```

4. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Application

Start the Flask server locally:
```bash
python app.py
```

Open your web browser and navigate to:
```
http://127.0.0.1:5000
```

// App State
let allReleaseNotes = [];
let filteredReleaseNotes = [];
let currentCategory = 'all';
let searchQuery = '';
let currentSort = 'newest';
let selectedNote = null;
let currentStyleIndex = 0;

// DOM Elements
const notesContainer = document.getElementById('notes-container');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const filterButtonsContainer = document.getElementById('filter-buttons');
const resultsCount = document.getElementById('results-count');
const sortSelect = document.getElementById('sort-select');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const cacheStatus = document.getElementById('cache-status');

// Share Panel Elements
const sharePanel = document.getElementById('share-panel');
const closeShareBtn = document.getElementById('close-share');
const noSelectionMsg = document.getElementById('no-selection-message');
const composerForm = document.getElementById('composer-form');
const previewDate = document.getElementById('preview-date');
const previewTag = document.getElementById('preview-tag');
const previewHeadline = document.getElementById('preview-headline');
const tweetTextarea = document.getElementById('tweet-text');
const charCounter = document.getElementById('char-counter');
const progressRingCircle = document.getElementById('progress-ring-circle');
const tweetPreviewContent = document.getElementById('tweet-content-preview');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const tweetBtn = document.getElementById('tweet-btn');
const suggestBtn = document.getElementById('suggest-btn');

// Progress Ring Configuration
const ringRadius = 9;
const ringCircumference = 2 * Math.PI * ringRadius;
if (progressRingCircle) {
    progressRingCircle.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
    progressRingCircle.style.strokeDashoffset = ringCircumference;
}

// Toast Notification
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Format relative time helper
function formatRelativeTime(epoch) {
    if (!epoch) return '';
    const now = Math.floor(Date.now() / 1000);
    const diff = now - epoch;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(epoch * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Fetch Release Notes from API
async function fetchReleaseNotes(forceRefresh = false) {
    showSkeletonLoader();
    refreshBtn.classList.add('spinning');
    
    try {
        const url = forceRefresh ? '/api/releases?refresh=true' : '/api/releases';
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        allReleaseNotes = data.release_notes || [];
        
        // Update Cache/Sync status
        if (data.source === 'network') {
            cacheStatus.textContent = 'Sync: Active';
            showToast('Feed refreshed from source.');
        } else if (data.source === 'cache' || data.source === 'cache_fallback') {
            const timeStr = formatRelativeTime(data.last_fetched_epoch);
            cacheStatus.textContent = `Cached (${timeStr})`;
        }
        
        renderCategories();
        applyFiltersAndRender();
        
    } catch (error) {
        console.error('Failed to fetch release notes:', error);
        renderErrorState(error.message);
    } finally {
        refreshBtn.classList.remove('spinning');
    }
}

function showSkeletonLoader() {
    notesContainer.innerHTML = `
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
        <div class="skeleton-card"></div>
    `;
}

function renderErrorState(errorMsg) {
    notesContainer.innerHTML = `
        <div class="error-state">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h3>Unable to retrieve release notes</h3>
            <p>${errorMsg}</p>
            <button onclick="fetchReleaseNotes(true)">Try Again</button>
        </div>
    `;
}

// Dynamically Render Category Filters based on loaded data
function renderCategories() {
    const counts = { all: allReleaseNotes.length };
    
    allReleaseNotes.forEach(note => {
        const cat = note.category.toLowerCase();
        counts[cat] = (counts[cat] || 0) + 1;
    });
    
    // Build buttons
    let buttonsHtml = `
        <button class="filter-btn ${currentCategory === 'all' ? 'active' : ''}" data-category="all">
            <span><span class="dot all"></span>All Updates</span>
            <span class="filter-count">${counts.all}</span>
        </button>
    `;
    
    // Standard Google categories ordered
    const standardCategories = ['feature', 'change', 'deprecation', 'issue', 'fixed'];
    
    // Get actual categories from data that are not in standard list
    const otherCategories = Object.keys(counts).filter(
        c => c !== 'all' && !standardCategories.includes(c)
    );
    
    const categoriesToRender = [...standardCategories, ...otherCategories].filter(
        c => counts[c] > 0
    );
    
    categoriesToRender.forEach(cat => {
        const displayName = cat.charAt(0).toUpperCase() + cat.slice(1);
        buttonsHtml += `
            <button class="filter-btn ${currentCategory === cat ? 'active' : ''}" data-category="${cat}">
                <span><span class="dot ${standardCategories.includes(cat) ? cat : 'update'}"></span>${displayName}</span>
                <span class="filter-count">${counts[cat]}</span>
            </button>
        `;
    });
    
    filterButtonsContainer.innerHTML = buttonsHtml;
    
    // Add event listeners
    const buttons = filterButtonsContainer.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategory = btn.getAttribute('data-category');
            applyFiltersAndRender();
        });
    });
}

// Filter, Sort and Search logic
function applyFiltersAndRender() {
    // 1. Category Filter
    filteredReleaseNotes = allReleaseNotes;
    if (currentCategory !== 'all') {
        filteredReleaseNotes = filteredReleaseNotes.filter(
            note => note.category.toLowerCase() === currentCategory
        );
    }
    
    // 2. Search Query Filter
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredReleaseNotes = filteredReleaseNotes.filter(
            note => note.headline.toLowerCase().includes(query) ||
                    note.content_text.toLowerCase().includes(query) ||
                    note.category.toLowerCase().includes(query) ||
                    note.date_str.toLowerCase().includes(query)
        );
    }
    
    // 3. Sort Order
    filteredReleaseNotes.sort((a, b) => {
        const dateA = new Date(a.updated_iso || a.date_str);
        const dateB = new Date(b.updated_iso || b.date_str);
        return currentSort === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    // Render
    renderReleaseCards();
}

function renderReleaseCards() {
    resultsCount.textContent = filteredReleaseNotes.length;
    
    if (filteredReleaseNotes.length === 0) {
        notesContainer.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <h3>No updates found</h3>
                <p>Try refining your search query or choosing another category filter.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    filteredReleaseNotes.forEach(note => {
        const isSelected = selectedNote && selectedNote.id === note.id;
        const catClass = note.category.toLowerCase();
        
        html += `
            <div class="note-card ${isSelected ? 'selected' : ''}" data-id="${note.id}">
                <div class="card-header">
                    <div class="card-meta">
                        <span class="tag ${catClass}">${note.category}</span>
                        <span class="card-date">${note.date_str}</span>
                    </div>
                    <button class="card-tweet-btn" data-id="${note.id}">
                        <svg viewBox="0 0 24 24" width="12" height="12">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Select to Share</span>
                    </button>
                </div>
                <h3 class="card-headline">${note.headline}</h3>
                <div class="card-content">${note.content_html}</div>
            </div>
        `;
    });
    
    notesContainer.innerHTML = html;
    
    // Add Click listeners
    const cards = notesContainer.querySelectorAll('.note-card');
    cards.forEach(card => {
        card.addEventListener('click', (e) => {
            // Prevent trigger if clicking on links inside the card
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                return;
            }
            
            const noteId = card.getAttribute('data-id');
            const note = allReleaseNotes.find(n => n.id === noteId);
            selectReleaseNote(note);
        });
    });
    
    // Add Click listener to the select to share button specifically
    const shareBtns = notesContainer.querySelectorAll('.card-tweet-btn');
    shareBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const noteId = btn.getAttribute('data-id');
            const note = allReleaseNotes.find(n => n.id === noteId);
            selectReleaseNote(note);
            
            // On mobile, scroll or open share panel
            if (window.innerWidth <= 1100) {
                sharePanel.classList.add('open');
            }
        });
    });
}

// Tweet formatting templates
const tweetTemplates = [
    // Template 1: Bullet points / Highlight
    (headline, date, category) => `Google Cloud BigQuery Update (${date}):\n\n📌 ${headline}\n\nRead more details in the release feed. #BigQuery #GoogleCloud #GCP`,
    
    // Template 2: Action-oriented / Announcement
    (headline, date, category) => `🚨 New BigQuery ${category} Announcement:\n\n${headline}\n\n#GoogleCloud #BigQuery #DataAnalytics`,
    
    // Template 3: Brief / Minimal
    (headline, date, category) => `BigQuery Update [${date}]: ${headline} #BigQuery`
];

// Select a release note and load composer
function selectReleaseNote(note) {
    selectedNote = note;
    
    // Highlight in the cards
    const cards = notesContainer.querySelectorAll('.note-card');
    cards.forEach(card => {
        if (card.getAttribute('data-id') === note.id) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    // Hide placeholder, show form
    noSelectionMsg.style.display = 'none';
    composerForm.style.display = 'flex';
    
    // Populate Preview fields
    previewDate.textContent = note.date_str;
    previewTag.textContent = note.category;
    previewTag.className = `tag ${note.category.toLowerCase()}`;
    previewHeadline.textContent = note.headline;
    
    // Reset templates cycling
    currentStyleIndex = 0;
    
    // Generate initial tweet text
    generateTweetText();
}

function generateTweetText() {
    if (!selectedNote) return;
    
    const template = tweetTemplates[currentStyleIndex];
    let tweet = template(selectedNote.headline, selectedNote.date_str, selectedNote.category);
    
    // If text exceeds 280 characters, fallback to the minimal template or crop
    if (tweet.length > 280) {
        const minimalTemplate = tweetTemplates[2];
        tweet = minimalTemplate(selectedNote.headline, selectedNote.date_str, selectedNote.category);
        
        // If still too long, crop headline
        if (tweet.length > 280) {
            const extraChars = tweet.length - 277; // 3 chars for "..."
            const croppedHeadline = selectedNote.headline.slice(0, selectedNote.headline.length - extraChars) + "...";
            tweet = minimalTemplate(croppedHeadline, selectedNote.date_str, selectedNote.category);
        }
    }
    
    tweetTextarea.value = tweet;
    updateCharCount();
}

// Character Counter and Progress Ring logic
function updateCharCount() {
    const text = tweetTextarea.value;
    const charCount = text.length;
    const remaining = 280 - charCount;
    
    charCounter.textContent = remaining;
    tweetPreviewContent.textContent = text || "Type something to preview your tweet...";
    
    // Progress ring calculation
    const percentage = Math.min(charCount / 280, 1);
    const strokeDashoffset = ringCircumference - (percentage * ringCircumference);
    
    if (progressRingCircle) {
        progressRingCircle.style.strokeDashoffset = strokeDashoffset;
        
        // Adjust colors based on remaining count
        if (remaining < 0) {
            progressRingCircle.style.stroke = '#ef4444'; // Red
            charCounter.className = 'danger';
            tweetBtn.disabled = true;
            tweetBtn.style.opacity = 0.5;
            tweetBtn.style.pointerEvents = 'none';
        } else if (remaining <= 20) {
            progressRingCircle.style.stroke = '#f59e0b'; // Amber/Yellow
            charCounter.className = 'warning';
            tweetBtn.disabled = false;
            tweetBtn.style.opacity = 1;
            tweetBtn.style.pointerEvents = 'auto';
        } else {
            progressRingCircle.style.stroke = '#1da1f2'; // Twitter Blue
            charCounter.className = '';
            tweetBtn.disabled = false;
            tweetBtn.style.opacity = 1;
            tweetBtn.style.pointerEvents = 'auto';
        }
    }
}

// Enhance / Cycle Tweet Styles
suggestBtn.addEventListener('click', () => {
    if (!selectedNote) return;
    currentStyleIndex = (currentStyleIndex + 1) % tweetTemplates.length;
    generateTweetText();
    showToast(`Switched to Tweet Template Style #${currentStyleIndex + 1}`);
});

// Event Listeners
tweetTextarea.addEventListener('input', updateCharCount);

copyTweetBtn.addEventListener('click', () => {
    const text = tweetTextarea.value;
    if (!text) return;
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Tweet copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy text:', err);
    });
});

tweetBtn.addEventListener('click', () => {
    const text = tweetTextarea.value;
    if (!text || text.length > 280) return;
    
    const encodedText = encodeURIComponent(text);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    window.open(twitterUrl, '_blank');
});

// Search Input Listener
searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (searchQuery) {
        clearSearchBtn.style.display = 'block';
    } else {
        clearSearchBtn.style.display = 'none';
    }
    applyFiltersAndRender();
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    clearSearchBtn.style.display = 'none';
    applyFiltersAndRender();
    searchInput.focus();
});

// Sort Select Listener
sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    applyFiltersAndRender();
});

// Refresh Button Listener
refreshBtn.addEventListener('click', () => {
    fetchReleaseNotes(true);
});

// Close Share Panel (Mobile)
closeShareBtn.addEventListener('click', () => {
    sharePanel.classList.remove('open');
});

// Page Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
});

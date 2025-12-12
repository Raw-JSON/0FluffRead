// Global variables for DOM elements
const feedContainer = document.getElementById('feedContainer');
// Removed urlInput and loadButton from global scope as they are replaced by settings
const loadingIndicator = document.getElementById('loadingIndicator');
const messageBox = document.getElementById('messageBox');

// New Settings elements
const settingsButton = document.getElementById('settingsButton');
const settingsDialog = document.getElementById('settingsDialog');
const closeSettingsButton = document.getElementById('closeSettingsButton');
const feedsList = document.getElementById('feedsList');
const addFeedInput = document.getElementById('addFeedInput');
const addFeedButton = document.getElementById('addFeedButton');
const loadFeedFromSettingsButton = document.getElementById('loadFeedFromSettingsButton');

const STORAGE_KEY = '0FluffReadFeeds';
const DEFAULT_FEEDS = ['https://www.theverge.com/rss/index.xml', 'https://www.engadget.com/rss.xml'];

/**
 * Utility to retrieve the stored feed URLs.
 * @returns {Array<string>} List of feed URLs.
 */
const getFeeds = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : DEFAULT_FEEDS;
    } catch (e) {
        console.error("Error reading localStorage, using defaults:", e);
        return DEFAULT_FEEDS;
    }
};

/**
 * Utility to save the current feed URLs.
 * @param {Array<string>} feeds List of feed URLs to save.
 */
const saveFeeds = (feeds) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds));
    } catch (e) {
        console.error("Error writing to localStorage:", e);
    }
};

/**
 * Converts a JavaScript Date object to a readable string.
 * @param {Date} date The date object.
 * @returns {string} Formatted date string.
 */
const formatDate = (date) => {
    if (!date) return '';
    // Use 'en-US' or undefined for system locale.
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(date).toLocaleDateString(undefined, options);
};

/**
 * Shows a message in the message box.
 * @param {string} message The text to display.
 * @param {string} type 'success', 'error', or 'warning'.
 */
const showMessage = (message, type = 'warning') => {
    messageBox.textContent = message;
    
    // Base classes for the message box
    let baseClasses = 'text-center p-4 rounded-lg';
    
    // Determine color classes based on message type
    if (type === 'error') {
        messageBox.className = `${baseClasses} bg-red-100 text-red-800`;
    } else if (type === 'success') {
        messageBox.className = `${baseClasses} bg-green-100 text-green-800`;
    } else {
        messageBox.className = `${baseClasses} bg-yellow-100 text-yellow-800`;
    }
    
    messageBox.classList.remove('hidden');
};

/**
 * Renders the list of current feed URLs in the settings dialog.
 */
const renderFeedsList = () => {
    const currentFeeds = getFeeds();
    feedsList.innerHTML = ''; // Clear existing list

    if (currentFeeds.length === 0) {
        feedsList.innerHTML = '<li class="text-gray-500 text-sm p-2">No feeds added.</li>';
        return;
    }

    currentFeeds.forEach((url, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'flex justify-between items-center p-2 bg-gray-50 rounded text-sm mb-1';
        
        // Display the URL, truncating it if necessary
        const urlDisplay = url.length > 50 ? url.substring(0, 47) + '...' : url;

        listItem.innerHTML = `
            <span class="text-gray-700 truncate" title="${url}">${urlDisplay}</span>
            <button data-index="${index}" class="remove-feed text-red-500 hover:text-red-700 font-bold text-lg leading-none transition-colors ml-4">&times;</button>
        `;
        feedsList.appendChild(listItem);
    });

    // Attach event listeners to removal buttons
    document.querySelectorAll('.remove-feed').forEach(button => {
        button.addEventListener('click', (e) => {
            const indexToRemove = parseInt(e.currentTarget.getAttribute('data-index'));
            removeFeed(indexToRemove);
        });
    });
};

/**
 * Adds a new feed URL to the list.
 */
const addFeed = () => {
    const url = addFeedInput.value.trim();
    if (!url) {
        showMessage('Feed URL cannot be empty.', 'warning');
        return;
    }
    
    let currentFeeds = getFeeds();

    // Check for duplicates
    if (currentFeeds.includes(url)) {
        showMessage('Feed URL already exists.', 'warning');
        addFeedInput.value = '';
        return;
    }

    // Add new URL and save
    currentFeeds.push(url);
    saveFeeds(currentFeeds);
    
    // Update UI and clear input
    renderFeedsList();
    addFeedInput.value = '';
    showMessage(`Feed added: ${url.substring(0, 30)}...`, 'success');
};

/**
 * Removes a feed URL by index.
 * @param {number} index The index of the URL to remove.
 */
const removeFeed = (index) => {
    let currentFeeds = getFeeds();
    const urlToRemove = currentFeeds[index];

    currentFeeds.splice(index, 1);
    saveFeeds(currentFeeds);

    // Update UI
    renderFeedsList();
    showMessage(`Feed removed: ${urlToRemove.substring(0, 30)}...`, 'success');
};


/**
 * Renders the feed articles into the container.
 * @param {Array<Object>} items Array of feed articles (already sorted).
 * @param {Array<Object>} feedSources Array of successful feed metadata.
 */
const renderFeed = (items, feedSources) => {
    feedContainer.innerHTML = ''; // Clear existing content

    if (items.length === 0) {
        feedContainer.innerHTML = `
            <div class="p-6 bg-white rounded-xl shadow-md">
                <p class="text-gray-500 text-center">No articles found in any loaded feed.</p>
            </div>
        `;
        return;
    }

    // Display Feed Metadata Summary (Updated for new visual style)
    const successfulTitles = feedSources.map(f => f.title || 'Unknown Feed').join(', ');
    const feedTitleHtml = `
        <div class="mb-8 p-4 bg-indigo-50 border-l-4 border-indigo-400">
            <h2 class="text-2xl font-bold text-gray-800 tracking-tight">Aggregated Content</h2>
            <p class="text-gray-500 text-sm mt-1">${items.length} articles from: ${successfulTitles.substring(0, 100)}...</p>
        </div>
    `;
    feedContainer.insertAdjacentHTML('beforeend', feedTitleHtml);


    // Render individual articles
    items.forEach(item => {
        const pubDate = formatDate(item.pubDate);
        
        // Use DOMParser to safely extract and strip HTML from the description/content
        const description = item.content || item.description || 'No description available.';
        const parser = new DOMParser();
        const doc = parser.parseFromString(description, 'text/html');
        // Truncate clean text for preview
        const cleanDescription = doc.body.textContent.substring(0, 200) + (doc.body.textContent.length > 200 ? '...' : '');

        // Note: The structure here relies on classes defined in the upcoming style.css update
        const cardHtml = `
            <div class="article-card">
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="block">
                    <h3 class="card-title">${item.title}</h3>
                </a>
                <p class="card-meta">${pubDate} — **${item.feedTitle}**</p>
                <p class="card-description">${cleanDescription}</p>
            </div>
        `;
        feedContainer.insertAdjacentHTML('beforeend', cardHtml);
    });
};

/**
 * Fetches a single RSS feed using a CORS-bypassing proxy. (Unchanged, remains modular)
 * @param {string} rssUrl The URL of the RSS feed to fetch.
 * @returns {Promise<Object|null>} The parsed JSON data or null on failure.
 */
async function loadFeed(rssUrl) {
    if (!rssUrl) return null;
    
    // Proxy URL to bypass CORS and convert RSS XML to JSON
    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    
    const MAX_RETRIES = 3;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
        try {
            const response = await fetch(proxyUrl, { method: 'GET' });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status} for ${rssUrl}`);
            }

            const data = await response.json();
            
            if (data.status === 'ok' && data.items) {
                // Attach feed title to each item for display in renderFeed
                const feedTitle = data.feed.title || new URL(rssUrl).hostname;
                data.items.forEach(item => {
                    item.feedTitle = feedTitle;
                });
                return data; // Success
            } else if (data.status === 'error') {
                console.error(`Proxy Service Failed for ${rssUrl}:`, data); 
                throw new Error(`Proxy Error: ${data.message || 'Failed to parse RSS feed via proxy.'}`);
            }

        } catch (error) {
            attempt++;
            console.error(`Fetch attempt ${attempt} failed for ${rssUrl}:`, error.message);
            
            if (attempt >= MAX_RETRIES) {
                console.error(`Final failure for ${rssUrl}.`);
                return null;
            } else {
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    return null;
}


/**
 * Orchestrates the fetching of multiple feeds, merges, sorts, and renders the results.
 */
async function loadAllFeeds() {
    // New: Get feeds from the modular utility
    const feedUrls = getFeeds();

    if (!feedUrls || feedUrls.length === 0) {
        showMessage("No feeds configured. Open Settings to add a URL.", 'warning');
        // Render empty container instead of throwing up the old message
        feedContainer.innerHTML = '';
        return;
    }
    
    // UI state changes
    settingsDialog.close(); // Close settings after triggering load
    // loadButton.disabled = true; // Removed old button
    loadingIndicator.classList.remove('hidden');
    feedContainer.innerHTML = '';
    messageBox.classList.add('hidden');
    
    // Concurrent fetching using Promise.all
    const fetchPromises = feedUrls.map(url => loadFeed(url));
    const results = await Promise.all(fetchPromises);
    
    const successfulLoads = results.filter(result => result !== null);
    
    let allItems = [];
    const successfulFeeds = [];

    successfulLoads.forEach(data => {
        allItems = allItems.concat(data.items);
        successfulFeeds.push(data.feed);
    });

    // Sort all articles chronologically by publication date (newest first)
    allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    
    // Final UI cleanup
    // loadButton.disabled = false; // Removed old button
    loadingIndicator.classList.add('hidden');
    
    if (successfulLoads.length > 0) {
        renderFeed(allItems, successfulFeeds);
        showMessage(`Successfully loaded ${successfulLoads.length} feed(s) with ${allItems.length} total articles.`, 'success');
    } else {
        renderFeed([], []); 
        showMessage(`Failed to load any of the requested feeds after all retries. Open Settings to verify URLs.`, 'error');
    }
}


/**
 * Initialization function.
 */
function init() {
    // 1. Setup Settings Logic
    settingsButton.addEventListener('click', () => {
        renderFeedsList();
        settingsDialog.showModal();
    });
    closeSettingsButton.addEventListener('click', () => settingsDialog.close());
    
    addFeedButton.addEventListener('click', addFeed);
    // Allow pressing Enter in the input to add the feed
    addFeedInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            addFeed();
        }
    });

    // 2. Setup Load Logic
    loadFeedFromSettingsButton.addEventListener('click', loadAllFeeds);

    // 3. Auto-load the default feed(s) on page load
    loadAllFeeds();
}

// Execute initialization once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);

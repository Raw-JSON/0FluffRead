// Global variables for DOM elements
const feedContainer = document.getElementById('feedContainer');
const urlInput = document.getElementById('rssUrlInput');
const loadButton = document.getElementById('loadButton');
const loadingIndicator = document.getElementById('loadingIndicator');
const messageBox = document.getElementById('messageBox');

// Default feeds for initial load/display
const DEFAULT_FEEDS = urlInput.value.split(',').map(url => url.trim()).filter(Boolean);

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
 * Renders the feed articles into the container.
 * This is now a unified renderer for merged articles.
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

    // Display Feed Metadata Summary
    const titles = feedSources.map(f => f.title || 'Unknown Feed').join(', ');
    const feedTitleHtml = `
        <div class="p-6 bg-white rounded-xl shadow-md border-l-4 border-indigo-400 mb-6">
            <h2 class="text-2xl font-bold text-gray-800">Aggregated Feed: ${titles}</h2>
            <p class="text-gray-500 text-sm">${items.length} articles found.</p>
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
        const cleanDescription = doc.body.textContent.substring(0, 150) + (doc.body.textContent.length > 150 ? '...' : '');

        const cardHtml = `
            <div class="feed-card bg-white p-6 rounded-xl shadow-md hover:shadow-xl border-t-2 border-gray-100">
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="block">
                    <h3 class="text-xl font-semibold text-gray-900 mb-2 hover:text-indigo-600 transition-colors">${item.title}</h3>
                </a>
                <p class="text-sm text-gray-400 mb-3">${pubDate} from ${item.feedTitle}</p>
                <p class="text-gray-600 mb-4">${cleanDescription}</p>
                <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="text-indigo-500 font-medium hover:text-indigo-700 text-sm">
                    Read Full Article &rarr;
                </a>
            </div>
        `;
        feedContainer.insertAdjacentHTML('beforeend', cardHtml);
    });
};

/**
 * Fetches a single RSS feed using a CORS-bypassing proxy.
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
                // Log final failure but do not throw, so other feeds can load.
                console.error(`Final failure for ${rssUrl}.`);
                return null;
            } else {
                // Exponential backoff delay (1s, 2s, 4s)
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    return null; // Should only be reached if retries fail.
}


/**
 * Orchestrates the fetching of multiple feeds, merges, sorts, and renders the results.
 * @param {Array<string>} feedUrls Array of RSS feed URLs.
 */
async function loadAllFeeds(feedUrls) {
    if (!feedUrls || feedUrls.length === 0) {
        showMessage("I need at least one valid URL, Jacob.", 'error');
        return;
    }
    
    // UI state changes
    loadButton.disabled = true;
    loadingIndicator.classList.remove('hidden');
    feedContainer.innerHTML = '';
    messageBox.classList.add('hidden');
    
    // Concurrent fetching using Promise.all
    const fetchPromises = feedUrls.map(url => loadFeed(url));
    const results = await Promise.all(fetchPromises);
    
    // Filter out failed loads (nulls) and collect all items and successful feed info
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
    loadButton.disabled = false;
    loadingIndicator.classList.add('hidden');
    
    if (successfulLoads.length > 0) {
        renderFeed(allItems, successfulFeeds);
        showMessage(`Successfully loaded ${successfulLoads.length} feed(s) with ${allItems.length} total articles.`, 'success');
    } else {
        renderFeed([], []); // Render a message that nothing was found
        showMessage(`Failed to load any of the requested feeds after all retries. Check the URLs, Jacob.`, 'error');
    }
}


/**
 * Initialization function.
 */
function init() {
    // Event listener for the load button
    loadButton.addEventListener('click', () => {
        // Parse the comma-separated input value
        const urls = urlInput.value.split(',').map(url => url.trim()).filter(Boolean);
        loadAllFeeds(urls);
    });
    
    // Auto-load the default feed(s) on page load
    loadAllFeeds(DEFAULT_FEEDS);
}

// Execute initialization once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);

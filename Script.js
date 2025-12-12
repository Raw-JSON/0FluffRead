// Global variables for DOM elements
const feedContainer = document.getElementById('feedContainer');
const urlInput = document.getElementById('rssUrlInput');
const loadButton = document.getElementById('loadButton');
const loadingIndicator = document.getElementById('loadingIndicator');
const messageBox = document.getElementById('messageBox');

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
 * @param {Array<Object>} items Array of feed articles.
 * @param {Object} feedInfo Object containing feed title and link.
 */
const renderFeed = (items, feedInfo) => {
    feedContainer.innerHTML = ''; // Clear existing content

    if (items.length === 0) {
        feedContainer.innerHTML = `
            <div class="p-6 bg-white rounded-xl shadow-md">
                <p class="text-gray-500 text-center">No articles found in this feed. Maybe it's dead, Jacob.</p>
            </div>
        `;
        return;
    }

    // Display Feed Metadata
    const feedTitleHtml = `
        <div class="p-6 bg-white rounded-xl shadow-md border-l-4 border-indigo-400 mb-6">
            <h2 class="text-2xl font-bold text-gray-800">${feedInfo.title || 'Unknown Feed'}</h2>
            <a href="${feedInfo.link}" target="_blank" class="text-indigo-500 hover:text-indigo-700 text-sm truncate block" rel="noopener noreferrer">${feedInfo.link || 'No Link'}</a>
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
                <p class="text-sm text-gray-400 mb-3">${pubDate}</p>
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
 * Fetches and loads the RSS feed using a CORS-bypassing proxy.
 * This function is made global so it can be called directly from the HTML onclick attribute.
 */
window.loadFeed = async function() {
    const rssUrl = urlInput.value.trim();
    if (!rssUrl) {
        showMessage("I need a URL, Jacob. Don't waste my time.", 'error');
        return;
    }

    // Proxy URL to bypass CORS and convert RSS XML to JSON
    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
    
    // UI state changes
    loadButton.disabled = true;
    loadingIndicator.classList.remove('hidden');
    feedContainer.innerHTML = '';
    messageBox.classList.add('hidden');

    // Exponential backoff setup for fetching
    const MAX_RETRIES = 3;
    let attempt = 0;
    let result = null;

    while (attempt < MAX_RETRIES) {
        try {
            const response = await fetch(proxyUrl, { method: 'GET' });
            
            if (!response.ok) {
                // If it's a non-200 HTTP status, throw an error
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.status === 'ok' && data.items) {
                result = data;
                break; // Success, exit loop
            } else if (data.status === 'error') {
                // If the proxy service returned an error status
                throw new Error(`Proxy Error: ${data.message || 'Failed to parse RSS feed via proxy.'}`);
            }

        } catch (error) {
            attempt++;
            console.error(`Fetch attempt ${attempt} failed:`, error.message);
            
            if (attempt >= MAX_RETRIES) {
                // Final failure message after all retries
                showMessage(`Failed to load feed after ${MAX_RETRIES} attempts. Error: ${error.message}`, 'error');
                break; 
            } else {
                // Exponential backoff delay (1s, 2s, 4s)
                const delay = Math.pow(2, attempt) * 1000;
                // Silent wait for the next attempt
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    // Final UI cleanup
    loadButton.disabled = false;
    loadingIndicator.classList.add('hidden');

    if (result) {
        renderFeed(result.items, result.feed);
        showMessage(`Feed loaded successfully from ${result.feed.title || 'the requested URL'}.`, 'success');
    }
}

// Auto-load the default feed on page load
window.onload = loadFeed;

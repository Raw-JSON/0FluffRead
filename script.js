// 0FluffRead - Modular RSS Logic
const feedContainer = document.getElementById('feedContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const messageBox = document.getElementById('messageBox');
const settingsButton = document.getElementById('settingsButton');
const settingsDialog = document.getElementById('settingsDialog');
const closeSettingsButton = document.getElementById('closeSettingsButton');
const feedsList = document.getElementById('feedsList');
const addFeedInput = document.getElementById('addFeedInput');
const addFeedButton = document.getElementById('addFeedButton');
const loadFeedFromSettingsButton = document.getElementById('loadFeedFromSettingsButton');

const STORAGE_KEY = '0FluffReadFeeds';
const DEFAULT_FEEDS = ['https://www.theverge.com/rss/index.xml', 'https://www.engadget.com/rss.xml'];

const getFeeds = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_FEEDS;
};

const saveFeeds = (feeds) => localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds));

function showMessage(msg, type = 'success') {
    messageBox.textContent = msg;
    messageBox.className = `p-4 mb-6 rounded-xl text-sm font-semibold ${type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`;
    messageBox.classList.remove('hidden');
    setTimeout(() => messageBox.classList.add('hidden'), 5000);
}

async function fetchFeedWithRetry(url, retries = 3, backoff = 1000) {
    const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Network response failed');
            return await response.json();
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, backoff * Math.pow(2, i)));
        }
    }
}

function renderFeed(items, sourceFeeds) {
    feedContainer.innerHTML = '';
    if (items.length === 0) {
        feedContainer.innerHTML = '<div class="col-span-full text-center py-20 text-gray-400">No content available. Add feeds in settings.</div>';
        return;
    }

    items.forEach(item => {
        const card = document.createElement('article');
        card.className = 'article-card bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col';
        
        // Image Pulling Logic
        const imageUrl = item.thumbnail || (item.enclosure && item.enclosure.link) || '';
        const imgHtml = imageUrl ? `<img src="${imageUrl}" alt="" class="w-full h-48 object-cover">` : `<div class="w-full h-48 bg-gray-50 flex items-center justify-center text-gray-300"><svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>`;

        card.innerHTML = `
            ${imgHtml}
            <div class="p-6 flex-grow flex flex-col">
                <span class="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">${item.author || 'RSS Feed'}</span>
                <h3 class="text-lg font-bold text-gray-900 leading-snug mb-3 hover:text-indigo-600 transition-colors">
                    <a href="${item.link}" target="_blank" rel="noopener">${item.title}</a>
                </h3>
                <p class="text-gray-500 text-sm line-clamp-3 mb-6">${item.description.replace(/<[^>]*>/g, '').substring(0, 120)}...</p>
                <div class="mt-auto flex justify-between items-center">
                    <span class="text-xs text-gray-400 font-medium">${new Date(item.pubDate).toLocaleDateString()}</span>
                    <button onclick="shareArticle('${item.title.replace(/'/g, "\\'")}', '${item.link}')" class="text-gray-400 hover:text-indigo-600 p-2 transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                    </button>
                </div>
            </div>
        `;
        feedContainer.appendChild(card);
    });
}

window.shareArticle = async (title, url) => {
    const shareData = {
        title: title,
        text: `Check out this article on 0FluffRead: ${title}`,
        url: url
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(`${title} - ${url}`);
            showMessage('Copied professional link to clipboard!');
        }
    } catch (err) {
        console.error('Sharing failed', err);
    }
};

async function loadAllFeeds() {
    const urls = getFeeds();
    loadingIndicator.classList.remove('hidden');
    feedContainer.innerHTML = '';
    
    let allItems = [];
    for (const url of urls) {
        try {
            const data = await fetchFeedWithRetry(url);
            if (data.status === 'ok') {
                allItems = [...allItems, ...data.items];
            }
        } catch (e) {
            console.error(`Feed failure: ${url}`, e);
        }
    }

    allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    loadingIndicator.classList.add('hidden');
    renderFeed(allItems);
}

function renderFeedsList() {
    const feeds = getFeeds();
    feedsList.innerHTML = feeds.map((url, index) => `
        <li class="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
            <span class="truncate pr-4 text-gray-600 font-medium">${url}</span>
            <button onclick="removeFeed(${index})" class="text-red-400 hover:text-red-600 font-bold px-2">✕</button>
        </li>
    `).join('');
}

window.removeFeed = (index) => {
    const feeds = getFeeds();
    feeds.splice(index, 1);
    saveFeeds(feeds);
    renderFeedsList();
};

function addFeed() {
    const url = addFeedInput.value.trim();
    if (url) {
        const feeds = getFeeds();
        if (!feeds.includes(url)) {
            feeds.push(url);
            saveFeeds(feeds);
            addFeedInput.value = '';
            renderFeedsList();
        }
    }
}

settingsButton.addEventListener('click', () => { renderFeedsList(); settingsDialog.showModal(); });
closeSettingsButton.addEventListener('click', () => settingsDialog.close());
addFeedButton.addEventListener('click', addFeed);
loadFeedFromSettingsButton.addEventListener('click', () => { loadAllFeeds(); settingsDialog.close(); });

document.addEventListener('DOMContentLoaded', loadAllFeeds);

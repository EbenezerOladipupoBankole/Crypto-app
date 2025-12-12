/**
 * API Module
 * Handles all external API calls to CoinGecko and NewsAPI
 */

const API_CONFIG = {
    COINGECKO_BASE: 'https://api.coingecko.com/api/v3',
    NEWSAPI_BASE: 'https://gnews.io/api/v4',
    NEWSAPI_KEY: 'YOUR_API_KEY_HERE', // Replace with your GNews API key
    CACHE_DURATION: 60000 // 1 minute
};

// Simple cache to avoid excessive API calls
const cache = {
    coins: { data: null, timestamp: 0 },
    news: { data: null, timestamp: 0 }
};

// Selected currency for display
let selectedCurrency = 'USD';

export function setCurrency(code) {
    selectedCurrency = code;
}

export function getCurrency() {
    return selectedCurrency;
}

/**
 * Generic fetch function with in-memory caching.
 * @param {string} cacheKey - The key to use for the cache object (e.g., 'coins', 'news').
 * @param {string} url - The URL to fetch data from.
 * @param {Function} [fallbackFn] - An optional function to call for fallback data on error.
 * @returns {Promise<any>} The fetched or cached data.
 */
async function fetchWithCache(cacheKey, url, fallbackFn = () => []) {
    const now = Date.now();
    const cachedItem = cache[cacheKey];

    // Return cached data if it's still valid
    if (cachedItem.data && now - cachedItem.timestamp < API_CONFIG.CACHE_DURATION) {
        return cachedItem.data;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Update cache
        cache[cacheKey] = { data: data.articles || data, timestamp: now };
        return data.articles || data;
    } catch (error) {
        console.error(`Error fetching ${cacheKey}:`, error);
        return fallbackFn() || cachedItem.data || []; // Return fallback, then stale cache, then empty array
    }
}

/**
 * Fetch top cryptocurrencies by market cap
 * @returns {Promise<Array>} Array of cryptocurrency data
 */
export async function fetchCoins() {
    // Check cache first
    if (cache.coins.data && Date.now() - cache.coins.timestamp < API_CONFIG.CACHE_DURATION) {
        return cache.coins.data;
    }
    const url = `${API_CONFIG.COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=24h`;
    return fetchWithCache('coins', url);
}

/**
 * Fetch detailed chart data for a specific coin
 * @param {string} coinId - CoinGecko coin ID
 * @param {number} days - Number of days (default: 7)
 * @returns {Promise<Object>} Chart data with prices array
 */
export async function fetchCoinChart(coinId, days = 7) {
    try {
        const response = await fetch(
            `${API_CONFIG.COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Format data for Chart.js
        const formattedData = data.prices.map(([timestamp, price]) => ({
            time: new Date(timestamp).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
            }),
            price: price
        }));

        return formattedData;
    } catch (error) {
        console.error('Error fetching coin chart:', error);
        return [];
    }
}

/**
 * Fetch cryptocurrency news
 * @returns {Promise<Array>} Array of news articles
 */
export async function fetchCryptoNews() {
    // Check cache first
    if (cache.news.data && Date.now() - cache.news.timestamp < API_CONFIG.CACHE_DURATION) {
        return cache.news.data;
    }
    const url = `${API_CONFIG.NEWSAPI_BASE}/search?q=cryptocurrency&lang=en&max=10&apikey=${API_CONFIG.NEWSAPI_KEY}`;
    return fetchWithCache('news', url, getMockNews);
}

/**
 * Mock news data for demonstration or when API is unavailable
 * @returns {Array} Array of mock news articles
 */
function getMockNews() {
    return [
        {
            title: "Bitcoin Reaches New All-Time High",
            description: "Bitcoin has surged to unprecedented levels as institutional adoption continues to grow. Analysts predict further gains in the coming months.",
            source: { name: "Crypto News" },
            publishedAt: new Date().toISOString(),
            url: "https://example.com/news1"
        },
        {
            title: "Ethereum 2.0 Upgrade Shows Promising Results",
            description: "The Ethereum network's transition to proof-of-stake is showing significant improvements in energy efficiency and transaction speeds.",
            source: { name: "Blockchain Today" },
            publishedAt: new Date(Date.now() - 3600000).toISOString(),
            url: "https://example.com/news2"
        },
        {
            title: "Major Bank Announces Crypto Trading Platform",
            description: "A leading financial institution has unveiled plans to launch a cryptocurrency trading platform for its millions of customers.",
            source: { name: "Finance Daily" },
            publishedAt: new Date(Date.now() - 7200000).toISOString(),
            url: "https://example.com/news3"
        },
        {
            title: "DeFi Protocols See Record Trading Volume",
            description: "Decentralized finance platforms have experienced unprecedented growth, with daily trading volumes reaching new highs.",
            source: { name: "DeFi Insights" },
            publishedAt: new Date(Date.now() - 10800000).toISOString(),
            url: "https://example.com/news4"
        },
        {
            title: "Regulatory Framework for Crypto Assets Proposed",
            description: "Government officials have introduced a comprehensive regulatory framework aimed at providing clarity for cryptocurrency markets.",
            source: { name: "Regulatory Review" },
            publishedAt: new Date(Date.now() - 14400000).toISOString(),
            url: "https://example.com/news5"
        }
    ];
}

/**
 * Format large numbers for display
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
    if (num >= 1e12) {
        return (num / 1e12).toFixed(2) + 'T';
    } else if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
        return (num / 1e3).toFixed(2) + 'K';
    }
    return num.toFixed(2);
}

/**
 * Format currency values
 * @param {number} value - Value to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value) {
    try {
        // Use the selected currency (falls back to USD)
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency: selectedCurrency || 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    } catch (err) {
        // Fallback
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date string
 */
export function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }
}
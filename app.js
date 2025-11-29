/**
 * Main Application Entry Point
 * Crypto Trade Master - Virtual Trading Simulator
 */

import { fetchCoins, fetchCoinChart, fetchCryptoNews } from 'api.js';
import { Portfolio } from './portfolio.js';
import {
    showToast,
    showLoading,
    updateDashboard,
    renderHoldings,
    renderTransactions,
    renderMarketTable,
    renderCoinDetails,
    renderChart,
    renderNews,
    updateTradeModal,
    clearSearch
} from 'ui.js';

// Application state
const state = {
    coins: [],
    selectedCoin: null,
    currentTab: 'dashboard',
    tradeType: 'buy',
    portfolio: null,
    searchQuery: ''
};

/**
 * Initialize the application
 */
async function init() {
    console.log('Initializing Crypto Trade Master...');
    
    // Initialize portfolio
    state.portfolio = new Portfolio();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    await loadInitialData();
    
    // Setup auto-refresh
    setupAutoRefresh();
    
    console.log('Application initialized successfully');
}

/**
 * Load initial data
 */
async function loadInitialData() {
    showLoading(true);
    
    try {
        // Fetch coins and news in parallel
        const [coins, news] = await Promise.all([
            fetchCoins(),
            fetchCryptoNews()
        ]);
        
        state.coins = coins;
        
        // Render initial views
        updateDashboard(state.portfolio, state.coins);
        renderHoldings(state.portfolio, state.coins, handleCoinClick);
        renderTransactions();
        renderMarketTable(state.coins, handleCoinClick);
        renderNews(news);
        
        showToast('Market data loaded successfully', 'success');
    } catch (error) {
        console.error('Error loading initial data:', error);
        showToast('Error loading market data', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', handleNavigation);
    });
    
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mainNav = document.getElementById('mainNav');
    
    mobileMenuBtn.addEventListener('click', () => {
        mainNav.classList.toggle('active');
    });
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', handleSearch);
    
    // Trade buttons
    document.getElementById('buyBtn').addEventListener('click', () => openTradeModal('buy'));
    document.getElementById('sellBtn').addEventListener('click', () => openTradeModal('sell'));
    
    // Modal controls
    document.getElementById('modalClose').addEventListener('click', closeTradeModal);
    document.getElementById('confirmTradeBtn').addEventListener('click', handleTrade);
    
    // Close modal on backdrop click
    const modal = document.getElementById('tradeModal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeTradeModal();
        }
    });
    
    // Trade amount input
    const tradeAmountInput = document.getElementById('tradeAmount');
    tradeAmountInput.addEventListener('input', updateTradeTotal);
    
    // Back button
    document.getElementById('backBtn').addEventListener('click', () => {
        switchTab('market');
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

/**
 * Handle navigation between tabs
 */
function handleNavigation(e) {
    const tab = e.currentTarget.dataset.tab;
    switchTab(tab);
}

/**
 * Switch to a different tab
 */
function switchTab(tabName) {
    // Update state
    state.currentTab = tabName;
    
    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tabName === 'dashboard') {
        document.getElementById('dashboardTab').classList.add('active');
    } else if (tabName === 'market') {
        document.getElementById('marketTab').classList.add('active');
    } else if (tabName === 'news') {
        document.getElementById('newsTab').classList.add('active');
    }
    
    // Close mobile menu
    document.getElementById('mainNav').classList.remove('active');
    
    // Clear search when leaving market tab
    if (tabName !== 'market') {
        clearSearch();
    }
}

/**
 * Handle search input
 */
function handleSearch(e) {
    state.searchQuery = e.target.value.toLowerCase();
    
    const filteredCoins = state.coins.filter(coin => {
        return coin.name.toLowerCase().includes(state.searchQuery) ||
               coin.symbol.toLowerCase().includes(state.searchQuery);
    });
    
    renderMarketTable(filteredCoins, handleCoinClick);
}

/**
 * Handle coin click - show coin details
 */
function handleCoinClick(coin) {
    state.selectedCoin = coin;
    
    // Show coin details section
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById('coinDetails').classList.add('active');
    
    // Update navigation to deselect all
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Render coin details
    renderCoinDetails(coin, state.portfolio);
    
    // Fetch and render chart
    fetchCoinChart(coin.id).then(chartData => {
        renderChart(chartData);
    });
}

/**
 * Open trade modal
 */
function openTradeModal(type) {
    state.tradeType = type;
    
    const modal = document.getElementById('tradeModal');
    modal.classList.add('active');
    
    // Clear previous input
    document.getElementById('tradeAmount').value = '';
    document.getElementById('tradeTotal').textContent = '$0.00';
    
    // Update modal content
    updateTradeModal(type, state.selectedCoin, state.portfolio);
    
    // Focus on input
    setTimeout(() => {
        document.getElementById('tradeAmount').focus();
    }, 100);
}

/**
 * Close trade modal
 */
function closeTradeModal() {
    const modal = document.getElementById('tradeModal');
    modal.classList.remove('active');
}

/**
 * Update trade total as user types
 */
function updateTradeTotal() {
    const amount = parseFloat(document.getElementById('tradeAmount').value) || 0;
    const price = state.selectedCoin.current_price;
    const total = amount * price;
    
    document.getElementById('tradeTotal').textContent = `$${total.toFixed(2)}`;
}

/**
 * Handle trade execution
 */
function handleTrade() {
    const amount = parseFloat(document.getElementById('tradeAmount').value);
    
    if (!amount || amount <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }
    
    let result;
    
    if (state.tradeType === 'buy') {
        result = state.portfolio.buy(state.selectedCoin, amount);
    } else {
        result = state.portfolio.sell(state.selectedCoin, amount);
    }
    
    if (result.success) {
        showToast(result.message, 'success');
        closeTradeModal();
        
        // Refresh UI
        updateDashboard(state.portfolio, state.coins);
        renderHoldings(state.portfolio, state.coins, handleCoinClick);
        renderTransactions();
        renderCoinDetails(state.selectedCoin, state.portfolio);
    } else {
        showToast(result.message, 'error');
    }
}

/**
 * Setup auto-refresh for market data
 */
function setupAutoRefresh() {
    // Refresh every 60 seconds
    setInterval(async () => {
        try {
            const coins = await fetchCoins();
            state.coins = coins;
            
            // Update current view
            if (state.currentTab === 'dashboard') {
                updateDashboard(state.portfolio, state.coins);
                renderHoldings(state.portfolio, state.coins, handleCoinClick);
            } else if (state.currentTab === 'market') {
                renderMarketTable(state.coins, handleCoinClick);
            }
            
            // Update coin details if viewing one
            if (state.selectedCoin) {
                const updatedCoin = coins.find(c => c.id === state.selectedCoin.id);
                if (updatedCoin) {
                    state.selectedCoin = updatedCoin;
                    renderCoinDetails(updatedCoin, state.portfolio);
                }
            }
            
            console.log('Market data refreshed');
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    }, 60000);
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboard(e) {
    // ESC key closes modal
    if (e.key === 'Escape') {
        const modal = document.getElementById('tradeModal');
        if (modal.classList.contains('active')) {
            closeTradeModal();
        }
    }
    
    // Ctrl/Cmd + K focuses search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        switchTab('market');
        setTimeout(() => {
            document.getElementById('searchInput').focus();
        }, 100);
    }
}

/**
 * Expose reset function globally for testing
 */
window.resetPortfolio = function() {
    if (confirm('Are you sure you want to reset your portfolio? This will delete all your holdings and transactions.')) {
        state.portfolio.reset();
        localStorage.clear();
        location.reload();
    }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Handle page visibility for pausing/resuming updates
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden, pausing updates');
    } else {
        console.log('Page visible, resuming updates');
        // Refresh data when page becomes visible again
        fetchCoins().then(coins => {
            state.coins = coins;
            if (state.currentTab === 'dashboard') {
                updateDashboard(state.portfolio, state.coins);
                renderHoldings(state.portfolio, state.coins, handleCoinClick);
            }
        });
    }
});

// Service Worker registration (optional, for PWA functionality)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Service worker registration code would go here
        console.log('Service Worker support detected');
    });
}

console.log('Crypto Trade Master loaded - Ready to trade!');
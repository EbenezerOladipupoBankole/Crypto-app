/**
 * Main Application Entry Point
 * Crypto Trade Master - Virtual Trading Simulator
 */

import { fetchCoins, fetchCoinChart, fetchCryptoNews, setCurrency, getCurrency } from './api.js';
import { Portfolio } from './portfolio.js';
import { renderMarketTable, renderMarketSummary } from './market.js';
import { renderNews } from './news.js';
import {
    showToast,
    showLoading,
    updateDashboard,
    renderHoldings,
    renderTransactions,
    renderCoinDetails,
    renderChart,
    updateTradeModal,
    clearSearch
} from './ui.js';

// Application state
const state = {
    coins: [],
    selectedCoin: null,
    currentTab: 'dashboard',
    tradeType: 'buy',
    portfolio: null,
    searchQuery: '',
    sortKey: 'market_cap_rank',
    sortOrder: 'asc',
    marketPage: 1,
    itemsPerPage: 20
};

/**
 * Initialize the application
 */
async function init() {
    console.log('Initializing Crypto Trade Master...');
    
    // Initialize portfolio
    state.portfolio = new Portfolio();
    
    // Load settings from storage
    const settings = JSON.parse(localStorage.getItem('settings') || '{}');
    if (settings.currency) setCurrency(settings.currency);
    if (settings.theme === 'light') document.body.classList.add('theme-light');

    // Initialize settings UI if present
    const currencySelectInit = document.getElementById('currencySelect');
    const themeToggleInit = document.getElementById('themeToggle');
    const themeLabelInit = document.getElementById('themeLabel');
    if (currencySelectInit && settings.currency) currencySelectInit.value = settings.currency;
    if (themeToggleInit) {
        themeToggleInit.checked = (settings.theme === 'light');
        if (themeLabelInit) themeLabelInit.textContent = themeToggleInit.checked ? 'Light' : 'Dark';
    }
    
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
        renderPaginatedMarket();
        renderMarketSummary(state.coins);
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
    // Navigation: only attach handlers to buttons that have a data-tab (SPA tabs)
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.dataset && btn.dataset.tab) {
            btn.addEventListener('click', handleNavigation);
        }
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

    // Market table sort headers
    document.querySelectorAll('.market-table th[data-sort]').forEach(header => {
        header.addEventListener('click', handleSort);
    });
    
    // Pagination controls
    document.getElementById('prevPageBtn').addEventListener('click', () => handlePagination('prev'));
    document.getElementById('nextPageBtn').addEventListener('click', () => handlePagination('next'));

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Hero buttons actions
    const heroTradeBtn = document.getElementById('heroTradeBtn');
    if (heroTradeBtn) heroTradeBtn.addEventListener('click', () => {
        // activate market tab by simulating a click on the nav button
        const marketBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.dataset && b.dataset.tab === 'market');
        if (marketBtn) marketBtn.click();
        // focus the search input after switching
        setTimeout(() => { const si = document.getElementById('searchInput'); if (si) si.focus(); }, 100);
    });

    const heroGainersBtn = document.getElementById('heroGainersBtn');
    if (heroGainersBtn) heroGainersBtn.addEventListener('click', () => {
        // switch to market and try to sort by 24h % desc if available
        const marketBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.dataset && b.dataset.tab === 'market');
        if (marketBtn) marketBtn.click();
        setTimeout(() => {
            const header = Array.from(document.querySelectorAll('.market-table th[data-sort]')).find(h => h.dataset.sort === 'price_change_percentage_24h');
            if (header) header.click();
            // ensure descending order
            if (header && header.classList.contains('sorted')) {
                // toggle if currently ascending would flip to descending
                // the handler toggles order, so to ensure descending, check indicator
                const indicator = header.querySelector('.sort-indicator');
                if (indicator && indicator.textContent.trim() === '▲') header.click();
            }
        }, 150);
    });

    // Profile button toggle and menu
    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');
    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', (e) => {
            const expanded = profileBtn.getAttribute('aria-expanded') === 'true';
            profileBtn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
            profileMenu.style.display = expanded ? 'none' : 'block';
            profileMenu.setAttribute('aria-hidden', expanded ? 'true' : 'false');
        });
        document.addEventListener('click', (e) => {
            if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
                profileMenu.style.display = 'none';
                profileBtn.setAttribute('aria-expanded', 'false');
                profileMenu.setAttribute('aria-hidden', 'true');
            }
        });
        const profileReset = document.getElementById('profileReset');
        if (profileReset) profileReset.addEventListener('click', (ev) => {
            ev.preventDefault();
            window.resetPortfolio();
        });
        const profileSettings = document.getElementById('profileSettings');
        const settingsModal = document.getElementById('settingsModal');
        const settingsClose = document.getElementById('settingsClose');
        const saveSettingsBtn = document.getElementById('saveSettings');
        const cancelSettingsBtn = document.getElementById('cancelSettings');
        const currencySelect = document.getElementById('currencySelect');
        const themeToggle = document.getElementById('themeToggle');
        const themeLabel = document.getElementById('themeLabel');

        if (profileSettings) {
            profileSettings.addEventListener('click', (ev) => {
                ev.preventDefault();
                // close profile menu and open settings modal
                profileMenu.style.display = 'none';
                profileBtn.setAttribute('aria-expanded', 'false');
                if (settingsModal) settingsModal.classList.add('active');
                // load current settings
                const settings = JSON.parse(localStorage.getItem('settings') || '{}');
                if (currencySelect && settings.currency) currencySelect.value = settings.currency;
                if (themeToggle) themeToggle.checked = (settings.theme === 'light');
                if (themeLabel) themeLabel.textContent = (themeToggle.checked ? 'Light' : 'Dark');
            });
        }
        // Close settings modal handlers
        if (settingsClose) settingsClose.addEventListener('click', () => settingsModal.classList.remove('active'));
        if (cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('active'));
        // Theme toggle label update
        if (themeToggle && themeLabel) themeToggle.addEventListener('change', () => { themeLabel.textContent = themeToggle.checked ? 'Light' : 'Dark'; });

        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                const newCurrency = currencySelect ? currencySelect.value : 'USD';
                const newTheme = (themeToggle && themeToggle.checked) ? 'light' : 'dark';
                setCurrency(newCurrency);
                if (newTheme === 'light') document.body.classList.add('theme-light'); else document.body.classList.remove('theme-light');
                localStorage.setItem('settings', JSON.stringify({ currency: newCurrency, theme: newTheme }));
                if (settingsModal) settingsModal.classList.remove('active');
                // Re-render values to use new currency formatting
                updateDashboard(state.portfolio, state.coins);
                showToast('Settings saved', 'success');
            });
        }
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    settingsModal.classList.remove('active');
                }
            });
        }
    }
}

/**
 * Handle navigation between tabs
 */
function handleNavigation(e) {
    const tab = e.currentTarget.dataset.tab;
    if (!tab) return;
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
    
    const activeTabContent = document.getElementById(`${tabName}Tab`);
    if (activeTabContent) activeTabContent.classList.add('active');
    
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
    state.marketPage = 1; // Reset to first page on new search
    const query = e.target.value.toLowerCase();
    state.searchQuery = query;

    const sortedCoins = sortCoins(state.coins);
    const filteredCoins = sortedCoins.filter(coin =>
        coin.name.toLowerCase().includes(query) ||
        coin.symbol.toLowerCase().includes(query)
    );

    renderPaginatedMarket(filteredCoins);
}

/**
 * Handle table sorting
 */
function handleSort(e) {
    const newSortKey = e.currentTarget.dataset.sort;
    state.marketPage = 1; // Reset to first page on new sort

    if (state.sortKey === newSortKey) {
        // If same key, toggle order
        state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        // If new key, set to ascending
        state.sortKey = newSortKey;
        state.sortOrder = 'asc';
    }

    const sortedCoins = sortCoins(state.coins);
    state.coins = sortedCoins; // Update the main coins array with the new order
    renderPaginatedMarket();
}

/**
 * Handle pagination clicks
 * @param {string} direction - 'prev' or 'next'
 */
function handlePagination(direction) {
    if (direction === 'prev' && state.marketPage > 1) {
        state.marketPage--;
    } else {
        state.marketPage++;
    }
    renderPaginatedMarket();
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
                renderPaginatedMarket();
                renderMarketSummary(state.coins);
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
 * Slices, renders the market table, and updates pagination controls.
 * @param {Array} [dataSource=state.coins] - Optional data source to use.
 */
function renderPaginatedMarket(dataSource = state.coins) {
    const { marketPage, itemsPerPage, sortKey, sortOrder } = state;

    // Handle filtering if search is active
    const source = state.searchQuery ? dataSource : state.coins;

    const totalItems = source.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Clamp current page
    if (state.marketPage > totalPages) state.marketPage = totalPages > 0 ? totalPages : 1;
    if (state.marketPage < 1) state.marketPage = 1;

    const startIndex = (state.marketPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = source.slice(startIndex, endIndex);

    renderMarketTable(pageItems, handleCoinClick, sortKey, sortOrder, startIndex);

    // Update pagination controls
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    pageInfo.textContent = `Page ${state.marketPage} of ${totalPages}`;
    prevBtn.disabled = state.marketPage === 1;
    nextBtn.disabled = state.marketPage === totalPages;
}

/**
 * Sorts the coin array based on the current state.
 * @param {Array} coinsArray - The array of coins to sort.
 * @returns {Array} The sorted array.
 */
function sortCoins(coinsArray) {
    const { sortKey, sortOrder } = state;
    return [...coinsArray].sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'string') {
            return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
    });
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
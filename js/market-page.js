import { fetchCoins, setCurrency } from './api.js';
import { renderMarketTable, renderMarketSummary } from './market.js';

const state = {
    coins: [],
    searchQuery: '',
    sortKey: 'market_cap_rank',
    sortOrder: 'asc',
    currentPage: 1,
    itemsPerPage: 20
};

async function init() {
    try {
        // Apply saved theme
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        if (settings.theme === 'light') document.body.classList.add('theme-light');
        const coins = await fetchCoins();
        state.coins = coins;

        renderMarketSummary(state.coins);
        renderPaginatedMarket();

        setupEventListeners();
        setupProfileAndSettings();
    } catch (err) {
        console.error('Failed to load market data', err);
        const tbody = document.getElementById('marketTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="loading-state">Failed to load market data</td></tr>';
    }
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value.toLowerCase();
            state.currentPage = 1;
            renderPaginatedMarket();
        });
    }

    document.querySelectorAll('.market-table th[data-sort]').forEach(header => {
        header.addEventListener('click', () => {
            const newSortKey = header.dataset.sort;
            if (state.sortKey === newSortKey) {
                state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortKey = newSortKey;
                state.sortOrder = 'asc';
            }
            state.currentPage = 1;
            renderPaginatedMarket();
        });
    });

    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (prevBtn) prevBtn.addEventListener('click', () => { if (state.currentPage > 1) { state.currentPage--; renderPaginatedMarket(); } });
    if (nextBtn) nextBtn.addEventListener('click', () => { state.currentPage++; renderPaginatedMarket(); });
}

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

function renderPaginatedMarket() {
    const filtered = state.coins.filter(coin => {
        if (!state.searchQuery) return true;
        return coin.name.toLowerCase().includes(state.searchQuery) || coin.symbol.toLowerCase().includes(state.searchQuery);
    });

    const sorted = sortCoins(filtered);

    const totalItems = sorted.length;
    const totalPages = Math.ceil(totalItems / state.itemsPerPage) || 1;

    if (state.currentPage > totalPages) state.currentPage = totalPages;
    if (state.currentPage < 1) state.currentPage = 1;

    const start = (state.currentPage - 1) * state.itemsPerPage;
    const pageItems = sorted.slice(start, start + state.itemsPerPage);

    renderMarketTable(pageItems, handleCoinClick, state.sortKey, state.sortOrder, start);

    // update pagination UI
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    if (pageInfo) pageInfo.textContent = `Page ${state.currentPage} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = state.currentPage === 1;
    if (nextBtn) nextBtn.disabled = state.currentPage === totalPages;
}

function handleCoinClick(coin) {
    // For now, navigate back to the main app
    // Optionally, could open a detailed coin view in this page.
    window.location.href = `index.html`;
}

function setupProfileAndSettings() {
    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');
    const profileSettings = document.getElementById('profileSettings');
    const profileReset = document.getElementById('profileReset');
    const settingsModal = document.getElementById('settingsModal');
    const settingsClose = document.getElementById('settingsClose');
    const saveSettingsBtn = document.getElementById('saveSettings');
    const cancelSettingsBtn = document.getElementById('cancelSettings');
    const currencySelect = document.getElementById('currencySelect');
    const themeToggle = document.getElementById('themeToggle');

    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', () => {
            const expanded = profileBtn.getAttribute('aria-expanded') === 'true';
            profileBtn.setAttribute('aria-expanded', expanded ? 'false' : 'true');
            profileMenu.style.display = expanded ? 'none' : 'block';
        });
        document.addEventListener('click', (e) => {
            if (!profileBtn.contains(e.target) && !profileMenu.contains(e.target)) {
                profileMenu.style.display = 'none';
            }
        });
    }

    if (profileSettings && settingsModal) {
        profileSettings.addEventListener('click', (e) => {
            e.preventDefault();
            profileMenu.style.display = 'none';
            settingsModal.classList.add('active');
            const settings = JSON.parse(localStorage.getItem('settings') || '{}');
            if (currencySelect && settings.currency) currencySelect.value = settings.currency;
            if (themeToggle) themeToggle.checked = (settings.theme === 'light');
        });
    }
    if (profileReset) profileReset.addEventListener('click', (e) => { e.preventDefault(); localStorage.clear(); location.reload(); });
    if (settingsClose) settingsClose.addEventListener('click', (e) => { settingsModal.classList.remove('active'); });
    if (cancelSettingsBtn) cancelSettingsBtn.addEventListener('click', (e) => { settingsModal.classList.remove('active'); });
    if (saveSettingsBtn) saveSettingsBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const newCurrency = currencySelect ? currencySelect.value : 'USD';
        setCurrency(newCurrency);
        localStorage.setItem('settings', JSON.stringify({ currency: newCurrency, theme: (themeToggle && themeToggle.checked) ? 'light' : 'dark' }));
        if (settingsModal) settingsModal.classList.remove('active');
        location.reload();
    });
    if (settingsModal) settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.remove('active'); });
}

// Initialize when DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

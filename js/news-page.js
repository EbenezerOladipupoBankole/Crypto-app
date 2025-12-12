import { fetchCryptoNews, setCurrency } from '../api.js';
import { renderNews } from '../news.js';

async function init() {
    try {
        // Apply saved theme
        const settings = JSON.parse(localStorage.getItem('settings') || '{}');
        if (settings.theme === 'light') document.body.classList.add('theme-light');
        const news = await fetchCryptoNews();
        renderNews(news);
        setupProfileAndSettings();
    } catch (err) {
        console.error('Failed to load news', err);
        const container = document.getElementById('newsList');
        if (container) container.innerHTML = '<p class="loading-state">Failed to load news</p>';
    }
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

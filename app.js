// app.js - Core app logic for Crypto Trade Master
(function() {
    const API_BASE = 'https://api.coingecko.com/api/v3';
    let cryptoData = [];
    let page = 1;
    const perPage = 25;

    const state = {
        portfolio: { balance: 100000, holdings: {} },
        transactions: [],
        watchlist: [],
        alerts: [],
        settings: { currency: 'USD', dark: false }
    };

    function loadState() {
        const keys = ['portfolio', 'transactions', 'watchlist', 'alerts', 'settings'];
        keys.forEach(k => {
            const raw = localStorage.getItem('ctm_' + k);
            if (raw) state[k] = JSON.parse(raw);
        });
    }
    function saveState(key) { localStorage.setItem('ctm_' + key, JSON.stringify(state[key])); }

    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    async function fetchGlobal() {
        try {
            const res = await fetch(`${API_BASE}/global`);
            const json = await res.json();
            const d = json.data;
            $('#totalMarketCap').textContent = d.total_market_cap.usd ? `$${Number(d.total_market_cap.usd).toLocaleString()}` : '--';
            $('#totalVolume24h').textContent = d.total_volume.usd ? `$${Number(d.total_volume.usd).toLocaleString()}` : '--';
            $('#btcDominance').textContent = d.market_cap_percentage?.btc ? `${d.market_cap_percentage.btc.toFixed(2)}%` : '--';
        } catch (e) {
            console.warn('Global fetch failed', e);
        }
    }

    async function fetchMarkets(p = 1) {
        try {
            $('#marketTableBody').innerHTML = '<tr><td colspan="8" class="loading-state">Loading market data...</td></tr>';
            const url = `${API_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${p}&sparkline=true&price_change_percentage=24h`;
            const res = await fetch(url);
            cryptoData = await res.json();
            renderMarketTable(cryptoData);
            $('#pageInfo').textContent = `Page ${p}`;
        } catch (err) {
            console.error('fetchMarkets', err);
            $('#marketTableBody').innerHTML = '<tr><td colspan="8" class="loading-state">Failed to load data</td></tr>';
        }
    }

    function renderMarketTable(data) {
        const tbody = $('#marketTableBody');
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="loading-state">No results</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(coin => {
            const inWatch = state.watchlist.includes(coin.id);
            const changeClass = coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative';
            return `
                <tr data-id="${coin.id}" class="market-row">
                    <td class="watchlist-star-col"><button class="star-btn" data-id="${coin.id}" aria-label="${inWatch ? 'Remove' : 'Add'} from watchlist">${inWatch ? '★' : '☆'}</button></td>
                    <td>${coin.market_cap_rank}</td>
                    <td class="coin-cell"><img src="${coin.image}" alt="" style="width:20px; height:20px; border-radius:50%; margin-right:8px; vertical-align:middle"> ${coin.name} <small style="color:#9CA3AF">${coin.symbol.toUpperCase()}</small></td>
                    <td class="text-right">$${Number(coin.current_price).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:6})}</td>
                    <td class="text-right ${changeClass}">${coin.price_change_percentage_24h?.toFixed(2) ?? '--'}%</td>
                    <td class="text-right hide-mobile">${renderSparklineInline(coin.sparkline_in_7d?.price)}</td>
                    <td class="text-right hide-mobile">$${Number(coin.market_cap).toLocaleString()}</td>
                    <td class="text-right hide-mobile">$${Number(coin.total_volume).toLocaleString()}</td>
                </tr>
            `;
        }).join('');
    }

    function renderSparklineInline(prices) {
        if (!prices || prices.length === 0) return '';
        const min = Math.min(...prices), max = Math.max(...prices), range = max - min || 1;
        const step = 100 / (prices.length - 1);
        const points = prices.map((p,i) => {
            const x = (i * step).toFixed(2);
            const y = (30 - ((p - min) / range) * 24).toFixed(2);
            return `${x},${y}`;
        }).join(' ');
        const color = prices[prices.length-1] - prices[0] >= 0 ? '#16C784' : '#EA3943';
        return `<svg viewBox="0 0 100 30" width="120" height="30"><polyline fill="none" stroke="${color}" stroke-width="1.5" points="${points}" /></svg>`;
    }

    function onSearch(e) {
        const q = (e.target.value || '').toLowerCase().trim();
        const filtered = cryptoData.filter(c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q));
        renderMarketTable(filtered);
    }

    function toggleWatchlist(id, btn) {
        const idx = state.watchlist.indexOf(id);
        if (idx >= 0) state.watchlist.splice(idx,1);
        else state.watchlist.push(id);
        saveState('watchlist');
        btn.textContent = state.watchlist.includes(id) ? '★' : '☆';
        renderWatchlist();
    }

    function renderWatchlist() {
        const container = $('#watchlistContainer');
        if (!state.watchlist.length) return container.innerHTML = '<p class="empty-state">No watchlist items</p>';
        const items = state.watchlist.map(id => {
            const c = cryptoData.find(x => x.id === id);
            if (!c) return '';
            return `<div class="watch-item" data-id="${c.id}"><img src="${c.image}" width="20"> ${c.name} <span style="float:right">$${c.current_price}</span></div>`;
        }).join('');
        container.innerHTML = items;
    }

    function openTradeModalFor(id, type='buy') {
        const coin = cryptoData.find(c => c.id === id);
        if (!coin) return;
        currentCoin = coin;
        $('#modalTitle').textContent = `${type === 'buy' ? 'Buy' : 'Sell'} ${coin.name}`;
        $('#tradeAmount').value = '';
        $('#tradePrice').textContent = `$${coin.current_price.toFixed(2)}`;
        $('#tradeBalance').textContent = `$${state.portfolio.balance.toFixed(2)}`;
        $('#tradeModal').classList.add('active');
        $('#confirmTradeBtn').onclick = () => confirmTrade(coin, type);
    }

    function confirmTrade(coin, type) {
        const amount = parseFloat($('#tradeAmount').value) || 0;
        if (amount <= 0) { showToast('Enter a valid amount'); return; }
        const total = amount * coin.current_price;
        if (type === 'buy') {
            if (total > state.portfolio.balance) { showToast('Insufficient balance'); return; }
            state.portfolio.balance -= total;
            const h = state.portfolio.holdings[coin.id] || { amount:0, totalCost:0 };
            h.amount += amount; h.totalCost += total; state.portfolio.holdings[coin.id] = h;
            state.transactions.unshift({ date: new Date().toISOString(), type:'BUY', coin:coin.name, symbol:coin.symbol, amount, price:coin.current_price, total });
        } else {
            const h = state.portfolio.holdings[coin.id];
            if (!h || h.amount < amount) { showToast('Not enough holdings'); return; }
            state.portfolio.balance += total;
            const avg = h.totalCost / h.amount;
            h.totalCost -= avg * amount;
            h.amount -= amount;
            if (h.amount <= 0) delete state.portfolio.holdings[coin.id];
            state.transactions.unshift({ date: new Date().toISOString(), type:'SELL', coin:coin.name, symbol:coin.symbol, amount, price:coin.current_price, total });
        }
        saveState('portfolio'); saveState('transactions');
        updateUI();
        $('#tradeModal').classList.remove('active');
        showToast('Trade successful', 'success');
    }

    function showToast(msg, type='') {
        const t = $('#toast');
        if (!t) return alert(msg);
        t.textContent = msg; t.className = 'toast ' + (type||'');
        t.classList.add('visible');
        setTimeout(()=> t.classList.remove('visible'), 3000);
    }

    function updateUI() {
        let total = state.portfolio.balance;
        Object.keys(state.portfolio.holdings).forEach(id => {
            const h = state.portfolio.holdings[id];
            const coin = cryptoData.find(c => c.id === id);
            if (coin) total += h.amount * coin.current_price;
        });
        $('#heroPortfolioValue').textContent = `$${total.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;
        const list = $('#holdingsList');
        const keys = Object.keys(state.portfolio.holdings);
        if (!keys.length) list.innerHTML = '<p class="empty-state">No holdings yet. Start trading to build your portfolio!</p>';
        else {
            list.innerHTML = keys.map(id => {
                const h = state.portfolio.holdings[id];
                const c = cryptoData.find(x => x.id === id);
                const current = c ? (h.amount * c.current_price) : 0;
                const avg = h.totalCost / h.amount;
                return `<div class="holding-item"><div><strong>${c?.name || id}</strong> <small>${h.amount.toFixed(6)} ${h.symbol||''}</small></div><div>$${current.toFixed(2)} <small style="color:#9CA3AF">(avg $${avg.toFixed(2)})</small></div></div>`;
            }).join('');
        }

        const tx = $('#transactionsList');
        if (!state.transactions.length) tx.innerHTML = '<p class="empty-state">No transactions yet</p>';
        else tx.innerHTML = state.transactions.slice(0,10).map(t => `<div class="tx-item"><strong>${t.type}</strong> ${t.coin} ${t.amount} — $${t.total.toFixed(2)} <div class="tx-date">${new Date(t.date).toLocaleString()}</div></div>`).join('');

        renderWatchlist();
    }

    function wireEvents() {
        $('#searchInput')?.addEventListener('input', onSearch);
        $('#prevPageBtn')?.addEventListener('click', ()=> { if (page>1) { page--; fetchMarkets(page); } });
        $('#nextPageBtn')?.addEventListener('click', ()=> { page++; fetchMarkets(page); });
        $$('.nav-btn').forEach(btn => btn.addEventListener('click', (e) => {
            const tab = btn.dataset.tab;
            $$('.tab-content').forEach(t => t.classList.remove('active'));
            $(`#${tab}Tab`).classList.add('active');
            $$('.nav-btn').forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
        }));

        $('#marketTableBody')?.addEventListener('click', (e) => {
            const star = e.target.closest('.star-btn');
            if (star) { toggleWatchlist(star.dataset.id, star); return; }
            const row = e.target.closest('.market-row');
            if (row) {
                const id = row.dataset.id;
                openCoinDetails(id);
            }
        });

        $('#watchlistContainer')?.addEventListener('click', (e) => {
            const row = e.target.closest('.watch-item');
            if (row) openCoinDetails(row.dataset.id);
        });

        $('#modalClose')?.addEventListener('click', ()=> $('#tradeModal').classList.remove('active'));
        document.getElementById('heroTradeBtn')?.addEventListener('click', ()=> { $$('.tab-content').forEach(t=>t.classList.remove('active')); $('#marketTab').classList.add('active'); });
        $('#profileBtn')?.addEventListener('click', ()=> { const m = $('#profileMenu'); m.classList.toggle('open'); });
    }

    let currentCoin = null;
    async function openCoinDetails(id) {
        const coin = cryptoData.find(c => c.id === id);
        if (!coin) return;
        currentCoin = coin;
        $$('.tab-content').forEach(t=>t.classList.remove('active'));
        $('#coinDetails').classList.add('active');
        $('#coinImage').src = coin.image; $('#coinName').textContent = coin.name; $('#coinSymbol').textContent = coin.symbol.toUpperCase();
        $('#coinPrice').textContent = `$${coin.current_price.toLocaleString()}`; $('#coinChange').textContent = `${coin.price_change_percentage_24h?.toFixed(2)}%`;
        const h = state.portfolio.holdings[coin.id];
        if (h) {
            $('#coinHoldingInfo').style.display = 'block';
            $('#holdingAmount').textContent = h.amount.toFixed(8);
            $('#holdingAvgPrice').textContent = `$${(h.totalCost/h.amount).toFixed(2)}`;
            $('#holdingValue').textContent = `$${(h.amount * coin.current_price).toFixed(2)}`;
            $('#holdingPnL').textContent = `$${((h.amount*coin.current_price) - h.totalCost).toFixed(2)}`;
        } else $('#coinHoldingInfo').style.display = 'none';

        $('#buyBtn').onclick = ()=> openTradeModalFor(coin.id, 'buy');
        $('#sellBtn').onclick = ()=> openTradeModalFor(coin.id, 'sell');

        try {
            const res = await fetch(`${API_BASE}/coins/${id}/market_chart?vs_currency=usd&days=7`);
            const json = await res.json();
            drawMiniChart(json.prices || []);
        } catch(e) { console.warn('chart fetch', e); }
    }

    function drawMiniChart(prices) {
        const canvas = document.getElementById('priceChart');
        if (!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.clientWidth; canvas.height = 100;
        ctx.clearRect(0,0,canvas.width,canvas.height);
        if (!prices.length) return;
        const pts = prices.map(p=>p[1]);
        const min = Math.min(...pts), max = Math.max(...pts), range = max-min || 1;
        ctx.beginPath();
        pts.forEach((v,i)=>{
            const x = (i/(pts.length-1))*canvas.width;
            const y = canvas.height - ((v-min)/range)*(canvas.height-20) - 10;
            if (i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        });
        ctx.strokeStyle = '#3A7AFE'; ctx.lineWidth = 2; ctx.stroke();
    }

    async function init() {
        loadState();
        wireEvents();
        await fetchGlobal();
        await fetchMarkets(page);
        updateUI();
        setInterval(()=>{ fetchGlobal(); fetchMarkets(page); updateUI(); }, 60000);
    }

    window.openTradeModal = openTradeModalFor;
    window.openCoinDetails = openCoinDetails;

    document.addEventListener('DOMContentLoaded', init);
})();

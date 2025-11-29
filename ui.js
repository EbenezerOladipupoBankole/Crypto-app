/**
 * UI Module
 * Handles all DOM manipulation and rendering
 */

import { formatCurrency, formatNumber, formatDate } from 'api.js';
import { getTransactions } from './storage.js';

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast ('success', 'error', 'info')
 */
export function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    // Trigger reflow to restart animation
    void toast.offsetWidth;
    
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

/**
 * Show/hide loading overlay
 * @param {boolean} show - Whether to show or hide
 */
export function showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

/**
 * Update dashboard summary cards
 * @param {Object} portfolio - Portfolio instance
 * @param {Array} coins - Coin data
 */
export function updateDashboard(portfolio, coins) {
    const totalValue = portfolio.calculateTotalValue(coins);
    const pnl = portfolio.calculateProfitLoss(coins);
    
    // Update total value
    document.getElementById('totalValue').textContent = formatCurrency(totalValue);
    
    // Update profit/loss
    const profitLossCard = document.getElementById('profitLossCard');
    const profitLossEl = document.getElementById('profitLoss');
    const profitLossPercentEl = document.getElementById('profitLossPercent');
    
    profitLossEl.textContent = formatCurrency(Math.abs(pnl.amount));
    profitLossPercentEl.textContent = `${pnl.isProfit ? '+' : '-'}${Math.abs(pnl.percent).toFixed(2)}%`;
    
    // Update card color
    profitLossCard.className = pnl.isProfit ? 'card card-gradient-green' : 'card card-gradient-red';
    
    // Update cash balance
    document.getElementById('cashBalance').textContent = formatCurrency(portfolio.getBalance());
}

/**
 * Render holdings list
 * @param {Object} portfolio - Portfolio instance
 * @param {Array} coins - Coin data
 * @param {Function} onHoldingClick - Click handler
 */
export function renderHoldings(portfolio, coins, onHoldingClick) {
    const container = document.getElementById('holdingsList');
    const holdings = portfolio.getData().holdings;
    
    if (Object.keys(holdings).length === 0) {
        container.innerHTML = '<p class="empty-state">No holdings yet. Start trading to build your portfolio!</p>';
        return;
    }
    
    container.innerHTML = '';
    
    Object.entries(holdings).forEach(([coinId, holding]) => {
        const coin = coins.find(c => c.id === coinId);
        if (!coin) return;
        
        const pnlData = portfolio.calculateHoldingPnL(coinId, coin.current_price);
        
        const item = document.createElement('div');
        item.className = 'holding-item';
        item.onclick = () => onHoldingClick(coin);
        
        item.innerHTML = `
            <div class="holding-info">
                <img src="${holding.image}" alt="${holding.name}" class="holding-image">
                <div>
                    <div class="holding-name">${holding.name}</div>
                    <div class="holding-amount">${holding.amount.toFixed(6)} ${holding.symbol.toUpperCase()}</div>
                </div>
            </div>
            <div class="holding-stats">
                <div class="holding-value">${formatCurrency(pnlData.currentValue)}</div>
                <div class="holding-pnl ${pnlData.isProfit ? 'positive' : 'negative'}">
                    ${pnlData.isProfit ? '+' : ''}${formatCurrency(pnlData.pnl)} (${pnlData.pnlPercent.toFixed(2)}%)
                </div>
            </div>
        `;
        
        container.appendChild(item);
    });
}

/**
 * Render transaction history
 */
export function renderTransactions() {
    const container = document.getElementById('transactionsList');
    const transactions = getTransactions();
    
    if (transactions.length === 0) {
        container.innerHTML = '<p class="empty-state">No transactions yet</p>';
        return;
    }
    
    container.innerHTML = '';
    
    transactions.slice(0, 10).forEach(tx => {
        const item = document.createElement('div');
        item.className = 'transaction-item';
        
        item.innerHTML = `
            <div class="transaction-left">
                <div class="transaction-icon ${tx.type}">
                    ${tx.type === 'buy' ? 
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>' :
                        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
                    }
                </div>
                <div class="transaction-details">
                    <div class="transaction-type">${tx.type === 'buy' ? 'Bought' : 'Sold'} ${tx.coinName}</div>
                    <div class="transaction-date">${new Date(tx.timestamp).toLocaleString()}</div>
                </div>
            </div>
            <div class="transaction-amounts">
                <div class="transaction-amount">${tx.amount.toFixed(6)} ${tx.coinSymbol.toUpperCase()}</div>
                <div class="transaction-total">${formatCurrency(tx.total)}</div>
            </div>
        `;
        
        container.appendChild(item);
    });
}

/**
 * Render market table
 * @param {Array} coins - Coin data
 * @param {Function} onCoinClick - Click handler
 */
export function renderMarketTable(coins, onCoinClick) {
    const tbody = document.getElementById('marketTableBody');
    
    if (coins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-state">No data available</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    
    coins.forEach((coin, index) => {
        const row = document.createElement('tr');
        row.onclick = () => onCoinClick(coin);
        
        const changeClass = coin.price_change_percentage_24h >= 0 ? 'price-positive' : 'price-negative';
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <div class="coin-cell">
                    <img src="${coin.image}" alt="${coin.name}" class="coin-img">
                    <div>
                        <div class="coin-name-cell">${coin.name}</div>
                        <span class="coin-symbol-cell">${coin.symbol.toUpperCase()}</span>
                    </div>
                </div>
            </td>
            <td class="text-right">${formatCurrency(coin.current_price)}</td>
            <td class="text-right ${changeClass}">
                ${coin.price_change_percentage_24h >= 0 ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%
            </td>
            <td class="text-right hide-mobile">$${formatNumber(coin.market_cap)}</td>
            <td class="text-right hide-mobile">$${formatNumber(coin.total_volume)}</td>
        `;
        
        tbody.appendChild(row);
    });
}

/**
 * Render coin details page
 * @param {Object} coin - Coin data
 * @param {Object} portfolio - Portfolio instance
 */
export function renderCoinDetails(coin, portfolio) {
    // Basic info
    document.getElementById('coinImage').src = coin.image;
    document.getElementById('coinImage').alt = coin.name;
    document.getElementById('coinName').textContent = coin.name;
    document.getElementById('coinSymbol').textContent = coin.symbol.toUpperCase();
    document.getElementById('coinPrice').textContent = formatCurrency(coin.current_price);
    
    const changeEl = document.getElementById('coinChange');
    const changeClass = coin.price_change_percentage_24h >= 0 ? 'price-positive' : 'price-negative';
    changeEl.className = `coin-change ${changeClass}`;
    changeEl.textContent = `${coin.price_change_percentage_24h >= 0 ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%`;
    
    // Stats
    document.getElementById('statMarketCap').textContent = '$' + formatNumber(coin.market_cap);
    document.getElementById('statVolume').textContent = '$' + formatNumber(coin.total_volume);
    document.getElementById('statHigh').textContent = formatCurrency(coin.high_24h);
    document.getElementById('statLow').textContent = formatCurrency(coin.low_24h);
    
    // Holdings info
    const holding = portfolio.getHolding(coin.id);
    const holdingInfo = document.getElementById('coinHoldingInfo');
    
    if (holding) {
        holdingInfo.style.display = 'block';
        const pnlData = portfolio.calculateHoldingPnL(coin.id, coin.current_price);
        
        document.getElementById('holdingAmount').textContent = 
            `${holding.amount.toFixed(6)} ${coin.symbol.toUpperCase()}`;
        document.getElementById('holdingAvgPrice').textContent = formatCurrency(holding.avgPrice);
        document.getElementById('holdingValue').textContent = formatCurrency(pnlData.currentValue);
        
        const pnlEl = document.getElementById('holdingPnL');
        pnlEl.textContent = `${pnlData.isProfit ? '+' : ''}${formatCurrency(pnlData.pnl)} (${pnlData.pnlPercent.toFixed(2)}%)`;
        pnlEl.className = `value ${pnlData.isProfit ? 'price-positive' : 'price-negative'}`;
        
        // Enable sell button
        document.getElementById('sellBtn').disabled = false;
    } else {
        holdingInfo.style.display = 'none';
        document.getElementById('sellBtn').disabled = true;
    }
}

/**
 * Render price chart
 * @param {Array} chartData - Chart data points
 */
export function renderChart(chartData) {
    const canvas = document.getElementById('priceChart');
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if any
    if (window.priceChartInstance) {
        window.priceChartInstance.destroy();
    }
    
    window.priceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => d.time),
            datasets: [{
                label: 'Price',
                data: chartData.map(d => d.price),
                borderColor: '#3A7AFE',
                backgroundColor: 'rgba(58, 122, 254, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: '#3A7AFE',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#1F2937',
                    titleColor: '#E5E7EB',
                    bodyColor: '#9CA3AF',
                    borderColor: '#374151',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return '$' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#374151',
                        display: false
                    },
                    ticks: {
                        color: '#9CA3AF'
                    }
                },
                y: {
                    grid: {
                        color: '#374151'
                    },
                    ticks: {
                        color: '#9CA3AF',
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

/**
 * Render news articles
 * @param {Array} articles - News articles
 */
export function renderNews(articles) {
    const container = document.getElementById('newsList');
    
    if (articles.length === 0) {
        container.innerHTML = '<p class="empty-state">No news available</p>';
        return;
    }
    
    container.innerHTML = '';
    
    articles.forEach(article => {
        const item = document.createElement('div');
        item.className = 'news-item';
        item.onclick = () => window.open(article.url, '_blank');
        
        item.innerHTML = `
            <h3 class="news-title">${article.title}</h3>
            <p class="news-description">${article.description || 'No description available'}</p>
            <div class="news-meta">
                <span class="news-source">${article.source.name}</span>
                <span class="news-date">${formatDate(article.publishedAt)}</span>
            </div>
        `;
        
        container.appendChild(item);
    });
}

/**
 * Update trade modal
 * @param {string} type - 'buy' or 'sell'
 * @param {Object} coin - Coin data
 * @param {Object} portfolio - Portfolio instance
 */
export function updateTradeModal(type, coin, portfolio) {
    document.getElementById('modalTitle').textContent = 
        `${type === 'buy' ? 'Buy' : 'Sell'} ${coin.symbol.toUpperCase()}`;
    
    document.getElementById('tradePrice').textContent = formatCurrency(coin.current_price);
    document.getElementById('tradeBalance').textContent = formatCurrency(portfolio.getBalance());
    
    const maxAmount = type === 'buy' ? 
        portfolio.getMaxBuyAmount(coin.current_price) : 
        portfolio.getMaxSellAmount(coin.id);
    
    document.getElementById('maxAmount').textContent = 
        `Max: ${maxAmount.toFixed(6)} ${coin.symbol.toUpperCase()}`;
}

/**
 * Clear search input
 */
export function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
}
/**
 * Market Module
 * Handles rendering the market table and search functionality
 */

import { formatCurrency, formatNumber } from './api.js';

/**
 * Render market table
 * @param {Array} coins - Coin data
 * @param {Function} onCoinClick - Click handler
 */
export function renderMarketTable(coins, onCoinClick) {
    const tbody = document.getElementById('marketTableBody');

    if (coins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-state">No results found</td></tr>';
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
        <td class="text-right hide-mobile sparkline-cell">
            ${createSparklineSVG(coin.sparkline_in_7d?.price, isPositive)}
        </td>
            <td class="text-right hide-mobile">$${formatNumber(coin.market_cap)}</td>
            <td class="text-right hide-mobile">$${formatNumber(coin.total_volume)}</td>
        `;

        tbody.appendChild(row);
    });
}

/**
 * Renders the market summary cards.
 * @param {Array} coins - The full list of coins.
 */
export function renderMarketSummary(coins) {
    if (!coins || coins.length === 0) return;

    const totalMarketCap = coins.reduce((sum, coin) => sum + (coin.market_cap || 0), 0);
    const totalVolume = coins.reduce((sum, coin) => sum + (coin.total_volume || 0), 0);

    const btc = coins.find(c => c.symbol.toLowerCase() === 'btc');
    const btcDominance = btc ? (btc.market_cap / totalMarketCap) * 100 : 0;

    const totalMarketCapEl = document.getElementById('totalMarketCap');
    const totalVolumeEl = document.getElementById('totalVolume24h');
    const btcDominanceEl = document.getElementById('btcDominance');

    if (totalMarketCapEl) {
        totalMarketCapEl.textContent = '$' + formatNumber(totalMarketCap);
        totalVolumeEl.textContent = '$' + formatNumber(totalVolume);
        btcDominanceEl.textContent = btcDominance.toFixed(2) + '%';
    }
}
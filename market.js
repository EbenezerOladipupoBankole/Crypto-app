/**
 * Market Module
 * Handles rendering the market table, summary, and search functionality
 */

import { formatCurrency, formatNumber } from './api.js';

/**
 * Creates an SVG sparkline chart from price data.
 * @param {number[]} prices - Array of price points.
 * @param {boolean} isPositive - Whether the 24h change is positive.
 * @returns {string} An SVG string.
 */
function createSparklineSVG(prices, isPositive) {
    if (!prices || prices.length < 2) {
        return '';
    }

    const width = 120;
    const height = 40;
    const strokeColor = isPositive ? 'var(--color-success)' : 'var(--color-danger)';

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    // Normalize data points to fit within the SVG viewbox
    const points = prices.map((price, index) => {
        const x = (index / (prices.length - 1)) * width;
        const y = height - ((price - minPrice) / priceRange) * height;
        return `${x},${y}`;
    }).join(' ');

    return `
        <svg class="sparkline-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
            <polyline
                fill="none"
                stroke="${strokeColor}"
                stroke-width="1.5"
                points="${points}"
            />
        </svg>`;
}

/**
 * Render market table
 * @param {Array} coins - Coin data for the current page
 * @param {Function} onCoinClick - Click handler for rows
 * @param {Function} onWatchlistToggle - Click handler for the star icon
 * @param {Set<string>} watchlist - A Set of watched coin IDs
 * @param {string} sortKey - The current sort key
 * @param {string} sortOrder - The current sort order ('asc' or 'desc')
 * @param {number} startIndex - The starting index for the rank number
 */
export function renderMarketTable(coins, onCoinClick, onWatchlistToggle, watchlist, sortKey, sortOrder, startIndex = 0) {
    const tbody = document.getElementById('marketTableBody');
    const thead = document.querySelector('.market-table thead');

    if (coins.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-state">No results found</td></tr>';
        return;
    }

    // Update sort indicators in the header
    thead.querySelectorAll('th[data-sort]').forEach(th => {
        th.classList.remove('sorted');
        const indicator = th.querySelector('.sort-indicator');
        if (indicator) {
            indicator.textContent = '';
        }

        if (th.dataset.sort === sortKey) {
            th.classList.add('sorted');
            if (indicator) {
                indicator.textContent = sortOrder === 'asc' ? '▲' : '▼';
            }
        }
    });

    tbody.innerHTML = '';

    coins.forEach((coin, index) => {
        const row = document.createElement('tr');
        const isWatched = watchlist.has(coin.id);

        const changeClass = coin.price_change_percentage_24h >= 0 ? 'price-positive' : 'price-negative';
        const isPositive = coin.price_change_percentage_24h >= 0;
        const sign = isPositive ? '+' : '';

        row.innerHTML = `
            <td>
                <svg class="watchlist-star ${isWatched ? 'watched' : ''}" data-coin-id="${coin.id}" width="20" height="20" viewBox="0 0 24 24" fill="${isWatched ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                </svg>
            </td>
            <td>${startIndex + index + 1}</td>
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
                ${sign}${coin.price_change_percentage_24h.toFixed(2)}%
            </td>
            <td class="text-right hide-mobile sparkline-cell">
                ${createSparklineSVG(coin.sparkline_in_7d?.price, isPositive)}
            </td>
            <td class="text-right hide-mobile">$${formatNumber(coin.market_cap)}</td>
            <td class="text-right hide-mobile">$${formatNumber(coin.total_volume)}</td>
        `;

        tbody.appendChild(row);
    });

    // Add event listeners to stars after they are in the DOM
    tbody.querySelectorAll('.watchlist-star').forEach(star => {
        star.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent row click from firing
            onWatchlistToggle(e.currentTarget.dataset.coinId);
        });
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
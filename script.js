// State
let cryptoData = [];
let portfolio = { balance: 10000, holdings: {} };
let transactions = [];
let alerts = [];
let currentCoin = null;
let tradeType = 'buy';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    fetchCryptoData();
    fetchNews();
    updateUI();
    
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', (e) => {
        filterCrypto(e.target.value);
    });

    // Refresh data every minute
    setInterval(fetchCryptoData, 60000);
});

// Storage functions
function loadFromStorage() {
    const savedPortfolio = localStorage.getItem('cryptoPortfolio');
    const savedTransactions = localStorage.getItem('cryptoTransactions');
    const savedAlerts = localStorage.getItem('cryptoAlerts');
    
    if (savedPortfolio) portfolio = JSON.parse(savedPortfolio);
    if (savedTransactions) transactions = JSON.parse(savedTransactions);
    if (savedAlerts) alerts = JSON.parse(savedAlerts);
}

function saveToStorage() {
    localStorage.setItem('cryptoPortfolio', JSON.stringify(portfolio));
    localStorage.setItem('cryptoTransactions', JSON.stringify(transactions));
    localStorage.setItem('cryptoAlerts', JSON.stringify(alerts));
}

// Fetch crypto data
async function fetchCryptoData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=true&price_change_percentage=24h');
        cryptoData = await response.json();
        displayCrypto(cryptoData);
        updatePortfolioValues();
        checkAlerts();
    } catch (error) {
        console.error('Error fetching crypto data:', error);
        showNotification('Failed to fetch crypto data', 'error');
    }
}

// Display crypto cards
function displayCrypto(data) {
    const grid = document.getElementById('cryptoGrid');
    grid.innerHTML = data.map(coin => `
        <div class="crypto-card" onclick="openTradeModal('${coin.id}')">
            <div class="crypto-header">
                <img src="${coin.image}" alt="${coin.name}" class="crypto-icon">
                <div class="crypto-name">
                    <div>${coin.name}</div>
                    <div class="crypto-symbol">${coin.symbol}</div>
                </div>
            </div>
            <div class="crypto-price">$${coin.current_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}</div>
            <div class="crypto-change ${coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative'}">
                ${coin.price_change_percentage_24h >= 0 ? '▲' : '▼'} ${Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
            </div>
            <div class="chart-container">
                <svg class="mini-chart" viewBox="0 0 100 30">
                    <polyline
                        fill="none"
                        stroke="${coin.price_change_percentage_24h >= 0 ? '#16C784' : '#EA3943'}"
                        stroke-width="2"
                        points="${generateSparkline(coin.sparkline_in_7d.price)}"
                    />
                </svg>
            </div>
        </div>
    `).join('');
}

function generateSparkline(prices) {
    if (!prices || prices.length === 0) return '';
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    
    return prices.map((price, i) => {
        const x = (i / (prices.length - 1)) * 100;
        const y = 25 - ((price - min) / range) * 20;
        return `${x},${y}`;
    }).join(' ');
}

// Filter crypto
function filterCrypto(query) {
    const filtered = cryptoData.filter(coin => 
        coin.name.toLowerCase().includes(query.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(query.toLowerCase())
    );
    displayCrypto(filtered);
}

// Open trade modal
function openTradeModal(coinId) {
    currentCoin = cryptoData.find(c => c.id === coinId);
    if (!currentCoin) return;

    const modal = document.getElementById('tradeModal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <div class="crypto-header">
            <img src="${currentCoin.image}" alt="${currentCoin.name}" class="crypto-icon">
            <div class="crypto-name">
                <div>${currentCoin.name}</div>
                <div class="crypto-symbol">${currentCoin.symbol.toUpperCase()}</div>
            </div>
        </div>
        <div class="crypto-price" style="margin: 20px 0;">$${currentCoin.current_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})}</div>
        
        <div class="trade-tabs">
            <button class="trade-tab buy active" onclick="setTradeType('buy')">Buy</button>
            <button class="trade-tab sell" onclick="setTradeType('sell')">Sell</button>
        </div>

        <div class="input-group">
            <label>Amount (${currentCoin.symbol.toUpperCase()})</label>
            <input type="number" id="tradeAmount" placeholder="0.00" step="0.00000001" min="0">
        </div>

        <div class="input-group">
            <label>Total Cost</label>
            <input type="number" id="tradeCost" placeholder="0.00" readonly style="background: rgba(58, 122, 254, 0.1);">
        </div>

        <div style="margin: 15px 0; padding: 15px; background: rgba(58, 122, 254, 0.1); border-radius: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Available Balance:</span>
                <span style="color: #16C784;">$${portfolio.balance.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;" id="holdingInfo">
                <span>Current Holdings:</span>
                <span style="color: #3A7AFE;">${(portfolio.holdings[currentCoin.id]?.amount || 0).toFixed(8)} ${currentCoin.symbol.toUpperCase()}</span>
            </div>
        </div>

        <button class="action-btn buy" id="tradeButton" onclick="executeTrade()">
            Buy ${currentCoin.symbol.toUpperCase()}
        </button>

        <button class="action-btn" style="background: #3A7AFE; margin-top: 10px;" onclick="openAlertDialog()">
            Set Price Alert
        </button>
    `;

    // Add event listener for amount input
    document.getElementById('tradeAmount').addEventListener('input', (e) => {
        const amount = parseFloat(e.target.value) || 0;
        const cost = amount * currentCoin.current_price;
        document.getElementById('tradeCost').value = cost.toFixed(2);
    });

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('tradeModal').classList.remove('active');
}

function setTradeType(type) {
    tradeType = type;
    const buyTab = document.querySelector('.trade-tab.buy');
    const sellTab = document.querySelector('.trade-tab.sell');
    const tradeButton = document.getElementById('tradeButton');

    if (type === 'buy') {
        buyTab.classList.add('active');
        sellTab.classList.remove('active');
        tradeButton.className = 'action-btn buy';
        tradeButton.textContent = `Buy ${currentCoin.symbol.toUpperCase()}`;
    } else {
        sellTab.classList.add('active');
        buyTab.classList.remove('active');
        tradeButton.className = 'action-btn sell';
        tradeButton.textContent = `Sell ${currentCoin.symbol.toUpperCase()}`;
    }
}

function executeTrade() {
    const amount = parseFloat(document.getElementById('tradeAmount').value);
    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
    }

    const totalCost = amount * currentCoin.current_price;

    if (tradeType === 'buy') {
        if (totalCost > portfolio.balance) {
            showNotification('Insufficient balance!', 'error');
            return;
        }

        portfolio.balance -= totalCost;
        
        if (!portfolio.holdings[currentCoin.id]) {
            portfolio.holdings[currentCoin.id] = {
                amount: 0,
                totalCost: 0,
                coin: currentCoin.name,
                symbol: currentCoin.symbol
            };
        }

        portfolio.holdings[currentCoin.id].amount += amount;
        portfolio.holdings[currentCoin.id].totalCost += totalCost;

        transactions.unshift({
            date: new Date().toISOString(),
            type: 'BUY',
            coin: currentCoin.name,
            symbol: currentCoin.symbol,
            amount: amount,
            price: currentCoin.current_price,
            total: totalCost
        });

        showNotification(`Successfully bought ${amount} ${currentCoin.symbol.toUpperCase()}!`, 'success');
    } else {
        const holding = portfolio.holdings[currentCoin.id];
        if (!holding || holding.amount < amount) {
            showNotification('Insufficient holdings!', 'error');
            return;
        }

        portfolio.balance += totalCost;
        holding.amount -= amount;
        holding.totalCost -= (holding.totalCost / (holding.amount + amount)) * amount;

        if (holding.amount === 0) {
            delete portfolio.holdings[currentCoin.id];
        }

        transactions.unshift({
            date: new Date().toISOString(),
            type: 'SELL',
            coin: currentCoin.name,
            symbol: currentCoin.symbol,
            amount: amount,
            price: currentCoin.current_price,
            total: totalCost
        });

        showNotification(`Successfully sold ${amount} ${currentCoin.symbol.toUpperCase()}!`, 'success');
    }

    saveToStorage();
    updateUI();
    updateLeaderboard();
    closeModal();
}

function openAlertDialog() {
    const targetPrice = prompt(`Set price alert for ${currentCoin.name}\nCurrent price: $${currentCoin.current_price}\n\nEnter target price:`);
    
    if (targetPrice && !isNaN(targetPrice) && parseFloat(targetPrice) > 0) {
        alerts.push({
            coinId: currentCoin.id,
            coin: currentCoin.name,
            symbol: currentCoin.symbol,
            targetPrice: parseFloat(targetPrice),
            currentPrice: currentCoin.current_price,
            created: new Date().toISOString()
        });
        
        saveToStorage();
        displayAlerts();
        showNotification('Price alert created!', 'success');
    }
}

function checkAlerts() {
    alerts.forEach((alert, index) => {
        const coin = cryptoData.find(c => c.id === alert.coinId);
        if (!coin) return;

        if ((alert.targetPrice >= alert.currentPrice && coin.current_price >= alert.targetPrice) ||
            (alert.targetPrice <= alert.currentPrice && coin.current_price <= alert.targetPrice)) {
            showNotification(`🔔 ${alert.coin} reached $${alert.targetPrice}!`, 'success');
            alerts.splice(index, 1);
            saveToStorage();
            displayAlerts();
        }
    });
}

function displayAlerts() {
    const alertsList = document.getElementById('alertsList');
    if (alerts.length === 0) {
        alertsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #9CA3AF;">No active alerts</div>';
        return;
    }

    alertsList.innerHTML = alerts.map((alert, index) => `
        <div class="leaderboard-item">
            <div style="flex: 1;">
                <div style="font-weight: bold; margin-bottom: 5px;">${alert.coin} (${alert.symbol.toUpperCase()})</div>
                <div style="color: #9CA3AF;">Target: $${alert.targetPrice.toFixed(2)} | Current: $${cryptoData.find(c => c.id === alert.coinId)?.current_price.toFixed(2) || 'N/A'}</div>
            </div>
            <button class="close-btn" onclick="removeAlert(${index})">×</button>
        </div>
    `).join('');
}

function removeAlert(index) {
    alerts.splice(index, 1);
    saveToStorage();
    displayAlerts();
    showNotification('Alert removed', 'success');
}

async function fetchNews() {
    const newsGrid = document.getElementById('newsGrid');
    // Sample crypto news since NewsAPI requires API key
    const sampleNews = [
        {
            title: "Bitcoin Reaches New All-Time High",
            source: "Crypto Daily",
            description: "Bitcoin surged past its previous record, driven by institutional adoption and positive market sentiment."
        },
        {
            title: "Ethereum 2.0 Upgrade Shows Promising Results",
            source: "Blockchain News",
            description: "The latest Ethereum network upgrade has significantly reduced gas fees and improved transaction speeds."
        },
        {
            title: "DeFi Tokens See Massive Growth",
            source: "DeFi Digest",
            description: "Decentralized finance platforms continue to attract billions in total value locked as users seek alternative financial services."
        },
        {
            title: "Major Bank Announces Crypto Custody Service",
            source: "Finance Today",
            description: "Traditional financial institution enters cryptocurrency market with new custody solutions for institutional clients."
        },
        {
            title: "NFT Market Hits Record Trading Volume",
            source: "NFT News",
            description: "Non-fungible token sales reach unprecedented levels as digital art and collectibles gain mainstream attention."
        }
    ];

    newsGrid.innerHTML = sampleNews.map(article => `
        <div class="news-card">
            <div class="news-title">${article.title}</div>
            <div class="news-source">${article.source}</div>
            <div class="news-description">${article.description}</div>
        </div>
    `).join('');
}

function updatePortfolioValues() {
    let totalValue = portfolio.balance;
    let totalPL = 0;

    Object.keys(portfolio.holdings).forEach(coinId => {
        const holding = portfolio.holdings[coinId];
        const coin = cryptoData.find(c => c.id === coinId);
        if (coin) {
            const currentValue = holding.amount * coin.current_price;
            totalValue += currentValue;
            totalPL += currentValue - holding.totalCost;
        }
    });

    document.getElementById('headerBalance').textContent = totalValue.toFixed(2);
    document.getElementById('totalBalance').textContent = totalValue.toFixed(2);
    document.getElementById('availableCash').textContent = portfolio.balance.toFixed(2);
    
    const plElement = document.getElementById('totalPL');
    plElement.textContent = `$${totalPL.toFixed(2)}`;
    plElement.style.color = totalPL >= 0 ? '#16C784' : '#EA3943';
}

function displayPortfolio() {
    const tbody = document.getElementById('portfolioTable');
    const holdings = Object.keys(portfolio.holdings);

    if (holdings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">No holdings yet. Start trading!</td></tr>';
        return;
    }

    tbody.innerHTML = holdings.map(coinId => {
        const holding = portfolio.holdings[coinId];
        const coin = cryptoData.find(c => c.id === coinId);
        if (!coin) return '';

        const currentValue = holding.amount * coin.current_price;
        const avgPrice = holding.totalCost / holding.amount;
        const pl = currentValue - holding.totalCost;
        const plPercent = (pl / holding.totalCost) * 100;

        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${coin.image}" style="width: 30px; height: 30px; border-radius: 50%;">
                        <div>
                            <div>${coin.name}</div>
                            <div style="color: #9CA3AF; font-size: 12px;">${coin.symbol.toUpperCase()}</div>
                        </div>
                    </div>
                </td>
                <td>${holding.amount.toFixed(8)}</td>
                <td>$${avgPrice.toFixed(2)}</td>
                <td>$${coin.current_price.toFixed(2)}</td>
                <td>$${currentValue.toFixed(2)}</td>
                <td style="color: ${pl >= 0 ? '#16C784' : '#EA3943'}; font-weight: bold;">
                    ${pl >= 0 ? '▲' : '▼'} $${Math.abs(pl).toFixed(2)} (${plPercent.toFixed(2)}%)
                </td>
            </tr>
        `;
    }).join('');
}

function displayTransactions() {
    const tbody = document.getElementById('transactionsTable');
    
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">No transactions yet</td></tr>';
        return;
    }

    tbody.innerHTML = transactions.map(tx => `
        <tr>
            <td>${new Date(tx.date).toLocaleString()}</td>
            <td>
                <span style="color: ${tx.type === 'BUY' ? '#16C784' : '#EA3943'}; font-weight: bold;">
                    ${tx.type}
                </span>
            </td>
            <td>${tx.coin} (${tx.symbol.toUpperCase()})</td>
            <td>${tx.amount.toFixed(8)}</td>
            <td>$${tx.price.toFixed(2)}</td>
            <td>$${tx.total.toFixed(2)}</td>
        </tr>
    `).join('');
}

function updateLeaderboard() {
    let leaderboard = JSON.parse(localStorage.getItem('cryptoLeaderboard') || '[]');
    
    const totalValue = portfolio.balance + Object.keys(portfolio.holdings).reduce((sum, coinId) => {
        const holding = portfolio.holdings[coinId];
        const coin = cryptoData.find(c => c.id === coinId);
        return sum + (coin ? holding.amount * coin.current_price : 0);
    }, 0);

    const userIndex = leaderboard.findIndex(u => u.name === 'You');
    if (userIndex >= 0) {
        leaderboard[userIndex].balance = totalValue;
    } else {
        leaderboard.push({ name: 'You', balance: totalValue });
    }

    leaderboard.sort((a, b) => b.balance - a.balance);
    leaderboard = leaderboard.slice(0, 10);

    localStorage.setItem('cryptoLeaderboard', JSON.stringify(leaderboard));
    displayLeaderboard(leaderboard);
}

function displayLeaderboard(leaderboard) {
    const list = document.getElementById('leaderboardList');
    
    if (leaderboard.length === 0) {
        list.innerHTML = '<div style="text-align: center; padding: 40px; color: #9CA3AF;">No traders yet</div>';
        return;
    }

    list.innerHTML = leaderboard.map((trader, index) => {
        let rankClass = '';
        if (index === 0) rankClass = 'first';
        else if (index === 1) rankClass = 'second';
        else if (index === 2) rankClass = 'third';

        return `
            <div class="leaderboard-item">
                <div class="rank ${rankClass}">#${index + 1}</div>
                <div style="flex: 1;">
                    <div style="font-weight: bold; margin-bottom: 5px;">${trader.name}</div>
                    <div style="color: #3A7AFE; font-size: 14px;">Portfolio Value: $${trader.balance.toFixed(2)}</div>
                </div>
                <div style="font-size: 24px;">${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅'}</div>
            </div>
        `;
    }).join('');
}

function changePage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(page).classList.add('active');
    event.target.classList.add('active');

    if (page === 'portfolio') displayPortfolio();
    if (page === 'transactions') displayTransactions();
    if (page === 'alerts') displayAlerts();
    if (page === 'leaderboard') updateLeaderboard();
}

function updateUI() {
    updatePortfolioValues();
    displayPortfolio();
    displayTransactions();
    displayAlerts();
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #EA3943, #ff4757)';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.5s ease reverse';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Close modal on outside click
document.getElementById('tradeModal').addEventListener('click', (e) => {
    if (e.target.id === 'tradeModal') {
        closeModal();
    }
});
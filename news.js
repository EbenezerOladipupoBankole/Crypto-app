/**
 * News Module
 * Handles rendering news articles
 */

import { formatDate } from './api.js';

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
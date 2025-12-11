// ...existing code...
const bookSearch = {
    // Use provided API_BASE_URL or default to '/api'
    API_BASE: (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : '/api',

    // Helper: fetch and safely parse JSON/text and throw on non-ok
    async fetchSafe(url, options = {}) {
        const res = await fetch(url, options);
        const ct = res.headers.get('content-type') || '';
        let data = null;
        if (ct.includes('application/json')) {
            try {
                data = await res.json();
            } catch (err) {
                data = null;
            }
        } else {
            data = await res.text();
        }

        if (!res.ok) {
            const msg = data && typeof data === 'object' && data.error ? data.error : (typeof data === 'string' ? data : 'Request failed');
            throw new Error(msg || 'Request failed');
        }

        return data;
    },

    async searchBooks(searchParams) {
        const queryString = new URLSearchParams();

        // Add search parameters
        Object.keys(searchParams).forEach(key => {
            if (searchParams[key]) {
                queryString.append(key, searchParams[key]);
            }
        });

        try {
            const url = `${this.API_BASE}/books/search?${queryString}`;
            const data = await this.fetchSafe(url);
            return data;
        } catch (error) {
            throw new Error(error.message || 'Search failed');
        }
    },

    async loadLibraries() {
        try {
            const url = `${this.API_BASE}/books/libraries`;
            const libraries = await this.fetchSafe(url);

            if (Array.isArray(libraries)) {
                const librarySelect = document.getElementById('library');
                if (!librarySelect) return;
                // clear existing options except first (assuming there's a default)
                const defaultOption = librarySelect.querySelector('option') ? librarySelect.querySelector('option').outerHTML : '';
                librarySelect.innerHTML = defaultOption;
                libraries.forEach(library => {
                    const option = document.createElement('option');
                    option.value = library.name;
                    option.textContent = library.name;
                    librarySelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load libraries:', error);
        }
    },

    displayResults(books) {
        const resultsList = document.getElementById('resultsList');
        const resultCount = document.getElementById('resultCount');
        if (!resultsList || !resultCount) return;

        resultCount.textContent = Array.isArray(books) ? books.length.toString() : '0';

        if (!Array.isArray(books) || books.length === 0) {
            resultsList.innerHTML = '<p class="no-results">No books found matching your criteria</p>';
            return;
        }

        // Build DOM nodes instead of using innerHTML to avoid XSS
        resultsList.innerHTML = '';
        books.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.dataset.bookId = book._id;

            const header = document.createElement('div');
            header.className = 'book-header';

            const title = document.createElement('h4');
            title.textContent = book.title || 'Untitled';

            const favoriteBtn = document.createElement('button');
            favoriteBtn.className = 'favorite-btn';
            favoriteBtn.type = 'button';
            favoriteBtn.setAttribute('aria-label', 'Toggle favorite');
            favoriteBtn.textContent = '♥';
            if (this.isBookInFavorites(book._id)) favoriteBtn.classList.add('favorited');

            const token = localStorage.getItem('token');
            if (!token) {
                favoriteBtn.disabled = true;
                favoriteBtn.title = 'Please login to add favorites';
            } else {
                favoriteBtn.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    this.toggleFavorite(book._id).catch(err => {
                        console.error('Favorite toggle error:', err);
                        alert('Failed to update favorites: ' + (err.message || err));
                    });
                });
            }

            header.appendChild(title);
            header.appendChild(favoriteBtn);

            const details = document.createElement('div');
            details.className = 'book-details';

            const fields = [
                ['Author', book.author],
                ['Publication Year', book.publication_year],
                ['Genre', book.genre || 'Uncategorized'],
                ['Publisher', book.publisher || 'Unknown'],
                ['Library', book.library_name],
                ['Address', book.library_address],
                ['Phone', book.library_phone],
                ['Available Copies', book.copies_available]
            ];

            fields.forEach(([label, value]) => {
                const p = document.createElement('p');
                const strong = document.createElement('strong');
                strong.textContent = `${label}: `;
                const span = document.createElement('span');
                span.textContent = (value !== undefined && value !== null) ? value : 'Unknown';
                p.appendChild(strong);
                p.appendChild(span);
                details.appendChild(p);
            });

            // Actions (review link)
            const actions = document.createElement('div');
            actions.className = 'book-actions';
            const reviewLink = document.createElement('a');
            reviewLink.className = 'btn-review';
            reviewLink.href = `review.html?bookId=${encodeURIComponent(book._id)}`;
            reviewLink.textContent = 'Write / View Reviews';
            const token2 = localStorage.getItem('token');
            if (!token2) {
                reviewLink.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    // Use the reusable modal if available, otherwise fallback to alert
                    const href = reviewLink.href;
                    if (typeof window.showLoginModal === 'function') {
                        window.showLoginModal(href);
                    } else {
                        const proceed = confirm('Please login to write a review.\n\nPress OK to go to login page, Cancel to view reviews only.');
                        if (proceed) {
                            window.location.href = '/login.html?next=' + encodeURIComponent(href);
                        } else {
                            window.location.href = href;
                        }
                    }
                });
            }
            actions.appendChild(reviewLink);

            card.appendChild(header);
            card.appendChild(details);
            card.appendChild(actions);

            resultsList.appendChild(card);
        });
    },

    isBookInFavorites(bookId) {
        try {
            const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
            return favorites.includes(bookId);
        } catch (err) {
            return false;
        }
    },

    async toggleFavorite(bookId) {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please login to add books to favorites');
            return;
        }

        if (this.isBookInFavorites(bookId)) {
            await this.removeFromFavorites(bookId);
        } else {
            await this.addToFavorites(bookId);
        }
    },

    async addToFavorites(bookId) {
        const token = localStorage.getItem('token');
        const url = `${this.API_BASE}/books/favorites`;
        const opts = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ bookId })
        };

        const data = await this.fetchSafe(url, opts);

        // Update local storage
        try {
            const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
            if (!favorites.includes(bookId)) {
                favorites.push(bookId);
                localStorage.setItem('favorites', JSON.stringify(favorites));
            }
            this.updateFavoriteButton(bookId, true);
        } catch (err) {
            console.warn('Failed to update local favorites:', err);
        }

        return data;
    },

    async removeFromFavorites(bookId) {
        const token = localStorage.getItem('token');
        const url = `${this.API_BASE}/books/favorites/${encodeURIComponent(bookId)}`;
        const opts = {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const data = await this.fetchSafe(url, opts);

        // Update local storage
        try {
            const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
            const updatedFavorites = favorites.filter(id => id !== bookId);
            localStorage.setItem('favorites', JSON.stringify(updatedFavorites));
            this.updateFavoriteButton(bookId, false);
        } catch (err) {
            console.warn('Failed to update local favorites:', err);
        }

        return data;
    },

    updateFavoriteButton(bookId, isFavorited) {
        const bookCard = document.querySelector(`[data-book-id="${bookId}"]`);
        if (!bookCard) return;
        const favoriteBtn = bookCard.querySelector('.favorite-btn');
        if (!favoriteBtn) return;
        if (isFavorited) {
            favoriteBtn.classList.add('favorited');
            favoriteBtn.title = 'Remove from favorites';
        } else {
            favoriteBtn.classList.remove('favorited');
            favoriteBtn.title = 'Add to favorites';
        }
    },

    showLoading(show) {
        const loadingDiv = document.getElementById('loading');
        if (!loadingDiv) return;
        loadingDiv.style.display = show ? 'block' : 'none';
    }
};

// Search form submission
document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const searchParams = {
                title: document.getElementById('title').value,
                author: document.getElementById('author').value,
                publicationYear: document.getElementById('publicationYear').value,
                genre: document.getElementById('genre').value,
                library: document.getElementById('library').value
            };

            bookSearch.showLoading(true);

            try {
                const results = await bookSearch.searchBooks(searchParams);
                bookSearch.displayResults(results);
            } catch (error) {
                alert('Search failed: ' + (error.message || error));
            } finally {
                bookSearch.showLoading(false);
            }
        });
    }

    // Initialize libraries dropdown if present
    bookSearch.loadLibraries().catch(err => console.warn('Could not load libraries', err));
});

// Clear search filters
function clearSearch() {
    const form = document.getElementById('searchForm');
    if (form) form.reset();
    const resultsList = document.getElementById('resultsList');
    const resultCount = document.getElementById('resultCount');
    if (resultsList) resultsList.innerHTML = '';
    if (resultCount) resultCount.textContent = '0';
}
const reviewPage = {
    async requestWithAuth(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Please login first');
        }

        const base = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '/api';
        const url = `${base}${endpoint}`;

        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...(options.headers || {})
            },
            ...options
        };

        if (config.body && typeof config.body !== 'string') {
            config.body = JSON.stringify(config.body);
        }

        const response = await fetch(url, config);

        // safe parsing: only parse JSON if content-type is json
        const contentType = response.headers.get('content-type') || '';
        let data = null;
        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            const msg = data && data.error ? data.error : (typeof data === 'string' ? data : 'Request failed');
            throw new Error(msg);
        }

        return data;
    },

    async get(url) {
        const base = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '/api';
        const response = await fetch(`${base}${url}`);
        const contentType = response.headers.get('content-type') || '';
        let data = null;
        if (contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        if (!response.ok) {
            throw new Error(data && data.error ? data.error : 'Request failed');
        }
        return data;
    },

    showMessage(message, type = 'info') {
        const messageDiv = document.getElementById('message');
        if (!messageDiv) return;
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        if (message) {
            setTimeout(() => {
                messageDiv.textContent = '';
                messageDiv.className = 'message';
            }, 5000);
        }
    },

    getBookIdFromURL() {
        const params = new URLSearchParams(window.location.search);
        return params.get('bookId');
    },

    async loadBookAndReviews() {
        try {
            const bookId = this.getBookIdFromURL();
            if (!bookId) {
                this.showMessage('Missing bookId in URL', 'error');
                return;
            }

            // Load book details
            const book = await this.get(`/books/${bookId}`);
            this.renderBook(book);

            // Load existing reviews (public)
            const reviews = await this.get(`/books/${bookId}/reviews`);
            this.renderReviews(reviews);
        } catch (err) {
            console.error('Load book/reviews error:', err);
            this.showMessage(err.message || 'Failed to load book or reviews', 'error');
        }
    },

    renderBook(book) {
        const container = document.getElementById('bookDetails');
        if (!container) return;
        
        container.innerHTML = '';
        const h = document.createElement('h2');
        h.textContent = book.title || 'Untitled';
        
        const author = document.createElement('p');
        author.innerHTML = '<strong>Author:</strong> ';
        const authorSpan = document.createElement('span');
        authorSpan.textContent = book.author || 'Unknown';
        author.appendChild(authorSpan);

        const year = document.createElement('p');
        year.innerHTML = '<strong>Publication Year:</strong> ';
        const yearSpan = document.createElement('span');
        yearSpan.textContent = book.publication_year || book.publicationYear || 'Unknown';
        year.appendChild(yearSpan);

        const genre = document.createElement('p');
        genre.innerHTML = '<strong>Genre:</strong> ';
        const genreSpan = document.createElement('span');
        genreSpan.textContent = book.genre || 'Uncategorized';
        genre.appendChild(genreSpan);

        const library = document.createElement('p');
        library.innerHTML = '<strong>Library:</strong> ';
        const libSpan = document.createElement('span');
        libSpan.textContent = book.library_name || book.libraryName || 'Unknown';
        library.appendChild(libSpan);

        container.appendChild(h);
        container.appendChild(author);
        container.appendChild(year);
        container.appendChild(genre);
        container.appendChild(library);

        if (book.description) {
            const desc = document.createElement('p');
            desc.innerHTML = '<strong>Description:</strong> ';
            const descSpan = document.createElement('span');
            descSpan.textContent = book.description;
            desc.appendChild(descSpan);
            container.appendChild(desc);
        }
    },

    renderReviews(reviews) {
        const list = document.getElementById('reviewsList');
        if (!list) return;

        if (!reviews || reviews.length === 0) {
            list.innerHTML = '<p class="no-results">No reviews yet. Be the first!</p>';
            return;
        }

        list.innerHTML = '';
        reviews.forEach(r => {
            const card = document.createElement('div');
            card.className = 'review-card';

            const header = document.createElement('div');
            header.className = 'review-header';

            const userStrong = document.createElement('strong');
            userStrong.textContent = r.user ? (r.user.username || 'Unknown') : 'Unknown user';

            const stars = document.createElement('span');
            const rating = Number(r.rating) || 0;
            stars.textContent = '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));

            header.appendChild(userStrong);
            header.appendChild(document.createTextNode(' '));
            header.appendChild(stars);

            const commentP = document.createElement('p');
            commentP.className = 'review-comment';
            commentP.textContent = r.comment || '';

            const small = document.createElement('small');
            const created = r.createdAt ? new Date(r.createdAt) : null;
            small.textContent = created ? created.toLocaleString() : '';

            card.appendChild(header);
            card.appendChild(commentP);
            card.appendChild(small);

            list.appendChild(card);
        });
    },

    async submitReview(e) {
        e.preventDefault();
        const bookId = this.getBookIdFromURL();
        if (!bookId) {
            this.showMessage('Missing bookId in URL', 'error');
            return;
        }

        const ratingEl = document.getElementById('rating');
        const commentEl = document.getElementById('comment');

        const rating = ratingEl ? Number(ratingEl.value) : null;
        const comment = commentEl ? commentEl.value : '';

        if (!rating || rating < 1 || rating > 5) {
            this.showMessage('Please choose a rating between 1 and 5.', 'error');
            return;
        }

        try {
            const review = await this.requestWithAuth('/reviews', {
                method: 'POST',
                body: { bookId, rating, comment }
            });

            this.showMessage('Review saved!', 'success');

            // Reload reviews list
            const reviews = await this.get(`/books/${bookId}/reviews`);
            this.renderReviews(reviews);

            // Clear form
            if (ratingEl) ratingEl.value = '';
            if (commentEl) commentEl.value = '';
        } catch (err) {
            console.error('Submit review error:', err);
            this.showMessage(err.message || 'Failed to submit review', 'error');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const authWarning = document.getElementById('auth-warning');
    const formSection = document.getElementById('review-form-section');

    // Show/hide review form based on login status
    if (!token) {
        if (authWarning) authWarning.style.display = '';
        if (formSection) formSection.style.display = 'none';
        reviewPage.showMessage('Please login to write a review.', 'info');
    } else {
        if (authWarning) authWarning.style.display = 'none';
        if (formSection) formSection.style.display = '';
    }

    // Load book and reviews
    reviewPage.loadBookAndReviews();

    // Attach submit handler to form
    const form = document.getElementById('reviewForm');
    if (form) {
        form.addEventListener('submit', reviewPage.submitReview.bind(reviewPage));
    }
});
const myReviewsManager = {
    API_BASE: (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : '/api',
    async fetchWithAuth(path, opts = {}) {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Not authenticated');
        const url = `${this.API_BASE}${path}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...(opts.headers || {})
            },
            ...opts
        };
        if (config.body && typeof config.body !== 'string') config.body = JSON.stringify(config.body);
        const res = await fetch(url, config);
        const ct = res.headers.get('content-type') || '';
        const data = ct.includes('application/json') ? await res.json() : await res.text();
        if (!res.ok) throw new Error(data && data.error ? data.error : (typeof data === 'string' ? data : 'Request failed'));
        return data;
    },
    async load() {
        try {
            const list = document.getElementById('myReviewsList');
            const message = document.getElementById('message');
            if (message) message.textContent = '';
            const data = await this.fetchWithAuth('/reviews/my');
            if (!Array.isArray(data) || data.length === 0) {
                list.innerHTML = '<p class="no-results">You have not written any reviews yet.</p>';
                return;
            }
            list.innerHTML = '';
            data.forEach(r => {
                const li = document.createElement('li');
                li.className = 'review-card';
                const header = document.createElement('div');
                header.className = 'review-header';
                const titleLink = document.createElement('a');
                const bookId = r.book && (r.book._id || r.book.id) ? (r.book._id || r.book.id) : '';
                titleLink.href = `review.html?bookId=${encodeURIComponent(bookId)}`;
                titleLink.textContent = r.book && r.book.title ? r.book.title : 'Unknown Book';
                titleLink.className = 'btn-review';
                header.appendChild(titleLink);
                const ratingSpan = document.createElement('span');
                const rating = Number(r.rating) || 0;
                ratingSpan.textContent = '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));
                header.appendChild(ratingSpan);
                const del = document.createElement('button');
                del.type = 'button';
                del.className = 'btn btn-secondary';
                del.textContent = 'Delete';
                del.addEventListener('click', async () => {
                    try {
                        await this.fetchWithAuth(`/reviews/${encodeURIComponent(r._id)}`, { method: 'DELETE' });
                        await this.load();
                    } catch (err) {
                        if (message) message.textContent = err.message || 'Failed to delete';
                    }
                });
                header.appendChild(del);
                const commentP = document.createElement('p');
                commentP.className = 'review-comment';
                commentP.textContent = r.comment || '';
                const small = document.createElement('small');
                small.textContent = r.createdAt ? new Date(r.createdAt).toLocaleString() : '';
                li.appendChild(header);
                li.appendChild(commentP);
                li.appendChild(small);
                list.appendChild(li);
            });
        } catch (err) {
            const message = document.getElementById('message');
            if (message) message.textContent = err.message || 'Failed to load reviews';
        }
    }
};

document.addEventListener('DOMContentLoaded', function() {
    myReviewsManager.load();
});

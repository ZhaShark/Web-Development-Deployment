const favoritesManager = {
    async requestWithAuth(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Please login first');
        }

        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers
            },
            ...options
        };

        if (config.body) {
            config.body = JSON.stringify(config.body);
        }

        console.log('Making request to:', url);
        const response = await fetch(url, config);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Request failed:', response.status, errorText);
            throw new Error(`Request failed: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        return data;
    },

    async loadFavorites() {
        const loadingDiv = document.getElementById('loading');
        const favoritesList = document.getElementById('favoritesList');
        const emptyFavorites = document.getElementById('emptyFavorites');

        loadingDiv.style.display = 'block';
        favoritesList.innerHTML = '';
        emptyFavorites.style.display = 'none';

        try {
            console.log('Starting to load favorites...');
            const favorites = await this.requestWithAuth('/books/favorites');
            
            loadingDiv.style.display = 'none';
            console.log('Favorites loaded successfully:', favorites);

            if (!favorites || favorites.length === 0) {
                emptyFavorites.style.display = 'block';
                return;
            }

            this.displayFavorites(favorites);
        } catch (error) {
            loadingDiv.style.display = 'none';
            console.error('Load favorites error details:', error);
            this.showMessage('Failed to load favorites: ' + error.message, 'error');
        }
    },

    displayFavorites(favorites) {
        const favoritesList = document.getElementById('favoritesList');
        
        const validFavorites = favorites.filter(book => book && book._id);
        
        console.log('Displaying valid favorites:', validFavorites.length);
        
        if (validFavorites.length === 0) {
            document.getElementById('emptyFavorites').style.display = 'block';
            return;
        }

        favoritesList.innerHTML = validFavorites.map(book => `
            <div class="book-card favorite-book" data-book-id="${book._id}">
                <div class="book-header">
                    <h4>${book.title || 'Unknown Title'}</h4>
                    <button class="favorite-btn favorited" onclick="favoritesManager.removeFavorite('${book._id}')" title="Remove from favorites">
                        ♥
                    </button>
                </div>
                <p><strong>Author:</strong> ${book.author || 'Unknown Author'}</p>
                <p><strong>Publication Year:</strong> ${book.publication_year || 'Unknown'}</p>
                <p><strong>Genre:</strong> ${book.genre || 'Uncategorized'}</p>
                <p><strong>Publisher:</strong> ${book.publisher || 'Unknown'}</p>
                <p><strong>Library:</strong> ${book.library_name || 'Unknown Library'}</p>
                ${book.library_address ? `<p><strong>Address:</strong> ${book.library_address}</p>` : ''}
                ${book.library_phone ? `<p><strong>Phone:</strong> ${book.library_phone}</p>` : ''}
                <p><strong>Available Copies:</strong> <span class="copies-available">${book.copies_available !== undefined ? book.copies_available : 'Unknown'}</span></p>
            </div>
        `).join('');
    },

    async removeFavorite(bookId) {
        if (!confirm('Are you sure you want to remove this book from favorites?')) {
            return;
        }

        try {
            await this.requestWithAuth(`/books/favorites/${bookId}`, {
                method: 'DELETE'
            });

            // Update local storage
            const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
            const updatedFavorites = favorites.filter(id => id !== bookId);
            localStorage.setItem('favorites', JSON.stringify(updatedFavorites));

            this.showMessage('Book removed from favorites', 'success');
            this.loadFavorites(); // Reload the list
        } catch (error) {
            this.showMessage('Failed to remove from favorites: ' + error.message, 'error');
        }
    },

    showMessage(message, type) {
        const messageDiv = document.getElementById('message');
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        
        setTimeout(() => {
            messageDiv.textContent = '';
            messageDiv.className = 'message';
        }, 5000);
    }
};
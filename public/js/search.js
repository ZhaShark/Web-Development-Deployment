const bookSearch = {
    async searchBooks(searchParams) {
        const queryString = new URLSearchParams();
        
        // Add search parameters
        Object.keys(searchParams).forEach(key => {
            if (searchParams[key]) {
                queryString.append(key, searchParams[key]);
            }
        });

        try {
            const response = await fetch(`${API_BASE_URL}/books/search?${queryString}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Search failed');
            }

            return data;
        } catch (error) {
            throw new Error(error.message);
        }
    },

    async loadLibraries() {
        try {
            const response = await fetch(`${API_BASE_URL}/books/libraries`);
            const libraries = await response.json();

            if (response.ok) {
                const librarySelect = document.getElementById('library');
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
        
        resultCount.textContent = books.length;

        if (books.length === 0) {
            resultsList.innerHTML = '<p class="no-results">No books found matching your criteria</p>';
            return;
        }

        resultsList.innerHTML = books.map(book => `
            <div class="book-card">
                <h4>${book.title}</h4>
                <p><strong>Author:</strong> ${book.author}</p>
                <p><strong>Publication Year:</strong> ${book.publication_year}</p>
                <p><strong>Genre:</strong> ${book.genre || 'Uncategorized'}</p>
                <p><strong>Publisher:</strong> ${book.publisher || 'Unknown'}</p>
                <p><strong>Library:</strong> ${book.library_name}</p>
                <p><strong>Address:</strong> ${book.library_address}</p>
                <p><strong>Phone:</strong> ${book.library_phone}</p>
                <p><strong>Available Copies:</strong> <span class="copies-available">${book.copies_available}</span></p>
            </div>
        `).join('');
    },

    showLoading(show) {
        const loadingDiv = document.getElementById('loading');
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
                alert('Search failed: ' + error.message);
            } finally {
                bookSearch.showLoading(false);
            }
        });
    }
});

// Clear search filters
function clearSearch() {
    document.getElementById('searchForm').reset();
    document.getElementById('resultsList').innerHTML = '';
    document.getElementById('resultCount').textContent = '0';
}
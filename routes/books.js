const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// Auth middleware
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Invalid authorization format' });

    const token = parts[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.userId = payload.id;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Book schema
const bookSchema = new mongoose.Schema({
    title: { type: String, required: true },
    author: { type: String, required: true },
    publication_year: { type: Number, required: true },
    genre: String,
    publisher: String,
    isbn: String,
    description: String,
    library_name: { type: String, required: true },
    library_address: String,
    library_phone: String,
    copies_available: { type: Number, default: 1 },
    total_copies: { type: Number, default: 1 }
});

const Book = mongoose.model('Book', bookSchema);

// Favorite schema
const favoriteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    addedAt: { type: Date, default: Date.now }
});

favoriteSchema.index({ userId: 1, bookId: 1 }, { unique: true });

const Favorite = mongoose.model('Favorite', favoriteSchema);

// Initialize sample data
const initializeSampleData = async () => {
    try {
        const bookCount = await Book.countDocuments();
        console.log('Current book count in database:', bookCount);
        if (bookCount === 0) {
            const sampleBooks = [
                {
                    title: "The Great Gatsby",
                    author: "F. Scott Fitzgerald",
                    publication_year: 1925,
                    genre: "Fiction",
                    publisher: "Scribner",
                    isbn: "9780743273565",
                    description: "A classic novel about the American Dream",
                    library_name: "Central Library",
                    library_address: "123 Main St",
                    library_phone: "555-0101",
                    copies_available: 3,
                    total_copies: 5
                },
                {
                    title: "To Kill a Mockingbird",
                    author: "Harper Lee",
                    publication_year: 1960,
                    genre: "Fiction",
                    publisher: "J.B. Lippincott & Co.",
                    isbn: "9780061120084",
                    description: "Classic novel about racial inequality and moral growth",
                    library_name: "Central Library",
                    library_address: "123 Main St",
                    library_phone: "555-0101",
                    copies_available: 2,
                    total_copies: 3
                },
                {
                    title: "1984",
                    author: "George Orwell",
                    publication_year: 1949,
                    genre: "Science Fiction",
                    publisher: "Secker & Warburg",
                    isbn: "9780451524935",
                    description: "Dystopian classic novel",
                    library_name: "North Branch",
                    library_address: "456 North St",
                    library_phone: "555-0102",
                    copies_available: 1,
                    total_copies: 2
                },
                {
                    title: "Pride and Prejudice",
                    author: "Jane Austen",
                    publication_year: 1813,
                    genre: "Romance",
                    publisher: "T. Egerton",
                    isbn: "9780141439518",
                    description: "Classic English romance novel",
                    library_name: "South Branch",
                    library_address: "789 South St",
                    library_phone: "555-0103",
                    copies_available: 4,
                    total_copies: 4
                }
            ];
            await Book.insertMany(sampleBooks);
            console.log('Sample books data initialized');
        }
    } catch (error) {
        console.error('Error initializing sample data:', error);
    }
};

// Initialize data
initializeSampleData();

module.exports = function(app) {
    
    // ========== PUBLIC ROUTES ==========

    // Get all libraries
    app.get('/api/books/libraries', async (req, res) => {
        try {
            const libraries = await Book.distinct('library_name');
            const libraryDetails = libraries.map(name => ({ name }));
            res.json(libraryDetails);
        } catch (err) {
            console.error('Get libraries error:', err);
            res.status(500).json({ error: 'Failed to get libraries list' });
        }
    });

    // Search books
    app.get('/api/books/search', async (req, res) => {
        try {
            const { title, author, publicationYear, genre, library } = req.query;
            
            let query = {};
            
            if (title) {
                query.title = { $regex: title, $options: 'i' };
            }
            if (author) {
                query.author = { $regex: author, $options: 'i' };
            }
            if (publicationYear) {
                query.publication_year = parseInt(publicationYear);
            }
            if (genre) {
                query.genre = { $regex: genre, $options: 'i' };
            }
            if (library) {
                query.library_name = library;
            }
            
            const books = await Book.find(query);
            console.log('Search found', books.length, 'books');
            res.json(books);
        } catch (err) {
            console.error('Search error:', err);
            res.status(500).json({ error: 'Search failed' });
        }
    });

    // ========== PRIVATE ROUTES ==========

    // Favorites routes - MUST COME BEFORE /api/books/:id route!
    app.get('/api/books/favorites', authMiddleware, async (req, res) => {
        try {
            console.log('Getting favorites for user:', req.userId);
            
            const favorites = await Favorite.find({ userId: req.userId })
                .populate('bookId')
                .sort({ addedAt: -1 });
            
            console.log('Found favorites count:', favorites.length);
            
            // 检查是否有无效的图书引用
            const validFavorites = favorites.filter(fav => {
                if (!fav.bookId) {
                    console.log('Invalid book reference in favorite:', fav._id);
                    return false;
                }
                return true;
            });
            
            console.log('Valid favorites count:', validFavorites.length);
            
            const favoriteBooks = validFavorites.map(fav => fav.bookId);
            res.json(favoriteBooks);
        } catch (err) {
            console.error('Get favorites error details:', err);
            res.status(500).json({ error: 'Failed to get favorites: ' + err.message });
        }
    });

    app.post('/api/books/favorites', authMiddleware, async (req, res) => {
        try {
            const { bookId } = req.body;
            console.log('Adding favorite - User:', req.userId, 'Book:', bookId);
            
            // 验证图书ID格式
            if (!mongoose.Types.ObjectId.isValid(bookId)) {
                return res.status(400).json({ error: 'Invalid book ID format' });
            }
            
            const book = await Book.findById(bookId);
            if (!book) {
                console.log('Book not found for ID:', bookId);
                return res.status(404).json({ error: 'Book not found' });
            }
            
            const existing = await Favorite.findOne({ userId: req.userId, bookId });
            if (existing) {
                return res.status(400).json({ error: 'Book already in favorites' });
            }
            
            const favorite = new Favorite({ userId: req.userId, bookId });
            await favorite.save();
            
            console.log('Favorite added successfully');
            res.json({ message: 'Successfully added to favorites', favorite });
        } catch (err) {
            console.error('Add favorite error details:', err);
            res.status(500).json({ error: 'Failed to add favorite: ' + err.message });
        }
    });

    app.delete('/api/books/favorites/:bookId', authMiddleware, async (req, res) => {
        try {
            console.log('Removing favorite - User:', req.userId, 'Book:', req.params.bookId);
            
            const result = await Favorite.findOneAndDelete({ 
                userId: req.userId, 
                bookId: req.params.bookId 
            });
            
            if (!result) {
                return res.status(404).json({ error: 'Favorite not found' });
            }
            
            console.log('Favorite removed successfully');
            res.json({ message: 'Successfully removed from favorites' });
        } catch (err) {
            console.error('Remove favorite error details:', err);
            res.status(500).json({ error: 'Failed to remove favorite: ' + err.message });
        }
    });

    // ========== PUBLIC ROUTES (CONTINUED) ==========

    // Get book details - THIS MUST COME AFTER ALL SPECIFIC ROUTES!
    app.get('/api/books/:id', async (req, res) => {
        try {
            console.log('Getting book details for ID:', req.params.id);
            
            // 验证ID格式
            if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
                return res.status(400).json({ error: 'Invalid book ID format' });
            }
            
            const book = await Book.findById(req.params.id);
            if (!book) {
                console.log('Book not found for ID:', req.params.id);
                return res.status(404).json({ error: 'Book not found' });
            }
            console.log('Book found:', book.title);
            res.json(book);
        } catch (err) {
            console.error('Get book details error:', err);
            res.status(500).json({ error: 'Failed to get book details' });
        }
    });
};
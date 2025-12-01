const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// Define Review schema inline (no separate models/review.js needed)
const reviewSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: false },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, trim: true, default: '' }
}, { timestamps: true });

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

// Simple auth middleware (same logic as in books/users routes)
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Invalid authorization format' });
    }

    const token = parts[1];
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.userId = payload.id;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

module.exports = function (app) {
    /**
     * POST /api/reviews
     * Create a review for a book by the logged-in user.
     * Body: { bookId, rating (1-5), comment }
     */
    app.post('/api/reviews', authMiddleware, async (req, res) => {
        try {
            const { bookId, rating, comment } = req.body;

            if (!bookId || !rating) {
                return res.status(400).json({ error: 'bookId and rating are required' });
            }

            if (!mongoose.Types.ObjectId.isValid(bookId)) {
                return res.status(400).json({ error: 'Invalid bookId' });
            }

            const Book = mongoose.model('Book');
            const book = await Book.findById(bookId);
            if (!book) {
                return res.status(404).json({ error: 'Book not found' });
            }

            const numericRating = Number(rating);
            if (numericRating < 1 || numericRating > 5) {
                return res.status(400).json({ error: 'Rating must be between 1 and 5' });
            }

            // Upsert: one review per user per book
            const review = await Review.findOneAndUpdate(
                { user: req.userId, book: bookId },
                { rating: numericRating, comment: (comment || '').trim() },
                { upsert: true, new: true, runValidators: true }
            );

            res.json({ success: true, review });
        } catch (err) {
            console.error('POST /api/reviews error:', err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    /**
     * GET /api/books/:bookId/reviews
     * Get all reviews for a specific book (public).
     */
    app.get('/api/books/:bookId/reviews', async (req, res) => {
        try {
            const { bookId } = req.params;
            if (!mongoose.Types.ObjectId.isValid(bookId)) {
                return res.status(400).json({ error: 'Invalid bookId' });
            }

            const reviews = await Review.find({ book: bookId })
                .populate('user', 'username')
                .sort({ createdAt: -1 });

            res.json(reviews);
        } catch (err) {
            console.error('GET /api/books/:bookId/reviews error:', err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    /**
     * GET /api/reviews/my
     * Get reviews written by the logged-in user.
     */
    app.get('/api/reviews/my', authMiddleware, async (req, res) => {
        try {
            const reviews = await Review.find({ user: req.userId })
                .populate('book', 'title')
                .sort({ createdAt: -1 });

            res.json(reviews);
        } catch (err) {
            console.error('GET /api/reviews/my error:', err);
            res.status(500).json({ error: 'Server error' });
        }
    });
};
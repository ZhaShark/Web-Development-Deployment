const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

// Import models
const User = mongoose.model('User');
const Favorite = mongoose.model('Favorite');

module.exports = function(app) {
    
    // ========== USER PROFILE ROUTES ==========

    app.get('/api/users/profile', authMiddleware, async (req, res) => {
        try {
            const user = await User.findById(req.userId);
            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json(user.toJSON());
        } catch (err) {
            console.error('Get profile error:', err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    app.put('/api/users/profile', authMiddleware, async (req, res) => {
        try {
            const updates = {};
            const allowed = ['username', 'email', 'firstName', 'lastName', 'phone', 'address'];
            for (const key of allowed) {
                if (req.body[key] !== undefined) updates[key] = req.body[key];
            }

            if (updates.username) {
                const exists = await User.findOne({ username: updates.username, _id: { $ne: req.userId } });
                if (exists) return res.status(400).json({ error: 'Username already in use' });
            }
            if (updates.email) {
                const exists = await User.findOne({ email: updates.email, _id: { $ne: req.userId } });
                if (exists) return res.status(400).json({ error: 'Email already in use' });
            }

            const user = await User.findById(req.userId);
            if (!user) return res.status(404).json({ error: 'User not found' });

            if (req.body.oldPassword || req.body.newPassword) {
                const { oldPassword, newPassword } = req.body;
                if (!oldPassword || !newPassword) {
                    return res.status(400).json({ error: 'oldPassword and newPassword are required to change password' });
                }

                const ok = await bcrypt.compare(oldPassword, user.password);
                if (!ok) return res.status(400).json({ error: 'Old password is incorrect' });

                user.password = await bcrypt.hash(newPassword, 10);
            }

            Object.assign(user, updates);
            await user.save();

            res.json(user.toJSON());
        } catch (err) {
            console.error('Update profile error:', err);
            res.status(500).json({ error: 'Server error' });
        }
    });

    app.delete('/api/users/profile', authMiddleware, async (req, res) => {
        try {
            await User.findByIdAndDelete(req.userId);
            await Favorite.deleteMany({ userId: req.userId });
            res.json({ ok: true });
        } catch (err) {
            console.error('Delete profile error:', err);
            res.status(500).json({ error: 'Server error' });
        }
    });
};
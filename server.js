const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/library-app';
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

const getLocalIP = () => {
    const interfaces = require('os').networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const intf of interfaces[name]) {
            if (intf.family === 'IPv4' && !intf.internal) {
                return intf.address;
            }
        }
    }
    return 'localhost';
};

const app = express();
app.use(cors());
app.use(express.json());

// Serve static front-end
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err.message));

// User schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: String,
    lastName: String,
    phone: String,
    address: String,
    createdAt: { type: Date, default: Date.now }
});

userSchema.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    delete obj.__v;
    return obj;
};

const User = mongoose.model('User', userSchema);

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, firstName, lastName, phone, address } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'username, email and password are required' });
        }

        const existing = await User.findOne({ $or: [{ username }, { email }] });
        if (existing) {
            return res.status(400).json({ error: 'Username or email already in use' });
        }

        const hashed = await bcrypt.hash(password, 10);

        const user = new User({ username, email, password: hashed, firstName, lastName, phone, address });
        await user.save();

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: user.toJSON() });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'username and password are required' });
        }

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: user.toJSON() });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, HOST, () => {
    const localIP = getLocalIP();
    console.log('Library System Mobile Test Server (Express + MongoDB)');
    console.log('=====================================================');
    console.log(`Computer: http://localhost:${PORT}`);
    console.log(`Phone:    http://${localIP}:${PORT}`);
    console.log('=====================================================');
});

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

// Profile endpoints
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

        // Check username/email uniqueness if changed
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

        // Handle password change if requested
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

        // Return updated user
        res.json(user.toJSON());
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/users/profile', authMiddleware, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.userId);
        res.json({ ok: true });
    } catch (err) {
        console.error('Delete profile error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});
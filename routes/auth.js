const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

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

module.exports = function(app) {
    
    // Register
    app.post('/api/auth/register', async (req, res) => {
        try {
            const { username, email, password, firstName, lastName, phone, address } = req.body;

            if (!username || !email || !password) {
                return res.status(400).json({ error: 'Username, email and password are required' });
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
                return res.status(400).json({ error: 'Username and password are required' });
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
};
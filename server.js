const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/library-app';

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

// Connect to MongoDB and register routes after connection to avoid race conditions
mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB');

        // Import routes AFTER DB connection
        require('./routes/auth')(app);
        require('./routes/books')(app);
        require('./routes/users')(app);
        require('./routes/review')(app); // <-- review route

        // SPA fallback route - MUST BE LAST
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
    })
    .catch(err => console.error('MongoDB connection error:', err.message));
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const HOST = '0.0.0.0';

const getLocalIP = () => {
    const interfaces = require('os').networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            if (interface.family === 'IPv4' && !interface.internal) {
                return interface.address;
            }
        }
    }
    return 'localhost';
};

const server = http.createServer((req, res) => {
    console.log(`📱 Mobile request from: ${req.url}`);
    
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, 'public', filePath);
    
    const extname = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.png': 'image/png',
        '.jpg': 'image/jpeg'
    };
    const contentType = mimeTypes[extname] || 'text/html';
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end('Page not found');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(data);
                }
            });
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
});

server.listen(PORT, HOST, () => {
    const localIP = getLocalIP();
    console.log('Library System Mobile Test Server');
    console.log('=====================================');
    console.log(`Computer: http://localhost:${PORT}`);
    console.log(`Phone:    http://${localIP}:${PORT}`);
    console.log('=====================================');
});
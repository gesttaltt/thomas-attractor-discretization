#!/usr/bin/env node
/**
 * Thomas Attractor - Simplified Server
 * Minimal static file server without unnecessary complexity
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = process.argv[2] || 8081;
const HOST = 'localhost';

// MIME types for common files
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

// Create HTTP server
const server = http.createServer((req, res) => {
    // Parse URL and get file path
    let pathname = req.url.split('?')[0]; // Remove query params
    if (pathname === '/') pathname = '/index.html';
    
    const filePath = path.join(__dirname, pathname);
    const ext = path.extname(filePath);
    
    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // File not found
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`
                <h1>404 - File Not Found</h1>
                <p>The requested file <code>${pathname}</code> was not found.</p>
                <a href="/">← Back to home</a>
            `);
            return;
        }
        
        // Read and serve file
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>500 - Internal Server Error</h1>');
                console.error(`Error reading ${filePath}:`, err.message);
                return;
            }
            
            // Set headers
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            });
            
            res.end(data);
            console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${pathname} - 200`);
        });
    });
});

// Start server
server.listen(PORT, HOST, () => {
    console.log(`
╔════════════════════════════════════════════╗
║        Thomas Attractor Visualizer         ║
║             Simplified Server              ║
╚════════════════════════════════════════════╝

🚀 Server running at: http://${HOST}:${PORT}
📱 Application: http://${HOST}:${PORT}/index.html

Press Ctrl+C to stop
    `);
});

// Error handling
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use!`);
        console.error(`   Try: node server-simple.js ${PORT + 1}`);
    } else {
        console.error('❌ Server error:', err.message);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Server stopped gracefully');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Server terminated');
    process.exit(0);
});
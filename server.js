/**
 * Simple Node.js Static Server
 * Serves the Crypto Trade Master application without any frameworks.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// Maps file extensions to their corresponding MIME types
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
    // Sanitize the requested URL to prevent directory traversal attacks
    const unsafeFilePath = path.join(__dirname, req.url === '/' ? 'Index.html' : req.url);
    const safeFilePath = path.normalize(unsafeFilePath).replace(/^(\.\.[\/\\])+/, '');

    const extname = path.extname(safeFilePath);
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(safeFilePath, (err, content) => {
        if (err) {
            // If the file is not found, send a 404 response
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
                console.error(`Error: ${req.method} ${req.url} - 404 Not Found`);
            } else {
                // For other server errors, send a 500 response
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Internal Server Error');
                console.error(`Server Error: ${err.message}`);
            }
        } else {
            // If the file is found, send it with the correct MIME type
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
            console.log(`Served: ${req.method} ${req.url}`);
        }
    });
});

server.listen(PORT, () => {
    console.log(`
--------------------------------------------------
  🚀 Server is running on http://localhost:${PORT}
  Your Crypto Trading App is ready!
--------------------------------------------------
    `);
});
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = 80;

process.on('uncaughtException', (err) => {
    console.error('Handled uncaughtException:', err.message);
});

process.on('unhandledRejection', (reason) => {
    console.error('Handled unhandledRejection:', reason);
});

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
    req.on('error', (err) => {
        console.warn('Request error:', err.message);
    });
    res.on('error', (err) => {
        console.warn('Response error:', err.message);
    });

    // 1. Proxy /api and /uploads to Backend on Port 5000
    if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
        const proxyReq = http.request({
            hostname: '127.0.0.1',
            port: 5000,
            path: req.url,
            method: req.method,
            headers: req.headers
        }, (proxyRes) => {
            if (!res.headersSent) {
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
            }
            proxyRes.pipe(res, { end: true });
        });

        proxyReq.on('error', (err) => {
            if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Backend proxy error: ' + err.message }));
            }
        });

        req.pipe(proxyReq, { end: true });
        return;
    }

    // 2. Safe static file resolution
    let safeUrl = req.url.split('?')[0];
    let filePath = path.normalize(path.join(DIST_DIR, safeUrl));

    // Security check: ensure filePath is strictly inside DIST_DIR
    if (!filePath.startsWith(DIST_DIR)) {
        if (!res.headersSent) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
        }
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (!err && stats.isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';
            if (!res.headersSent) {
                res.writeHead(200, {
                    'Content-Type': contentType,
                    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
                });
            }
            const stream = fs.createReadStream(filePath);
            stream.on('error', () => {
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('File read error');
                }
            });
            stream.pipe(res);
        } else {
            // SPA fallback: serve index.html for all client-side routes
            const indexPath = path.join(DIST_DIR, 'index.html');
            if (!res.headersSent) {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            }
            const stream = fs.createReadStream(indexPath);
            stream.on('error', () => {
                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Index read error');
                }
            });
            stream.pipe(res);
        }
    });
});

server.on('error', (err) => {
    console.error('Server error:', err.message);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Production Web App running rock-solid on http://148.251.171.147:${PORT}`);
});

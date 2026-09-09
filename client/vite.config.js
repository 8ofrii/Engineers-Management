/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom plugin to intercept malformed bot/scanner URIs on public port 80
// and respond with 400 instead of crashing Vite's static middleware
const safeUriPlugin = () => ({
    name: 'safe-uri-plugin',
    configureServer(server) {
        server.middlewares.use((req, res, next) => {
            try {
                decodeURI(req.url || '');
                next();
            } catch {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'text/plain');
                res.end('Bad Request: Malformed URI');
            }
        });
    }
});

// Manual chunks split the 1 MB monolith into ~8 cacheable chunks. Browsers
// can cache the heavy vendor bundles separately from app code, so a
// route-only update doesn't invalidate React, Recharts, etc.

export default defineConfig({
    plugins: [safeUriPlugin(), react()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        allowedHosts: true,
        hmr: {
            overlay: false
        },
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true
            },
            '/uploads': {
                target: 'http://localhost:5000',
                changeOrigin: true
            }
        }
    },
    build: {
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                manualChunks: {
                    // Pin React + router together — they're always co-required
                    'vendor-react':   ['react', 'react-dom', 'react-router-dom'],
                    // Charts is the single heaviest dep (~400 KB unminified)
                    'vendor-charts':  ['recharts'],
                    // i18n + icons together — both used everywhere
                    'vendor-ui':      ['lucide-react', 'i18next', 'react-i18next', 'i18next-browser-languagedetector'],
                    // axios is small but distinct
                    'vendor-http':    ['axios']
                }
            }
        }
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.js'],
        css: false,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            exclude: ['**/node_modules/**', '**/dist/**', '**/*.config.*', 'src/main.jsx']
        }
    }
})

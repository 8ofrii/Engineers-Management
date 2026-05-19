/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Manual chunks split the 1 MB monolith into ~8 cacheable chunks. Browsers
// can cache the heavy vendor bundles separately from app code, so a
// route-only update doesn't invalidate React, Recharts, etc.

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
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

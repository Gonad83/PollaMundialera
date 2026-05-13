// mundial2026-frontend/vite.config.js
// Instalar: npm install -D vite-plugin-pwa

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Polla Mundial 2026',
        short_name: 'Mundial 2026',
        description: 'Quiniela del Mundial FIFA 2026',
        theme_color: '#16a34a',
        background_color: '#09090b',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable any' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable any' },
        ],
        shortcuts: [
          { name: 'Partidos', url: '/matches' },
          { name: 'Ranking',  url: '/leaderboard' },
        ],
      },
      workbox: {
        // Cachear assets de Vite
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cache de API de partidos (5 min)
            urlPattern: /^\/api\/matches/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-matches',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
          {
            // Cache de leaderboard (1 min)
            urlPattern: /^\/api\/leaderboard/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-leaderboard',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 },
            },
          },
        ],
        // No cachear rutas de auth ni mutaciones
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})

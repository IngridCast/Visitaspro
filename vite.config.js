import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Una sola dirección para la web y la API, también desde un teléfono.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api(?=\/|$)/, ''),
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api(?=\/|$)/, ''),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'loto-azul-apple-180x180.png', 'logo.svg'],
      manifest: {
        id: '/',
        name: 'VisitasPro',
        short_name: 'VisitasPro',
        description: 'Gestión de visitas',
        lang: 'es',
        theme_color: '#0066b3',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        // Iconos de instalación generados con el logo azul de Loto.
        icons: [
          { src: 'loto-azul-transparent-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'loto-azul-transparent-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'loto-azul-transparent-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'loto-azul-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})

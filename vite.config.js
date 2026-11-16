import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png'],
      workbox: {
        // Carga nuestros handlers de push dentro del SW que genera Workbox.
        // Sin esto, el navegador recibe el push pero nadie lo muestra.
        importScripts: ['/push-sw.js'],
      },
      // Para poder probar el push con `npm run dev` (si no, el SW solo existe en build).
      devOptions: {
        enabled: true,
        type: 'module',
      },
      manifest: {
        name: 'PoliSport EPN — Reservas Deportivas',
        short_name: 'PoliSport',
        description: 'Reserva de espacios e implementos deportivos de la Escuela Politécnica Nacional',
        theme_color: '#FFFFFF',
        background_color: '#FFFFFF',
        display: 'standalone',
        // ⚠️ PROVISORIO: se usa el logo completo (1230x1278) porque los
        // `icon-192.png` / `icon-512.png` se borraron de `public/`.
        // Para que la PWA se instale prolijo hacen falta DOS PNG cuadrados
        // exportados del logo — 192x192 y 512x512 — y volver a declararlos acá.
        // El `maskable` además necesita margen propio: Android le recorta un
        // círculo, así que el escudo tiene que ir con aire alrededor o lo corta.
        icons: [
          {
            src: 'logo.png',
            sizes: '1230x1278',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      }
    })
  ]
})
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/postcss";
import viteCompression from "vite-plugin-compression";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    viteCompression({ algorithm: "gzip", ext: ".gz" }),
    viteCompression({ algorithm: "brotliCompress", ext: ".br" }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.png", "logo.webp", "logo.svg", "armoiries-guinee.png"],
      manifest: {
        name: "Les Enfants d'Adam",
        short_name: "Enfants d'Adam",
        description: "Plateforme guinéenne d'enregistrement généalogique, santé, éducation et solidarité.",
        theme_color: "#065f46",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "fr",
        icons: [
          { src: "/logo.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
          { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
        categories: ["social", "health", "education"],
        shortcuts: [
          { name: "Accueil", url: "/", icons: [{ src: "/logo.png", sizes: "96x96" }] },
          { name: "Mon Profil", url: "/profil", icons: [{ src: "/logo.png", sizes: "96x96" }] },
          { name: "Arbre Généalogique", url: "/arbre-genealogique", icons: [{ src: "/logo.png", sizes: "96x96" }] },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "google-fonts-cache", expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "api-cache", expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 }, networkTimeoutSeconds: 10 },
          },
          {
            urlPattern: /\/uploads\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "uploads-cache", expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
      devOptions: { enabled: true },
    }),
  ],
  base: '/',
  css: {
    postcss: {
      plugins: [tailwindcss],
    },
  },
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api': { target: 'http://localhost:5002', changeOrigin: true },
      '/uploads': { target: 'http://localhost:5002', changeOrigin: true },
    },
    hmr: { overlay: true },
    watch: { usePolling: true },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    chunkSizeWarningLimit: 600,
    // Inline les assets < 2KB directement dans le JS (évite des requêtes réseau)
    assetsInlineLimit: 2048,
    // modulePreload: polyfill pour Safari qui ne supporte pas nativement les module preloads
    modulePreload: { polyfill: true },
    rollupOptions: {
      output: {
        manualChunks: {
          // Cœur React — chargé immédiatement
          'react-vendor': ['react', 'react-dom'],
          // Router — chargé immédiatement (SPA)
          'router': ['react-router-dom'],
          // Notifications — petit, mais pas critique au démarrage
          'ui': ['react-hot-toast'],
          // Carte Leaflet — uniquement chargée sur /terre-adam
          'map': ['leaflet', 'react-leaflet'],
          // Markdown — uniquement chargé sur pages IA/science
          'markdown': ['react-markdown', 'remark-gfm'],
          // React Query — chargé pour les pages avec data fetching
          'query': ['@tanstack/react-query'],
          // QR code — chargé uniquement sur les pages de profil
          'qr': ['qrcode.react', 'jsqr'],
        },
      },
    },
  },
});

import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/postcss";
import viteCompression from "vite-plugin-compression";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBase = env.VITE_API_URL || "http://localhost:5002";

  // Remplace toutes les occurrences hardcodées de localhost:5002 par l'URL réelle en prod
  const replaceLocalhostPlugin: Plugin = {
    name: "replace-localhost-api",
    transform(code, id) {
      if (
        mode === "production" &&
        id.includes("/src/") &&
        (id.endsWith(".ts") || id.endsWith(".tsx"))
      ) {
        return code.replace(/http:\/\/localhost:5002/g, apiBase);
      }
      return null;
    },
  };

  return {
    plugins: [
      react(),
      replaceLocalhostPlugin,
      viteCompression({ algorithm: "gzip", ext: ".gz" }),
      viteCompression({ algorithm: "brotliCompress", ext: ".br" }),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["logo.png", "logo.webp", "logo.svg", "armoiries-guinee.png"],
        manifest: {
          name: "Les Enfants d'Adam",
          short_name: "Enfants d'Adam",
          description:
            "Plateforme guinéenne d'enregistrement généalogique, santé, éducation et solidarité.",
          theme_color: "#065f46",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          lang: "fr",
          icons: [
            {
              src: "/logo.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any maskable",
            },
            {
              src: "/logo.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
          categories: ["social", "health", "education"],
          shortcuts: [
            {
              name: "Accueil",
              url: "/",
              icons: [{ src: "/logo.png", sizes: "96x96" }],
            },
            {
              name: "Mon Profil",
              url: "/profil",
              icons: [{ src: "/logo.png", sizes: "96x96" }],
            },
            {
              name: "Arbre Généalogique",
              url: "/arbre-genealogique",
              icons: [{ src: "/logo.png", sizes: "96x96" }],
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webp,woff2}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            {
              urlPattern: /\/api\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "api-cache",
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
                networkTimeoutSeconds: 10,
              },
            },
            {
              urlPattern: /\/uploads\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "uploads-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
        devOptions: { enabled: true },
      }),
    ],
    base: "/",
    css: {
      postcss: {
        plugins: [tailwindcss],
      },
    },
    server: {
      port: 3000,
      open: false,
      proxy: {
        "/api": { target: "http://localhost:5002", changeOrigin: true },
        "/uploads": { target: "http://localhost:5002", changeOrigin: true },
      },
      hmr: { overlay: true },
      watch: { usePolling: true },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
      minify: "esbuild",
      target: "es2020",
      chunkSizeWarningLimit: 600,
      assetsInlineLimit: 2048,
      modulePreload: { polyfill: true },
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            ui: ["react-hot-toast"],
            map: ["leaflet", "react-leaflet"],
            markdown: ["react-markdown", "remark-gfm"],
            query: ["@tanstack/react-query"],
            qr: ["qrcode.react", "jsqr"],
          },
        },
      },
    },
  };
});

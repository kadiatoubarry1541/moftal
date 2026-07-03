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

  // Plugin qui force le navigateur à supprimer les anciens caches/SW en dev
  const clearSwPlugin: Plugin = {
    name: 'clear-sw-dev',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader('Clear-Site-Data', '"cache"')
        next()
      })
    }
  }

  return {
    plugins: [
      react(),
      replaceLocalhostPlugin,
      ...(mode === 'development' ? [clearSwPlugin] : []),
      viteCompression({ algorithm: "gzip", ext: ".gz" }),
      viteCompression({ algorithm: "brotliCompress", ext: ".br" }),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        registerType: "autoUpdate",
        // Seuls les assets réellement utiles pour l'app shell PWA
        includeAssets: ["logo-moftal.svg"],
        manifest: {
          name: "Moftal",
          short_name: "Moftal",
          description:
            "La plateforme Moftal — famille, santé, éducation et solidarité.",
          theme_color: "#065f46",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          lang: "fr",
          icons: [
            {
              src: "/logo-moftal.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any",
            },
            {
              src: "/logo-moftal.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "maskable",
            },
          ],
          categories: ["social", "health", "education", "business"],
          shortcuts: [
            {
              name: "Accueil",
              url: "/",
              icons: [{ src: "/logo-moftal.svg", sizes: "any", type: "image/svg+xml" }],
            },
            {
              name: "Mon Profil",
              url: "/profil",
              icons: [{ src: "/logo-moftal.svg", sizes: "any", type: "image/svg+xml" }],
            },
            {
              name: "Espace Gestion",
              short_name: "Gestion",
              description: "Accès direct à vos espaces de gestion professionnelle",
              url: "/gestion-interne",
              icons: [{ src: "/logo-moftal.svg", sizes: "any", type: "image/svg+xml" }],
            },
          ],
        },
        injectManifest: {
          // PNG exclus du précache : logo.png (227KB) + armoiries (325KB) = 552KB économisés
          globPatterns: ["**/*.{js,css,html,ico,webp,woff2}"],
        },
        devOptions: { enabled: false },
      }),
    ],
    base: "/",
    css: {
      postcss: {
        plugins: [tailwindcss],
      },
    },
    server: {
      host: '0.0.0.0',
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
      chunkSizeWarningLimit: 500,
      // Inline les assets < 4KB en base64 (réduit les requêtes HTTP)
      assetsInlineLimit: 4096,
      // es2020+ supporte nativement modulepreload — pas besoin du polyfill
      modulePreload: { polyfill: false },
      // Accélère le build : ne calcule pas la taille compressée
      reportCompressedSize: false,
      rollupOptions: {
        output: {
          // Fonction granulaire : chaque bibliothèque dans son propre chunk
          // → bundle initial plus petit → moins de JS à parser → TBT réduit
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            // socket.io est lourd et uniquement utilisé dans Arbre.tsx (lazy)
            if (id.includes("/socket.io") || id.includes("/engine.io")) return "socketio";
            // Tout le reste dans vendor pour éviter les conflits d'initialisation entre chunks
            return "vendor";
          },
        },
      },
    },
  };
});

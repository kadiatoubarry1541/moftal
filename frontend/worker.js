export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy /api/* → api.moftal.com
    // Permet de servir le manifest PWA en same-origin → Chrome déclenche beforeinstallprompt
    if (url.pathname.startsWith('/api/')) {
      const apiUrl = `https://api.moftal.com${url.pathname}${url.search}`;
      try {
        const apiResponse = await fetch(apiUrl, {
          method: request.method,
          headers: request.headers,
          body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
          redirect: 'follow',
        });
        return apiResponse;
      } catch (err) {
        return new Response(
          JSON.stringify({ success: false, message: 'Serveur temporairement indisponible. Réessayez dans quelques secondes.' }),
          { status: 503, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    // Tout le reste → assets statiques (SPA React/Vite dans dist/)
    try {
      const assetResponse = await env.ASSETS.fetch(request);
      return applyCacheHeaders(assetResponse, url.pathname);
    } catch (err) {
      return new Response('Page non trouvée', { status: 404 });
    }
  },
};

// Le fichier public/_headers (convention Cloudflare Pages) n'est pas forcément
// respecté par le binding [assets] de Cloudflare Workers utilisé ici — donc on
// fixe les en-têtes de cache nous-mêmes, dans le code, pour être sûr que
// index.html et le service worker ne restent jamais bloqués en cache (sinon un
// visiteur peut voir une ancienne version du site même après un déploiement
// réussi). Les fichiers avec un hash dans leur nom (assets/*) restent
// immuables : leur contenu ne change jamais sans que le nom change aussi.
const CSP_OBSERVATION = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.logr-in.com https://challenges.cloudflare.com https://cdnjs.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
  "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' https://api.moftal.com wss://api.moftal.com https://*.moftal.com wss://*.moftal.com https://enfants-adam-backend.onrender.com wss://enfants-adam-backend.onrender.com https://nominatim.openstreetmap.org https://*.openstreetmap.org https://tiles.openfreemap.org https://*.logr-in.com https://*.lr-ingest.io https://*.lr-in.com https://*.lr-ingest.com https://challenges.cloudflare.com",
  "frame-src 'self' https://challenges.cloudflare.com https://www.google.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  'report-uri /api/erreurs/csp',
].join('; ');

function applyCacheHeaders(response, pathname) {
  const isHtml = response.headers.get('content-type')?.includes('text/html');
  const isServiceWorker = pathname === '/sw.js';
  const isManifest = pathname.endsWith('.webmanifest');

  if (!isHtml && !isServiceWorker && !isManifest) return response;

  const headers = new Headers(response.headers);
  if (isHtml) {
    // Protection des pages en mode OBSERVATION : rien n'est bloqué, le navigateur
    // signale seulement ce que la règle bloquerait (journal des erreurs de
    // l'admin). Quand le journal ne montre plus de cas normaux, on pourra
    // passer à « Content-Security-Policy » pour bloquer vraiment.
    headers.set('Content-Security-Policy-Report-Only', CSP_OBSERVATION);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  }
  if (isHtml || isServiceWorker) {
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (isManifest) {
    headers.set('Cache-Control', 'public, max-age=3600');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

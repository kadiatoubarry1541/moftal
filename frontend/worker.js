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
function applyCacheHeaders(response, pathname) {
  const isHtml = response.headers.get('content-type')?.includes('text/html');
  const isServiceWorker = pathname === '/sw.js';
  const isManifest = pathname.endsWith('.webmanifest');

  if (!isHtml && !isServiceWorker && !isManifest) return response;

  const headers = new Headers(response.headers);
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

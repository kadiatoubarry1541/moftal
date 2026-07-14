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
      return await env.ASSETS.fetch(request);
    } catch (err) {
      return new Response('Page non trouvée', { status: 404 });
    }
  },
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy /api/* → api.moftal.com
    // Permet de servir le manifest PWA en same-origin → Chrome déclenche beforeinstallprompt
    if (url.pathname.startsWith('/api/')) {
      const apiUrl = `https://api.moftal.com${url.pathname}${url.search}`;
      return fetch(apiUrl, {
        method: request.method,
        headers: request.headers,
        body: ['GET', 'HEAD'].includes(request.method) ? null : request.body,
        redirect: 'follow',
      });
    }

    // Tout le reste → assets statiques (SPA React/Vite dans dist/)
    return env.ASSETS.fetch(request);
  },
};

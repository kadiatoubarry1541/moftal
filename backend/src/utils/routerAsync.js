// Express 4 n'attrape pas les erreurs des routes « async » : sans try/catch,
// une erreur de base de données laissait la requête sans réponse et la page
// tournait sans fin. Ce garde-fou envoie l'erreur au gestionnaire d'erreurs
// d'Express (réponse 500 avec un message).
export function attraperErreursAsync(router) {
  for (const methode of ['get', 'post', 'put', 'patch', 'delete']) {
    const origine = router[methode].bind(router);
    router[methode] = (chemin, ...handlers) => origine(chemin, ...handlers.map(h =>
      typeof h === 'function' && h.length < 4
        ? (req, res, next) => {
            try {
              const r = h(req, res, next);
              if (r && typeof r.catch === 'function') r.catch(next);
            } catch (e) { next(e); }
          }
        : h
    ));
  }
  return router;
}

// Express 4 ne rattrape pas les erreurs des routes « async » : la requête restait
// sans réponse et le bouton de l'écran tournait sans fin. On transmet ces erreurs
// au gestionnaire d'erreurs, qui répond { success: false, message }.
import Layer from 'express/lib/router/layer.js';

const original = Layer.prototype.handle_request;
Layer.prototype.handle_request = function handleRequest(req, res, next) {
  const fn = this.handle;
  if (fn.length > 3) return next(); // middleware d'erreur : même règle qu'Express
  try {
    const out = fn(req, res, next);
    if (out && typeof out.catch === 'function') out.catch(next);
  } catch (err) {
    next(err);
  }
};
Layer.prototype.handle_request.original = original;

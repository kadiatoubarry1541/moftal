// Serveur Moftal (Express) dans le moteur de Cloudflare Workers.
//
// Chez Cloudflare, se connecter à la base ou lancer une minuterie est interdit
// au chargement du fichier : on charge donc tout le serveur à la PREMIÈRE
// demande (où tout est permis), puis on lui passe les demandes.
import { httpServerHandler } from 'cloudflare:node';

let pret = null;

export default {
  async fetch(request, env, ctx) {
    if (!pret) {
      pret = import('./src/server.js')
        .then((m) => m.serveurPret)
        .then(() => httpServerHandler({ port: 5002 }))
        .catch((e) => { pret = null; throw e; });
    }
    const gestionnaire = await pret;
    return gestionnaire.fetch(request, env, ctx);
  },
};

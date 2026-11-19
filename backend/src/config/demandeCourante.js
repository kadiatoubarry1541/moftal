import { AsyncLocalStorage } from 'node:async_hooks';

// Chez Cloudflare (CONNEXION_PAR_DEMANDE=true), une connexion à la base ouverte
// pendant une demande ne peut servir à aucune autre : la demande qui la
// recevrait attendrait pour toujours. Chaque demande a donc sa propre petite
// réserve de connexions, fermée quand la réponse est envoyée.
// Ailleurs (Render, Oracle, tests), rien ne change : la réserve commune habituelle.
export const PAR_DEMANDE = process.env.CONNEXION_PAR_DEMANDE === 'true';
const MAX_PAR_DEMANDE = 4;

const demande = new AsyncLocalStorage();
export const demandeCourante = () => demande.getStore() || null;

function fermerTout(d) {
  d.fermee = true;
  for (const { gestion, connexion } of d.toutes) {
    gestion._disconnect(connexion).catch(() => {});
  }
  d.toutes.clear();
  d.libres.length = 0;
}

// Premier middleware du serveur : la suite de la demande garde sa réserve.
export function jetonDeDemande(_req, res, next) {
  if (!PAR_DEMANDE) return next();
  const d = { libres: [], toutes: new Set(), attente: [], fermee: false };
  res.once('finish', () => fermerTout(d));
  res.once('close', () => fermerTout(d));
  return demande.run(d, next);
}

// À appeler juste après new Sequelize(...)
export function brancherParDemande(sequelize) {
  if (!PAR_DEMANDE) return;
  const gestion = sequelize.connectionManager;
  const obtenirCommune = gestion.getConnection.bind(gestion);
  const rendreCommune = gestion.releaseConnection.bind(gestion);
  const detruireCommune = gestion.destroyConnection.bind(gestion);

  gestion.getConnection = async (options) => {
    const d = demandeCourante();
    // Démarrage du serveur : réserve commune. Après la réponse (envoi d'une
    // notification…), la demande ouvre encore ses propres connexions, fermées aussitôt.
    if (!d) return obtenirCommune(options);
    const libres = d.libres.filter((e) => e.gestion === gestion);
    const libre = libres.find((e) => !e.connexion._ending && !e.connexion._invalid);
    if (libre) {
      d.libres.splice(d.libres.indexOf(libre), 1);
      return libre.connexion;
    }
    const miennes = [...d.toutes].filter((e) => e.gestion === gestion).length;
    if (miennes >= MAX_PAR_DEMANDE) {
      return new Promise((resoudre) => d.attente.push({ gestion, resoudre }));
    }
    const connexion = await gestion._connect(gestion.config);
    connexion.__demande = d;
    d.toutes.add({ gestion, connexion });
    return connexion;
  };

  gestion.releaseConnection = (connexion) => {
    const d = connexion.__demande;
    if (!d) return rendreCommune(connexion);
    const enAttente = d.attente.findIndex((a) => a.gestion === gestion);
    if (enAttente >= 0) {
      const [a] = d.attente.splice(enAttente, 1);
      a.resoudre(connexion);
      return;
    }
    if (d.fermee) {
      gestion._disconnect(connexion).catch(() => {});
      return;
    }
    d.libres.push({ gestion, connexion });
  };

  gestion.destroyConnection = async (connexion) => {
    const d = connexion.__demande;
    if (!d) return detruireCommune(connexion);
    for (const e of d.toutes) if (e.connexion === connexion) d.toutes.delete(e);
    await gestion._disconnect(connexion).catch(() => {});
  };
}

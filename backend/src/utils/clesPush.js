import webpush from 'web-push';
import { sequelize } from '../config/database.js';

/**
 * Clés d'envoi des notifications sur le téléphone (« VAPID »).
 *
 * Données par l'hébergeur (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) si elles y
 * sont ; sinon créées une seule fois par le serveur et gardées dans la base
 * (table cles_serveur), pour qu'elles restent les mêmes à chaque démarrage.
 * Sans clés, aucun téléphone ne pouvait s'inscrire : aucune notification
 * n'arrivait, sans aucun message d'erreur.
 */
const SUJET = process.env.VAPID_SUBJECT || 'mailto:noreply@moftal.com';
let pret = null;

async function lireOuCreer() {
  let publique = process.env.VAPID_PUBLIC_KEY || '';
  let privee = process.env.VAPID_PRIVATE_KEY || '';
  if (!publique || !privee) {
    await sequelize.query(`CREATE TABLE IF NOT EXISTS cles_serveur (
      nom VARCHAR(60) PRIMARY KEY, valeur TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    const lire = async () => Object.fromEntries((await sequelize.query(
      `SELECT nom, valeur FROM cles_serveur WHERE nom IN ('vapid_public', 'vapid_private')`,
      { type: sequelize.QueryTypes.SELECT }
    )).map((r) => [r.nom, r.valeur]));
    let cles = await lire();
    if (!cles.vapid_public || !cles.vapid_private) {
      const nouvelles = webpush.generateVAPIDKeys();
      // Deux démarrages en même temps : le premier enregistré gagne, l'autre le relit
      await sequelize.query(
        `INSERT INTO cles_serveur (nom, valeur) VALUES ('vapid_public', :pub), ('vapid_private', :priv) ON CONFLICT (nom) DO NOTHING`,
        { replacements: { pub: nouvelles.publicKey, priv: nouvelles.privateKey } }
      );
      cles = await lire();
      console.log('🔔 Clés des notifications créées et gardées dans la base.');
    }
    publique = cles.vapid_public;
    privee = cles.vapid_private;
  }
  webpush.setVapidDetails(SUJET, publique, privee);
  return publique;
}

/** Prépare les clés (une fois) et renvoie la clé publique ('' si impossible). */
export function preparerClesPush() {
  pret ||= lireOuCreer().catch((e) => {
    pret = null;
    console.warn('⚠️ Clés des notifications :', e.message);
    return '';
  });
  return pret;
}

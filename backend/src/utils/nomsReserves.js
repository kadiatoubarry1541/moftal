import { estAdminUtilisateur } from '../middleware/auth.js';

// ─── Noms réservés à l'entreprise Moftal ─────────────────────────────────────
// Moftal, moftal.com, Moftal Pay, Moftal.ia, moftal.gn… appartiennent à
// l'entreprise (compte admin) : aucun autre établissement ne peut les porter.
// On compare sans majuscules, accents, espaces ni ponctuation : « MOFTAL Pay »,
// « moftal-gn » ou « Möftal » sont aussi refusés.

function nomCompact(nom) {
  return String(nom || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
}

export function estNomReserve(nom) {
  return nomCompact(nom).includes('moftal');
}

/** Message de refus si `nom` est réservé et que le propriétaire n'est pas l'admin, sinon null. */
export function refusNomReserve(nom, proprietaire) {
  if (!estNomReserve(nom) || estAdminUtilisateur(proprietaire)) return null;
  return `Le nom "${String(nom).trim()}" est réservé à l'entreprise Moftal. Veuillez en choisir un autre.`;
}

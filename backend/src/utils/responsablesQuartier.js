import { sequelize } from '../config/database.js';

/**
 * Les responsables d'un quartier : les 3 chefs de sa Caisse (Compte Solidarité,
 * table quartier_funds). Le chef de quartier validé par l'admin y est placé
 * automatiquement (voir routes/responsables.js).
 *
 * Seuls eux (et les administrateurs de Moftal) voient la caisse totale, la
 * liste des membres et les papiers de résidence des habitants. Un quartier sans
 * chef n'a pas de responsable : personne n'est nommé à sa place.
 */

/** Même règle que les groupes de quartier : minuscule, sans accents. */
export function normaliserLieu(str) {
  if (!str) return '';
  return String(str).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function estAdminPlateforme(user) {
  return !!(user && (user.role === 'admin' || user.role === 'super-admin' || user.isMasterAdmin || user.canViewAll));
}

/** NuméroH des chefs de la caisse du quartier (location comparée sans accents). */
export async function chefsDuQuartier(location, scope = 'quartier') {
  const loc = normaliserLieu(location);
  if (!loc) return [];
  const lignes = await sequelize.query(
    `SELECT location, chef1_numero_h AS c1, chef2_numero_h AS c2, chef3_numero_h AS c3
       FROM quartier_funds WHERE scope = :scope AND is_active = true`,
    { replacements: { scope }, type: sequelize.QueryTypes.SELECT }
  ).catch(() => []);
  const fonds = lignes.find((l) => normaliserLieu(l.location) === loc);
  return fonds ? [fonds.c1, fonds.c2, fonds.c3].filter(Boolean) : [];
}

/** La personne est-elle l'un des 3 responsables de ce quartier (ou admin Moftal) ? */
export async function estResponsableQuartier(user, location, scope = 'quartier') {
  if (!user) return false;
  if (estAdminPlateforme(user)) return true;
  return (await chefsDuQuartier(location, scope)).includes(user.numeroH);
}

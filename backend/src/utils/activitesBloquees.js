import { sequelize } from '../config/database.js';

/**
 * Activités bloquées par l'administrateur : une personne qui se déclare
 * « Président de la République », « Maire »… sans l'être. Une activité bloquée
 * est retirée de son profil et elle ne peut plus la choisir.
 */
let tablePrete = null;
export const preparerTableActivitesBloquees = () => (tablePrete ||= sequelize.query(`
  CREATE TABLE IF NOT EXISTS activites_bloquees (
    numero_h   VARCHAR(100) NOT NULL,
    activite   VARCHAR(150) NOT NULL,
    raison     TEXT,
    bloque_par VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (numero_h, activite)
  )`).catch((e) => { tablePrete = null; throw e; }));

const norm = (a) => String(a || '').trim().toLowerCase();

/** Activités bloquées pour cette personne (en minuscules). */
export async function activitesBloqueesDe(numeroH) {
  await preparerTableActivitesBloquees();
  const lignes = await sequelize.query(
    'SELECT activite FROM activites_bloquees WHERE numero_h = :nh',
    { replacements: { nh: numeroH }, type: sequelize.QueryTypes.SELECT }
  );
  return new Set(lignes.map((l) => norm(l.activite)));
}

/** La première activité de la liste qui est bloquée pour cette personne, sinon null. */
export async function premiereActiviteBloquee(numeroH, activites) {
  const choisies = activites.filter((a) => a && String(a).trim());
  if (!numeroH || choisies.length === 0) return null;
  const bloquees = await activitesBloqueesDe(numeroH).catch(() => new Set());
  return choisies.find((a) => bloquees.has(norm(a))) || null;
}

export const messageActiviteBloquee = (a) =>
  `L'activité « ${a} » a été bloquée par l'administrateur pour votre compte. Choisissez une autre activité ou écrivez-nous.`;

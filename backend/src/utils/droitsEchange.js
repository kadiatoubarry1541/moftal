import { sequelize } from '../config/database.js';

/**
 * Droit de publier dans Échange accordé par l'admin à un professionnel du
 * commerce, secteur par secteur (alimentation, secondaire, tertiaire,
 * quaternaire, restaurants).
 *
 * Il remplace le compte « vendeur Moftal » pour les secteurs cochés, sans
 * abonnement vendeur en plus. Il n'est valable que tant que le compte
 * commerce est approuvé, actif et non suspendu : retirer, suspendre ou
 * refuser le compte retire aussi le droit.
 */
export const SECTEURS_ECHANGE = ['primaire', 'secondaire', 'tertiaire', 'quaternaire', 'nourriture'];
/** Types de comptes pros à qui l'admin peut donner ce droit */
export const TYPES_DROIT_ECHANGE = ['commerce'];

let tablePrete = null;
export function preparerTableDroits() {
  if (!tablePrete) {
    tablePrete = sequelize.query(`
      CREATE TABLE IF NOT EXISTS echange_droits_publication (
        professional_account_id UUID PRIMARY KEY,
        secteurs    JSONB        NOT NULL DEFAULT '[]',
        accorde_par VARCHAR(100),
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )`).catch((e) => { tablePrete = null; throw e; });
  }
  return tablePrete;
}

/** Secteurs où cette personne peut publier grâce à un droit accordé par l'admin. */
export async function secteursAccordes(numeroH) {
  if (!numeroH) return [];
  await preparerTableDroits();
  const rows = await sequelize.query(
    `SELECT d.secteurs FROM echange_droits_publication d
       JOIN professional_accounts p ON p.id = d.professional_account_id
      WHERE p.owner_numero_h = :n AND p.type::text IN (:types)
        AND p.status = 'approved' AND p.is_active = true
        AND (p.subscription_status IS NULL OR p.subscription_status::text <> 'blocked')`,
    { replacements: { n: numeroH, types: TYPES_DROIT_ECHANGE }, type: sequelize.QueryTypes.SELECT }
  );
  const tous = new Set();
  for (const r of rows) for (const s of (Array.isArray(r.secteurs) ? r.secteurs : [])) if (SECTEURS_ECHANGE.includes(s)) tous.add(s);
  return SECTEURS_ECHANGE.filter((s) => tous.has(s));
}

/** Tous les droits accordés : { [professional_account_id]: secteurs[] } (page admin). */
export async function tousLesDroits() {
  await preparerTableDroits();
  const rows = await sequelize.query(
    `SELECT professional_account_id::text AS id, secteurs FROM echange_droits_publication`,
    { type: sequelize.QueryTypes.SELECT }
  );
  return Object.fromEntries(rows.map((r) => [r.id, Array.isArray(r.secteurs) ? r.secteurs : []]));
}

/** Enregistre les secteurs accordés à un compte (liste vide = droit retiré). */
export async function enregistrerDroits(accountId, secteurs, parNumeroH) {
  await preparerTableDroits();
  const propres = SECTEURS_ECHANGE.filter((s) => (secteurs || []).includes(s));
  if (!propres.length) {
    await sequelize.query(`DELETE FROM echange_droits_publication WHERE professional_account_id = :id`, { replacements: { id: accountId } });
    return [];
  }
  await sequelize.query(
    `INSERT INTO echange_droits_publication (professional_account_id, secteurs, accorde_par, updated_at)
     VALUES (:id, :s::jsonb, :par, NOW())
     ON CONFLICT (professional_account_id) DO UPDATE SET secteurs = EXCLUDED.secteurs, accorde_par = EXCLUDED.accorde_par, updated_at = NOW()`,
    { replacements: { id: accountId, s: JSON.stringify(propres), par: parNumeroH || null } }
  );
  return propres;
}

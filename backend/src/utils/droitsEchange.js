import { sequelize } from '../config/database.js';
import { PRIX_VENDEUR_ECHANGE } from '../routes/payment.js';

/**
 * Droit de publier dans Échange, donné par l'admin à la personne de son
 * choix, au moment de son choix, secteur par secteur (alimentation,
 * secondaire, tertiaire, quaternaire, restaurants).
 *
 * Donner le droit = un compte « vendeur Échange » (moftal_vendor) approuvé
 * pour ce secteur. Comme tout vendeur, la personne le paie à son prix
 * (PRIX_VENDEUR_ECHANGE), en plus de ses autres comptes (commerce, école…) :
 * chaque compte se paie séparément. Retirer le droit désactive ce compte
 * (son historique de paiement est gardé ; le redonner le réactive).
 */
export const SECTEURS_ECHANGE = ['primaire', 'secondaire', 'tertiaire', 'quaternaire', 'nourriture'];

/** Droits de toutes les personnes : { [NuméroH]: [{ secteur, paye, jusquau, prix }] } (page admin). */
export async function tousLesDroits() {
  const rows = await sequelize.query(
    `SELECT owner_numero_h, sub_sector, subscription_status::text AS statut, subscription_valid_until
       FROM professional_accounts
      WHERE type = 'moftal_vendor' AND status = 'approved' AND is_active = true AND sub_sector IN (:secteurs)
      ORDER BY created_at`,
    { replacements: { secteurs: SECTEURS_ECHANGE }, type: sequelize.QueryTypes.SELECT }
  );
  const maintenant = new Date();
  const droits = {};
  for (const r of rows) {
    const jusquau = r.subscription_valid_until ? new Date(r.subscription_valid_until) : null;
    (droits[r.owner_numero_h] ||= []).push({
      secteur: r.sub_sector,
      paye: r.statut === 'active' && !!jusquau && jusquau > maintenant,
      jusquau: r.subscription_valid_until,
      prix: PRIX_VENDEUR_ECHANGE[r.sub_sector] || null,
    });
  }
  return droits;
}

/**
 * Donne à la personne exactement les secteurs cochés : comptes vendeur créés
 * ou réactivés (approuvés, à payer), comptes des secteurs décochés désactivés.
 * Renvoie les secteurs nouvellement ouverts.
 */
export async function enregistrerDroits({ ownerNumeroH, nom, telephone, ville }, secteurs, parNumeroH) {
  const voulus = SECTEURS_ECHANGE.filter((s) => (secteurs || []).includes(s));
  const comptes = await sequelize.query(
    `SELECT id, sub_sector, status::text AS status, is_active FROM professional_accounts
      WHERE type = 'moftal_vendor' AND owner_numero_h = :n ORDER BY created_at DESC`,
    { replacements: { n: ownerNumeroH }, type: sequelize.QueryTypes.SELECT }
  );
  const ouverts = [];
  await sequelize.transaction(async (transaction) => {
    for (const secteur of SECTEURS_ECHANGE) {
      const compte = comptes.find((c) => c.sub_sector === secteur);
      const actif = !!compte && compte.status === 'approved' && compte.is_active;
      if (voulus.includes(secteur)) {
        if (actif) continue;
        ouverts.push(secteur);
        if (compte) {
          // Pas d'essai gratuit : le vendeur paie avant de publier
          await sequelize.query(
            `UPDATE professional_accounts SET status = 'approved', is_active = true, is_trial = false,
               approved_at = COALESCE(approved_at, NOW()), approved_by = :par, updated_at = NOW()
             WHERE id = :id`,
            { replacements: { id: compte.id, par: parNumeroH || null }, transaction }
          );
        } else {
          await sequelize.query(
            `INSERT INTO professional_accounts (id, type, name, description, phone, city, owner_numero_h, status, sub_sector,
               subscription_status, is_trial, is_active, approved_at, approved_by, created_at, updated_at)
             VALUES (gen_random_uuid(), 'moftal_vendor', :nom, '', :tel, :ville, :owner, 'approved', :secteur,
               'never_paid', false, true, NOW(), :par, NOW(), NOW())`,
            { replacements: { nom: nom || 'Vendeur Échange', tel: telephone || '', ville: ville || '', owner: ownerNumeroH, secteur, par: parNumeroH || null }, transaction }
          );
        }
      } else if (actif) {
        await sequelize.query(
          `UPDATE professional_accounts SET is_active = false, updated_at = NOW() WHERE id = :id`,
          { replacements: { id: compte.id }, transaction }
        );
      }
    }
  });
  return ouverts;
}

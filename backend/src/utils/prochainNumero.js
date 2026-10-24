// Prochain numéro d'une fiche (ordonnance, facture, matricule, dossier…) :
// le plus grand numéro déjà donné avec ce préfixe + 1. Avant, « nombre de
// fiches + 1 » redonnait un numéro déjà utilisé dès qu'une fiche était supprimée.
import { sequelize } from '../config/database.js';

const COLONNES = {
  clinic_staff: 'matricule', clinic_prescriptions: 'numero_ordo', clinic_invoices: 'numero_facture',
  school_students: 'numero_matricule', school_staff: 'matricule', juridique_dossiers: 'reference',
};

export async function prochainNumero(table, code, prefixe, largeur) {
  const colonne = COLONNES[table];
  if (!colonne) throw new Error(`prochainNumero : table inconnue ${table}`);
  const [row] = await sequelize.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(${colonne} FROM '([0-9]+)$') AS INTEGER)), 0) AS n
       FROM ${table} WHERE tenant_code = :code AND ${colonne} LIKE :motif`,
    { replacements: { code, motif: `${prefixe.replace(/[\\%_]/g, '\\$&')}%` }, type: sequelize.QueryTypes.SELECT }
  );
  return `${prefixe}${String(+row.n + 1).padStart(largeur, '0')}`;
}

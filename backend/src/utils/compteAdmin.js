import { MASTER_ADMIN_NUMEROS } from '../middleware/auth.js';

/**
 * Comptes de l'administration : secrets, jamais montrés ni trouvables par les
 * membres (suggestions, recherches par nom / téléphone / e-mail / NuméroH).
 * Rôle admin, NuméroH maîtres, ou NuméroH de génération réservée G0–G90
 * (aucun vivant ne peut l'avoir : les vivants sont en G96).
 */
export const ROLES_ADMIN = ['admin', 'super-admin', 'superadmin', 'administrator'];
const RESERVE_RE = /^G([0-9]|[1-8][0-9]|90)C/i;
export function estCompteAdmin(u) {
  if (!u) return false;
  return ROLES_ADMIN.includes(String(u.role || '').toLowerCase())
    || MASTER_ADMIN_NUMEROS.includes(u.numeroH)
    || RESERVE_RE.test(String(u.numeroH || ''));
}
// Même règle en SQL (prefixe = alias de table, ex. '"User".')
export const sansComptesAdmin = (prefixe = '') => `NOT (
  LOWER(COALESCE(${prefixe}role, 'user')) IN (${ROLES_ADMIN.map((x) => `'${x}'`).join(', ')})
  OR ${prefixe}numero_h IN (${MASTER_ADMIN_NUMEROS.map((x) => `'${x}'`).join(', ')})
  OR ${prefixe}numero_h ~* '^G([0-9]|[1-8][0-9]|90)C')`;


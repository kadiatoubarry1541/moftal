import { Op } from 'sequelize';
import Payment from '../models/Payment.js';
import { MASTER_ADMIN_NUMEROS } from '../middleware/auth.js';

// ─────────────────────────────────────────────────────────────────────────────
// Inspir — qui voit quoi.
// Inspir sert à sensibiliser : on y publie le bien que l'on doit faire pour
// l'autre. Chaque section parle de CE QU'ON DOIT FAIRE POUR quelqu'un :
//   • parents  → pour nos parents       (tout le monde, y compris les -18 ans)
//   • femmes   → pour nos femmes        (vu par les hommes)
//   • hommes   → pour nos maris         (vu par les femmes)
//   • enfants  → pour nos enfants       (vu par les adultes)
// Un enfant de moins de 18 ans voit seulement « parents ».
// ─────────────────────────────────────────────────────────────────────────────

export const INSPIR_SECTIONS = ['parents', 'femmes', 'hommes', 'enfants'];

export function isInspirAdmin(user) {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  return role === 'admin' || role === 'super-admin' || user.isAdmin === true || user.isMasterAdmin === true
    || MASTER_ADMIN_NUMEROS.includes(user.numeroH);
}

function ageOf(dateNaissance) {
  if (!dateNaissance) return null;
  const b = new Date(dateNaissance);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age;
}

export function allowedInspirSections(user) {
  if (isInspirAdmin(user)) return [...INSPIR_SECTIONS];
  const age = ageOf(user?.dateNaissance || user?.date_naissance);
  if (age !== null && age < 18) return ['parents'];
  const g = String(user?.genre || '').trim().toUpperCase();
  if (['HOMME', 'H', 'M', 'MASCULIN', 'MALE'].includes(g)) return ['parents', 'femmes', 'enfants'];
  if (['FEMME', 'F', 'FEMININ', 'FÉMININ', 'FEMALE'].includes(g)) return ['parents', 'hommes', 'enfants'];
  return ['parents', 'enfants'];
}

// Bibliothèque (livres) : abonnement annuel actif, ou administrateur
export async function hasLivresAccess(user) {
  if (isInspirAdmin(user)) return true;
  const unAnAvant = new Date();
  unAnAvant.setFullYear(unAnAvant.getFullYear() - 1);
  const pass = await Payment.findOne({
    where: {
      payerNumeroH: user.numeroH,
      purpose: 'subscription_livres_an',
      status: 'completed',
      createdAt: { [Op.gte]: unAnAvant },
    },
    order: [['createdAt', 'DESC']],
  });
  return pass;
}

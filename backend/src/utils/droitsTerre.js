/**
 * Droits de publier une actualité dans Terre ADAM, en plus des admins, des
 * comptes « journaliste » et des responsables validés :
 *  - dans son quartier, tout habitant de 25 ans ou plus ;
 *  - partout, tout journaliste qui a un compte pro (service Journalistes),
 *    sans attendre la validation de son établissement (sauf s'il est refusé
 *    ou désactivé).
 */
import ProfessionalAccount from '../models/ProfessionalAccount.js';

export const AGE_MIN_PUBLIER_QUARTIER = 25;

/** Âge de la personne : d'après sa date de naissance, sinon son âge enregistré. */
export function ageDe(user) {
  const naissance = user?.dateNaissance ? new Date(user.dateNaissance) : null;
  if (naissance && !Number.isNaN(naissance.getTime())) {
    const auj = new Date();
    let age = auj.getFullYear() - naissance.getFullYear();
    const m = auj.getMonth() - naissance.getMonth();
    if (m < 0 || (m === 0 && auj.getDate() < naissance.getDate())) age--;
    return age;
  }
  const age = Number(user?.age);
  return Number.isFinite(age) && age > 0 ? age : null;
}

const norme = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

/** Le quartier (tel que la page Terre ADAM l'envoie) est l'une des résidences de la personne. */
export function habiteLeQuartier(user, location) {
  const lieu = norme(location);
  if (!lieu || lieu === 'non spécifié' || lieu === 'non specifie') return false;
  return ['lieu1', 'lieu2', 'lieu3', 'lieuResidence1', 'lieuResidence2', 'lieuResidence3']
    .some((champ) => norme(user?.[champ]) === lieu);
}

/** Habitant de 25 ans ou plus, qui publie dans l'un de ses quartiers. */
export function peutPublierCommeAncien(user, scope, location) {
  if (scope !== 'quartier') return false;
  const age = ageDe(user);
  return age !== null && age >= AGE_MIN_PUBLIER_QUARTIER && habiteLeQuartier(user, location);
}

/** La personne possède un compte pro de journaliste (non refusé, actif). */
export async function estJournalistePro(numeroH) {
  if (!numeroH) return false;
  const n = await ProfessionalAccount.count({
    where: { ownerNumeroH: numeroH, type: 'journalist', isActive: true, status: ['pending', 'approved'] },
  });
  return n > 0;
}

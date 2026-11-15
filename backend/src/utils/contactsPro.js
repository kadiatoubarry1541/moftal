/**
 * Contacts des professionnels (téléphone, e-mail) — règle de la propriétaire :
 *
 *  - Le public ne voit ni le téléphone ni l'e-mail d'un professionnel : on passe
 *    par une demande de rendez-vous (ou une commande) dans Moftal.
 *  - Exception : les urgences (santé, sécurité) gardent leur numéro visible.
 *  - Le client dont le rendez-vous est accepté reçoit les contacts du pro
 *    (notification + écran du rendez-vous). Idem pour l'acheteur dont la
 *    commande Échanges est acceptée.
 *  - Le propriétaire du compte et l'administrateur voient toujours tout.
 */

/** Types de comptes pro dont le numéro reste public (urgences). */
export const TYPES_URGENCE = ['clinic', 'health_worker', 'security_agency'];

export const estUrgence = (type) => TYPES_URGENCE.includes(String(type || ''));

/** Copie de l'objet sans téléphone ni e-mail (sauf urgences : le numéro reste). */
export function sansContacts(objet, type = objet?.type) {
  if (!objet) return objet;
  const o = { ...objet };
  delete o.email;
  if (!estUrgence(type)) {
    delete o.phone;
    delete o.phone_urgence;
  }
  return o;
}

/** Contacts à donner à une personne autorisée (rendez-vous ou commande acceptés). */
export function contactsDe(compte) {
  if (!compte) return null;
  const phone = String(compte.phone || '').trim();
  const email = String(compte.email || '').trim();
  if (!phone && !email) return null;
  return { phone: phone || null, email: email || null };
}

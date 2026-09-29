import Notification from '../models/Notification.js';

// Envoie une notification à une personne (cloche + notification sur le téléphone).
// Avant, plusieurs gestions écrivaient directement dans la table avec de mauvaises
// colonnes : l'erreur était ignorée et personne ne recevait rien.
const TITRES = {
  bulletin: 'Nouveau bulletin',
  school_member: 'Établissement scolaire',
  pro_connection: 'Réseau professionnel',
  pro_announcement: 'Annonce',
  community_join: 'Nouveau membre',
  imam_connection: 'Réseau des imams',
  friday_khutba: 'Khoutba du vendredi',
  coordinator_msg: 'Message du coordinateur',
  acces_enseignant: 'Accès enseignant',
};

export function notifier(numeroH, type, message) {
  if (!numeroH || !message) return Promise.resolve();
  return Notification.createNotification({
    recipientNumeroH: numeroH, type, title: TITRES[type] || 'Notification', message,
  }).catch(() => {});
}

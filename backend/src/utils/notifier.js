import Notification from '../models/Notification.js';

// Notification à une personne (cloche, temps réel et push sur le téléphone).
// Passe par le modèle : la table « notifications » n'a pas de colonne user_id,
// et le titre y est obligatoire. Ne bloque jamais l'action qui l'envoie.
const TITRES = {
  school_member: 'Établissement',
  bulletin: 'Bulletin disponible',
  pro_connection: 'Réseau professionnel',
  community_join: 'Nouveau membre',
  pro_announcement: 'Annonce',
  imam_connection: 'Réseau des imams',
  friday_khutba: 'Khoutba du vendredi',
  coordinator_msg: 'Message du coordinateur',
  echange_droit: 'Publication dans Échange',
};

export async function notifier(numeroH, type, message, titre) {
  if (!numeroH || !message) return;
  try {
    await Notification.createNotification({ recipientNumeroH: String(numeroH), type, title: titre || TITRES[type] || 'Notification', message: String(message) });
  } catch (e) {
    console.warn(`⚠️ Notification « ${type} » non envoyée :`, e.message);
  }
}

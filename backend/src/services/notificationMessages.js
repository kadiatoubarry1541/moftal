import webpush from 'web-push';
import User from '../models/User.js';
import PushSubscription from '../models/PushSubscription.js';
import { compterNonLus } from '../routes/unread.js';

// Notification sur le téléphone à chaque nouveau message (ami, couple,
// parent/enfant, famille principale, quartier, activité), même application
// fermée, avec le nombre de messages non lus pour l'icône de l'application.
// Jamais à l'expéditeur. Envoyé après la réponse : n'alourdit jamais l'envoi.

const MAX_AVEC_COMPTEUR = 300; // au-delà (très grand groupe), pas de calcul du chiffre

// Photo de l'expéditeur en adresse complète (la notification s'affiche hors du site)
const ADRESSE_SERVEUR = (process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL || 'https://moftal.com').replace(/\/$/, '');
function photoAbsolue(photo) {
  if (!photo || typeof photo !== 'string' || photo.startsWith('data:')) return undefined;
  if (/^https?:\/\//.test(photo)) return photo;
  return `${ADRESSE_SERVEUR}${photo.startsWith('/') ? '' : '/'}${photo}`;
}

function apercu(message) {
  const type = message.messageType || message.type;
  if (type === 'image') return '📷 Photo';
  if (type === 'video') return '🎥 Vidéo';
  if (type === 'audio') return '🎤 Message vocal';
  const texte = String(message.content || '').trim();
  return texte.length > 120 ? `${texte.slice(0, 117)}…` : texte;
}

/**
 * @param {object} p
 * @param {string[]} p.destinataires  NuméroH des personnes à prévenir
 * @param {object}   p.expediteur     req.user (prenom, nomFamille, numeroH)
 * @param {string}   p.convKey        clé de la conversation (comme /api/unread)
 * @param {object}   p.message        message créé (content, messageType)
 * @param {string}  [p.groupe]        nom du groupe, pour les discussions de groupe
 */
export function notifierNouveauMessage({ destinataires, expediteur, convKey, message, groupe }) {
  setImmediate(async () => {
    try {
      const liste = [...new Set((destinataires || []).filter((n) => n && n !== expediteur.numeroH))];
      if (!liste.length) return;
      const nom = [expediteur.prenom, expediteur.nomFamille].filter(Boolean).join(' ') || 'Un membre';
      const title = groupe ? `${groupe} · ${nom}` : nom;
      const body = apercu(message);
      const avecCompteur = liste.length <= MAX_AVEC_COMPTEUR;
      const icon = photoAbsolue(expediteur.photo);

      for (const numeroH of liste) {
        const subs = await PushSubscription.getForUser(numeroH).catch(() => []);
        if (!subs.length) continue;
        let badgeCount;
        if (avecCompteur) {
          const user = await User.findByNumeroH(numeroH);
          if (user) badgeCount = (await compterNonLus(user).catch(() => null))?.total;
        }
        const payload = JSON.stringify({
          type: 'message', title, message: body, url: '/compte?messages=1',
          id: `msg-${convKey}`, badgeCount, icon
        });
        await Promise.allSettled(subs.map(async (sub) => {
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
          } catch (err) {
            if (err.statusCode === 410 || err.statusCode === 404) await PushSubscription.removeExpired(sub.endpoint);
          }
        }));
      }
    } catch (err) {
      console.warn('⚠️ notification message:', err.message);
    }
  });
}

/** Membres de la famille principale (même nom de famille, comme la messagerie familiale). */
export async function membresFamille(familyName) {
  if (!familyName) return [];
  const users = await User.findAll({ where: { nomFamille: familyName, isActive: true }, attributes: ['numeroH'], limit: 2000 });
  return users.map((u) => u.numeroH);
}

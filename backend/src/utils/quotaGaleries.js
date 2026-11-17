import { sequelize } from '../config/database.js';

/**
 * Règles des galeries — une seule source pour tout Moftal.
 *
 *  - Galerie familiale : 10 photos + 2 vidéos gratuites pour la famille,
 *    puis 1 photo offerte chaque mois et 1 vidéo offerte tous les 3 mois.
 *  - Galeries personnelles (album privé, couple, parent-enfant) : 5 photos +
 *    2 vidéos gratuites PAR PERSONNE, puis 1 photo offerte chaque mois et
 *    1 vidéo offerte tous les 6 mois.
 *
 * On compte ce qui est réellement dans la galerie : supprimer une photo libère
 * sa place pour en mettre une autre. Au-delà du gratuit, on paie avec les
 * points de galerie (1 point la photo ; la vidéo selon sa durée).
 *
 * Les cadeaux mensuels se comptent à partir du lancement de cette règle
 * (ou de la création du compte / de la galerie si elle est plus récente).
 */
export const REGLES_GALERIES = {
  famille:   { photos: 10, videos: 2, moisParPhoto: 1, moisParVideo: 3 },
  personnel: { photos: 5,  videos: 2, moisParPhoto: 1, moisParVideo: 6 },
};

export const DEBUT_CADEAUX_MENSUELS = new Date('2026-11-17T00:00:00Z');
export const COUT_PHOTO = 1;

/** Coût d'une vidéo en points selon sa durée (secondes) — même grille que la galerie familiale. */
export function coutVideo(duree) {
  const d = Number(duree);
  if (!Number.isFinite(d) || d <= 0) return 5;
  if (d <= 10) return 2;
  if (d <= 20) return 3;
  return 5;
}

/** Nombre de mois entiers écoulés depuis `depuis` (jamais avant le lancement des cadeaux). */
export function moisEcoules(depuis, maintenant = new Date()) {
  const debut = new Date(Math.max(new Date(depuis || maintenant).getTime() || maintenant.getTime(), DEBUT_CADEAUX_MENSUELS.getTime()));
  let mois = (maintenant.getFullYear() - debut.getFullYear()) * 12 + (maintenant.getMonth() - debut.getMonth());
  if (maintenant.getDate() < debut.getDate()) mois -= 1;
  return { mois: Math.max(0, mois), debut };
}

const ajouterMois = (date, n) => { const d = new Date(date); d.setMonth(d.getMonth() + n); return d; };

/** Photos et vidéos gratuites auxquelles on a droit aujourd'hui. */
export function droitsGratuits(regle, depuis) {
  const { mois, debut } = moisEcoules(depuis);
  const bonusPhotos = Math.floor(mois / regle.moisParPhoto);
  const bonusVideos = Math.floor(mois / regle.moisParVideo);
  return {
    photos: regle.photos + bonusPhotos,
    videos: regle.videos + bonusVideos,
    prochainePhotoOfferte: ajouterMois(debut, (bonusPhotos + 1) * regle.moisParPhoto),
    prochaineVideoOfferte: ajouterMois(debut, (bonusVideos + 1) * regle.moisParVideo),
  };
}

/** photo / vidéo / audio d'un souvenir enregistré (adresse + contenu JSON éventuel). */
export function typeMedia(mediaUrl, content) {
  if (content) {
    try {
      const t = JSON.parse(content)?.mediaType;
      if (t === 'photo' || t === 'video' || t === 'audio') return t;
    } catch { /* légende en texte simple */ }
  }
  const u = String(mediaUrl || '').toLowerCase();
  if (u.startsWith('data:video')) return 'video';
  if (u.startsWith('data:audio')) return 'audio';
  if (u.startsWith('data:image')) return 'photo';
  const chemin = u.split('?')[0];
  if (/\.(mp4|webm|mov|m4v|3gp|mkv)$/.test(chemin)) return 'video';
  if (/\.(ogg|mp3|m4a|wav|aac|opus)$/.test(chemin)) return 'audio';
  return 'photo';
}

export async function pointsDisponibles(numeroH) {
  const [rows] = await sequelize.query(
    `SELECT points_disponibles, expires_at FROM gallery_points WHERE numero_h = :numeroH LIMIT 1`,
    { replacements: { numeroH } }
  ).catch(() => [[]]);
  const r = rows?.[0];
  if (!r) return 0;
  if (r.expires_at && new Date(r.expires_at) < new Date()) return 0;
  return Number(r.points_disponibles) || 0;
}

/** Résumé envoyé à la page : gratuit utilisé / restant, prochains cadeaux, points. */
export async function resumeQuota(regle, depuis, nbPhotos, nbVideos, numeroH) {
  const droits = droitsGratuits(regle, depuis);
  return {
    photosGratuites: droits.photos,
    videosGratuites: droits.videos,
    photosUtilisees: nbPhotos,
    videosUtilisees: nbVideos,
    photosRestantes: Math.max(0, droits.photos - nbPhotos),
    videosRestantes: Math.max(0, droits.videos - nbVideos),
    prochainePhotoOfferte: droits.prochainePhotoOfferte,
    prochaineVideoOfferte: droits.prochaineVideoOfferte,
    moisParVideo: regle.moisParVideo,
    pointsDisponibles: numeroH ? await pointsDisponibles(numeroH) : 0,
    coutPhoto: COUT_PHOTO,
  };
}

/**
 * Autorise une nouvelle photo / vidéo : gratuite si on est sous ses droits,
 * sinon payée en points (débit atomique, jamais en dessous de 0, points non expirés).
 * Lève une erreur { code: 'QUOTA_EXCEEDED', status: 402 } si ni l'un ni l'autre.
 */
export async function autoriserPublication({ regle, depuis, nbPhotos, nbVideos, estVideo, numeroH, dureeVideo }) {
  const droits = droitsGratuits(regle, depuis);
  if (estVideo ? nbVideos < droits.videos : nbPhotos < droits.photos) return { mode: 'gratuit', cout: 0 };

  const cout = estVideo ? coutVideo(dureeVideo) : COUT_PHOTO;
  const [, meta] = await sequelize.query(`
    UPDATE gallery_points
       SET points_disponibles = points_disponibles - :cout, updated_at = NOW()
     WHERE numero_h = :numeroH
       AND points_disponibles >= :cout
       AND (expires_at IS NULL OR expires_at >= NOW())
  `, { replacements: { numeroH, cout } });
  if ((meta?.rowCount ?? meta?.affectedRows ?? 0) > 0) return { mode: 'points', cout };

  const quoi = estVideo ? 'vidéos' : 'photos';
  throw Object.assign(new Error(
    `Vos ${quoi} gratuites sont toutes utilisées. Retirez-en une pour en mettre une autre, ` +
    `ou achetez des points pour publier plus (${cout} point${cout > 1 ? 's' : ''} pour cette ${estVideo ? 'vidéo' : 'photo'}).`
  ), { code: 'QUOTA_EXCEEDED', status: 402, isVideo: !!estVideo, cout });
}

/** Rend les points d'une publication qui a échoué après le débit. */
export async function rembourserPoints(numeroH, autorisation) {
  if (autorisation?.mode !== 'points' || !autorisation.cout) return;
  await sequelize.query(
    `UPDATE gallery_points SET points_disponibles = points_disponibles + :cout, updated_at = NOW() WHERE numero_h = :numeroH`,
    { replacements: { numeroH, cout: autorisation.cout } }
  ).catch(() => {});
}

/** Réponse HTTP standard pour un refus de quota. */
export function repondreQuota(res, err) {
  return res.status(402).json({ success: false, code: 'QUOTA_EXCEEDED', isVideo: err.isVideo, message: err.message });
}

/**
 * Compte les photos et vidéos publiées par `numeroH` dans une galerie à deux
 * (couple_activities, parent_child_activities). `paireSql` est écrit dans le
 * code (jamais par l'utilisateur) ; les valeurs passent par `replacements`.
 */
export async function compterMediasPublies(table, paireSql, replacements, numeroH) {
  const [rows] = await sequelize.query(
    `SELECT LEFT(media_url, 200) AS media_url, content FROM ${table}
      WHERE ${paireSql} AND from_numero_h = :__auteur AND media_url IS NOT NULL AND COALESCE(is_active, true) = true`,
    { replacements: { ...replacements, __auteur: numeroH } }
  );
  let nbPhotos = 0, nbVideos = 0;
  for (const r of rows) {
    const t = typeMedia(r.media_url, r.content);
    if (t === 'photo') nbPhotos++;
    else if (t === 'video') nbVideos++;
  }
  return { nbPhotos, nbVideos };
}

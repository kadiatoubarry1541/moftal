import { sequelize } from '../config/database.js';

/**
 * Offre gratuite des galeries.
 *
 * - Galerie personnelle, galeries du Noyau (parents, enfants, conjoint) et
 *   galerie souvenirs entre amis précieux : 5 photos + 2 vidéos gratuites.
 * - Galerie famille (partagée) : 7 photos + 2 vidéos gratuites.
 *
 * On compte ce qui est DANS la galerie en ce moment : supprimer ou remplacer
 * une photo libère sa place, et l'offre gratuite peut resservir. Au-delà, chaque
 * ajout se paie avec les points de la personne qui ajoute (1 point la photo,
 * 2 à 5 points la vidéo selon sa durée).
 */
export const OFFRES_GALERIES = {
  personnelle: { photos: 5, videos: 2 },
  noyau: { photos: 5, videos: 2 },
  amis: { photos: 5, videos: 2 },
  famille: { photos: 7, videos: 2 },
};

/** Prix d'une vidéo au-delà de l'offre, selon sa durée (en secondes). */
export function coutVideo(duree) {
  const d = parseFloat(duree || '30');
  if (d <= 10) return 2;
  if (d <= 20) return 3;
  return 5;
}

/** Photo, vidéo ou audio, d'après ce que l'on sait d'un média enregistré. */
export function genreMedia({ type, content, mediaUrl } = {}) {
  if (type === 'video' || type === 'image' || type === 'photo') return type === 'video' ? 'video' : 'photo';
  if (content) {
    try {
      const p = JSON.parse(content);
      if (p?.mediaType === 'video') return 'video';
      if (p?.mediaType === 'audio') return 'audio';
      if (p?.mediaType === 'photo') return 'photo';
    } catch { /* légende en texte simple */ }
  }
  const url = String(mediaUrl || '');
  if (url.startsWith('data:video')) return 'video';
  if (url.startsWith('data:audio')) return 'audio';
  if (/\.(mp4|mov|avi|m4v)(\?|$)/i.test(url)) return 'video';
  if (/\.(mp3|m4a|wav|aac|oga)(\?|$)/i.test(url)) return 'audio';
  return 'photo';
}

/** Ce qui reste de l'offre gratuite. */
export function resumeOffre(offre, photos, videos) {
  return {
    photosLibres: offre.photos,
    videosLibres: offre.videos,
    photosUtilisees: photos,
    videosUtilisees: videos,
    photosRestantes: Math.max(0, offre.photos - photos),
    videosRestantes: Math.max(0, offre.videos - videos),
  };
}

/**
 * Une photo ou une vidéo de plus dans une galerie : gratuite tant que l'offre
 * n'est pas atteinte, sinon payée en points (déduits d'un seul coup en base,
 * jamais en dessous de zéro). Lève QUOTA_EXCEEDED si les points manquent.
 */
export async function placeDansGalerie({ offre, photos, videos, estVideo, numeroH, cout }) {
  const dejaLa = estVideo ? videos : photos;
  const libres = estVideo ? offre.videos : offre.photos;
  if (dejaLa < libres) return { mode: 'gratuit' };

  const prix = cout ?? (estVideo ? 5 : 1);
  await sequelize.query(`
    INSERT INTO gallery_points (id, numero_h, points_disponibles, total_achete, created_at, updated_at)
    VALUES (gen_random_uuid(), :numeroH, 0, 0, NOW(), NOW())
    ON CONFLICT (numero_h) DO NOTHING
  `, { replacements: { numeroH } });
  const [, meta] = await sequelize.query(`
    UPDATE gallery_points
    SET points_disponibles = points_disponibles - :prix, updated_at = NOW()
    WHERE numero_h = :numeroH
      AND points_disponibles >= :prix
      AND (expires_at IS NULL OR expires_at >= NOW())
  `, { replacements: { numeroH, prix } });
  if ((meta?.rowCount ?? meta?.affectedRows ?? 0) > 0) return { mode: 'points', pointsUtilises: prix };

  throw Object.assign(new Error(estVideo ? 'QUOTA_VIDEO' : 'QUOTA_PHOTO'), { code: 'QUOTA_EXCEEDED', isVideo: estVideo, prix });
}

/** Réponse 402 quand l'offre gratuite est atteinte et qu'il n'y a pas assez de points. */
export function refusOffre(res, err, offre) {
  const quoi = err.isVideo ? `${offre.videos} vidéos` : `${offre.photos} photos`;
  const prix = err.prix === 1 ? '1 point' : `${err.prix} points`;
  return res.status(402).json({
    success: false,
    code: 'QUOTA_EXCEEDED',
    isVideo: err.isVideo,
    message: `Votre offre gratuite (${quoi}) est utilisée. Supprimez ou remplacez un élément, ou achetez des points : ${prix} pour ${err.isVideo ? 'cette vidéo' : 'cette photo'}.`,
  });
}

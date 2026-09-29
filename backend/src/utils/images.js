// Toute image du téléphone doit être acceptée : JPG, PNG, WEBP, GIF, SVG, mais aussi
// HEIC/HEIF (photos iPhone et de nombreux Android), AVIF, BMP, TIFF…
// Les formats que les navigateurs n'affichent pas sont convertis ici en JPEG/PNG,
// sans rien changer à l'image elle-même.
import sharp from 'sharp';
import heicConvert from 'heic-convert';

const AFFICHABLES = /^image\/(jpeg|jpg|pjpeg|png|gif|webp|svg\+xml|avif)$/i;
const EXT_IMAGE = /\.(jpe?g|jfif|pjpeg|pjp|png|gif|webp|svg|avif|heic|heif|hif|bmp|dib|tiff?|ico|jp2|jxl|raw|dng|cr2|nef|arw)$/i;

/** Vrai si le fichier est une image, quel que soit son format (même mimetype vide). */
export function estImage(file) {
  const mime = String(file?.mimetype || file?.type || '');
  return mime.startsWith('image/') || EXT_IMAGE.test(String(file?.originalname || file?.name || ''));
}

function estHeic(buffer) {
  // En-tête « ftyp » + marque HEIF (heic, heix, mif1, msf1, hevc…)
  const marque = buffer.slice(8, 12).toString('ascii');
  return buffer.slice(4, 8).toString('ascii') === 'ftyp' && /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(marque);
}

/**
 * Rend une image affichable partout. Renvoie { buffer, mime, ext } : l'image
 * telle quelle si le navigateur sait l'afficher, sinon convertie en JPEG
 * (ou PNG si elle a de la transparence).
 */
export async function imageAffichable(buffer, mime = '') {
  if (AFFICHABLES.test(mime) && !estHeic(buffer)) return { buffer, mime, ext: mime.split('/')[1].replace('svg+xml', 'svg').replace('jpeg', 'jpg') };
  if (estHeic(buffer) || /hei[cf]/i.test(mime)) {
    const out = Buffer.from(await heicConvert({ buffer, format: 'JPEG', quality: 0.9 }));
    return { buffer: out, mime: 'image/jpeg', ext: 'jpg' };
  }
  const img = sharp(buffer, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  if (meta.hasAlpha) return { buffer: await img.png().toBuffer(), mime: 'image/png', ext: 'png' };
  return { buffer: await img.jpeg({ quality: 90 }).toBuffer(), mime: 'image/jpeg', ext: 'jpg' };
}

/** Convertit en place les images d'une requête multer (req.file / req.files). */
export async function convertirImagesRequete(req) {
  const fichiers = [req.file, ...(Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat())].filter(Boolean);
  for (const f of fichiers) {
    if (!f.buffer || !estImage(f)) continue;
    try {
      const r = await imageAffichable(f.buffer, f.mimetype);
      if (r.buffer !== f.buffer) {
        f.buffer = r.buffer; f.size = r.buffer.length; f.mimetype = r.mime;
        f.originalname = String(f.originalname || 'image').replace(/\.[^.]*$/, '') + '.' + r.ext;
      }
    } catch { /* image illisible : on la garde telle quelle */ }
  }
}

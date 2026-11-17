import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import { uploadToImageKit } from '../services/imagekitStorage.js';
import { uploadToR2, deleteFromR2 } from '../services/r2Storage.js';
import { uploadToIDrive } from '../services/idriveStorage.js';

// Album privé : chaque personne a le sien, que personne d'autre ne voit
// (ni la famille, ni les amis, ni l'admin). 7 fichiers au maximum :
// 5 photos et 2 vidéos de 5 secondes au plus.

export const ALBUM_PRIVE_MAX_PHOTOS = 5;
export const ALBUM_PRIVE_MAX_VIDEOS = 2;
export const ALBUM_PRIVE_DUREE_MAX_VIDEO = 5; // secondes

const router = express.Router();
router.use(authenticate);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

let tablePrete = false;
async function assurerTable() {
  if (tablePrete) return;
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS "private_album_items" (
      "id"              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      "owner_numero_h"  VARCHAR(255) NOT NULL,
      "type"            VARCHAR(10)  NOT NULL,
      "url"             TEXT         NOT NULL,
      "duree"           REAL,
      "created_at"      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
  `);
  await sequelize.query(`CREATE INDEX IF NOT EXISTS "private_album_items_owner" ON "private_album_items" ("owner_numero_h");`);
  tablePrete = true;
}

async function elementsDe(numeroH) {
  const [rows] = await sequelize.query(
    `SELECT id, type, url, duree, created_at AS "createdAt"
       FROM private_album_items WHERE owner_numero_h = :numeroH ORDER BY created_at DESC`,
    { replacements: { numeroH } }
  );
  return rows;
}

const limites = { maxPhotos: ALBUM_PRIVE_MAX_PHOTOS, maxVideos: ALBUM_PRIVE_MAX_VIDEOS, dureeMaxVideo: ALBUM_PRIVE_DUREE_MAX_VIDEO };

/** GET /api/album-prive — mon album (uniquement le mien) */
router.get('/', async (req, res) => {
  try {
    await assurerTable();
    res.json({ success: true, elements: await elementsDe(req.user.numeroH), limites });
  } catch (e) {
    console.error('Album privé (lecture):', e);
    res.status(500).json({ success: false, message: "Votre album n'a pas pu être chargé." });
  }
});

/** POST /api/album-prive — ajoute une photo ou une vidéo (champ « fichier ») */
router.post('/', upload.single('fichier'), async (req, res) => {
  try {
    await assurerTable();
    const fichier = req.file;
    if (!fichier) return res.status(400).json({ success: false, message: 'Choisissez une photo ou une vidéo.' });
    const estPhoto = fichier.mimetype.startsWith('image/');
    const estVideo = fichier.mimetype.startsWith('video/');
    if (!estPhoto && !estVideo) return res.status(400).json({ success: false, message: 'Seules les photos et les vidéos sont acceptées.' });

    const duree = Number(req.body.duree);
    if (estVideo && (!Number.isFinite(duree) || duree > ALBUM_PRIVE_DUREE_MAX_VIDEO + 0.5)) {
      return res.status(400).json({ success: false, message: `Une vidéo de l'album privé dure ${ALBUM_PRIVE_DUREE_MAX_VIDEO} secondes au maximum.` });
    }

    const elements = await elementsDe(req.user.numeroH);
    const nbPhotos = elements.filter(e => e.type === 'photo').length;
    const nbVideos = elements.filter(e => e.type === 'video').length;
    if (estPhoto && nbPhotos >= ALBUM_PRIVE_MAX_PHOTOS) {
      return res.status(400).json({ success: false, message: `Votre album a déjà ${ALBUM_PRIVE_MAX_PHOTOS} photos. Retirez-en une pour en ajouter une autre.` });
    }
    if (estVideo && nbVideos >= ALBUM_PRIVE_MAX_VIDEOS) {
      return res.status(400).json({ success: false, message: `Votre album a déjà ${ALBUM_PRIVE_MAX_VIDEOS} vidéos. Retirez-en une pour en ajouter une autre.` });
    }

    const url = estPhoto
      ? await uploadToImageKit(fichier.buffer, fichier.originalname, 'album-prive')
      : await uploadToR2(fichier.buffer, fichier.originalname, fichier.mimetype, 'album-prive');
    uploadToIDrive(fichier.buffer, fichier.originalname, fichier.mimetype, 'album-prive').catch(() => {});

    await sequelize.query(
      `INSERT INTO private_album_items (owner_numero_h, type, url, duree) VALUES (:numeroH, :type, :url, :duree)`,
      { replacements: { numeroH: req.user.numeroH, type: estPhoto ? 'photo' : 'video', url, duree: estVideo ? duree : null } }
    );
    res.json({ success: true, elements: await elementsDe(req.user.numeroH), limites });
  } catch (e) {
    console.error('Album privé (ajout):', e);
    res.status(500).json({ success: false, message: "Le fichier n'a pas pu être enregistré. Réessayez." });
  }
});

/** DELETE /api/album-prive/:id — retire un de mes fichiers */
router.delete('/:id', async (req, res) => {
  try {
    await assurerTable();
    const [rows] = await sequelize.query(
      `DELETE FROM private_album_items WHERE id::text = :id AND owner_numero_h = :numeroH RETURNING type, url`,
      { replacements: { id: req.params.id, numeroH: req.user.numeroH } }
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Fichier introuvable dans votre album.' });
    if (rows[0].type === 'video') deleteFromR2(rows[0].url).catch(() => {});
    res.json({ success: true, elements: await elementsDe(req.user.numeroH), limites });
  } catch (e) {
    console.error('Album privé (suppression):', e);
    res.status(500).json({ success: false, message: "Le fichier n'a pas pu être retiré. Réessayez." });
  }
});

export default router;

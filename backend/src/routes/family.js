import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import User from '../models/User.js';
import FamilyGallery from '../models/FamilyGallery.js';
import FamilyProblemMedia from '../models/FamilyProblemMedia.js';
import { sequelize } from '../config/database.js';
import { checkAndConsumeQuota } from './quotas.js';

const router = express.Router();

// Stockage en mémoire (pas sur disque) → les fichiers sont convertis en base64 et stockés en DB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 Mo max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image et vidéo sont autorisés'), false);
    }
  }
});

// Convertit le buffer en data URL base64
function toDataUrl(file) {
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// S'assurer que les colonnes photos de famille existent en TEXT
async function ensureFamilyPhotoColumns() {
  try {
    const q = sequelize.getQueryInterface();
    const desc = await q.describeTable('users');
    const textCols = ['family_photo', 'man_photo', 'wife_photo'];
    for (const col of textCols) {
      if (!desc[col]) {
        await sequelize.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "${col}" TEXT;`);
      } else if (desc[col].type && desc[col].type.toLowerCase().includes('varchar')) {
        await sequelize.query(`ALTER TABLE "users" ALTER COLUMN "${col}" TYPE TEXT;`);
      }
    }
    if (!desc['children_photos']) {
      await sequelize.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "children_photos" TEXT;`);
    }
  } catch (err) {
    console.warn('⚠️ ensureFamilyPhotoColumns:', err.message);
  }
}

// Crée la table family_gallery si elle n'existe pas (dev ET production)
// et s'assure que la colonne url est de type TEXT pour les base64
async function ensureGalleryTable() {
  try {
    // 1. Créer la table si elle n'existe pas (sans transaction — compatible PostgreSQL)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "family_gallery" (
        "id"                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "family_name"         VARCHAR(255) NOT NULL,
        "uploader_numero_h"   VARCHAR(255) NOT NULL,
        "uploader_name"       VARCHAR(255) NOT NULL DEFAULT 'Membre',
        "album"               VARCHAR(50)  NOT NULL,
        "url"                 TEXT         NOT NULL,
        "type"                VARCHAR(20)  DEFAULT 'image',
        "created_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    // 2. Index pour les recherches fréquentes
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_fg_family_name ON "family_gallery" ("family_name");`).catch(() => {});
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_fg_uploader    ON "family_gallery" ("uploader_numero_h");`).catch(() => {});
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_fg_album       ON "family_gallery" ("album");`).catch(() => {});
    // 3. Garantir que url est TEXT (migration si ancienne colonne varchar)
    await sequelize.query(`ALTER TABLE "family_gallery" ALTER COLUMN "url" TYPE TEXT;`).catch(() => {});
  } catch (err) {
    console.warn('⚠️ ensureGalleryTable:', err.message);
  }
}

// Crée la table family_problem_media si elle n'existe pas
async function ensureFamilyProblemTable() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "family_problem_media" (
        "id"           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "family_name"  VARCHAR(255) NOT NULL,
        "numero_h"     VARCHAR(255) NOT NULL,
        "author_name"  VARCHAR(255) NOT NULL DEFAULT 'Membre',
        "media_type"   VARCHAR(20)  NOT NULL DEFAULT 'video',
        "description"  TEXT,
        "media_url"    TEXT         NOT NULL,
        "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_fpm_family_name ON "family_problem_media" ("family_name");`).catch(() => {});
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_fpm_created_at ON "family_problem_media" ("created_at");`).catch(() => {});
  } catch (err) {
    console.warn('⚠️ ensureFamilyProblemTable:', err.message);
  }
}

// @route   GET /api/family/photos
router.get('/photos', async (req, res) => {
  try {
    await ensureFamilyPhotoColumns();
    const userData = await User.findOne({ where: { numeroH: req.user.numeroH } });
    const raw = userData?.get ? userData.get({ plain: true }) : userData || {};
    let childrenPhotos = [];
    if (raw.childrenPhotos) {
      try {
        childrenPhotos = typeof raw.childrenPhotos === 'string' ? JSON.parse(raw.childrenPhotos) : raw.childrenPhotos;
      } catch (_) {}
      if (!Array.isArray(childrenPhotos)) childrenPhotos = [];
    }
    res.json({ success: true, photos: {
      familyPhoto: raw.familyPhoto || null,
      manPhoto: raw.manPhoto || null,
      wifePhoto: raw.wifePhoto || null,
      childrenPhotos
    }});
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   POST /api/family/photos/family
router.post('/photos/family', upload.single('photo'), async (req, res) => {
  try {
    await ensureFamilyPhotoColumns();
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
    const dataUrl = toDataUrl(req.file);
    await User.update({ familyPhoto: dataUrl }, { where: { numeroH: req.user.numeroH } });
    res.json({ success: true, message: 'Photo uploadée avec succès', photoUrl: dataUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   POST /api/family/photos/man
router.post('/photos/man', upload.single('photo'), async (req, res) => {
  try {
    await ensureFamilyPhotoColumns();
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
    const dataUrl = toDataUrl(req.file);
    await User.update({ manPhoto: dataUrl }, { where: { numeroH: req.user.numeroH } });
    res.json({ success: true, message: 'Photo uploadée avec succès', photoUrl: dataUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   POST /api/family/photos/wife
router.post('/photos/wife', upload.single('photo'), async (req, res) => {
  try {
    await ensureFamilyPhotoColumns();
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
    const dataUrl = toDataUrl(req.file);
    await User.update({ wifePhoto: dataUrl }, { where: { numeroH: req.user.numeroH } });
    res.json({ success: true, message: 'Photo uploadée avec succès', photoUrl: dataUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   POST /api/family/photos/children
router.post('/photos/children', upload.single('photo'), async (req, res) => {
  try {
    await ensureFamilyPhotoColumns();
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
    const dataUrl = toDataUrl(req.file);
    const { childName } = req.body;
    const userData = await User.findOne({ where: { numeroH: req.user.numeroH } });
    let childrenPhotos = [];
    if (userData?.childrenPhotos) {
      try {
        childrenPhotos = typeof userData.childrenPhotos === 'string' ? JSON.parse(userData.childrenPhotos) : userData.childrenPhotos;
      } catch (_) {}
      if (!Array.isArray(childrenPhotos)) childrenPhotos = [];
    }
    childrenPhotos.push({ name: childName || 'Enfant', photoUrl: dataUrl, uploadedAt: new Date().toISOString() });
    await User.update({ childrenPhotos: JSON.stringify(childrenPhotos) }, { where: { numeroH: req.user.numeroH } });
    res.json({ success: true, message: 'Photo uploadée avec succès', photoUrl: dataUrl, childrenPhotos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   DELETE /api/family/photos/children/:index
router.delete('/photos/children/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index);
    const userData = await User.findOne({ where: { numeroH: req.user.numeroH } });
    let childrenPhotos = [];
    if (userData?.childrenPhotos) {
      try {
        childrenPhotos = typeof userData.childrenPhotos === 'string' ? JSON.parse(userData.childrenPhotos) : userData.childrenPhotos;
      } catch (_) {}
      if (!Array.isArray(childrenPhotos)) childrenPhotos = [];
    }
    if (index < 0 || index >= childrenPhotos.length) {
      return res.status(400).json({ success: false, message: 'Index invalide' });
    }
    childrenPhotos.splice(index, 1);
    await User.update({ childrenPhotos: JSON.stringify(childrenPhotos) }, { where: { numeroH: req.user.numeroH } });
    res.json({ success: true, message: 'Photo supprimée', childrenPhotos });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GALERIE PRIVÉE (albums personnels, stockée dans user.galleryAlbums)
// Conservée pour compatibilité ascendante — la galerie principale utilise
// la galerie partagée ci-dessous.
// ─────────────────────────────────────────────────────────────────────────────

const VALID_ALBUMS = ['bapteme', 'mariage', 'deces', 'rencontre'];

function parseAlbums(raw) {
  try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

async function ensureGalleryColumn() {
  try {
    const q = sequelize.getQueryInterface();
    const desc = await q.describeTable('users');
    if (!desc.gallery_albums) {
      await sequelize.query('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gallery_albums" TEXT;');
    }
  } catch (err) {
    console.warn('⚠️ ensureGalleryColumn:', err.message);
  }
}

// GET /api/family/gallery → retourne les albums privés de l'utilisateur
router.get('/gallery', async (req, res) => {
  try {
    await ensureGalleryColumn();
    const userData = await User.findOne({ where: { numeroH: req.user.numeroH } });
    const albums = parseAlbums(userData?.galleryAlbums);
    for (const key of VALID_ALBUMS) { if (!albums[key]) albums[key] = []; }
    res.json({ success: true, albums });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/family/gallery/:album → ajouter dans galerie privée (base64)
router.post('/gallery/:album', upload.single('media'), async (req, res) => {
  try {
    await ensureGalleryColumn();
    const { album } = req.params;
    if (!VALID_ALBUMS.includes(album)) return res.status(400).json({ success: false, message: 'Album invalide' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
    const dataUrl = toDataUrl(req.file);
    const isVideo = req.file.mimetype.startsWith('video/');
    const userData = await User.findOne({ where: { numeroH: req.user.numeroH } });
    const albums = parseAlbums(userData?.galleryAlbums);
    if (!albums[album]) albums[album] = [];
    albums[album].unshift({ url: dataUrl, type: isVideo ? 'video' : 'image', uploadedAt: new Date().toISOString() });
    await User.update({ galleryAlbums: JSON.stringify(albums) }, { where: { numeroH: req.user.numeroH } });
    res.json({ success: true, albums });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/family/gallery/:album/:index
router.delete('/gallery/:album/:index', async (req, res) => {
  try {
    const { album } = req.params;
    const index = parseInt(req.params.index);
    if (!VALID_ALBUMS.includes(album)) return res.status(400).json({ success: false, message: 'Album invalide' });
    const userData = await User.findOne({ where: { numeroH: req.user.numeroH } });
    const albums = parseAlbums(userData?.galleryAlbums);
    if (!albums[album] || index < 0 || index >= albums[album].length) {
      return res.status(400).json({ success: false, message: 'Média introuvable' });
    }
    albums[album].splice(index, 1);
    await User.update({ galleryAlbums: JSON.stringify(albums) }, { where: { numeroH: req.user.numeroH } });
    res.json({ success: true, albums });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MÉDIAS POUR PROBLÈMES DE LA FAMILLE (santé, situations graves)
// Visibles uniquement par les membres ayant le même nom de famille
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/family/problems/media
router.get('/problems/media', async (req, res) => {
  try {
    await ensureFamilyProblemTable();
    const userData = await User.findOne({ where: { numeroH: req.user.numeroH } });
    const familyName = userData?.nomFamille;
    if (!familyName) {
      return res.json({ success: true, items: [] });
    }

    const items = await FamilyProblemMedia.findAll({
      where: { familyName },
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, items });
  } catch (error) {
    console.error('Erreur chargement médias problèmes famille:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/family/problems/media
router.post('/problems/media', upload.single('media'), async (req, res) => {
  try {
    await ensureFamilyProblemTable();
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
    }

    const userData = await User.findOne({ where: { numeroH: req.user.numeroH } });
    const familyName = userData?.nomFamille;
    if (!familyName) {
      return res.status(400).json({ success: false, message: 'Vous devez avoir un nom de famille pour publier ici.' });
    }

    const dataUrl = toDataUrl(req.file);
    const isVideo = req.file.mimetype.startsWith('video/');
    const description = (req.body.description || '').toString().slice(0, 500);
    const authorName = [userData.prenom, userData.nomFamille].filter(Boolean).join(' ') || 'Membre';

    const item = await FamilyProblemMedia.create({
      familyName,
      numeroH: req.user.numeroH,
      authorName,
      mediaType: isVideo ? 'video' : 'image',
      description,
      mediaUrl: dataUrl
    });

    res.json({ success: true, item });
  } catch (error) {
    console.error('Erreur ajout média problème famille:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GALERIE PARTAGÉE — visible par tous les membres de la même famille
// Photos stockées en base64 dans PostgreSQL (Neon) — persistantes sur Render
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/family/shared-gallery
router.get('/shared-gallery', async (req, res) => {
  try {
    await ensureGalleryTable();
    const userData = await User.findOne({ where: { numeroH: req.user.numeroH } });
    const familyName = userData?.nomFamille;
    if (!familyName) return res.json({ success: true, items: [] });
    const items = await FamilyGallery.findAll({
      where: { familyName },
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/family/shared-gallery/:album → base64 stocké en DB
router.post('/shared-gallery/:album', upload.single('media'), async (req, res) => {
  try {
    await ensureGalleryTable();
    const { album } = req.params;
    if (!VALID_ALBUMS.includes(album)) return res.status(400).json({ success: false, message: 'Album invalide' });
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
    const userData = await User.findOne({ where: { numeroH: req.user.numeroH } });
    const familyName = userData?.nomFamille;
    if (!familyName) return res.status(400).json({ success: false, message: 'Vous devez avoir un nom de famille pour partager des médias' });
    const isVideoFile = req.file.mimetype.startsWith('video/');

    // Vérifier et consommer le quota (5 photos + 1 vidéo gratuits par famille, puis points)
    try {
      await checkAndConsumeQuota('family', familyName, isVideoFile, req.user.numeroH, 5, 1);
    } catch (quotaErr) {
      if (quotaErr.code === 'QUOTA_EXCEEDED') {
        const type = quotaErr.isVideo ? 'vidéo' : 'photo';
        const pts = quotaErr.isVideo ? '2 points' : '1 point';
        return res.status(402).json({
          success: false,
          code: 'QUOTA_EXCEEDED',
          isVideo: quotaErr.isVideo,
          message: `Quota gratuit de votre famille épuisé. Publiez une ${type} supplémentaire pour ${pts}. Achetez des points via l'admin.`
        });
      }
      throw quotaErr;
    }

    const dataUrl = toDataUrl(req.file);
    const uploaderName = [userData.prenom, userData.nomFamille].filter(Boolean).join(' ') || 'Membre';
    const item = await FamilyGallery.create({
      familyName,
      uploaderNumeroH: req.user.numeroH,
      uploaderName,
      album,
      url: dataUrl,
      type: isVideoFile ? 'video' : 'image'
    });
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/family/shared-gallery/:id (propriétaire uniquement)
router.delete('/shared-gallery/:id', async (req, res) => {
  try {
    const item = await FamilyGallery.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Média introuvable' });
    if (item.uploaderNumeroH !== req.user.numeroH) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }
    await item.destroy();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

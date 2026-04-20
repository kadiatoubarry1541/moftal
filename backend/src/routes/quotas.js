import express from 'express';
import { Op } from 'sequelize';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import GalleryQuota from '../models/GalleryQuota.js';
import GalleryPoints from '../models/GalleryPoints.js';
import PointsTransaction from '../models/PointsTransaction.js';
import User from '../models/User.js';
import { sequelize } from '../config/database.js';

const router = express.Router();

// Crée les tables avec contraintes anti-fraude
async function ensureQuotaTables() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "gallery_quotas" (
        "id"               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "context_type"     VARCHAR(20)  NOT NULL,
        "context_key"      VARCHAR(255) NOT NULL,
        "photos_libres"    INTEGER      NOT NULL DEFAULT 5,
        "videos_libres"    INTEGER      NOT NULL DEFAULT 1,
        "photos_utilisees" INTEGER      NOT NULL DEFAULT 0 CHECK (photos_utilisees >= 0),
        "videos_utilisees" INTEGER      NOT NULL DEFAULT 0 CHECK (videos_utilisees >= 0),
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_gallery_quotas UNIQUE (context_type, context_key)
      );
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "gallery_points" (
        "id"                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "numero_h"           VARCHAR(255) NOT NULL UNIQUE,
        "points_disponibles" INTEGER      NOT NULL DEFAULT 0 CHECK (points_disponibles >= 0),
        "total_achete"       INTEGER      NOT NULL DEFAULT 0,
        "created_at"         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        "updated_at"         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "points_transactions" (
        "id"             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        "numero_h"       VARCHAR(255) NOT NULL,
        "points_ajoutes" INTEGER      NOT NULL,
        "montant_gnf"    INTEGER      NOT NULL DEFAULT 0,
        "note"           VARCHAR(500),
        "admin_numero_h" VARCHAR(255) NOT NULL,
        "created_at"     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_pts_numero_h ON "points_transactions" ("numero_h");`).catch(() => {});
    // Ajouter la contrainte CHECK sur points_disponibles si la table existait déjà sans elle
    await sequelize.query(`
      ALTER TABLE "gallery_points"
        ADD CONSTRAINT IF NOT EXISTS chk_points_non_negatif CHECK (points_disponibles >= 0);
    `).catch(() => {});
  } catch (err) {
    console.warn('⚠️ ensureQuotaTables:', err.message);
  }
}

ensureQuotaTables();

// ── UTILITAIRE : obtenir ou créer le quota d'un contexte ──────────────────────
export async function getOrCreateQuota(contextType, contextKey, defaultFreePhotos, defaultFreeVideos) {
  // UPSERT atomique : crée si absent, ne touche pas si déjà existant
  await sequelize.query(`
    INSERT INTO gallery_quotas (id, context_type, context_key, photos_libres, videos_libres, photos_utilisees, videos_utilisees, created_at, updated_at)
    VALUES (gen_random_uuid(), :contextType, :contextKey, :photosLibres, :videosLibres, 0, 0, NOW(), NOW())
    ON CONFLICT (context_type, context_key) DO NOTHING
  `, { replacements: { contextType, contextKey, photosLibres: defaultFreePhotos, videosLibres: defaultFreeVideos } });
  return GalleryQuota.findOne({ where: { contextType, contextKey } });
}

// ── UTILITAIRE : vérifier et consommer un quota — 100% atomique, anti-fraude ──
//
// Stratégie : UPDATE conditionnel en SQL. PostgreSQL n'exécute la mise à jour
// que si la condition est vraie, et RETURNING nous dit combien de lignes ont été
// affectées. Impossible de tricher avec des appels simultanés.
//
export async function checkAndConsumeQuota(contextType, contextKey, isVideoUpload, uploaderNumeroH, defaultFreePhotos, defaultFreeVideos) {
  const costPoints = isVideoUpload ? 2 : 1;

  // ── Étape 1 : s'assurer que la ligne quota existe ──
  await sequelize.query(`
    INSERT INTO gallery_quotas (id, context_type, context_key, photos_libres, videos_libres, photos_utilisees, videos_utilisees, created_at, updated_at)
    VALUES (gen_random_uuid(), :contextType, :contextKey, :photosLibres, :videosLibres, 0, 0, NOW(), NOW())
    ON CONFLICT (context_type, context_key) DO NOTHING
  `, { replacements: { contextType, contextKey, photosLibres: defaultFreePhotos, videosLibres: defaultFreeVideos } });

  // ── Étape 2 : tenter de consommer le quota GRATUIT (atomique) ──
  const updateField = isVideoUpload ? 'videos_utilisees' : 'photos_utilisees';
  const libreField  = isVideoUpload ? 'videos_libres'    : 'photos_libres';
  const [, quotaMeta] = await sequelize.query(`
    UPDATE gallery_quotas
    SET ${updateField} = ${updateField} + 1, updated_at = NOW()
    WHERE context_type = :contextType
      AND context_key  = :contextKey
      AND ${updateField} < ${libreField}
  `, { replacements: { contextType, contextKey } });

  const quotaUsed = (quotaMeta?.rowCount ?? quotaMeta?.affectedRows ?? 0) > 0;
  if (quotaUsed) return { ok: true, mode: 'gratuit' };

  // ── Étape 3 : quota gratuit épuisé — s'assurer que la ligne points existe ──
  await sequelize.query(`
    INSERT INTO gallery_points (id, numero_h, points_disponibles, total_achete, created_at, updated_at)
    VALUES (gen_random_uuid(), :numeroH, 0, 0, NOW(), NOW())
    ON CONFLICT (numero_h) DO NOTHING
  `, { replacements: { numeroH: uploaderNumeroH } });

  // ── Étape 4 : déduire les points ATOMIQUEMENT (impossible de passer en dessous de 0) ──
  // La contrainte WHERE points_disponibles >= :cost empêche toute fraude simultanée.
  const [, ptsMeta] = await sequelize.query(`
    UPDATE gallery_points
    SET points_disponibles = points_disponibles - :cost, updated_at = NOW()
    WHERE numero_h = :numeroH
      AND points_disponibles >= :cost
  `, { replacements: { numeroH: uploaderNumeroH, cost: costPoints } });

  const ptsUsed = (ptsMeta?.rowCount ?? ptsMeta?.affectedRows ?? 0) > 0;
  if (ptsUsed) return { ok: true, mode: 'points', pointsUtilises: costPoints };

  // ── Étape 5 : ni quota gratuit ni points suffisants → refus ──
  throw Object.assign(
    new Error(isVideoUpload ? 'QUOTA_VIDEO' : 'QUOTA_PHOTO'),
    { code: 'QUOTA_EXCEEDED', isVideo: isVideoUpload }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES PUBLIQUES (authentifiées)
// ─────────────────────────────────────────────────────────────────────────────

router.use(authenticate);

// GET /api/quotas/my-points → solde de points de l'utilisateur connecté
router.get('/my-points', async (req, res) => {
  try {
    const pts = await GalleryPoints.findOne({ where: { numeroH: req.user.numeroH } });
    res.json({
      success: true,
      pointsDisponibles: pts?.pointsDisponibles || 0,
      totalAchete: pts?.totalAchete || 0
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/quotas/family → quota galerie familiale de l'utilisateur connecté
router.get('/family', async (req, res) => {
  try {
    const userData = await User.findOne({ where: { numeroH: req.user.numeroH } });
    if (!userData?.nomFamille) {
      return res.json({ success: true, quota: null });
    }
    const quota = await getOrCreateQuota('family', userData.nomFamille, 5, 1);
    const pts = await GalleryPoints.findOne({ where: { numeroH: req.user.numeroH } });
    res.json({
      success: true,
      quota: {
        photosLibres: quota.photosLibres,
        videosLibres: quota.videosLibres,
        photosUtilisees: quota.photosUtilisees,
        videosUtilisees: quota.videosUtilisees,
        photosRestantes: Math.max(0, quota.photosLibres - quota.photosUtilisees),
        videosRestantes: Math.max(0, quota.videosLibres - quota.videosUtilisees)
      },
      points: {
        disponibles: pts?.pointsDisponibles || 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/quotas/couple/:contextKey → quota galerie couple
router.get('/couple/:contextKey', async (req, res) => {
  try {
    const quota = await getOrCreateQuota('couple', req.params.contextKey, 2, 1);
    const pts = await GalleryPoints.findOne({ where: { numeroH: req.user.numeroH } });
    res.json({
      success: true,
      quota: {
        photosLibres: quota.photosLibres,
        videosLibres: quota.videosLibres,
        photosUtilisees: quota.photosUtilisees,
        videosUtilisees: quota.videosUtilisees,
        photosRestantes: Math.max(0, quota.photosLibres - quota.photosUtilisees),
        videosRestantes: Math.max(0, quota.videosLibres - quota.videosUtilisees)
      },
      points: { disponibles: pts?.pointsDisponibles || 0 }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/quotas/parent-child/:contextKey → quota galerie parent-enfant
router.get('/parent-child/:contextKey', async (req, res) => {
  try {
    const quota = await getOrCreateQuota('parent_child', req.params.contextKey, 2, 1);
    const pts = await GalleryPoints.findOne({ where: { numeroH: req.user.numeroH } });
    res.json({
      success: true,
      quota: {
        photosLibres: quota.photosLibres,
        videosLibres: quota.videosLibres,
        photosUtilisees: quota.photosUtilisees,
        videosUtilisees: quota.videosUtilisees,
        photosRestantes: Math.max(0, quota.photosLibres - quota.photosUtilisees),
        videosRestantes: Math.max(0, quota.videosLibres - quota.videosUtilisees)
      },
      points: { disponibles: pts?.pointsDisponibles || 0 }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES ADMIN (authentifiées + rôle admin)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/quotas/admin/points → liste des soldes de points (tous les utilisateurs)
router.get('/admin/points', requireAdmin, async (req, res) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    const where = search ? { numeroH: { [Op.iLike]: `%${search}%` } } : {};
    const rows = await GalleryPoints.findAll({
      where,
      order: [['updated_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    // Joindre les prénoms depuis users
    const enriched = await Promise.all(rows.map(async (r) => {
      const u = await User.findOne({
        where: { numeroH: r.numeroH },
        attributes: ['prenom', 'nomFamille']
      });
      return {
        numeroH: r.numeroH,
        prenom: u?.prenom || '',
        nomFamille: u?.nomFamille || '',
        pointsDisponibles: r.pointsDisponibles,
        totalAchete: r.totalAchete,
        updatedAt: r.updated_at
      };
    }));
    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/quotas/admin/transactions → historique des transactions de points
router.get('/admin/transactions', requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const rows = await PointsTransaction.findAll({
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    res.json({ success: true, transactions: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/quotas/admin/user/:numeroH → solde + historique d'un utilisateur
router.get('/admin/user/:numeroH', requireAdmin, async (req, res) => {
  try {
    const { numeroH } = req.params;
    const user = await User.findOne({
      where: { numeroH },
      attributes: ['prenom', 'nomFamille', 'numeroH']
    });
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    const pts = await GalleryPoints.findOne({ where: { numeroH } });
    const transactions = await PointsTransaction.findAll({
      where: { numeroH },
      order: [['created_at', 'DESC']],
      limit: 20
    });
    res.json({
      success: true,
      user: { prenom: user.prenom, nomFamille: user.nomFamille, numeroH: user.numeroH },
      pointsDisponibles: pts?.pointsDisponibles || 0,
      totalAchete: pts?.totalAchete || 0,
      transactions
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/quotas/admin/assign → attribuer des points à un utilisateur
router.post('/admin/assign', requireAdmin, async (req, res) => {
  try {
    const { numeroH, points, montantGNF = 0, note = '' } = req.body;

    if (!numeroH || !points || isNaN(points) || points <= 0) {
      return res.status(400).json({ success: false, message: 'NumeroH et nombre de points valides requis' });
    }

    const user = await User.findOne({ where: { numeroH } });
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable — NumeroH incorrect' });

    const pointsInt = parseInt(points);

    // UPSERT atomique — crée la ligne si absente, puis incrémente
    await sequelize.query(`
      INSERT INTO gallery_points (id, numero_h, points_disponibles, total_achete, created_at, updated_at)
      VALUES (gen_random_uuid(), :numeroH, :pts, :pts, NOW(), NOW())
      ON CONFLICT (numero_h) DO UPDATE
        SET points_disponibles = gallery_points.points_disponibles + :pts,
            total_achete       = gallery_points.total_achete + :pts,
            updated_at         = NOW()
    `, { replacements: { numeroH, pts: pointsInt } });

    // Enregistrer la transaction
    await PointsTransaction.create({
      numeroH,
      pointsAjoutes: pointsInt,
      montantGNF: parseInt(montantGNF) || 0,
      note: note.toString().slice(0, 500),
      adminNumeroH: req.user.numeroH
    });

    // Lire le nouveau solde après l'UPSERT
    const nouveauPts = await GalleryPoints.findOne({ where: { numeroH } });

    res.json({
      success: true,
      message: `${pointsInt} points attribués à ${user.prenom} ${user.nomFamille}`,
      nouveauSolde: nouveauPts?.pointsDisponibles ?? pointsInt
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

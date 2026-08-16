import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticate, requireAdmin, MASTER_ADMIN_NUMEROS } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import { PRIX_PUBLICITE_AFRIQUE, PRIX_PUBLICITE_HORS_AFRIQUE } from './payment.js';

const router = express.Router();

// ─── Création de la table au démarrage ────────────────────────────────────────
async function ensurePublicitesTable() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "publicites" (
        "id"            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "numero_h"      VARCHAR(50)   NOT NULL,
        "nom"           VARCHAR(200)  DEFAULT '',
        "image_url"     VARCHAR(500)  NOT NULL,
        "lien"          VARCHAR(500),
        "statut"        VARCHAR(20)   NOT NULL DEFAULT 'en_attente',
        "raison_refus"  TEXT,
        "approuve_par"  VARCHAR(50),
        "approuve_le"   TIMESTAMPTZ,
        "expire_le"     TIMESTAMPTZ,
        "is_active"     BOOLEAN       DEFAULT false,
        "payment_ref"   VARCHAR(100),
        "created_at"    TIMESTAMPTZ   DEFAULT NOW()
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_pub_numero_h ON "publicites" ("numero_h");`).catch(() => {});
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_pub_actives ON "publicites" ("is_active", "expire_le");`).catch(() => {});
    // Ajoute la colonne "lien" si la table existait déjà avant son introduction
    await sequelize.query(`ALTER TABLE "publicites" ADD COLUMN IF NOT EXISTS "lien" VARCHAR(500);`).catch(() => {});
  } catch (err) {
    console.warn('⚠️ ensurePublicitesTable:', err.message);
  }
}

ensurePublicitesTable();

// ─── Upload des images de publicité ────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/publicites');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `pub-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Seules les images sont autorisées.'), false);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/publicites/actives
// Liste les publicités de l'admin principal, actives et non expirées — pour
// le bandeau Famille. Réservé aux annonces de l'admin (voir /soumettre) :
// la page d'accueil n'affiche jamais les publicités des autres utilisateurs.
// Accessible sans connexion.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/actives', async (req, res) => {
  try {
    const [publicites] = await sequelize.query(`
      SELECT id, image_url, lien
      FROM publicites
      WHERE is_active = true AND statut = 'approuve' AND expire_le >= NOW()
        AND numero_h IN (:admins)
      ORDER BY created_at DESC
      LIMIT 20
    `, { replacements: { admins: MASTER_ADMIN_NUMEROS } });
    res.json({ success: true, publicites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/publicites/prix
// Retourne le prix de publication selon le pays de l'utilisateur
// ─────────────────────────────────────────────────────────────────────────────
router.get('/prix', authenticate, (req, res) => {
  const pays = req.user?.pays || '';
  const PAYS_AFRIQUE = ['gn','guinée','guinea','guinee','sn','senegal','ml','mali','ci','côte','ghana','nigeria','burkina','niger','togo','bénin','benin','cameroun','cameroon','congo'];
  const estAfrique = !pays || PAYS_AFRIQUE.some(p => pays.toLowerCase().includes(p));
  const prix = estAfrique ? PRIX_PUBLICITE_AFRIQUE : PRIX_PUBLICITE_HORS_AFRIQUE;

  res.json({ success: true, prix, zone: estAfrique ? 'afrique' : 'hors_afrique', dureeJours: 30 });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/publicites/soumettre
// Propose une publicité (image) — statut 'en_attente', doit être approuvée
// par un admin avant de pouvoir payer.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/soumettre', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Une image est requise.' });
    }
    const nom = `${req.user.prenom || ''} ${req.user.nomFamille || ''}`.trim();
    const imageUrl = `/uploads/publicites/${req.file.filename}`;
    const lien = (req.body.lien || '').toString().trim().slice(0, 500) || null;

    // L'admin principal n'a personne au-dessus de lui pour approuver sa propre
    // publicité, ni pour la payer — elle est directement approuvée ET activée
    // 30 jours, comme après un paiement normal. Seul l'admin principal
    // apparaît sur la page d'accueil (voir /actives) ; les autres
    // utilisateurs restent soumis à l'approbation + paiement habituels.
    const autoApprouve = !!req.user.isMasterAdmin;
    const expireLe = new Date();
    expireLe.setDate(expireLe.getDate() + 30);

    const [[pub]] = autoApprouve
      ? await sequelize.query(`
          INSERT INTO publicites (numero_h, nom, image_url, lien, statut, approuve_par, approuve_le, is_active, expire_le, created_at)
          VALUES (:numeroH, :nom, :imageUrl, :lien, 'approuve', :numeroH, NOW(), true, :expireLe, NOW())
          RETURNING id
        `, { replacements: { numeroH: req.user.numeroH, nom: nom.slice(0, 200), imageUrl, lien, expireLe } })
      : await sequelize.query(`
          INSERT INTO publicites (numero_h, nom, image_url, lien, statut, is_active, created_at)
          VALUES (:numeroH, :nom, :imageUrl, :lien, 'en_attente', false, NOW())
          RETURNING id
        `, { replacements: { numeroH: req.user.numeroH, nom: nom.slice(0, 200), imageUrl, lien } });

    res.json({
      success: true,
      publiciteId: pub.id,
      message: autoApprouve
        ? 'Publicité approuvée et publiée pour 30 jours.'
        : 'Publicité envoyée ! Un administrateur va l\'examiner avant que vous puissiez payer pour la publier.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/publicites/mes-publicites
// L'utilisateur voit ses propres soumissions et leur statut
// ─────────────────────────────────────────────────────────────────────────────
router.get('/mes-publicites', authenticate, async (req, res) => {
  try {
    const [publicites] = await sequelize.query(`
      SELECT id, image_url, lien, statut, raison_refus, expire_le, is_active,
        (is_active = true AND expire_le >= NOW()) AS en_ligne,
        created_at
      FROM publicites
      WHERE numero_h = :numeroH
      ORDER BY created_at DESC
    `, { replacements: { numeroH: req.user.numeroH } });

    res.json({ success: true, publicites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/publicites/:id/activer-admin
// L'admin principal publie immédiatement l'une de ses propres publicités,
// sans jamais passer par Djomy — couvre aussi les anciennes annonces restées
// "approuvée" mais non actives avant la mise en place de l'auto-publication.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:id/activer-admin', authenticate, async (req, res) => {
  try {
    if (!req.user.isMasterAdmin) {
      return res.status(403).json({ success: false, message: 'Réservé à l\'admin principal.' });
    }
    const [[pub]] = await sequelize.query(
      `SELECT numero_h FROM publicites WHERE id = :id`,
      { replacements: { id: req.params.id } }
    );
    if (!pub) return res.status(404).json({ success: false, message: 'Publicité introuvable.' });
    if (pub.numero_h !== req.user.numeroH) {
      return res.status(403).json({ success: false, message: 'Cette publicité ne vous appartient pas.' });
    }
    const expireLe = new Date();
    expireLe.setDate(expireLe.getDate() + 30);
    await sequelize.query(`
      UPDATE publicites
      SET statut = 'approuve', approuve_par = :admin, approuve_le = NOW(), is_active = true, expire_le = :expireLe
      WHERE id = :id
    `, { replacements: { admin: req.user.numeroH, id: req.params.id, expireLe } });
    res.json({ success: true, message: 'Publicité publiée pour 30 jours.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/publicites/:id
// L'utilisateur retire sa propre publicité
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const [[pub]] = await sequelize.query(
      `SELECT numero_h FROM publicites WHERE id = :id`,
      { replacements: { id: req.params.id } }
    );
    if (!pub) return res.status(404).json({ success: false, message: 'Publicité introuvable.' });
    if (pub.numero_h !== req.user.numeroH) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez retirer que vos propres publicités.' });
    }
    await sequelize.query(`UPDATE publicites SET is_active = false WHERE id = :id`, { replacements: { id: req.params.id } });
    res.json({ success: true, message: 'Publicité retirée.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — GET /api/publicites/admin/en-attente
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/en-attente', authenticate, requireAdmin, async (req, res) => {
  try {
    const [publicites] = await sequelize.query(`
      SELECT * FROM publicites WHERE statut = 'en_attente' ORDER BY created_at ASC
    `);
    res.json({ success: true, publicites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — GET /api/publicites/admin/toutes
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/toutes', authenticate, requireAdmin, async (req, res) => {
  try {
    const [publicites] = await sequelize.query(`
      SELECT *, (is_active = true AND expire_le >= NOW()) AS en_ligne
      FROM publicites
      ORDER BY created_at DESC
      LIMIT 200
    `);
    res.json({ success: true, publicites });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — POST /api/publicites/admin/:id/approuver
// Approuve la publicité — l'utilisateur peut ensuite payer pour la publier.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/admin/:id/approuver', authenticate, requireAdmin, async (req, res) => {
  try {
    await sequelize.query(`
      UPDATE publicites
      SET statut = 'approuve', approuve_par = :admin, approuve_le = NOW()
      WHERE id = :id
    `, { replacements: { admin: req.user.numeroH, id: req.params.id } });
    res.json({ success: true, message: 'Publicité approuvée. L\'utilisateur peut maintenant payer pour la publier.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — POST /api/publicites/admin/:id/refuser
// ─────────────────────────────────────────────────────────────────────────────
router.post('/admin/:id/refuser', authenticate, requireAdmin, async (req, res) => {
  try {
    const { raison } = req.body;
    await sequelize.query(`
      UPDATE publicites SET statut = 'refuse', raison_refus = :raison WHERE id = :id
    `, { replacements: { raison: raison || '', id: req.params.id } });
    res.json({ success: true, message: 'Publicité refusée.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

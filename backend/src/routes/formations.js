import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import { PRIX_PUBLICATION_FORMATION_AFRIQUE, PRIX_PUBLICATION_FORMATION_HORS_AFRIQUE } from './payment.js';

const router = express.Router();

// ─── Création de la table au démarrage ────────────────────────────────────────
async function ensureFormationsTable() {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "formation_annonces" (
        "id"             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        "prof_numero_h"  VARCHAR(50)   NOT NULL,
        "prof_nom"       VARCHAR(200)  DEFAULT '',
        "titre"          VARCHAR(300)  NOT NULL,
        "description"    TEXT          DEFAULT '',
        "matiere"        VARCHAR(100)  DEFAULT '',
        "niveau"         VARCHAR(50)   DEFAULT 'tous',
        "lieu"           VARCHAR(200)  DEFAULT '',
        "date_debut"     DATE,
        "nb_places"      INTEGER       DEFAULT 0,
        "prix_info"      VARCHAR(100)  DEFAULT '',
        "contact"        VARCHAR(300)  NOT NULL,
        "duree_jours"    INTEGER       NOT NULL DEFAULT 7,
        "expire_le"      TIMESTAMPTZ   NOT NULL,
        "is_active"      BOOLEAN       DEFAULT false,
        "fedapay_ref"    VARCHAR(100),
        "created_at"     TIMESTAMPTZ   DEFAULT NOW()
      );
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_fa_prof ON "formation_annonces" ("prof_numero_h");`).catch(() => {});
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_fa_expire ON "formation_annonces" ("expire_le");`).catch(() => {});
  } catch (err) {
    console.warn('⚠️ ensureFormationsTable:', err.message);
  }
}

ensureFormationsTable();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/formations/actives
// Liste toutes les annonces actives et non-expirées (page Éducation)
// Accessible sans connexion
// ─────────────────────────────────────────────────────────────────────────────
router.get('/actives', async (req, res) => {
  try {
    const { matiere, niveau, q } = req.query;

    let whereExtra = '';
    const replacements = {};

    if (matiere) {
      whereExtra += ` AND matiere ILIKE :matiere`;
      replacements.matiere = `%${matiere}%`;
    }
    if (niveau && niveau !== 'tous') {
      whereExtra += ` AND (niveau = :niveau OR niveau = 'tous')`;
      replacements.niveau = niveau;
    }
    if (q) {
      whereExtra += ` AND (titre ILIKE :q OR description ILIKE :q OR matiere ILIKE :q)`;
      replacements.q = `%${q}%`;
    }

    const [annonces] = await sequelize.query(`
      SELECT
        id, prof_nom, titre, description, matiere, niveau,
        lieu, date_debut, nb_places, prix_info, contact,
        expire_le, created_at
      FROM formation_annonces
      WHERE is_active = true
        AND expire_le >= NOW()
        ${whereExtra}
      ORDER BY created_at DESC
      LIMIT 100
    `, { replacements });

    res.json({ success: true, annonces });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/formations/prix
// Retourne le prix de publication selon le pays de l'utilisateur
// ─────────────────────────────────────────────────────────────────────────────
router.get('/prix', authenticate, (req, res) => {
  const pays = req.user?.pays || '';
  // Vérification simple : si le pays est africain
  const PAYS_AFRIQUE = ['gn','guinée','guinea','guinee','sn','senegal','ml','mali','ci','côte','ghana','nigeria','burkina','niger','togo','bénin','benin','cameroun','cameroon','congo'];
  const estAfrique = !pays || PAYS_AFRIQUE.some(p => pays.toLowerCase().includes(p));
  const prix = estAfrique ? PRIX_PUBLICATION_FORMATION_AFRIQUE : PRIX_PUBLICATION_FORMATION_HORS_AFRIQUE;

  res.json({
    success: true,
    prix,
    zone: estAfrique ? 'afrique' : 'hors_afrique',
    dureesDisponibles: [
      { jours: 7,  label: '1 semaine' },
      { jours: 14, label: '2 semaines' },
      { jours: 21, label: '3 semaines' },
      { jours: 30, label: '1 mois (max)' },
    ],
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/formations/preparer
// Prof crée l'annonce EN ATTENTE puis paie via FedaPay
// Retourne l'id de l'annonce pour le paiement
// ─────────────────────────────────────────────────────────────────────────────
router.post('/preparer', authenticate, async (req, res) => {
  try {
    const {
      titre, description, matiere, niveau = 'tous',
      lieu, dateDebut, nbPlaces = 0, prixInfo = '',
      contact, dureejours = 7,
    } = req.body;

    // Validations
    if (!titre?.trim()) return res.status(400).json({ success: false, message: 'Le titre est requis.' });
    if (!contact?.trim()) return res.status(400).json({ success: false, message: 'Le contact est requis (téléphone ou email).' });

    const duree = parseInt(dureejours);
    if (isNaN(duree) || duree < 7 || duree > 30) {
      return res.status(400).json({ success: false, message: 'La durée doit être entre 7 et 30 jours.' });
    }

    const expireLe = new Date();
    expireLe.setDate(expireLe.getDate() + duree);

    const nom = `${req.user.prenom || ''} ${req.user.nomFamille || ''}`.trim();

    const [[annonce]] = await sequelize.query(`
      INSERT INTO formation_annonces
        (prof_numero_h, prof_nom, titre, description, matiere, niveau,
         lieu, date_debut, nb_places, prix_info, contact,
         duree_jours, expire_le, is_active, created_at)
      VALUES
        (:profH, :nom, :titre, :description, :matiere, :niveau,
         :lieu, :dateDebut, :nbPlaces, :prixInfo, :contact,
         :duree, :expireLe, false, NOW())
      RETURNING id, expire_le
    `, {
      replacements: {
        profH: req.user.numeroH,
        nom: nom.slice(0, 200),
        titre: titre.trim().slice(0, 300),
        description: (description || '').toString().slice(0, 2000),
        matiere: (matiere || '').toString().slice(0, 100),
        niveau,
        lieu: (lieu || '').toString().slice(0, 200),
        dateDebut: dateDebut || null,
        nbPlaces: parseInt(nbPlaces) || 0,
        prixInfo: (prixInfo || '').toString().slice(0, 100),
        contact: contact.trim().slice(0, 300),
        duree,
        expireLe,
      }
    });

    res.json({
      success: true,
      annonceId: annonce.id,
      expireLe: annonce.expire_le,
      message: 'Annonce préparée. Finalisez le paiement pour la publier.',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/formations/mes-annonces
// Prof voit ses propres annonces (actives + expirées)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/mes-annonces', authenticate, async (req, res) => {
  try {
    const [annonces] = await sequelize.query(`
      SELECT
        id, titre, matiere, niveau, lieu, date_debut,
        contact, nb_places, prix_info, duree_jours,
        expire_le, is_active,
        (expire_le >= NOW() AND is_active = true) AS en_ligne,
        created_at
      FROM formation_annonces
      WHERE prof_numero_h = :profH
      ORDER BY created_at DESC
    `, { replacements: { profH: req.user.numeroH } });

    res.json({ success: true, annonces });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/formations/:id
// Prof supprime sa propre annonce avant expiration
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const [[annonce]] = await sequelize.query(
      `SELECT prof_numero_h FROM formation_annonces WHERE id = :id`,
      { replacements: { id: req.params.id } }
    );

    if (!annonce) return res.status(404).json({ success: false, message: 'Annonce introuvable.' });
    if (annonce.prof_numero_h !== req.user.numeroH) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez supprimer que vos propres annonces.' });
    }

    await sequelize.query(
      `UPDATE formation_annonces SET is_active = false WHERE id = :id`,
      { replacements: { id: req.params.id } }
    );

    res.json({ success: true, message: 'Annonce supprimée.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — GET /api/formations/admin/toutes
// ─────────────────────────────────────────────────────────────────────────────
router.get('/admin/toutes', requireAdmin, async (req, res) => {
  try {
    const [annonces] = await sequelize.query(`
      SELECT *, (expire_le >= NOW() AND is_active = true) AS en_ligne
      FROM formation_annonces
      ORDER BY created_at DESC
      LIMIT 200
    `);
    res.json({ success: true, annonces });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

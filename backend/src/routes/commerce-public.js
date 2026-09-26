import express from 'express';
import { sequelize } from '../config/database.js';
import { ensureTenantExtraColumns } from './clinic-management.js';
import { ensureCommerceReviewsTable, ensureCommerceExtras } from './commerce-management.js';

const router = express.Router();

// GET /api/commerce-public/:tenantCode — infos publiques de la boutique
router.get('/:tenantCode', async (req, res) => {
  try {
    await ensureTenantExtraColumns();
    const { tenantCode } = req.params;
    const [tenant] = await sequelize.query(
      `SELECT tenant_code, type, name, logo_url, address, city, phone, email, description, horaires, phone_urgence
       FROM management_tenants
       WHERE tenant_code = :code
         AND type IN ('commerce','vendor','supplier','producer','broker','restaurant','transport','beauty','artisan')
         AND is_active = true
       LIMIT 1`,
      { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(404).json({ success: false, message: 'Boutique introuvable.' });
    res.json({ success: true, store: tenant });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/commerce-public/:tenantCode/products — catalogue public
router.get('/:tenantCode/products', async (req, res) => {
  try {
    await ensureCommerceExtras();
    const { tenantCode } = req.params;
    const products = await sequelize.query(
      `SELECT id, nom, categorie, prix_vente, unite, stock, photo_url
       FROM commerce_products
       WHERE tenant_code = :code AND is_active = true AND stock > 0
       ORDER BY categorie, nom`,
      { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, products });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/commerce-public/:tenantCode/categories — catégories disponibles
router.get('/:tenantCode/categories', async (req, res) => {
  try {
    const { tenantCode } = req.params;
    const rows = await sequelize.query(
      `SELECT DISTINCT categorie FROM commerce_products
       WHERE tenant_code = :code AND is_active = true AND stock > 0 AND categorie IS NOT NULL
       ORDER BY categorie`,
      { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    const categories = rows.map(r => r.categorie).filter(Boolean);
    res.json({ success: true, categories });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/commerce-public/:tenantCode/reviews — avis approuvés + moyenne
router.get('/:tenantCode/reviews', async (req, res) => {
  try {
    await ensureCommerceReviewsTable();
    const { tenantCode } = req.params;
    const reviews = await sequelize.query(
      `SELECT id, nom_auteur, note, commentaire, created_at FROM commerce_reviews WHERE tenant_code=:code AND statut='approuve' ORDER BY created_at DESC LIMIT 50`,
      { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    const [avg] = await sequelize.query(
      `SELECT COALESCE(AVG(note),0) as moyenne, COUNT(*) as total FROM commerce_reviews WHERE tenant_code=:code AND statut='approuve'`,
      { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, reviews, moyenne: +(avg?.moyenne || 0), total: +(avg?.total || 0) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/commerce-public/:tenantCode/reviews — soumettre un avis (modéré avant publication)
router.post('/:tenantCode/reviews', async (req, res) => {
  try {
    await ensureCommerceReviewsTable();
    const { tenantCode } = req.params;
    const { nom_auteur, note, commentaire } = req.body;
    if (!note || note < 1 || note > 5) return res.status(400).json({ success: false, message: 'Note invalide (1 à 5).' });
    await sequelize.query(
      `INSERT INTO commerce_reviews (tenant_code, nom_auteur, note, commentaire) VALUES (:code,:nom,:note,:com)`,
      { replacements: { code: tenantCode, nom: nom_auteur || 'Anonyme', note, com: commentaire || null } }
    );
    res.json({ success: true, message: 'Merci ! Votre avis sera visible après modération.' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;

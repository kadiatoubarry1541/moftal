import express from 'express';
import { sequelize } from '../config/database.js';

const router = express.Router();

// GET /api/commerce-public/:tenantCode — infos publiques de la boutique
router.get('/:tenantCode', async (req, res) => {
  try {
    const { tenantCode } = req.params;
    const [tenant] = await sequelize.query(
      `SELECT tenant_code, type, name, logo_url, address, city, phone, email, description
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
    const { tenantCode } = req.params;
    const products = await sequelize.query(
      `SELECT id, nom, categorie, prix_vente, unite, stock
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

export default router;

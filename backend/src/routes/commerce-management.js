import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';

const router = express.Router();

async function verifyTenant(req, res, next) {
  const { tenantCode } = req.params;
  const role = req.user?.role || '';
  const isAdminUser = !!(req.user?.isMasterAdmin || role === 'admin' || role === 'super-admin');
  try {
    if (isAdminUser) {
      const [tenant] = await sequelize.query(`SELECT * FROM management_tenants WHERE tenant_code=:code LIMIT 1`, { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT });
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Commerce Admin', type: 'commerce', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }
    const [tenant] = await sequelize.query(`SELECT * FROM management_tenants WHERE tenant_code=:code AND owner_numero_h=:n LIMIT 1`, { replacements: { code: tenantCode, n: req.userId }, type: sequelize.QueryTypes.SELECT });
    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé à cet espace commerce.' });
    req.tenant = tenant;
    next();
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

// ─── INFO ─────────────────────────────────────────────────────────────────────
router.get('/:tenantCode/info', authenticate, verifyTenant, (req, res) => {
  res.json({ success: true, tenant: req.tenant });
});

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
router.get('/:tenantCode/dashboard', authenticate, verifyTenant, async (req, res) => {
  try {
    const code = req.params.tenantCode;
    const q = (sql, rep) => sequelize.query(sql, { replacements: rep, type: sequelize.QueryTypes.SELECT }).then(r => r[0]).catch(() => ({ c: 0, t: 0 }));
    const [prod, stock, sales, month, cred, clients, depenses, recent, lowStock] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM commerce_products WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM commerce_products WHERE tenant_code=:code AND is_active=true AND stock<=stock_min`, { code }),
      q(`SELECT COUNT(*) as c, COALESCE(SUM(total),0) as t FROM commerce_sales WHERE tenant_code=:code AND DATE(date_vente)=CURRENT_DATE`, { code }),
      q(`SELECT COALESCE(SUM(total),0) as t FROM commerce_sales WHERE tenant_code=:code AND EXTRACT(MONTH FROM date_vente)=EXTRACT(MONTH FROM CURRENT_DATE)`, { code }),
      q(`SELECT COALESCE(SUM(credit_total),0) as t FROM commerce_clients WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM commerce_clients WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COALESCE(SUM(montant),0) as t FROM commerce_expenses WHERE tenant_code=:code AND DATE(date_depense)=CURRENT_DATE`, { code }),
      sequelize.query(`SELECT * FROM commerce_sales WHERE tenant_code=:code ORDER BY date_vente DESC LIMIT 5`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
      sequelize.query(`SELECT * FROM commerce_products WHERE tenant_code=:code AND is_active=true AND stock<=stock_min ORDER BY stock ASC LIMIT 5`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
    ]);
    res.json({
      success: true,
      totalProducts: +(prod.c||0),
      alertesStock: +(stock.c||0),
      ventesAujourdhui: +(sales.c||0),
      caAujourdhui: +(sales.t||0),
      caMois: +(month.t||0),
      totalCredits: +(cred.t||0),
      totalClients: +(clients.c||0),
      depensesAujourdhui: +(depenses.t||0),
      recentSales: recent,
      lowStockProducts: lowStock
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PRODUITS ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/products', authenticate, verifyTenant, async (req, res) => {
  try {
    const { search } = req.query;
    let q = `SELECT * FROM commerce_products WHERE tenant_code=:code AND is_active=true`;
    if (search) q += ` AND (nom ILIKE :s OR categorie ILIKE :s)`;
    q += ` ORDER BY nom`;
    const rows = await sequelize.query(q, { replacements: { code: req.params.tenantCode, s: `%${search || ''}%` }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, products: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/products', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, categorie, prix_vente, prix_achat, stock, stock_min, unite } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO commerce_products (tenant_code,nom,categorie,prix_vente,prix_achat,stock,stock_min,unite) VALUES(:code,:nom,:cat,:pv,:pa,:stk,:smin,:u) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, cat: categorie || null, pv: prix_vente || 0, pa: prix_achat || 0, stk: stock || 0, smin: stock_min || 5, u: unite || 'pièce' }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, product: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/products/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, categorie, prix_vente, prix_achat, stock, stock_min, unite } = req.body;
    await sequelize.query(
      `UPDATE commerce_products SET nom=:nom,categorie=:cat,prix_vente=:pv,prix_achat=:pa,stock=:stk,stock_min=:smin,unite=:u WHERE id=:id AND tenant_code=:code`,
      { replacements: { nom, cat: categorie, pv: prix_vente, pa: prix_achat, stk: stock, smin: stock_min, u: unite, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/products/:id/stock', authenticate, verifyTenant, async (req, res) => {
  try {
    const { delta } = req.body;
    await sequelize.query(
      `UPDATE commerce_products SET stock=GREATEST(0,stock+:delta) WHERE id=:id AND tenant_code=:code`,
      { replacements: { delta: delta || 0, id: req.params.id, code: req.params.tenantCode } }
    );
    const [prod] = await sequelize.query(`SELECT stock FROM commerce_products WHERE id=:id`, { replacements: { id: req.params.id }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, newStock: prod?.stock });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── VENTES ───────────────────────────────────────────────────────────────────
router.get('/:tenantCode/sales', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM commerce_sales WHERE tenant_code=:code ORDER BY date_vente DESC LIMIT 100`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, sales: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/sales', authenticate, verifyTenant, async (req, res) => {
  try {
    const { client_nom, items, type_paiement, montant_recu, est_credit, notes } = req.body;
    const code = req.params.tenantCode;
    const total = (items || []).reduce((s, i) => s + (+i.prix_unitaire || 0) * (+i.quantite || 1), 0);
    const [rows] = await sequelize.query(
      `INSERT INTO commerce_sales (tenant_code,client_nom,total,montant_recu,type_paiement,est_credit,notes,items) VALUES(:code,:nom,:total,:recu,:type,:credit,:notes,:items::jsonb) RETURNING *`,
      { replacements: { code, nom: client_nom || 'Client', total, recu: montant_recu || total, type: type_paiement || 'especes', credit: !!est_credit, notes: notes || null, items: JSON.stringify(items || []) }, type: sequelize.QueryTypes.INSERT }
    );
    // Déduire le stock pour chaque produit
    for (const item of items || []) {
      if (item.product_id) {
        await sequelize.query(
          `UPDATE commerce_products SET stock=GREATEST(0,stock-:qty) WHERE id=:id AND tenant_code=:code`,
          { replacements: { qty: item.quantite || 1, id: item.product_id, code } }
        ).catch(() => {});
      }
    }
    // Mettre à jour le crédit client si vente à crédit
    if (est_credit && client_nom) {
      await sequelize.query(
        `INSERT INTO commerce_clients (tenant_code,nom,credit_total) VALUES(:code,:nom,:total) ON CONFLICT DO NOTHING`,
        { replacements: { code, nom: client_nom, total } }
      ).catch(() => {});
      await sequelize.query(
        `UPDATE commerce_clients SET credit_total=credit_total+:total WHERE tenant_code=:code AND nom=:nom`,
        { replacements: { code, nom: client_nom, total: total - (montant_recu || 0) } }
      ).catch(() => {});
    }
    res.json({ success: true, sale: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
router.get('/:tenantCode/clients', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM commerce_clients WHERE tenant_code=:code AND is_active=true ORDER BY credit_total DESC,nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, clients: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/clients', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, telephone, adresse } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO commerce_clients (tenant_code,nom,telephone,adresse) VALUES(:code,:nom,:tel,:adr) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, tel: telephone || null, adr: adresse || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, client: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/clients/:id/pay-credit', authenticate, verifyTenant, async (req, res) => {
  try {
    const { montant } = req.body;
    await sequelize.query(
      `UPDATE commerce_clients SET credit_total=GREATEST(0,credit_total-:m) WHERE id=:id AND tenant_code=:code`,
      { replacements: { m: montant || 0, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── DÉPENSES ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/expenses', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT * FROM commerce_expenses WHERE tenant_code=:code ORDER BY date_depense DESC LIMIT 200`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, expenses: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/expenses', authenticate, verifyTenant, async (req, res) => {
  try {
    const { description, montant, categorie } = req.body;
    const [rows] = await sequelize.query(
      `INSERT INTO commerce_expenses (tenant_code,description,montant,categorie) VALUES(:code,:desc,:montant,:cat) RETURNING *`,
      { replacements: { code: req.params.tenantCode, desc: description, montant: montant || 0, cat: categorie || 'Autre' }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, expense: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;

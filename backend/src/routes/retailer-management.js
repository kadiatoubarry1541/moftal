/**
 * Gestion Interne — Vendeur en Détail (petit commerce de quartier)
 * Préfixe : /api/retailer-mgmt/:tenantCode
 * Tables   : retailer_products, retailer_sales, retailer_sale_items, retailer_clients, retailer_expenses
 */

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
      const [tenant] = await sequelize.query(
        `SELECT * FROM management_tenants WHERE tenant_code=:code LIMIT 1`,
        { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
      );
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Vendeur Admin', type: 'retailer', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }
    const [tenant] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code=:code AND owner_numero_h=:n LIMIT 1`,
      { replacements: { code: tenantCode, n: req.userId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé à cet espace vendeur.' });
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
    const [prod, stock, sales, month, cred, clients, dep, recent, lowStock] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM retailer_products WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM retailer_products WHERE tenant_code=:code AND is_active=true AND stock<=stock_min`, { code }),
      q(`SELECT COUNT(*) as c, COALESCE(SUM(total),0) as t FROM retailer_sales WHERE tenant_code=:code AND DATE(date_vente)=CURRENT_DATE`, { code }),
      q(`SELECT COALESCE(SUM(total),0) as t FROM retailer_sales WHERE tenant_code=:code AND EXTRACT(MONTH FROM date_vente)=EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM date_vente)=EXTRACT(YEAR FROM CURRENT_DATE)`, { code }),
      q(`SELECT COALESCE(SUM(credit_total),0) as t FROM retailer_clients WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM retailer_clients WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COALESCE(SUM(montant),0) as t FROM retailer_expenses WHERE tenant_code=:code AND DATE(date_depense)=CURRENT_DATE`, { code }),
      sequelize.query(`SELECT * FROM retailer_sales WHERE tenant_code=:code ORDER BY date_vente DESC LIMIT 5`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
      sequelize.query(`SELECT * FROM retailer_products WHERE tenant_code=:code AND is_active=true AND stock<=stock_min ORDER BY stock ASC LIMIT 5`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
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
      depensesAujourdhui: +(dep.t||0),
      recentSales: recent,
      lowStockProducts: lowStock,
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PRODUITS ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/products', authenticate, verifyTenant, async (req, res) => {
  try {
    const { search } = req.query;
    let q = `SELECT * FROM retailer_products WHERE tenant_code=:code AND is_active=true`;
    if (search) q += ` AND (nom ILIKE :s OR categorie ILIKE :s)`;
    q += ` ORDER BY nom`;
    const rows = await sequelize.query(q, { replacements: { code: req.params.tenantCode, s: `%${search || ''}%` }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, products: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/products', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, categorie, prix_vente, prix_achat, stock, stock_min, unite } = req.body;
    if (!nom || !prix_vente) return res.status(400).json({ success: false, message: 'Nom et prix requis.' });
    const [row] = await sequelize.query(
      `INSERT INTO retailer_products (tenant_code,nom,categorie,prix_vente,prix_achat,stock,stock_min,unite)
       VALUES (:code,:nom,:cat,:pv,:pa,:stk,:smin,:unite) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, cat: categorie || '', pv: +prix_vente, pa: +(prix_achat || 0), stk: +(stock || 0), smin: +(stock_min || 5), unite: unite || 'pièce' }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, product: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/products/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, categorie, prix_vente, prix_achat, stock, stock_min, unite } = req.body;
    await sequelize.query(
      `UPDATE retailer_products SET nom=COALESCE(:nom,nom), categorie=COALESCE(:cat,categorie),
       prix_vente=COALESCE(:pv,prix_vente), prix_achat=COALESCE(:pa,prix_achat),
       stock=COALESCE(:stk,stock), stock_min=COALESCE(:smin,stock_min), unite=COALESCE(:unite,unite)
       WHERE id=:id AND tenant_code=:code`,
      { replacements: { id: req.params.id, code: req.params.tenantCode, nom: nom||null, cat: categorie||null, pv: prix_vente?+prix_vente:null, pa: prix_achat?+prix_achat:null, stk: stock!=null?+stock:null, smin: stock_min?+stock_min:null, unite: unite||null } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/products/:id/stock', authenticate, verifyTenant, async (req, res) => {
  try {
    const { delta } = req.body;
    await sequelize.query(
      `UPDATE retailer_products SET stock=GREATEST(0,stock+:delta) WHERE id=:id AND tenant_code=:code`,
      { replacements: { delta: +delta, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── VENTES ───────────────────────────────────────────────────────────────────
router.get('/:tenantCode/sales', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT * FROM retailer_sales WHERE tenant_code=:code ORDER BY date_vente DESC LIMIT 100`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, sales: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/sales', authenticate, verifyTenant, async (req, res) => {
  try {
    const { client_nom, type_paiement, est_credit, notes, items } = req.body;
    const validItems = (items || []).filter(i => i.nom && i.prix_unitaire);
    if (!validItems.length) return res.status(400).json({ success: false, message: 'Au moins un article requis.' });
    const total = validItems.reduce((s, i) => s + +i.prix_unitaire * +(i.quantite || 1), 0);

    const [sale] = await sequelize.query(
      `INSERT INTO retailer_sales (tenant_code,client_nom,type_paiement,total,est_credit,notes)
       VALUES (:code,:cnom,:tp,:total,:credit,:notes) RETURNING *`,
      { replacements: { code: req.params.tenantCode, cnom: client_nom || 'Client', tp: type_paiement || 'especes', total, credit: !!est_credit, notes: notes || '' }, type: sequelize.QueryTypes.SELECT }
    );
    const saleId = sale.id;

    for (const item of validItems) {
      await sequelize.query(
        `INSERT INTO retailer_sale_items (sale_id,tenant_code,nom,product_id,prix_unitaire,quantite,sous_total)
         VALUES (:sid,:code,:nom,:pid,:prix,:qte,:sous)`,
        { replacements: { sid: saleId, code: req.params.tenantCode, nom: item.nom, pid: item.product_id || null, prix: +item.prix_unitaire, qte: +(item.quantite || 1), sous: +item.prix_unitaire * +(item.quantite || 1) } }
      );
      if (item.product_id) {
        await sequelize.query(
          `UPDATE retailer_products SET stock=GREATEST(0,stock-:qte) WHERE id=:pid AND tenant_code=:code`,
          { replacements: { qte: +(item.quantite || 1), pid: +item.product_id, code: req.params.tenantCode } }
        );
      }
    }

    if (est_credit && client_nom) {
      await sequelize.query(
        `INSERT INTO retailer_clients (tenant_code,nom,credit_total)
         VALUES (:code,:nom,:total)
         ON CONFLICT (tenant_code,nom) DO UPDATE SET credit_total=retailer_clients.credit_total+:total`,
        { replacements: { code: req.params.tenantCode, nom: client_nom, total } }
      );
    }

    res.json({ success: true, sale });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
router.get('/:tenantCode/clients', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT * FROM retailer_clients WHERE tenant_code=:code AND is_active=true ORDER BY nom`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, clients: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/clients', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, telephone, adresse } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom requis.' });
    const [row] = await sequelize.query(
      `INSERT INTO retailer_clients (tenant_code,nom,telephone,adresse)
       VALUES (:code,:nom,:tel,:adr)
       ON CONFLICT (tenant_code,nom) DO UPDATE SET telephone=EXCLUDED.telephone, is_active=true
       RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, tel: telephone || '', adr: adresse || '' }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, client: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/clients/:id/pay-credit', authenticate, verifyTenant, async (req, res) => {
  try {
    const { montant } = req.body;
    await sequelize.query(
      `UPDATE retailer_clients SET credit_total=GREATEST(0,credit_total-:montant) WHERE id=:id AND tenant_code=:code`,
      { replacements: { montant: +montant, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── DÉPENSES ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/expenses', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT * FROM retailer_expenses WHERE tenant_code=:code ORDER BY date_depense DESC LIMIT 50`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, expenses: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/expenses', authenticate, verifyTenant, async (req, res) => {
  try {
    const { description, montant, categorie } = req.body;
    if (!description || !montant) return res.status(400).json({ success: false, message: 'Description et montant requis.' });
    const [row] = await sequelize.query(
      `INSERT INTO retailer_expenses (tenant_code,description,montant,categorie)
       VALUES (:code,:desc,:montant,:cat) RETURNING *`,
      { replacements: { code: req.params.tenantCode, desc: description, montant: +montant, cat: categorie || 'Autre' }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, expense: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;

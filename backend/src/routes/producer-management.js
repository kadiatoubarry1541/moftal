/**
 * Gestion Interne — Entreprise de Production (usine, atelier, transformation)
 * Préfixe : /api/producer-mgmt/:tenantCode
 * Tables   : producer_products, producer_lots, producer_orders, producer_staff
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import { enforceGestionAccess } from '../middleware/gestionAccessGuard.js';

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
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Producteur Admin', type: 'producer', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }
    const [tenant] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code=:code AND owner_numero_h=:n LIMIT 1`,
      { replacements: { code: tenantCode, n: req.userId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé à cet espace producteur.' });
    req.tenant = tenant;
    return enforceGestionAccess(req, res, next);
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
    const [products, activeLots, pendingOrders, staff, caMonth, recentOrders] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM producer_products WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM producer_lots WHERE tenant_code=:code AND statut NOT IN ('livre','annule')`, { code }),
      q(`SELECT COUNT(*) as c FROM producer_orders WHERE tenant_code=:code AND statut IN ('en_attente','en_production')`, { code }),
      q(`SELECT COUNT(*) as c FROM producer_staff WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COALESCE(SUM(montant_total),0) as t FROM producer_orders WHERE tenant_code=:code AND statut='livre' AND EXTRACT(MONTH FROM date_livraison)=EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM date_livraison)=EXTRACT(YEAR FROM CURRENT_DATE)`, { code }),
      sequelize.query(`SELECT po.*, pp.nom as produit_nom FROM producer_orders po LEFT JOIN producer_products pp ON po.product_id=pp.id WHERE po.tenant_code=:code ORDER BY po.created_at DESC LIMIT 5`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
    ]);
    res.json({ success: true, totalProducts: +(products.c||0), lotsEnCours: +(activeLots.c||0), commandesEnAttente: +(pendingOrders.c||0), totalStaff: +(staff.c||0), caCeMois: +(caMonth.t||0), recentOrders });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PRODUITS ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/products', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM producer_products WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, products: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/products', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, categorie, unite, prix_unitaire, stock, description } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom requis.' });
    const [row] = await sequelize.query(
      `INSERT INTO producer_products (tenant_code,nom,categorie,unite,prix_unitaire,stock,description) VALUES (:code,:nom,:cat,:unite,:prix,:stock,:desc) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, cat:categorie||'Général', unite:unite||'kg', prix:+(prix_unitaire||0), stock:+(stock||0), desc:description||'' }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, product: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/products/:id/stock', authenticate, verifyTenant, async (req, res) => {
  try {
    const { delta } = req.body;
    await sequelize.query(`UPDATE producer_products SET stock=GREATEST(0,stock+:delta) WHERE id=:id AND tenant_code=:code`, { replacements: { delta:+delta, id:req.params.id, code:req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/products/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE producer_products SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── LOTS DE PRODUCTION ───────────────────────────────────────────────────────
router.get('/:tenantCode/lots', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT pl.*, pp.nom as produit_nom FROM producer_lots pl LEFT JOIN producer_products pp ON pl.product_id=pp.id WHERE pl.tenant_code=:code ORDER BY pl.date_debut DESC LIMIT 50`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, lots: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/lots', authenticate, verifyTenant, async (req, res) => {
  try {
    const { product_id, quantite_prevue, date_debut, date_fin_prevue, notes } = req.body;
    if (!product_id || !quantite_prevue) return res.status(400).json({ success: false, message: 'Produit et quantité requis.' });
    const [row] = await sequelize.query(
      `INSERT INTO producer_lots (tenant_code,product_id,quantite_prevue,date_debut,date_fin_prevue,notes) VALUES (:code,:pid,:qte,:debut,:fin,:notes) RETURNING *`,
      { replacements: { code: req.params.tenantCode, pid:+product_id, qte:+quantite_prevue, debut:date_debut||new Date(), fin:date_fin_prevue||null, notes:notes||'' }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, lot: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/lots/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut, quantite_produite } = req.body;
    const updates = [];
    const rep = { id: req.params.id, code: req.params.tenantCode };
    if (statut) { updates.push('statut=:statut'); rep.statut = statut; }
    if (quantite_produite != null) { updates.push('quantite_produite=:qte'); rep.qte = +quantite_produite; }
    if (statut === 'termine') updates.push('date_fin_reelle=NOW()');
    if (!updates.length) return res.json({ success: true });
    await sequelize.query(`UPDATE producer_lots SET ${updates.join(',')} WHERE id=:id AND tenant_code=:code`, { replacements: rep });
    if (statut === 'termine' && quantite_produite) {
      const [lot] = await sequelize.query(`SELECT product_id FROM producer_lots WHERE id=:id`, { replacements: { id: req.params.id }, type: sequelize.QueryTypes.SELECT });
      if (lot) await sequelize.query(`UPDATE producer_products SET stock=stock+:qte WHERE id=:pid AND tenant_code=:code`, { replacements: { qte:+quantite_produite, pid:lot.product_id, code:req.params.tenantCode } });
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── COMMANDES ────────────────────────────────────────────────────────────────
router.get('/:tenantCode/orders', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT po.*, pp.nom as produit_nom FROM producer_orders po LEFT JOIN producer_products pp ON po.product_id=pp.id WHERE po.tenant_code=:code ORDER BY po.created_at DESC LIMIT 100`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, orders: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/orders', authenticate, verifyTenant, async (req, res) => {
  try {
    const { client_nom, client_telephone, product_id, quantite, montant_total, date_livraison_prevue, notes } = req.body;
    if (!client_nom || !product_id || !quantite) return res.status(400).json({ success: false, message: 'Client, produit et quantité requis.' });
    const [row] = await sequelize.query(
      `INSERT INTO producer_orders (tenant_code,client_nom,client_telephone,product_id,quantite,montant_total,date_livraison_prevue,notes) VALUES (:code,:cnom,:ctel,:pid,:qte,:total,:dliv,:notes) RETURNING *`,
      { replacements: { code: req.params.tenantCode, cnom:client_nom, ctel:client_telephone||'', pid:+product_id, qte:+quantite, total:+(montant_total||0), dliv:date_livraison_prevue||null, notes:notes||'' }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, order: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/orders/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.body;
    const rep = { id: req.params.id, code: req.params.tenantCode, statut };
    let q = `UPDATE producer_orders SET statut=:statut`;
    if (statut === 'livre') q += ',date_livraison=NOW()';
    q += ` WHERE id=:id AND tenant_code=:code`;
    await sequelize.query(q, { replacements: rep });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PERSONNEL ────────────────────────────────────────────────────────────────
router.get('/:tenantCode/staff', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM producer_staff WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, staff: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/staff', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, poste, telephone, salaire } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom requis.' });
    const [row] = await sequelize.query(
      `INSERT INTO producer_staff (tenant_code,nom,prenom,poste,telephone,salaire) VALUES (:code,:nom,:prenom,:poste,:tel,:sal) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, prenom:prenom||'', poste:poste||'Ouvrier', tel:telephone||'', sal:+(salaire||0) }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, staff: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/staff/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE producer_staff SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ANNONCES ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM producer_announcements WHERE tenant_code=:code ORDER BY created_at DESC LIMIT 30`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, announcements: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, contenu, type } = req.body;
    if (!titre || !contenu) return res.status(400).json({ success: false, message: 'Titre et contenu requis.' });
    const [row] = await sequelize.query(
      `INSERT INTO producer_announcements (tenant_code,titre,contenu,type) VALUES (:code,:titre,:contenu,:type) RETURNING *`,
      { replacements: { code: req.params.tenantCode, titre, contenu, type:type||'general' }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, announcement: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/announcements/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM producer_announcements WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;

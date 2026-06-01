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
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Restaurant Admin', type: 'restaurant', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }
    const [tenant] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code=:code AND owner_numero_h=:n LIMIT 1`,
      { replacements: { code: tenantCode, n: req.userId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé à cet espace restaurant.' });
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
    const q = (sql, rep) => sequelize.query(sql, { replacements: rep, type: sequelize.QueryTypes.SELECT })
      .then(r => r[0]).catch(() => ({ c: 0, t: 0 }));

    const [dishes, orders, caDay, caMonth, tables, staff, recentOrders] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM resto_dishes WHERE tenant_code=:code AND disponible=true`, { code }),
      q(`SELECT COUNT(*) as c FROM resto_orders WHERE tenant_code=:code AND DATE(created_at)=CURRENT_DATE`, { code }),
      q(`SELECT COALESCE(SUM(total),0) as t FROM resto_orders WHERE tenant_code=:code AND DATE(created_at)=CURRENT_DATE AND statut='servi'`, { code }),
      q(`SELECT COALESCE(SUM(total),0) as t FROM resto_orders WHERE tenant_code=:code AND EXTRACT(MONTH FROM created_at)=EXTRACT(MONTH FROM CURRENT_DATE) AND statut='servi'`, { code }),
      q(`SELECT COUNT(*) as c FROM resto_tables WHERE tenant_code=:code`, { code }),
      q(`SELECT COUNT(*) as c FROM resto_staff WHERE tenant_code=:code AND actif=true`, { code }),
      sequelize.query(`SELECT * FROM resto_orders WHERE tenant_code=:code ORDER BY created_at DESC LIMIT 6`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
    ]);

    res.json({
      success: true,
      totalDishes: +(dishes.c || 0),
      ordersToday: +(orders.c || 0),
      caToday: +(caDay.t || 0),
      caMonth: +(caMonth.t || 0),
      totalTables: +(tables.c || 0),
      totalStaff: +(staff.c || 0),
      recentOrders,
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── MENU / PLATS ─────────────────────────────────────────────────────────────
router.get('/:tenantCode/dishes', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT * FROM resto_dishes WHERE tenant_code=:code ORDER BY categorie, nom`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, dishes: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/dishes', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, categorie, prix, description, disponible } = req.body;
    await sequelize.query(
      `INSERT INTO resto_dishes (tenant_code,nom,categorie,prix,description,disponible) VALUES(:code,:nom,:cat,:prix,:desc,:dispo)`,
      { replacements: { code: req.params.tenantCode, nom, cat: categorie || 'Plat principal', prix: prix || 0, desc: description || null, dispo: disponible !== false } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/dishes/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { disponible } = req.body;
    await sequelize.query(
      `UPDATE resto_dishes SET disponible=:dispo WHERE id=:id AND tenant_code=:code`,
      { replacements: { dispo: disponible, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/dishes/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM resto_dishes WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── TABLES ───────────────────────────────────────────────────────────────────
router.get('/:tenantCode/tables', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT * FROM resto_tables WHERE tenant_code=:code ORDER BY numero`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, tables: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/tables', authenticate, verifyTenant, async (req, res) => {
  try {
    const { numero, capacite, zone } = req.body;
    await sequelize.query(
      `INSERT INTO resto_tables (tenant_code,numero,capacite,zone,statut) VALUES(:code,:num,:cap,:zone,'libre')`,
      { replacements: { code: req.params.tenantCode, num: numero, cap: capacite || 4, zone: zone || 'Salle' } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/tables/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.body;
    await sequelize.query(
      `UPDATE resto_tables SET statut=:statut WHERE id=:id AND tenant_code=:code`,
      { replacements: { statut, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── COMMANDES ────────────────────────────────────────────────────────────────
router.get('/:tenantCode/orders', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT * FROM resto_orders WHERE tenant_code=:code ORDER BY created_at DESC LIMIT 100`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, orders: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/orders', authenticate, verifyTenant, async (req, res) => {
  try {
    const { table_id, table_num, items, type_service, type_paiement, notes } = req.body;
    const code = req.params.tenantCode;
    const total = (items || []).reduce((s, i) => s + (+i.prix || 0) * (+i.quantite || 1), 0);
    await sequelize.query(
      `INSERT INTO resto_orders (tenant_code,table_id,table_num,items,total,type_service,type_paiement,notes,statut) VALUES(:code,:tid,:tnum,:items::jsonb,:total,:service,:paiement,:notes,'en_preparation')`,
      { replacements: { code, tid: table_id || null, tnum: table_num || null, items: JSON.stringify(items || []), total, service: type_service || 'sur_place', paiement: type_paiement || 'especes', notes: notes || null } }
    );
    if (table_id) {
      await sequelize.query(`UPDATE resto_tables SET statut='occupee' WHERE id=:id AND tenant_code=:code`, { replacements: { id: table_id, code } }).catch(() => {});
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/orders/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.body;
    const code = req.params.tenantCode;
    await sequelize.query(
      `UPDATE resto_orders SET statut=:statut WHERE id=:id AND tenant_code=:code`,
      { replacements: { statut, id: req.params.id, code } }
    );
    if (statut === 'servi') {
      const [order] = await sequelize.query(`SELECT table_id FROM resto_orders WHERE id=:id`, { replacements: { id: req.params.id }, type: sequelize.QueryTypes.SELECT });
      if (order?.table_id) {
        await sequelize.query(`UPDATE resto_tables SET statut='libre' WHERE id=:id AND tenant_code=:code`, { replacements: { id: order.table_id, code } }).catch(() => {});
      }
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ÉQUIPE ───────────────────────────────────────────────────────────────────
router.get('/:tenantCode/staff', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT * FROM resto_staff WHERE tenant_code=:code ORDER BY poste, nom`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, staff: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/staff', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, poste, telephone, salaire } = req.body;
    await sequelize.query(
      `INSERT INTO resto_staff (tenant_code,nom,prenom,poste,telephone,salaire,actif) VALUES(:code,:nom,:prenom,:poste,:tel,:salaire,true)`,
      { replacements: { code: req.params.tenantCode, nom, prenom: prenom || '', poste: poste || 'Serveur', tel: telephone || '', salaire: salaire || 0 } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/staff/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM resto_staff WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ANNONCES ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT * FROM resto_announcements WHERE tenant_code=:code ORDER BY created_at DESC`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, announcements: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, contenu, type } = req.body;
    await sequelize.query(
      `INSERT INTO resto_announcements (tenant_code,titre,contenu,type) VALUES(:code,:titre,:contenu,:type)`,
      { replacements: { code: req.params.tenantCode, titre, contenu, type: type || 'general' } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/announcements/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM resto_announcements WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;

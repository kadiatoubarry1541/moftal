import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import { enforceGestionAccess } from '../middleware/gestionAccessGuard.js';

const router = express.Router();

async function verifyTenant(req, res, next) {
  const { tenantCode } = req.params;
  const isAdminUser = !!(req.user?.isMasterAdmin || req.user?.role === 'admin' || req.user?.role === 'super-admin');
  const userNumeroH = req.user?.numeroH || req.userId;
  try {
    if (isAdminUser) {
      const [tenant] = await sequelize.query(`SELECT * FROM management_tenants WHERE tenant_code=:code LIMIT 1`, { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT });
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Fournisseur Admin', type: 'supplier', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }
    let [tenant] = await sequelize.query(`SELECT * FROM management_tenants WHERE tenant_code=:code AND owner_numero_h=:n LIMIT 1`, { replacements: { code: tenantCode, n: userNumeroH }, type: sequelize.QueryTypes.SELECT });

    // Filet de sécurité : auto-créer si le pro possède un compte approuvé
    if (!tenant) {
      const prefixMap = { clinic:'CLIN', school:'ECO', enterprise:'ENT', mosque:'MSQ', madrasa:'MDS', commerce:'COM', ngo:'NGO', journalist:'JOUR', scientist:'SCIEN', supplier:'FOUR', security_agency:'SECU', vendor:'VENT', producer:'PROD', broker:'BROK', restaurant:'REST' };
      const [proAcc] = await sequelize.query(
        `SELECT * FROM professional_accounts WHERE owner_numero_h=:n AND status='approved' LIMIT 1`,
        { replacements: { n: userNumeroH }, type: sequelize.QueryTypes.SELECT }
      ).catch(() => []);
      if (proAcc) {
        const prefix = prefixMap[proAcc.type] || 'PRO';
        const autoCode = proAcc.tenant_code || `${prefix}-GN-${String(proAcc.id).padStart(5,'0')}`;
        await sequelize.query(
          `INSERT INTO management_tenants (tenant_code,type,name,owner_numero_h) VALUES (:code,:type,:name,:owner) ON CONFLICT (tenant_code) DO NOTHING`,
          { replacements: { code: autoCode, type: proAcc.type, name: proAcc.name, owner: userNumeroH } }
        ).catch(() => {});
        if (!proAcc.tenant_code) {
          await sequelize.query(
            `UPDATE professional_accounts SET tenant_code=:code WHERE id=:id`,
            { replacements: { code: autoCode, id: proAcc.id } }
          ).catch(() => {});
        }
        [tenant] = await sequelize.query(
          `SELECT * FROM management_tenants WHERE tenant_code=:code AND owner_numero_h=:n LIMIT 1`,
          { replacements: { code: autoCode, n: userNumeroH }, type: sequelize.QueryTypes.SELECT }
        ).catch(() => []);
      }
    }

    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé. Votre compte professionnel n\'est pas activé.' });
    req.tenant = tenant; return enforceGestionAccess(req, res, next);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

router.get('/:tenantCode/info', authenticate, verifyTenant, (req, res) => res.json({ success: true, tenant: req.tenant }));

router.get('/:tenantCode/dashboard', authenticate, verifyTenant, async (req, res) => {
  try {
    const code = req.params.tenantCode;
    const q = (sql, rep) => sequelize.query(sql, { replacements: rep, type: sequelize.QueryTypes.SELECT }).then(r => r[0]).catch(() => ({ c: 0, t: 0 }));
    const [prods, clients, orders, ca, recent] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM supplier_products WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM supplier_clients WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM supplier_orders WHERE tenant_code=:code AND statut='en_attente'`, { code }),
      q(`SELECT COALESCE(SUM(montant_total),0) as t FROM supplier_orders WHERE tenant_code=:code AND EXTRACT(MONTH FROM date_commande)=EXTRACT(MONTH FROM CURRENT_DATE)`, { code }),
      sequelize.query(`SELECT * FROM supplier_orders WHERE tenant_code=:code ORDER BY date_commande DESC LIMIT 5`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
    ]);
    res.json({ success: true, totalProducts: +(prods.c||0), totalClients: +(clients.c||0), commandesEnAttente: +(orders.c||0), caMois: +(ca.t||0), recentOrders: recent });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Produits
router.get('/:tenantCode/products', authenticate, verifyTenant, async (req, res) => {
  try { const rows = await sequelize.query(`SELECT * FROM supplier_products WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }); res.json({ success: true, products: rows }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/:tenantCode/products', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, categorie, prix_gros, prix_detail, stock, unite } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom obligatoire.' });
    await sequelize.query(`INSERT INTO supplier_products (tenant_code,nom,categorie,prix_gros,prix_detail,stock,unite) VALUES (:code,:nom,:cat,:pg,:pd,:stock,:unite)`,
      { replacements: { code: req.params.tenantCode, nom, cat: categorie||'', pg: prix_gros||0, pd: prix_detail||0, stock: stock||0, unite: unite||'unité' }, type: sequelize.QueryTypes.INSERT });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/:tenantCode/products/:id', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`UPDATE supplier_products SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Clients / Revendeurs
router.get('/:tenantCode/clients', authenticate, verifyTenant, async (req, res) => {
  try { const rows = await sequelize.query(`SELECT * FROM supplier_clients WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }); res.json({ success: true, clients: rows }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/:tenantCode/clients', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, telephone, adresse, type_client } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom obligatoire.' });
    await sequelize.query(`INSERT INTO supplier_clients (tenant_code,nom,telephone,adresse,type_client) VALUES (:code,:nom,:tel,:adr,:type)`,
      { replacements: { code: req.params.tenantCode, nom, tel: telephone||'', adr: adresse||'', type: type_client||'revendeur' }, type: sequelize.QueryTypes.INSERT });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/:tenantCode/clients/:id', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`UPDATE supplier_clients SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Commandes
router.get('/:tenantCode/orders', authenticate, verifyTenant, async (req, res) => {
  try { const rows = await sequelize.query(`SELECT * FROM supplier_orders WHERE tenant_code=:code ORDER BY date_commande DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }); res.json({ success: true, orders: rows }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/:tenantCode/orders', authenticate, verifyTenant, async (req, res) => {
  try {
    const { client_nom, client_id, montant_total, statut, date_commande, notes } = req.body;
    if (!montant_total) return res.status(400).json({ success: false, message: 'Montant obligatoire.' });
    await sequelize.query(`INSERT INTO supplier_orders (tenant_code,client_nom,client_id,montant_total,statut,date_commande,notes) VALUES (:code,:cnom,:cid,:montant,:statut,:date,:notes)`,
      { replacements: { code: req.params.tenantCode, cnom: client_nom||'', cid: client_id||null, montant: montant_total, statut: statut||'en_attente', date: date_commande||new Date().toISOString().split('T')[0], notes: notes||'' }, type: sequelize.QueryTypes.INSERT });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.patch('/:tenantCode/orders/:id/statut', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`UPDATE supplier_orders SET statut=:statut WHERE id=:id AND tenant_code=:code`, { replacements: { statut: req.body.statut, id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/:tenantCode/orders/:id', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`DELETE FROM supplier_orders WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.DELETE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Annonces
router.get('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try { const rows = await sequelize.query(`SELECT * FROM supplier_announcements WHERE tenant_code=:code AND is_active=true ORDER BY created_at DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }); res.json({ success: true, announcements: rows }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, contenu, type } = req.body;
    if (!titre || !contenu) return res.status(400).json({ success: false, message: 'Titre et contenu obligatoires.' });
    await sequelize.query(`INSERT INTO supplier_announcements (tenant_code,titre,contenu,type) VALUES (:code,:titre,:contenu,:type)`, { replacements: { code: req.params.tenantCode, titre, contenu, type: type||'general' }, type: sequelize.QueryTypes.INSERT });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/:tenantCode/announcements/:id', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`UPDATE supplier_announcements SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;

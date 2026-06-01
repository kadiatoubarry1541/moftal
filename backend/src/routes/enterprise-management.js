import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';

const router = express.Router();

async function verifyTenant(req, res, next) {
  const { tenantCode } = req.params;
  const isAdminUser = !!(req.user?.isMasterAdmin || req.user?.role === 'admin' || req.user?.role === 'super-admin');
  const userNumeroH = req.user?.numeroH || req.userId;
  try {
    if (isAdminUser) {
      const [tenant] = await sequelize.query(`SELECT * FROM management_tenants WHERE tenant_code=:code LIMIT 1`, { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT });
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Entreprise Admin', type: 'enterprise', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }
    const [tenant] = await sequelize.query(`SELECT * FROM management_tenants WHERE tenant_code=:code AND owner_numero_h=:n LIMIT 1`, { replacements: { code: tenantCode, n: userNumeroH }, type: sequelize.QueryTypes.SELECT });
    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé.' });
    req.tenant = tenant; next();
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

router.get('/:tenantCode/info', authenticate, verifyTenant, (req, res) => res.json({ success: true, tenant: req.tenant }));

router.get('/:tenantCode/dashboard', authenticate, verifyTenant, async (req, res) => {
  try {
    const code = req.params.tenantCode;
    const q = (sql, rep) => sequelize.query(sql, { replacements: rep, type: sequelize.QueryTypes.SELECT }).then(r => r[0]).catch(() => ({ c: 0, t: 0 }));
    const [employees, clients, contracts, ca, recent] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM enterprise_employees WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM enterprise_clients WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM enterprise_contracts WHERE tenant_code=:code AND statut='en_cours'`, { code }),
      q(`SELECT COALESCE(SUM(budget),0) as t FROM enterprise_contracts WHERE tenant_code=:code AND statut='termine'`, { code }),
      sequelize.query(`SELECT * FROM enterprise_contracts WHERE tenant_code=:code ORDER BY created_at DESC LIMIT 5`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
    ]);
    res.json({ success: true, totalEmployees: +(employees.c||0), totalClients: +(clients.c||0), contratsEnCours: +(contracts.c||0), caTotal: +(ca.t||0), recentContracts: recent });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Employés
router.get('/:tenantCode/employees', authenticate, verifyTenant, async (req, res) => {
  try { const rows = await sequelize.query(`SELECT * FROM enterprise_employees WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }); res.json({ success: true, employees: rows }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/:tenantCode/employees', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, telephone, numero_h, poste, departement } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom obligatoire.' });
    await sequelize.query(`INSERT INTO enterprise_employees (tenant_code,nom,prenom,telephone,numero_h,poste,departement) VALUES (:code,:nom,:prenom,:tel,:nh,:poste,:dept)`,
      { replacements: { code: req.params.tenantCode, nom, prenom: prenom||'', tel: telephone||'', nh: numero_h||'', poste: poste||'Employé', dept: departement||'' }, type: sequelize.QueryTypes.INSERT });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/:tenantCode/employees/:id', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`UPDATE enterprise_employees SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Clients
router.get('/:tenantCode/clients', authenticate, verifyTenant, async (req, res) => {
  try { const rows = await sequelize.query(`SELECT * FROM enterprise_clients WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }); res.json({ success: true, clients: rows }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/:tenantCode/clients', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, telephone, adresse, secteur } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom obligatoire.' });
    await sequelize.query(`INSERT INTO enterprise_clients (tenant_code,nom,telephone,adresse,secteur) VALUES (:code,:nom,:tel,:adr,:secteur)`,
      { replacements: { code: req.params.tenantCode, nom, tel: telephone||'', adr: adresse||'', secteur: secteur||'' }, type: sequelize.QueryTypes.INSERT });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/:tenantCode/clients/:id', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`UPDATE enterprise_clients SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Contrats / Projets
router.get('/:tenantCode/contracts', authenticate, verifyTenant, async (req, res) => {
  try { const rows = await sequelize.query(`SELECT * FROM enterprise_contracts WHERE tenant_code=:code ORDER BY created_at DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }); res.json({ success: true, contracts: rows }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/:tenantCode/contracts', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, client_nom, client_id, budget, statut, date_debut, date_fin, description } = req.body;
    if (!titre) return res.status(400).json({ success: false, message: 'Titre obligatoire.' });
    await sequelize.query(`INSERT INTO enterprise_contracts (tenant_code,titre,client_nom,client_id,budget,statut,date_debut,date_fin,description) VALUES (:code,:titre,:cnom,:cid,:budget,:statut,:dd,:df,:desc)`,
      { replacements: { code: req.params.tenantCode, titre, cnom: client_nom||'', cid: client_id||null, budget: budget||0, statut: statut||'en_cours', dd: date_debut||new Date().toISOString().split('T')[0], df: date_fin||null, desc: description||'' }, type: sequelize.QueryTypes.INSERT });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.patch('/:tenantCode/contracts/:id/statut', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`UPDATE enterprise_contracts SET statut=:statut WHERE id=:id AND tenant_code=:code`, { replacements: { statut: req.body.statut, id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/:tenantCode/contracts/:id', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`DELETE FROM enterprise_contracts WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.DELETE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Annonces
router.get('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try { const rows = await sequelize.query(`SELECT * FROM enterprise_announcements WHERE tenant_code=:code AND is_active=true ORDER BY created_at DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }); res.json({ success: true, announcements: rows }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, contenu, type } = req.body;
    if (!titre || !contenu) return res.status(400).json({ success: false, message: 'Titre et contenu obligatoires.' });
    await sequelize.query(`INSERT INTO enterprise_announcements (tenant_code,titre,contenu,type) VALUES (:code,:titre,:contenu,:type)`, { replacements: { code: req.params.tenantCode, titre, contenu, type: type||'general' }, type: sequelize.QueryTypes.INSERT });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/:tenantCode/announcements/:id', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`UPDATE enterprise_announcements SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;

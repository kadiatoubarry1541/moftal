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
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Sécurité Admin', type: 'security_agency', owner_numero_h: 'ADMIN-G7', is_active: true };
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
    const [agents, missions, clients, anns, recent] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM security_agents WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM security_missions WHERE tenant_code=:code AND statut='en_cours'`, { code }),
      q(`SELECT COUNT(*) as c FROM security_clients WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM security_announcements WHERE tenant_code=:code AND is_active=true`, { code }),
      sequelize.query(`SELECT * FROM security_missions WHERE tenant_code=:code ORDER BY date_debut DESC LIMIT 5`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
    ]);
    res.json({ success: true, totalAgents: +(agents.c||0), missionsEnCours: +(missions.c||0), totalClients: +(clients.c||0), totalAnnouncements: +(anns.c||0), recentMissions: recent });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Agents
router.get('/:tenantCode/agents', authenticate, verifyTenant, async (req, res) => {
  try { const rows = await sequelize.query(`SELECT * FROM security_agents WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }); res.json({ success: true, agents: rows }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/:tenantCode/agents', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, telephone, numero_h, grade, zone } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom obligatoire.' });
    await sequelize.query(`INSERT INTO security_agents (tenant_code,nom,prenom,telephone,numero_h,grade,zone) VALUES (:code,:nom,:prenom,:tel,:nh,:grade,:zone)`,
      { replacements: { code: req.params.tenantCode, nom, prenom: prenom||'', tel: telephone||'', nh: numero_h||'', grade: grade||'Agent', zone: zone||'' }, type: sequelize.QueryTypes.INSERT });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/:tenantCode/agents/:id', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`UPDATE security_agents SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Missions
router.get('/:tenantCode/missions', authenticate, verifyTenant, async (req, res) => {
  try { const rows = await sequelize.query(`SELECT * FROM security_missions WHERE tenant_code=:code ORDER BY date_debut DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }); res.json({ success: true, missions: rows }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/:tenantCode/missions', authenticate, verifyTenant, async (req, res) => {
  try {
    const { agent_id, agent_nom, titre, client_nom, lieu, date_debut, date_fin, statut, notes } = req.body;
    if (!titre) return res.status(400).json({ success: false, message: 'Titre obligatoire.' });
    await sequelize.query(`INSERT INTO security_missions (tenant_code,agent_id,agent_nom,titre,client_nom,lieu,date_debut,date_fin,statut,notes) VALUES (:code,:aid,:anom,:titre,:cnom,:lieu,:dd,:df,:statut,:notes)`,
      { replacements: { code: req.params.tenantCode, aid: agent_id||null, anom: agent_nom||'', titre, cnom: client_nom||'', lieu: lieu||'', dd: date_debut||new Date().toISOString().split('T')[0], df: date_fin||null, statut: statut||'en_cours', notes: notes||'' }, type: sequelize.QueryTypes.INSERT });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.patch('/:tenantCode/missions/:id/statut', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`UPDATE security_missions SET statut=:statut WHERE id=:id AND tenant_code=:code`, { replacements: { statut: req.body.statut, id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/:tenantCode/missions/:id', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`DELETE FROM security_missions WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.DELETE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Clients
router.get('/:tenantCode/clients', authenticate, verifyTenant, async (req, res) => {
  try { const rows = await sequelize.query(`SELECT * FROM security_clients WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }); res.json({ success: true, clients: rows }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/:tenantCode/clients', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, telephone, adresse, type_contrat } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom obligatoire.' });
    await sequelize.query(`INSERT INTO security_clients (tenant_code,nom,telephone,adresse,type_contrat) VALUES (:code,:nom,:tel,:adr,:type)`,
      { replacements: { code: req.params.tenantCode, nom, tel: telephone||'', adr: adresse||'', type: type_contrat||'ponctuel' }, type: sequelize.QueryTypes.INSERT });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/:tenantCode/clients/:id', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`UPDATE security_clients SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Annonces
router.get('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try { const rows = await sequelize.query(`SELECT * FROM security_announcements WHERE tenant_code=:code AND is_active=true ORDER BY created_at DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }); res.json({ success: true, announcements: rows }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, contenu, type } = req.body;
    if (!titre || !contenu) return res.status(400).json({ success: false, message: 'Titre et contenu obligatoires.' });
    await sequelize.query(`INSERT INTO security_announcements (tenant_code,titre,contenu,type) VALUES (:code,:titre,:contenu,:type)`, { replacements: { code: req.params.tenantCode, titre, contenu, type: type||'general' }, type: sequelize.QueryTypes.INSERT });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/:tenantCode/announcements/:id', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`UPDATE security_announcements SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;

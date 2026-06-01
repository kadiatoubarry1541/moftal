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
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Scientifique Admin', type: 'scientist', owner_numero_h: 'ADMIN-G7', is_active: true };
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
    const [members, pubs, projs, anns, recent] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM scientist_members WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM scientist_publications WHERE tenant_code=:code AND statut='publie'`, { code }),
      q(`SELECT COUNT(*) as c FROM scientist_projects WHERE tenant_code=:code AND statut='en_cours'`, { code }),
      q(`SELECT COUNT(*) as c FROM scientist_announcements WHERE tenant_code=:code AND is_active=true`, { code }),
      sequelize.query(`SELECT * FROM scientist_publications WHERE tenant_code=:code ORDER BY date_pub DESC LIMIT 5`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
    ]);
    res.json({ success: true, totalMembers: +(members.c||0), totalPublications: +(pubs.c||0), projetsEnCours: +(projs.c||0), totalAnnouncements: +(anns.c||0), recentPublications: recent });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Membres
router.get('/:tenantCode/members', authenticate, verifyTenant, async (req, res) => {
  try { const rows = await sequelize.query(`SELECT * FROM scientist_members WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }); res.json({ success: true, members: rows }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/:tenantCode/members', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, telephone, numero_h, titre, domaine, institution } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom obligatoire.' });
    await sequelize.query(`INSERT INTO scientist_members (tenant_code,nom,prenom,telephone,numero_h,titre,domaine,institution) VALUES (:code,:nom,:prenom,:tel,:nh,:titre,:domaine,:inst)`,
      { replacements: { code: req.params.tenantCode, nom, prenom: prenom||'', tel: telephone||'', nh: numero_h||'', titre: titre||'Chercheur', domaine: domaine||'', inst: institution||'' }, type: sequelize.QueryTypes.INSERT });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/:tenantCode/members/:id', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`UPDATE scientist_members SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Publications
router.get('/:tenantCode/publications', authenticate, verifyTenant, async (req, res) => {
  try { const rows = await sequelize.query(`SELECT * FROM scientist_publications WHERE tenant_code=:code ORDER BY date_pub DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }); res.json({ success: true, publications: rows }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/:tenantCode/publications', authenticate, verifyTenant, async (req, res) => {
  try {
    const { auteur_id, auteur_nom, titre, type_pub, domaine, statut, date_pub, resume } = req.body;
    if (!titre) return res.status(400).json({ success: false, message: 'Titre obligatoire.' });
    await sequelize.query(`INSERT INTO scientist_publications (tenant_code,auteur_id,auteur_nom,titre,type_pub,domaine,statut,date_pub,resume) VALUES (:code,:aid,:anom,:titre,:type,:domaine,:statut,:date,:resume)`,
      { replacements: { code: req.params.tenantCode, aid: auteur_id||null, anom: auteur_nom||'', titre, type: type_pub||'article', domaine: domaine||'', statut: statut||'en_cours', date: date_pub||new Date().toISOString().split('T')[0], resume: resume||'' }, type: sequelize.QueryTypes.INSERT });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.patch('/:tenantCode/publications/:id/statut', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`UPDATE scientist_publications SET statut=:statut WHERE id=:id AND tenant_code=:code`, { replacements: { statut: req.body.statut, id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/:tenantCode/publications/:id', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`DELETE FROM scientist_publications WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.DELETE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Projets
router.get('/:tenantCode/projects', authenticate, verifyTenant, async (req, res) => {
  try { const rows = await sequelize.query(`SELECT * FROM scientist_projects WHERE tenant_code=:code ORDER BY created_at DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }); res.json({ success: true, projects: rows }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/:tenantCode/projects', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, description, responsable, statut, date_debut, date_fin, budget } = req.body;
    if (!titre) return res.status(400).json({ success: false, message: 'Titre obligatoire.' });
    await sequelize.query(`INSERT INTO scientist_projects (tenant_code,titre,description,responsable,statut,date_debut,date_fin,budget) VALUES (:code,:titre,:desc,:resp,:statut,:dd,:df,:budget)`,
      { replacements: { code: req.params.tenantCode, titre, desc: description||'', resp: responsable||'', statut: statut||'en_cours', dd: date_debut||new Date().toISOString().split('T')[0], df: date_fin||null, budget: budget||0 }, type: sequelize.QueryTypes.INSERT });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.patch('/:tenantCode/projects/:id/statut', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`UPDATE scientist_projects SET statut=:statut WHERE id=:id AND tenant_code=:code`, { replacements: { statut: req.body.statut, id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/:tenantCode/projects/:id', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`DELETE FROM scientist_projects WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.DELETE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// Annonces
router.get('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try { const rows = await sequelize.query(`SELECT * FROM scientist_announcements WHERE tenant_code=:code AND is_active=true ORDER BY created_at DESC`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }); res.json({ success: true, announcements: rows }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.post('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, contenu, type } = req.body;
    if (!titre || !contenu) return res.status(400).json({ success: false, message: 'Titre et contenu obligatoires.' });
    await sequelize.query(`INSERT INTO scientist_announcements (tenant_code,titre,contenu,type) VALUES (:code,:titre,:contenu,:type)`, { replacements: { code: req.params.tenantCode, titre, contenu, type: type||'general' }, type: sequelize.QueryTypes.INSERT });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});
router.delete('/:tenantCode/announcements/:id', authenticate, verifyTenant, async (req, res) => {
  try { await sequelize.query(`UPDATE scientist_announcements SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode }, type: sequelize.QueryTypes.UPDATE }); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;

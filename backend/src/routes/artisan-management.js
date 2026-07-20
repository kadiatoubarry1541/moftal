/**
 * Gestion Interne — Artisanat & Services (plombier, électricien, menuisier, etc.)
 * Préfixe : /api/artisan-mgmt/:tenantCode
 * Tables   : artisan_services, artisan_interventions, artisan_clients
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
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Artisan Admin', type: 'artisan', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }
    const [tenant] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code=:code AND owner_numero_h=:n LIMIT 1`,
      { replacements: { code: tenantCode, n: req.userId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé à cet espace artisan.' });
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
    const [services, interventions, enCours, terminees, clients, caTotal, recent] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM artisan_services WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM artisan_interventions WHERE tenant_code=:code AND statut NOT IN ('terminee','annulee')`, { code }),
      q(`SELECT COUNT(*) as c FROM artisan_interventions WHERE tenant_code=:code AND statut='en_cours'`, { code }),
      q(`SELECT COUNT(*) as c FROM artisan_interventions WHERE tenant_code=:code AND statut='terminee' AND DATE(date_fin)=CURRENT_DATE`, { code }),
      q(`SELECT COUNT(*) as c FROM artisan_clients WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COALESCE(SUM(cout_reel),0) as t FROM artisan_interventions WHERE tenant_code=:code AND statut='terminee' AND EXTRACT(MONTH FROM date_fin)=EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM date_fin)=EXTRACT(YEAR FROM CURRENT_DATE)`, { code }),
      sequelize.query(`SELECT ai.*, ac.nom as client_nom, ase.nom as service_nom FROM artisan_interventions ai LEFT JOIN artisan_clients ac ON ai.client_id=ac.id LEFT JOIN artisan_services ase ON ai.service_id=ase.id WHERE ai.tenant_code=:code ORDER BY ai.date_debut DESC LIMIT 5`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
    ]);
    res.json({ success: true, totalServices: +(services.c||0), interventionsEnCours: +(interventions.c||0), enCours: +(enCours.c||0), terminéesAujourdhui: +(terminees.c||0), totalClients: +(clients.c||0), caCeMois: +(caTotal.t||0), recentInterventions: recent });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── SERVICES PROPOSÉS ────────────────────────────────────────────────────────
router.get('/:tenantCode/services', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM artisan_services WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, services: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/services', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, categorie, prix_base, description, zone_intervention } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom requis.' });
    const [row] = await sequelize.query(
      `INSERT INTO artisan_services (tenant_code,nom,categorie,prix_base,description,zone_intervention) VALUES (:code,:nom,:cat,:prix,:desc,:zone) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, cat:categorie||'Général', prix:+(prix_base||0), desc:description||'', zone:zone_intervention||'' }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, service: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/services/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE artisan_services SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── INTERVENTIONS ────────────────────────────────────────────────────────────
router.get('/:tenantCode/interventions', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.query;
    let q = `SELECT ai.*, ac.nom as client_nom, ac.telephone as client_telephone, ase.nom as service_nom FROM artisan_interventions ai LEFT JOIN artisan_clients ac ON ai.client_id=ac.id LEFT JOIN artisan_services ase ON ai.service_id=ase.id WHERE ai.tenant_code=:code`;
    if (statut) q += ` AND ai.statut=:statut`;
    q += ` ORDER BY ai.date_debut DESC LIMIT 100`;
    const rows = await sequelize.query(q, { replacements: { code: req.params.tenantCode, statut: statut||null }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, interventions: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/interventions', authenticate, verifyTenant, async (req, res) => {
  try {
    const { client_id, service_id, titre, description, adresse, date_debut, cout_estime, priorite, notes } = req.body;
    if (!titre) return res.status(400).json({ success: false, message: 'Titre requis.' });
    const [row] = await sequelize.query(
      `INSERT INTO artisan_interventions (tenant_code,client_id,service_id,titre,description,adresse,date_debut,cout_estime,priorite,notes) VALUES (:code,:cid,:sid,:titre,:desc,:adr,:date,:cout,:prio,:notes) RETURNING *`,
      { replacements: { code: req.params.tenantCode, cid:client_id||null, sid:service_id||null, titre, desc:description||'', adr:adresse||'', date:date_debut||new Date(), cout:+(cout_estime||0), prio:priorite||'normale', notes:notes||'' }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, intervention: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/interventions/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut, cout_reel, notes } = req.body;
    const updates = [];
    const rep = { id: req.params.id, code: req.params.tenantCode };
    if (statut) { updates.push('statut=:statut'); rep.statut = statut; }
    if (cout_reel != null) { updates.push('cout_reel=:cout'); rep.cout = +cout_reel; }
    if (notes != null) { updates.push('notes=:notes'); rep.notes = notes; }
    if (statut === 'terminee') { updates.push('date_fin=NOW()'); }
    if (!updates.length) return res.json({ success: true });
    await sequelize.query(`UPDATE artisan_interventions SET ${updates.join(',')} WHERE id=:id AND tenant_code=:code`, { replacements: rep });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
router.get('/:tenantCode/clients', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM artisan_clients WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, clients: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/clients', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, telephone, adresse, email } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom requis.' });
    const [row] = await sequelize.query(
      `INSERT INTO artisan_clients (tenant_code,nom,telephone,adresse,email) VALUES (:code,:nom,:tel,:adr,:email) ON CONFLICT (tenant_code,nom) DO UPDATE SET telephone=EXCLUDED.telephone,is_active=true RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, tel:telephone||'', adr:adresse||'', email:email||'' }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, client: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ANNONCES ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM artisan_announcements WHERE tenant_code=:code ORDER BY created_at DESC LIMIT 30`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, announcements: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, contenu, type } = req.body;
    if (!titre || !contenu) return res.status(400).json({ success: false, message: 'Titre et contenu requis.' });
    const [row] = await sequelize.query(
      `INSERT INTO artisan_announcements (tenant_code,titre,contenu,type) VALUES (:code,:titre,:contenu,:type) RETURNING *`,
      { replacements: { code: req.params.tenantCode, titre, contenu, type:type||'general' }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, announcement: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/announcements/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM artisan_announcements WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;

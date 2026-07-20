/**
 * Gestion Interne — Beauté & Bien-être (salon, coiffure, spa, institut)
 * Préfixe : /api/beauty-mgmt/:tenantCode
 * Tables   : beauty_services, beauty_staff, beauty_bookings, beauty_clients
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
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Beauté Admin', type: 'beauty', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }
    const [tenant] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code=:code AND owner_numero_h=:n LIMIT 1`,
      { replacements: { code: tenantCode, n: req.userId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé à cet espace beauté.' });
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
    const [services, staff, today, month, pending, clients, recent] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM beauty_services WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM beauty_staff WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM beauty_bookings WHERE tenant_code=:code AND DATE(date_rdv)=CURRENT_DATE`, { code }),
      q(`SELECT COUNT(*) as c FROM beauty_bookings WHERE tenant_code=:code AND EXTRACT(MONTH FROM date_rdv)=EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM date_rdv)=EXTRACT(YEAR FROM CURRENT_DATE)`, { code }),
      q(`SELECT COUNT(*) as c FROM beauty_bookings WHERE tenant_code=:code AND statut='en_attente'`, { code }),
      q(`SELECT COUNT(*) as c FROM beauty_clients WHERE tenant_code=:code AND is_active=true`, { code }),
      sequelize.query(`SELECT bb.*, bs.nom as service_nom FROM beauty_bookings bb LEFT JOIN beauty_services bs ON bb.service_id=bs.id WHERE bb.tenant_code=:code ORDER BY bb.date_rdv DESC LIMIT 5`, { replacements: { code }, type: sequelize.QueryTypes.SELECT }).catch(() => []),
    ]);
    res.json({ success: true, totalServices: +(services.c||0), totalStaff: +(staff.c||0), rdvAujourdhui: +(today.c||0), rdvCeMois: +(month.c||0), rdvEnAttente: +(pending.c||0), totalClients: +(clients.c||0), recentBookings: recent });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── SERVICES ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/services', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM beauty_services WHERE tenant_code=:code AND is_active=true ORDER BY categorie, nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, services: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/services', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, categorie, prix, duree_min, description } = req.body;
    if (!nom || !prix) return res.status(400).json({ success: false, message: 'Nom et prix requis.' });
    const [row] = await sequelize.query(
      `INSERT INTO beauty_services (tenant_code,nom,categorie,prix,duree_min,description) VALUES (:code,:nom,:cat,:prix,:duree,:desc) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, cat: categorie||'Général', prix: +prix, duree: +(duree_min||30), desc: description||'' }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, service: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/services/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, categorie, prix, duree_min, description } = req.body;
    await sequelize.query(
      `UPDATE beauty_services SET nom=COALESCE(:nom,nom),categorie=COALESCE(:cat,categorie),prix=COALESCE(:prix,prix),duree_min=COALESCE(:duree,duree_min),description=COALESCE(:desc,description) WHERE id=:id AND tenant_code=:code`,
      { replacements: { id: req.params.id, code: req.params.tenantCode, nom:nom||null, cat:categorie||null, prix:prix?+prix:null, duree:duree_min?+duree_min:null, desc:description||null } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/services/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE beauty_services SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── PERSONNEL ────────────────────────────────────────────────────────────────
router.get('/:tenantCode/staff', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM beauty_staff WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, staff: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/staff', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, poste, telephone, specialite, salaire } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom requis.' });
    const [row] = await sequelize.query(
      `INSERT INTO beauty_staff (tenant_code,nom,prenom,poste,telephone,specialite,salaire) VALUES (:code,:nom,:prenom,:poste,:tel,:spec,:sal) RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, prenom:prenom||'', poste:poste||'Coiffeur/se', tel:telephone||'', spec:specialite||'', sal:+(salaire||0) }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, staff: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/staff/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`UPDATE beauty_staff SET is_active=false WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── RENDEZ-VOUS / BOOKINGS ───────────────────────────────────────────────────
router.get('/:tenantCode/bookings', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT bb.*, bs.nom as service_nom, bs.prix as service_prix, bst.nom as staff_nom FROM beauty_bookings bb LEFT JOIN beauty_services bs ON bb.service_id=bs.id LEFT JOIN beauty_staff bst ON bb.staff_id=bst.id WHERE bb.tenant_code=:code ORDER BY bb.date_rdv DESC LIMIT 100`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, bookings: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/bookings', authenticate, verifyTenant, async (req, res) => {
  try {
    const { client_nom, client_telephone, service_id, staff_id, date_rdv, heure_rdv, notes } = req.body;
    if (!client_nom || !date_rdv) return res.status(400).json({ success: false, message: 'Nom client et date requis.' });
    const [row] = await sequelize.query(
      `INSERT INTO beauty_bookings (tenant_code,client_nom,client_telephone,service_id,staff_id,date_rdv,heure_rdv,notes) VALUES (:code,:cnom,:ctel,:sid,:stid,:date,:heure,:notes) RETURNING *`,
      { replacements: { code: req.params.tenantCode, cnom:client_nom, ctel:client_telephone||'', sid:service_id||null, stid:staff_id||null, date:date_rdv, heure:heure_rdv||'', notes:notes||'' }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, booking: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/bookings/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.body;
    await sequelize.query(`UPDATE beauty_bookings SET statut=:statut WHERE id=:id AND tenant_code=:code`, { replacements: { statut, id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
router.get('/:tenantCode/clients', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM beauty_clients WHERE tenant_code=:code AND is_active=true ORDER BY nom`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, clients: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/clients', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, telephone, email, notes } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom requis.' });
    const [row] = await sequelize.query(
      `INSERT INTO beauty_clients (tenant_code,nom,telephone,email,notes) VALUES (:code,:nom,:tel,:email,:notes) ON CONFLICT (tenant_code,nom) DO UPDATE SET telephone=EXCLUDED.telephone,is_active=true RETURNING *`,
      { replacements: { code: req.params.tenantCode, nom, tel:telephone||'', email:email||'', notes:notes||'' }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, client: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ANNONCES ─────────────────────────────────────────────────────────────────
router.get('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const rows = await sequelize.query(`SELECT * FROM beauty_announcements WHERE tenant_code=:code ORDER BY created_at DESC LIMIT 30`, { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT });
    res.json({ success: true, announcements: rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/announcements', authenticate, verifyTenant, async (req, res) => {
  try {
    const { titre, contenu, type } = req.body;
    if (!titre || !contenu) return res.status(400).json({ success: false, message: 'Titre et contenu requis.' });
    const [row] = await sequelize.query(
      `INSERT INTO beauty_announcements (tenant_code,titre,contenu,type) VALUES (:code,:titre,:contenu,:type) RETURNING *`,
      { replacements: { code: req.params.tenantCode, titre, contenu, type:type||'general' }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, announcement: row });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/announcements/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM beauty_announcements WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;

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
        `SELECT * FROM management_tenants WHERE tenant_code = :code LIMIT 1`,
        { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
      );
      req.tenant = tenant || { tenant_code: tenantCode, name: 'Mairie Admin', type: 'mairie', owner_numero_h: 'ADMIN-G7', is_active: true };
      return next();
    }
    const [tenant] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code = :code AND owner_numero_h = :n LIMIT 1`,
      { replacements: { code: tenantCode, n: req.userId }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(403).json({ success: false, message: 'Accès refusé à cet espace mairie.' });
    req.tenant = tenant;
    return enforceGestionAccess(req, res, next);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

// GET /api/mairie-mgmt/:tenantCode/info
router.get('/:tenantCode/info', authenticate, verifyTenant, (req, res) => {
  res.json({ success: true, tenant: req.tenant });
});

// PUT /api/mairie-mgmt/:tenantCode/settings
router.put('/:tenantCode/settings', authenticate, verifyTenant, async (req, res) => {
  try {
    const { name, logo_url, address, phone, email, description } = req.body;
    const code = req.params.tenantCode;
    await sequelize.query(
      `UPDATE management_tenants SET
        name        = COALESCE(:name, name),
        logo_url    = :logo,
        address     = :address,
        phone       = :phone,
        email       = :email,
        description = :desc
       WHERE tenant_code = :code`,
      { replacements: { name: name || null, logo: logo_url || null, address: address || null, phone: phone || null, email: email || null, desc: description || null, code } }
    );
    const [updated] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code = :code LIMIT 1`,
      { replacements: { code }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, tenant: updated });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/mairie-mgmt/:tenantCode/dashboard
router.get('/:tenantCode/dashboard', authenticate, verifyTenant, async (req, res) => {
  try {
    const code = req.params.tenantCode;
    const q = (sql, rep) => sequelize.query(sql, { replacements: rep, type: sequelize.QueryTypes.SELECT })
      .then(r => r[0]).catch(() => ({ c: 0 }));
    const [mariagesMois, mariagesEnAttente, naissancesMois, decesMois, agents, mariagesAujourdhui, naissancesAujourdhui] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM mairie_mariages WHERE tenant_code=:code AND DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW())`, { code }),
      q(`SELECT COUNT(*) as c FROM mairie_mariages WHERE tenant_code=:code AND statut='en_attente'`, { code }),
      q(`SELECT COUNT(*) as c FROM mairie_naissances WHERE tenant_code=:code AND DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW())`, { code }),
      q(`SELECT COUNT(*) as c FROM mairie_deces WHERE tenant_code=:code AND DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW())`, { code }),
      q(`SELECT COUNT(*) as c FROM mairie_agents WHERE tenant_code=:code AND is_active=true`, { code }),
      q(`SELECT COUNT(*) as c FROM mairie_mariages WHERE tenant_code=:code AND DATE(created_at)=CURRENT_DATE`, { code }),
      q(`SELECT COUNT(*) as c FROM mairie_naissances WHERE tenant_code=:code AND DATE(created_at)=CURRENT_DATE`, { code }),
    ]);
    const recentMariages = await sequelize.query(
      `SELECT * FROM mairie_mariages WHERE tenant_code=:code ORDER BY created_at DESC LIMIT 5`,
      { replacements: { code }, type: sequelize.QueryTypes.SELECT }
    ).catch(() => []);
    res.json({
      success: true,
      stats: {
        mariagesMois: +(mariagesMois.c || 0),
        mariagesEnAttente: +(mariagesEnAttente.c || 0),
        naissancesMois: +(naissancesMois.c || 0),
        decesMois: +(decesMois.c || 0),
        agents: +(agents.c || 0),
        mariagesAujourdhui: +(mariagesAujourdhui.c || 0),
        naissancesAujourdhui: +(naissancesAujourdhui.c || 0),
      },
      recentMariages
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── MARIAGES ────────────────────────────────────────────────────────────────

router.get('/:tenantCode/mariages', authenticate, verifyTenant, async (req, res) => {
  try {
    const { search, statut } = req.query;
    let q = `SELECT * FROM mairie_mariages WHERE tenant_code=:code`;
    if (statut) q += ` AND statut=:statut`;
    if (search) q += ` AND (epoux_nom ILIKE :s OR epoux_prenom ILIKE :s OR epouse_nom ILIKE :s OR epouse_prenom ILIKE :s OR numero_dossier ILIKE :s)`;
    q += ` ORDER BY created_at DESC`;
    const mariages = await sequelize.query(q, {
      replacements: { code: req.params.tenantCode, statut: statut || null, s: `%${search || ''}%` },
      type: sequelize.QueryTypes.SELECT
    });
    res.json({ success: true, mariages });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/mariages', authenticate, verifyTenant, async (req, res) => {
  try {
    const { epoux_nom, epoux_prenom, epoux_ddn, epoux_numero_h, epouse_nom, epouse_prenom, epouse_ddn, epouse_numero_h, date_mariage, lieu_mariage, temoin1_nom, temoin2_nom, notes } = req.body;
    const code = req.params.tenantCode;
    const [cnt] = await sequelize.query(`SELECT COUNT(*) as c FROM mairie_mariages WHERE tenant_code=:code`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const num = `MAR-${code.slice(-4)}-${String(+cnt.c + 1).padStart(4, '0')}`;
    const [rows] = await sequelize.query(
      `INSERT INTO mairie_mariages (tenant_code,numero_dossier,epoux_nom,epoux_prenom,epoux_ddn,epoux_numero_h,epouse_nom,epouse_prenom,epouse_ddn,epouse_numero_h,date_mariage,lieu_mariage,temoin1_nom,temoin2_nom,notes)
       VALUES(:code,:num,:en,:ep,:edd,:enh,:fn,:fp,:fdd,:fnh,:dm,:lm,:t1,:t2,:notes) RETURNING *`,
      { replacements: { code, num, en: epoux_nom, ep: epoux_prenom, edd: epoux_ddn || null, enh: epoux_numero_h || null, fn: epouse_nom, fp: epouse_prenom, fdd: epouse_ddn || null, fnh: epouse_numero_h || null, dm: date_mariage, lm: lieu_mariage || '', t1: temoin1_nom || null, t2: temoin2_nom || null, notes: notes || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, mariage: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/mariages/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { epoux_nom, epoux_prenom, epoux_ddn, epouse_nom, epouse_prenom, epouse_ddn, date_mariage, lieu_mariage, temoin1_nom, temoin2_nom, statut, notes } = req.body;
    await sequelize.query(
      `UPDATE mairie_mariages SET epoux_nom=:en,epoux_prenom=:ep,epoux_ddn=:edd,epouse_nom=:fn,epouse_prenom=:fp,epouse_ddn=:fdd,date_mariage=:dm,lieu_mariage=:lm,temoin1_nom=:t1,temoin2_nom=:t2,statut=:statut,notes=:notes,updated_at=NOW() WHERE id=:id AND tenant_code=:code`,
      { replacements: { en: epoux_nom, ep: epoux_prenom, edd: epoux_ddn || null, fn: epouse_nom, fp: epouse_prenom, fdd: epouse_ddn || null, dm: date_mariage, lm: lieu_mariage || '', t1: temoin1_nom || null, t2: temoin2_nom || null, statut: statut || 'en_attente', notes: notes || null, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/mariages/:id/statut', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.body;
    await sequelize.query(
      `UPDATE mairie_mariages SET statut=:statut, updated_at=NOW() WHERE id=:id AND tenant_code=:code`,
      { replacements: { statut, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/mariages/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM mairie_mariages WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── NAISSANCES ──────────────────────────────────────────────────────────────

router.get('/:tenantCode/naissances', authenticate, verifyTenant, async (req, res) => {
  try {
    const { search, statut } = req.query;
    let q = `SELECT * FROM mairie_naissances WHERE tenant_code=:code`;
    if (statut) q += ` AND statut=:statut`;
    if (search) q += ` AND (enfant_nom ILIKE :s OR enfant_prenom ILIKE :s OR pere_nom ILIKE :s OR mere_nom ILIKE :s OR numero_dossier ILIKE :s)`;
    q += ` ORDER BY created_at DESC`;
    const naissances = await sequelize.query(q, {
      replacements: { code: req.params.tenantCode, statut: statut || null, s: `%${search || ''}%` },
      type: sequelize.QueryTypes.SELECT
    });
    res.json({ success: true, naissances });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/naissances', authenticate, verifyTenant, async (req, res) => {
  try {
    const { enfant_nom, enfant_prenom, date_naissance, lieu_naissance, sexe, pere_nom, pere_prenom, mere_nom, mere_prenom, declarant_nom, notes } = req.body;
    const code = req.params.tenantCode;
    const [cnt] = await sequelize.query(`SELECT COUNT(*) as c FROM mairie_naissances WHERE tenant_code=:code`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const num = `NAI-${code.slice(-4)}-${String(+cnt.c + 1).padStart(4, '0')}`;
    const [rows] = await sequelize.query(
      `INSERT INTO mairie_naissances (tenant_code,numero_dossier,enfant_nom,enfant_prenom,date_naissance,lieu_naissance,sexe,pere_nom,pere_prenom,mere_nom,mere_prenom,declarant_nom,notes)
       VALUES(:code,:num,:en,:ep,:dn,:ln,:sexe,:pn,:pp,:mn,:mp,:decl,:notes) RETURNING *`,
      { replacements: { code, num, en: enfant_nom, ep: enfant_prenom, dn: date_naissance, ln: lieu_naissance || '', sexe: sexe || 'M', pn: pere_nom || null, pp: pere_prenom || null, mn: mere_nom || null, mp: mere_prenom || null, decl: declarant_nom || null, notes: notes || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, naissance: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/naissances/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { enfant_nom, enfant_prenom, date_naissance, lieu_naissance, sexe, pere_nom, pere_prenom, mere_nom, mere_prenom, declarant_nom, statut, notes } = req.body;
    await sequelize.query(
      `UPDATE mairie_naissances SET enfant_nom=:en,enfant_prenom=:ep,date_naissance=:dn,lieu_naissance=:ln,sexe=:sexe,pere_nom=:pn,pere_prenom=:pp,mere_nom=:mn,mere_prenom=:mp,declarant_nom=:decl,statut=:statut,notes=:notes,updated_at=NOW() WHERE id=:id AND tenant_code=:code`,
      { replacements: { en: enfant_nom, ep: enfant_prenom, dn: date_naissance, ln: lieu_naissance || '', sexe: sexe || 'M', pn: pere_nom || null, pp: pere_prenom || null, mn: mere_nom || null, mp: mere_prenom || null, decl: declarant_nom || null, statut: statut || 'en_attente', notes: notes || null, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/naissances/:id/statut', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.body;
    await sequelize.query(
      `UPDATE mairie_naissances SET statut=:statut, updated_at=NOW() WHERE id=:id AND tenant_code=:code`,
      { replacements: { statut, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/naissances/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM mairie_naissances WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── DÉCÈS ───────────────────────────────────────────────────────────────────

router.get('/:tenantCode/deces', authenticate, verifyTenant, async (req, res) => {
  try {
    const { search, statut } = req.query;
    let q = `SELECT * FROM mairie_deces WHERE tenant_code=:code`;
    if (statut) q += ` AND statut=:statut`;
    if (search) q += ` AND (defunt_nom ILIKE :s OR defunt_prenom ILIKE :s OR declarant_nom ILIKE :s OR numero_dossier ILIKE :s)`;
    q += ` ORDER BY created_at DESC`;
    const deces = await sequelize.query(q, {
      replacements: { code: req.params.tenantCode, statut: statut || null, s: `%${search || ''}%` },
      type: sequelize.QueryTypes.SELECT
    });
    res.json({ success: true, deces });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/deces', authenticate, verifyTenant, async (req, res) => {
  try {
    const { defunt_nom, defunt_prenom, defunt_ddn, defunt_numero_h, date_deces, lieu_deces, cause_deces, declarant_nom, declarant_telephone, notes } = req.body;
    const code = req.params.tenantCode;
    const [cnt] = await sequelize.query(`SELECT COUNT(*) as c FROM mairie_deces WHERE tenant_code=:code`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const num = `DEC-${code.slice(-4)}-${String(+cnt.c + 1).padStart(4, '0')}`;
    const [rows] = await sequelize.query(
      `INSERT INTO mairie_deces (tenant_code,numero_dossier,defunt_nom,defunt_prenom,defunt_ddn,defunt_numero_h,date_deces,lieu_deces,cause_deces,declarant_nom,declarant_telephone,notes)
       VALUES(:code,:num,:dn,:dp,:ddd,:dnh,:dd,:ld,:cd,:decl,:tel,:notes) RETURNING *`,
      { replacements: { code, num, dn: defunt_nom, dp: defunt_prenom, ddd: defunt_ddn || null, dnh: defunt_numero_h || null, dd: date_deces, ld: lieu_deces || '', cd: cause_deces || '', decl: declarant_nom || null, tel: declarant_telephone || null, notes: notes || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, deces: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/deces/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { defunt_nom, defunt_prenom, defunt_ddn, date_deces, lieu_deces, cause_deces, declarant_nom, declarant_telephone, statut, notes } = req.body;
    await sequelize.query(
      `UPDATE mairie_deces SET defunt_nom=:dn,defunt_prenom=:dp,defunt_ddn=:ddd,date_deces=:dd,lieu_deces=:ld,cause_deces=:cd,declarant_nom=:decl,declarant_telephone=:tel,statut=:statut,notes=:notes,updated_at=NOW() WHERE id=:id AND tenant_code=:code`,
      { replacements: { dn: defunt_nom, dp: defunt_prenom, ddd: defunt_ddn || null, dd: date_deces, ld: lieu_deces || '', cd: cause_deces || '', decl: declarant_nom || null, tel: declarant_telephone || null, statut: statut || 'en_attente', notes: notes || null, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/deces/:id/statut', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.body;
    await sequelize.query(
      `UPDATE mairie_deces SET statut=:statut, updated_at=NOW() WHERE id=:id AND tenant_code=:code`,
      { replacements: { statut, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/deces/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM mairie_deces WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── AGENTS ──────────────────────────────────────────────────────────────────

router.get('/:tenantCode/agents', authenticate, verifyTenant, async (req, res) => {
  try {
    const agents = await sequelize.query(
      `SELECT * FROM mairie_agents WHERE tenant_code=:code ORDER BY nom`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, agents });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/agents', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, role, telephone, email } = req.body;
    const code = req.params.tenantCode;
    const [rows] = await sequelize.query(
      `INSERT INTO mairie_agents (tenant_code,nom,prenom,role,telephone,email) VALUES(:code,:nom,:prenom,:role,:tel,:email) RETURNING *`,
      { replacements: { code, nom, prenom, role: role || 'Agent', tel: telephone || null, email: email || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, agent: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/agents/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, role, telephone, email, is_active } = req.body;
    await sequelize.query(
      `UPDATE mairie_agents SET nom=:nom,prenom=:prenom,role=:role,telephone=:tel,email=:email,is_active=:active WHERE id=:id AND tenant_code=:code`,
      { replacements: { nom, prenom, role: role || 'Agent', tel: telephone || null, email: email || null, active: is_active !== false, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/agents/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM mairie_agents WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── CERTIFICATS DE RÉSIDENCE ────────────────────────────────────────────────

router.get('/:tenantCode/residences', authenticate, verifyTenant, async (req, res) => {
  try {
    const { search, statut } = req.query;
    let q = `SELECT * FROM mairie_residences WHERE tenant_code=:code`;
    if (statut) q += ` AND statut=:statut`;
    if (search) q += ` AND (nom ILIKE :s OR prenom ILIKE :s OR adresse ILIKE :s OR numero_dossier ILIKE :s)`;
    q += ` ORDER BY created_at DESC`;
    const residences = await sequelize.query(q, {
      replacements: { code: req.params.tenantCode, statut: statut || null, s: `%${search || ''}%` },
      type: sequelize.QueryTypes.SELECT
    });
    res.json({ success: true, residences });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/residences', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, date_naissance, numero_h, adresse, depuis_quand, motif, notes, chef_quartier_id, chef_quartier_nom, chef_quartier_telephone } = req.body;
    const code = req.params.tenantCode;
    const [cnt] = await sequelize.query(`SELECT COUNT(*) as c FROM mairie_residences WHERE tenant_code=:code`, { replacements: { code }, type: sequelize.QueryTypes.SELECT });
    const num = `RES-${code.slice(-4)}-${String(+cnt.c + 1).padStart(4, '0')}`;
    const [rows] = await sequelize.query(
      `INSERT INTO mairie_residences (tenant_code,numero_dossier,nom,prenom,date_naissance,numero_h,adresse,depuis_quand,motif,notes,chef_quartier_id,chef_quartier_nom,chef_quartier_telephone)
       VALUES(:code,:num,:nom,:prenom,:ddn,:nh,:adr,:dq,:motif,:notes,:cid,:cnom,:ctel) RETURNING *`,
      { replacements: { code, num, nom, prenom, ddn: date_naissance || null, nh: numero_h || null, adr: adresse, dq: depuis_quand || '', motif: motif || 'Autre', notes: notes || null, cid: chef_quartier_id || null, cnom: chef_quartier_nom || null, ctel: chef_quartier_telephone || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, residence: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/residences/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, date_naissance, numero_h, adresse, depuis_quand, motif, statut, notes, chef_quartier_id, chef_quartier_nom, chef_quartier_telephone } = req.body;
    await sequelize.query(
      `UPDATE mairie_residences SET nom=:nom,prenom=:prenom,date_naissance=:ddn,numero_h=:nh,adresse=:adr,depuis_quand=:dq,motif=:motif,statut=:statut,notes=:notes,chef_quartier_id=:cid,chef_quartier_nom=:cnom,chef_quartier_telephone=:ctel,updated_at=NOW() WHERE id=:id AND tenant_code=:code`,
      { replacements: { nom, prenom, ddn: date_naissance || null, nh: numero_h || null, adr: adresse, dq: depuis_quand || '', motif: motif || 'Autre', statut: statut || 'en_attente', notes: notes || null, cid: chef_quartier_id || null, cnom: chef_quartier_nom || null, ctel: chef_quartier_telephone || null, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.patch('/:tenantCode/residences/:id/statut', authenticate, verifyTenant, async (req, res) => {
  try {
    const { statut } = req.body;
    await sequelize.query(
      `UPDATE mairie_residences SET statut=:statut, updated_at=NOW() WHERE id=:id AND tenant_code=:code`,
      { replacements: { statut, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/residences/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM mairie_residences WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── VALIDATION CHEF DE QUARTIER ─────────────────────────────────────────────
router.patch('/:tenantCode/residences/:id/chef-validation', authenticate, verifyTenant, async (req, res) => {
  try {
    const { chef_quartier_nom, chef_quartier_telephone, valide } = req.body;
    const newStatut = valide ? 'valide_chef' : 'en_attente';
    await sequelize.query(
      `UPDATE mairie_residences SET chef_quartier_nom=:cnom, chef_quartier_telephone=:ctel, chef_quartier_valide=:valide, chef_quartier_date=CASE WHEN :valide2 THEN NOW() ELSE NULL END, statut=:statut, updated_at=NOW() WHERE id=:id AND tenant_code=:code`,
      { replacements: { cnom: chef_quartier_nom || null, ctel: chef_quartier_telephone || null, valide: valide !== false, valide2: valide !== false, statut: newStatut, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── CHEFS DE QUARTIER ────────────────────────────────────────────────────────
router.get('/:tenantCode/chefs-quartier', authenticate, verifyTenant, async (req, res) => {
  try {
    const chefs = await sequelize.query(
      `SELECT * FROM mairie_chefs_quartier WHERE tenant_code=:code ORDER BY quartier, nom`,
      { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, chefs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:tenantCode/chefs-quartier', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, quartier, telephone, date_prise_fonction } = req.body;
    const code = req.params.tenantCode;
    const [rows] = await sequelize.query(
      `INSERT INTO mairie_chefs_quartier (tenant_code,nom,prenom,quartier,telephone,date_prise_fonction) VALUES(:code,:nom,:prenom,:quartier,:tel,:date) RETURNING *`,
      { replacements: { code, nom, prenom: prenom || '', quartier, tel: telephone || null, date: date_prise_fonction || null }, type: sequelize.QueryTypes.INSERT }
    );
    res.json({ success: true, chef: rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:tenantCode/chefs-quartier/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    const { nom, prenom, quartier, telephone, date_prise_fonction, is_active } = req.body;
    await sequelize.query(
      `UPDATE mairie_chefs_quartier SET nom=:nom,prenom=:prenom,quartier=:quartier,telephone=:tel,date_prise_fonction=:date,is_active=:active WHERE id=:id AND tenant_code=:code`,
      { replacements: { nom, prenom: prenom || '', quartier, tel: telephone || null, date: date_prise_fonction || null, active: is_active !== false, id: req.params.id, code: req.params.tenantCode } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:tenantCode/chefs-quartier/:id', authenticate, verifyTenant, async (req, res) => {
  try {
    await sequelize.query(`DELETE FROM mairie_chefs_quartier WHERE id=:id AND tenant_code=:code`, { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;

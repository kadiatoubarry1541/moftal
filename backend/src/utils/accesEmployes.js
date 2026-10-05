// Accès des employés aux gestions internes.
//
// Le propriétaire d'un établissement ajoute un employé (par son numéro Moftal)
// et choisit son niveau :
//   - « complet » : tout comme le propriétaire, SAUF les paramètres de
//     l'établissement et la gestion des accès ;
//   - « limité »  : voir, ajouter et changer un statut (vente servie, rendez-vous
//     confirmé…), mais ni modifier ni supprimer une fiche.
// Tout est contrôlé ici, côté serveur : l'écran ne fait que refléter ces règles.
import { sequelize } from '../config/database.js';

const NIVEAUX = ['complet', 'limite'];

let tablePrete = null;
export function preparerTableAcces() {
  if (!tablePrete) {
    tablePrete = sequelize.query(`
      CREATE TABLE IF NOT EXISTS "management_staff_access" (
        "id"          SERIAL PRIMARY KEY,
        "tenant_code" VARCHAR(50)  NOT NULL REFERENCES management_tenants(tenant_code) ON DELETE CASCADE,
        "numero_h"    VARCHAR(100) NOT NULL,
        "nom"         VARCHAR(255),
        "poste"       VARCHAR(100),
        "niveau"      VARCHAR(20)  NOT NULL DEFAULT 'limite',
        "is_active"   BOOLEAN      NOT NULL DEFAULT true,
        "ajoute_par"  VARCHAR(100),
        "created_at"  TIMESTAMPTZ  DEFAULT NOW(),
        UNIQUE ("tenant_code", "numero_h")
      );
      CREATE INDEX IF NOT EXISTS "idx_staff_access_numero_h" ON "management_staff_access" ("numero_h");
    `).catch(e => { tablePrete = null; throw e; });
  }
  return tablePrete;
}

async function accesActif(tenantCode, numeroH) {
  await preparerTableAcces();
  const [row] = await sequelize.query(
    `SELECT a.*, t.owner_numero_h FROM management_staff_access a
       JOIN management_tenants t ON t.tenant_code = a.tenant_code
      WHERE a.tenant_code = :code AND LOWER(a.numero_h) = LOWER(:nh) AND a.is_active = true
      LIMIT 1`,
    { replacements: { code: tenantCode, nh: numeroH }, type: sequelize.QueryTypes.SELECT }
  );
  return row || null;
}

// L'utilisateur est-il employé actif de l'établissement visé par cette URL
// de gestion (/api/<secteur>-mgmt/<code>/…) ?
export async function estEmployeDeLaGestion(numeroH, url) {
  const m = /^\/api\/[a-z]+-mgmt\/([^/?]+)/.exec(url || '');
  if (!m || !numeroH) return false;
  try { return !!(await accesActif(decodeURIComponent(m[1]), numeroH)); } catch { return false; }
}

// Ce qu'un employé n'a pas le droit de faire, selon son niveau (null = autorisé).
function refusEmploye(req, niveau) {
  const chemin = req.path || '';
  if (/\/(settings|acces-employes|logo|members\/add)(\/|$)/.test(chemin)) {
    return "Seul le propriétaire de l'établissement peut faire cette action.";
  }
  if (niveau === 'limite') {
    if (/\/rapport(\/|$)/.test(chemin)) return "Le rapport financier est réservé au propriétaire et aux employés à accès complet.";
    const m = req.method;
    const changementStatut = m === 'PATCH' || (m === 'PUT' && /\/(statut|status|pay|discharge|publish|convert|reject|confirm)(\/|$)/.test(chemin));
    if ((m === 'PUT' || m === 'PATCH' || m === 'DELETE') && !changementStatut) {
      return "Votre accès est limité : vous pouvez ajouter et consulter, mais pas modifier ni supprimer. Demandez au propriétaire.";
    }
  }
  return null;
}

// Enveloppe le contrôle d'accès d'une gestion (verifyTenant, verifyMember…) :
// un employé autorisé passe avec les droits de l'établissement, dans la limite
// de son niveau ; tous les autres cas suivent le contrôle d'origine.
export function avecAccesEmployes(verifierProprietaire) {
  return async (req, res, next) => {
    try {
      const code = req.params?.tenantCode;
      const nh = String(req.user?.numeroH || req.userId || '');
      if (!code || !nh) return verifierProprietaire(req, res, next);
      const acces = await accesActif(code, nh);
      if (!acces || String(acces.owner_numero_h).toLowerCase() === nh.toLowerCase()) {
        return verifierProprietaire(req, res, next);
      }
      const refus = refusEmploye(req, acces.niveau);
      if (refus) return res.status(403).json({ success: false, message: refus });

      req.employe = { numeroH: nh, niveau: acces.niveau, nom: acces.nom };
      const base = typeof req.user?.toJSON === 'function' ? req.user.toJSON() : { ...(req.user || {}) };
      req.user = { ...base, numeroH: acces.owner_numero_h, role: 'user', isAdmin: false, isMasterAdmin: false, employeNumeroH: nh };
      req.userId = acces.owner_numero_h;
      return verifierProprietaire(req, res, (err) => {
        if (err) return next(err);
        if (req.tenant) req.tenant = { ...req.tenant, acces_employe: acces.niveau };
        next();
      });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  };
}

// Routes du propriétaire : liste, ajout, changement de niveau, retrait.
export function ajouterRoutesAccesEmployes(router, middlewaresProprietaire) {
  const base = '/:tenantCode/acces-employes';

  router.get(base, ...middlewaresProprietaire, async (req, res) => {
    try {
      await preparerTableAcces();
      const rows = await sequelize.query(
        `SELECT id, numero_h, nom, poste, niveau, is_active, created_at FROM management_staff_access
          WHERE tenant_code = :code ORDER BY created_at DESC`,
        { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
      );
      res.json({ success: true, employes: rows });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });

  router.post(base, ...middlewaresProprietaire, async (req, res) => {
    try {
      await preparerTableAcces();
      const numeroH = String(req.body?.numero_h || '').trim();
      const niveau = NIVEAUX.includes(req.body?.niveau) ? req.body.niveau : 'limite';
      const poste = String(req.body?.poste || '').trim().slice(0, 100) || null;
      if (!numeroH) return res.status(400).json({ success: false, message: 'Numéro Moftal de l\'employé obligatoire.' });
      const [user] = await sequelize.query(
        `SELECT numero_h, prenom, nom_famille FROM users WHERE LOWER(numero_h) = LOWER(:nh) LIMIT 1`,
        { replacements: { nh: numeroH }, type: sequelize.QueryTypes.SELECT }
      );
      if (!user) return res.status(404).json({ success: false, message: 'Aucun compte Moftal avec ce numéro. Vérifiez le numéro de l\'employé.' });
      if (String(user.numero_h).toLowerCase() === String(req.tenant?.owner_numero_h || '').toLowerCase()) {
        return res.status(400).json({ success: false, message: 'Le propriétaire a déjà tous les accès.' });
      }
      const nom = [user.prenom, user.nom_famille].filter(Boolean).join(' ') || user.numero_h;
      const [rows] = await sequelize.query(
        `INSERT INTO management_staff_access (tenant_code, numero_h, nom, poste, niveau, is_active, ajoute_par)
         VALUES (:code, :nh, :nom, :poste, :niveau, true, :par)
         ON CONFLICT (tenant_code, numero_h) DO UPDATE SET niveau = EXCLUDED.niveau, poste = EXCLUDED.poste, nom = EXCLUDED.nom, is_active = true
         RETURNING id, numero_h, nom, poste, niveau, is_active, created_at`,
        { replacements: { code: req.params.tenantCode, nh: user.numero_h, nom, poste, niveau, par: req.userId || null } }
      );
      res.json({ success: true, employe: rows[0] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });

  router.put(`${base}/:id`, ...middlewaresProprietaire, async (req, res) => {
    try {
      await preparerTableAcces();
      const sets = []; const rep = { id: req.params.id, code: req.params.tenantCode };
      if (req.body?.niveau !== undefined) {
        if (!NIVEAUX.includes(req.body.niveau)) return res.status(400).json({ success: false, message: 'Niveau invalide.' });
        sets.push('niveau = :niveau'); rep.niveau = req.body.niveau;
      }
      if (req.body?.poste !== undefined) { sets.push('poste = :poste'); rep.poste = String(req.body.poste || '').slice(0, 100) || null; }
      if (req.body?.is_active !== undefined) { sets.push('is_active = :actif'); rep.actif = !!req.body.is_active; }
      if (!sets.length) return res.status(400).json({ success: false, message: 'Aucune modification envoyée.' });
      const [rows] = await sequelize.query(
        `UPDATE management_staff_access SET ${sets.join(', ')} WHERE id = :id AND tenant_code = :code
         RETURNING id, numero_h, nom, poste, niveau, is_active, created_at`,
        { replacements: rep }
      );
      if (!rows.length) return res.status(404).json({ success: false, message: 'Employé introuvable.' });
      res.json({ success: true, employe: rows[0] });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });

  router.delete(`${base}/:id`, ...middlewaresProprietaire, async (req, res) => {
    try {
      await preparerTableAcces();
      const [rows] = await sequelize.query(
        `DELETE FROM management_staff_access WHERE id = :id AND tenant_code = :code RETURNING id`,
        { replacements: { id: req.params.id, code: req.params.tenantCode } }
      );
      if (!rows.length) return res.status(404).json({ success: false, message: 'Employé introuvable.' });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });
}

// Établissements où l'utilisateur connecté travaille (pour les lui proposer).
export async function mesAccesEmploye(numeroH) {
  await preparerTableAcces();
  return sequelize.query(
    `SELECT t.tenant_code, t.type, t.name, t.logo_url, a.niveau, a.poste
       FROM management_staff_access a JOIN management_tenants t ON t.tenant_code = a.tenant_code
      WHERE LOWER(a.numero_h) = LOWER(:nh) AND a.is_active = true AND COALESCE(t.is_active, true)
      ORDER BY t.name`,
    { replacements: { nh: numeroH }, type: sequelize.QueryTypes.SELECT }
  );
}

// Accès des employés aux gestions internes.
//
// Le propriétaire d'un établissement ajoute un employé (par son numéro Moftal)
// et choisit son niveau :
//   - « total »   : tous les droits, exactement comme le propriétaire
//     (paramètres, logo, accès des employés compris) — ex. le directeur et
//     le proviseur d'une école, deux associés ;
//   - « complet » : tout comme le propriétaire, SAUF les paramètres de
//     l'établissement et la gestion des accès ;
//   - « limité »  : voir, ajouter et changer un statut (vente servie, rendez-vous
//     confirmé…), mais ni modifier ni supprimer une fiche.
// Tout est contrôlé ici, côté serveur : l'écran ne fait que refléter ces règles.
import { trouverOuPreparerPersonne } from '../services/comptesProvisoires.js';
import { sequelize } from '../config/database.js';

const NIVEAUX = ['total', 'complet', 'limite'];

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

// Enseignants, parents et élèves d'une école / madrasa : ajoutés par
// l'établissement avec un simple téléphone ou e-mail, ils travaillent tout de
// suite dans l'application de CETTE école, profil complété ou non (chacun le
// complète quand il veut). Leurs droits restent contrôlés par chaque route.
const TABLES_MEMBRES_ECOLE = {
  school: { staff: 'school_staff', membres: 'school_members', eleves: 'school_students' },
  madrasa: { staff: 'madrasa_staff', membres: 'madrasa_members', eleves: 'madrasa_students' },
};

export async function estMembreEcoleDeLaGestion(numeroH, url) {
  const m = /^\/api\/(school|madrasa)-mgmt\/([^/?]+)/.exec(url || '');
  if (!m || !numeroH) return false;
  const T = TABLES_MEMBRES_ECOLE[m[1]];
  const rep = { code: decodeURIComponent(m[2]), nh: String(numeroH) };
  const existe = (sql) => sequelize.query(sql, { replacements: rep, type: sequelize.QueryTypes.SELECT })
    .then((rows) => rows.length > 0).catch(() => false);
  const resultats = await Promise.all([
    existe(`SELECT 1 FROM ${T.staff} WHERE tenant_code = :code AND LOWER(TRIM(numero_h)) = LOWER(:nh) LIMIT 1`),
    existe(`SELECT 1 FROM ${T.membres} WHERE tenant_code = :code AND LOWER(numero_h) = LOWER(:nh) AND is_active = true LIMIT 1`),
    existe(`SELECT 1 FROM ${T.eleves} WHERE tenant_code = :code AND (LOWER(numero_h) = LOWER(:nh) OR LOWER(parent_numero_h) = LOWER(:nh)) LIMIT 1`),
  ]);
  return resultats.some(Boolean);
}

// ─── École / madrasa : le personnel EST la liste des employés ────────────────
// Une seule liste « Personnel » : chaque personne (enseignant, surveillant,
// comptable…) a son accès à la gestion, de « aucun » (espace enseignant
// seulement) à « total ». Seul le responsable (propriétaire ou co-responsable
// « total ») peut changer un accès.
export const ACCES_PERSONNEL = ['aucun', ...NIVEAUX];

/** numero_h (minuscules) → niveau d'accès actif, pour un établissement. */
export async function accesDuPersonnel(tenantCode) {
  await preparerTableAcces();
  const rows = await sequelize.query(
    `SELECT LOWER(numero_h) AS nh, niveau FROM management_staff_access WHERE tenant_code = :code AND is_active = true`,
    { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
  );
  return new Map(rows.map((r) => [r.nh, r.niveau]));
}

/** Donne, change ou retire l'accès à la gestion d'une personne du personnel. Renvoie { erreur } si refusé. */
export async function definirAccesPersonnel(req, { numeroH, nom, poste, niveau }) {
  if (!ACCES_PERSONNEL.includes(niveau)) return {};
  const code = req.params.tenantCode;
  if (!numeroH) {
    return niveau === 'aucun' ? {} : { erreur: "Indiquez le téléphone, l'e-mail ou le NuméroH de cette personne pour lui donner un accès à la gestion." };
  }
  if (String(numeroH).toLowerCase() === String(req.tenant?.owner_numero_h || '').toLowerCase()) return {};
  const actuel = (await accesActif(code, numeroH))?.niveau || 'aucun';
  if (actuel === niveau) return {};
  if (req.employe && req.employe.niveau !== 'total') {
    return { erreur: "Seul le responsable de l'établissement peut changer l'accès à la gestion." };
  }
  if (niveau === 'aucun') {
    await sequelize.query(
      `UPDATE management_staff_access SET is_active = false WHERE tenant_code = :code AND LOWER(numero_h) = LOWER(:nh)`,
      { replacements: { code, nh: numeroH } }
    );
    return {};
  }
  await sequelize.query(
    `INSERT INTO management_staff_access (tenant_code, numero_h, nom, poste, niveau, is_active, ajoute_par)
     VALUES (:code, :nh, :nom, :poste, :niveau, true, :par)
     ON CONFLICT (tenant_code, numero_h) DO UPDATE SET niveau = EXCLUDED.niveau, poste = EXCLUDED.poste, nom = EXCLUDED.nom, is_active = true`,
    { replacements: { code, nh: numeroH, nom: String(nom || '').slice(0, 255) || null, poste: String(poste || '').slice(0, 100) || null, niveau, par: req.employe?.numeroH || req.userId || null } }
  );
  return {};
}

/** Personne retirée du personnel : elle perd aussi son accès à la gestion. */
export async function retirerAccesPersonnel(tenantCode, numeroH) {
  if (!numeroH) return;
  await preparerTableAcces();
  await sequelize.query(
    `UPDATE management_staff_access SET is_active = false WHERE tenant_code = :code AND LOWER(numero_h) = LOWER(:nh)`,
    { replacements: { code: tenantCode, nh: numeroH } }
  );
}

/**
 * Employés ajoutés avant la liste unique (par « 👥 Employés ») : ils sont
 * ajoutés au personnel pour que tout le monde soit au même endroit.
 */
export async function employesDansLePersonnel(tenantCode, tableStaff) {
  await preparerTableAcces();
  const actifs = tableStaff === 'school_staff' ? 'AND s.is_active = true' : '';
  const manquants = await sequelize.query(
    `SELECT a.numero_h, a.nom, a.poste FROM management_staff_access a
      WHERE a.tenant_code = :code AND a.is_active = true
        AND NOT EXISTS (SELECT 1 FROM ${tableStaff} s WHERE s.tenant_code = a.tenant_code AND LOWER(TRIM(s.numero_h)) = LOWER(a.numero_h) ${actifs})`,
    { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
  );
  // Ajoutés automatiquement : pas montrés sur le site tant que le responsable ne le décide pas
  if (manquants.length) {
    await sequelize.query(`ALTER TABLE ${tableStaff} ADD COLUMN IF NOT EXISTS sur_site BOOLEAN NOT NULL DEFAULT true`);
  }
  for (const e of manquants) {
    const rep = { code: tenantCode, nh: e.numero_h, prenom: String(e.nom || e.numero_h).slice(0, 100), role: String(e.poste || 'Employé').slice(0, 50) };
    await sequelize.query(
      tableStaff === 'school_staff'
        ? `INSERT INTO school_staff (tenant_code, nom, prenom, role, numero_h, sur_site) VALUES (:code, '', :prenom, :role, :nh, false)`
        : `INSERT INTO madrasa_staff (tenant_code, prenom, nom, role, specialite, numero_h, sur_site) VALUES (:code, :prenom, '', :role, NULL, :nh, false)`,
      { replacements: rep }
    ).catch((err) => console.error('Personnel depuis les employés :', err.message));
  }
}

// Ce qu'un employé n'a pas le droit de faire, selon son niveau (null = autorisé).
function refusEmploye(req, niveau) {
  if (niveau === 'total') return null;
  const chemin = req.path || '';
  if (/\/(settings|acces-employes|logo|members\/add)(\/|$)/.test(chemin)) {
    return "Seul le propriétaire de l'établissement peut faire cette action.";
  }
  if (niveau === 'limite') {
    if (/\/rapport(\/|$)/.test(chemin)) return "Le rapport financier est réservé au propriétaire et aux employés à accès complet.";
    const m = req.method;
    const changementStatut = m === 'PATCH' || (m === 'PUT' && /\/(statut|status|pay|pay-credit|discharge|publish|convert|reject|confirm)(\/|$)/.test(chemin));
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
// Un co-responsable (niveau « total ») y a accès comme le propriétaire.
export function ajouterRoutesAccesEmployes(router, [authentifier, verifierProprietaire, ...autres]) {
  const base = '/:tenantCode/acces-employes';
  const middlewaresProprietaire = [authentifier, avecAccesEmployes(verifierProprietaire), ...autres];

  router.get(base, ...middlewaresProprietaire, async (req, res) => {
    try {
      await preparerTableAcces();
      const rows = await sequelize.query(
        `SELECT a.id, a.numero_h, a.nom, a.poste, a.niveau, a.is_active, a.created_at, u.tel1 AS telephone, u.email
           FROM management_staff_access a LEFT JOIN users u ON LOWER(u.numero_h) = LOWER(a.numero_h)
          WHERE a.tenant_code = :code ORDER BY a.created_at DESC`,
        { replacements: { code: req.params.tenantCode }, type: sequelize.QueryTypes.SELECT }
      );
      res.json({ success: true, employes: rows });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });

  router.post(base, ...middlewaresProprietaire, async (req, res) => {
    try {
      await preparerTableAcces();
      // Un seul champ : téléphone, e-mail ou NuméroH de l'employé
      const identifiant = String(req.body?.identifiant || req.body?.numero_h || '').trim();
      const niveau = NIVEAUX.includes(req.body?.niveau) ? req.body.niveau : 'limite';
      const poste = String(req.body?.poste || '').trim().slice(0, 100) || null;
      if (!identifiant) return res.status(400).json({ success: false, message: 'Téléphone, e-mail ou NuméroH de l\'employé obligatoire.' });
      // Sans compte Moftal : compte préparé, la personne choisit son mot de passe
      // à sa première connexion avec ce téléphone / cet e-mail
      const trouve = await trouverOuPreparerPersonne(identifiant);
      if (trouve.erreur) return res.status(trouve.statut).json({ success: false, message: trouve.erreur });
      const userCree = trouve.cree;
      const user = { numero_h: trouve.personne.numero_h, prenom: trouve.personne.prenom, nom_famille: trouve.personne.nom };
      if (String(user.numero_h).toLowerCase() === String(req.tenant?.owner_numero_h || '').toLowerCase()) {
        return res.status(400).json({ success: false, message: 'Le propriétaire a déjà tous les accès.' });
      }
      const nomCompte = [user.prenom, user.nom_famille].filter((x) => x && x !== 'Nouveau' && x !== 'membre').join(' ');
      const nom = nomCompte || (userCree ? identifiant : user.numero_h);
      const [rows] = await sequelize.query(
        `INSERT INTO management_staff_access (tenant_code, numero_h, nom, poste, niveau, is_active, ajoute_par)
         VALUES (:code, :nh, :nom, :poste, :niveau, true, :par)
         ON CONFLICT (tenant_code, numero_h) DO UPDATE SET niveau = EXCLUDED.niveau, poste = EXCLUDED.poste, nom = EXCLUDED.nom, is_active = true
         RETURNING id, numero_h, nom, poste, niveau, is_active, created_at`,
        { replacements: { code: req.params.tenantCode, nh: user.numero_h, nom, poste, niveau, par: req.userId || null } }
      );
      res.json({ success: true, employe: rows[0], nouveauCompte: userCree });
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

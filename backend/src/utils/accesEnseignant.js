// Accès des enseignants à la gestion d'une école ou d'une madrasa.
// Le directeur (propriétaire) donne à un membre du personnel l'accès à l'application,
// choisit ses classes (ou halaqas) et ses droits : faire l'appel, saisir les notes.
// L'enseignant ne voit et ne modifie que les élèves de SES classes.
import { sequelize } from '../config/database.js';
import { enforceGestionAccess } from '../middleware/gestionAccessGuard.js';

export const DROITS_ENSEIGNANT = ['presences', 'notes'];

const TABLES = {
  school:  { staff: 'school_staff',  groupe: 'school_classrooms', eleves: 'school_students', actifEleve: "e.statut='actif'", actifStaff: 'is_active = true' },
  madrasa: { staff: 'madrasa_staff', groupe: 'madrasa_halaqas',   eleves: 'madrasa_students', actifEleve: 'e.is_active = true', actifStaff: 'true' },
};

const colonnesPretes = {};
export async function ensureColonnesAcces(pre) {
  if (colonnesPretes[pre]) return;
  const t = TABLES[pre].staff;
  await sequelize.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS acces_actif BOOLEAN DEFAULT false`);
  await sequelize.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS classes_autorisees JSONB DEFAULT '[]'::jsonb`);
  await sequelize.query(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS droits JSONB DEFAULT '{}'::jsonb`);
  colonnesPretes[pre] = true;
}

const estAdmin = (req) => {
  const role = String(req.user?.role || '').toLowerCase();
  return !!(req.user?.isMasterAdmin || req.user?.isAdmin === true || role === 'admin' || role === 'super-admin');
};

/** Middleware : le directeur (tout) ou un enseignant ayant reçu l'accès (ses classes). */
export function verifyDirecteurOuEnseignant(pre) {
  const T = TABLES[pre];
  return async (req, res, next) => {
    const { tenantCode } = req.params;
    try {
      const [tenant] = await sequelize.query(
        `SELECT * FROM management_tenants WHERE tenant_code = :code LIMIT 1`,
        { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
      );
      if (estAdmin(req)) {
        req.tenant = tenant || { tenant_code: tenantCode, type: pre, name: 'Admin', is_active: true };
        req.acces = { role: 'directeur' };
        return next();
      }
      if (!tenant) return res.status(404).json({ success: false, message: 'Établissement introuvable.' });
      req.tenant = tenant;
      if (tenant.owner_numero_h === req.userId) {
        req.acces = { role: 'directeur' };
        return enforceGestionAccess(req, res, next);
      }
      await ensureColonnesAcces(pre);
      const [prof] = await sequelize.query(
        `SELECT id, prenom, nom, classes_autorisees, droits FROM ${T.staff}
         WHERE tenant_code = :code AND numero_h = :n AND acces_actif = true AND ${T.actifStaff} LIMIT 1`,
        { replacements: { code: tenantCode, n: req.userId }, type: sequelize.QueryTypes.SELECT }
      );
      if (!prof) return res.status(403).json({ success: false, message: "Vous n'avez pas accès à la gestion de cet établissement." });
      const classes = (Array.isArray(prof.classes_autorisees) ? prof.classes_autorisees : []).map(Number).filter(Boolean);
      req.acces = { role: 'enseignant', staffId: prof.id, prenom: prof.prenom, nom: prof.nom, classes, droits: prof.droits || {} };
      return enforceGestionAccess(req, res, next);
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  };
}

/** Middleware : refuse à l'enseignant une action pour laquelle il n'a pas le droit. */
export function exigerDroit(droit) {
  return (req, res, next) => {
    if (req.acces?.role === 'directeur') return next();
    if (req.acces?.droits?.[droit]) return next();
    const libelle = droit === 'presences' ? "faire l'appel" : 'saisir les notes';
    return res.status(403).json({ success: false, message: `Le directeur ne vous a pas donné le droit de ${libelle}.` });
  };
}

/** Réservé au directeur. */
export function directeurSeulement(req, res, next) {
  if (req.acces?.role === 'directeur') return next();
  return res.status(403).json({ success: false, message: 'Réservé au directeur de l’établissement.' });
}

/**
 * Ids des élèves que l'utilisateur peut voir : null = tous (directeur), sinon
 * les élèves des classes de l'enseignant (affectés à la classe, ou du même niveau).
 */
export async function elevesAutorises(pre, req) {
  if (req.acces?.role !== 'enseignant') return null;
  const T = TABLES[pre];
  const classes = req.acces.classes;
  if (!classes.length) return [];
  const lienClasse = pre === 'school'
    ? `(e.classroom_id = g.id OR (e.classroom_id IS NULL AND e.niveau = g.niveau))`
    : `e.niveau = g.niveau`;
  const rows = await sequelize.query(
    `SELECT DISTINCT e.id FROM ${T.eleves} e JOIN ${T.groupe} g ON g.tenant_code = e.tenant_code AND ${lienClasse}
     WHERE e.tenant_code = :code AND ${T.actifEleve} AND g.id IN (:classes)`,
    { replacements: { code: req.params.tenantCode, classes }, type: sequelize.QueryTypes.SELECT }
  );
  return rows.map(r => r.id);
}

/** Vrai si l'utilisateur peut agir sur cet élève. */
export async function peutVoirEleve(pre, req, studentId) {
  const ids = await elevesAutorises(pre, req);
  return ids === null || ids.includes(Number(studentId));
}

/** Vrai si l'utilisateur peut voir cette classe / halaqa. */
export function peutVoirClasse(req, classeId) {
  return req.acces?.role !== 'enseignant' || req.acces.classes.includes(Number(classeId));
}

/**
 * Lit, dans le formulaire du personnel, l'accès donné par le directeur.
 * Renvoie null si le formulaire ne parle pas d'accès. Pour donner l'accès, la
 * personne doit avoir un compte Moftal : on la retrouve par téléphone ou NuméroH.
 */
export async function preparerAcces(body) {
  if (body?.acces_actif === undefined) return null;
  const classes = (Array.isArray(body.classes_autorisees) ? body.classes_autorisees : []).map(Number).filter(Boolean);
  const droits = Object.fromEntries(DROITS_ENSEIGNANT.map(d => [d, !!body.droits?.[d]]));
  if (!body.acces_actif) return { acces_actif: false, classes, droits };
  const identifiant = String(body.telephone || '').trim() || String(body.numero_h || '').trim();
  const { trouverUtilisateur } = await import('./trouverUtilisateur.js');
  const user = (body.numero_h && await trouverUtilisateur(body.numero_h)) || await trouverUtilisateur(identifiant);
  if (!user) {
    const err = new Error(identifiant
      ? `Aucun compte Moftal avec « ${identifiant} ». L'enseignant doit d'abord s'inscrire sur Moftal avec ce téléphone, puis vous lui donnez l'accès.`
      : "Pour donner l'accès à l'application, indiquez le téléphone (ou le NuméroH) de l'enseignant.");
    err.status = 400;
    throw err;
  }
  if (!classes.length) {
    const err = new Error("Choisissez au moins une classe pour cet enseignant.");
    err.status = 400;
    throw err;
  }
  return { acces_actif: true, numero_h: user.numeroH, classes, droits };
}

/** Enregistre l'accès préparé sur la fiche du personnel (et prévient l'enseignant). */
export async function appliquerAcces(pre, tenantCode, staffId, acces, { nomEtablissement, dejaActif } = {}) {
  if (!acces) return;
  await ensureColonnesAcces(pre);
  const t = TABLES[pre].staff;
  await sequelize.query(
    `UPDATE ${t} SET acces_actif = :actif, classes_autorisees = CAST(:classes AS JSONB), droits = CAST(:droits AS JSONB)
       ${acces.numero_h ? ', numero_h = :nh' : ''}
     WHERE id = :id AND tenant_code = :code`,
    { replacements: { actif: acces.acces_actif, classes: JSON.stringify(acces.classes), droits: JSON.stringify(acces.droits), nh: acces.numero_h || null, id: staffId, code: tenantCode } }
  );
  if (acces.acces_actif && !dejaActif && acces.numero_h) {
    const { notifier } = await import('./notifier.js');
    const quoi = [acces.droits.presences && "faire l'appel", acces.droits.notes && 'saisir les notes'].filter(Boolean).join(' et ') || 'voir vos élèves';
    await notifier(acces.numero_h, 'acces_enseignant',
      `Le directeur de « ${nomEtablissement || tenantCode} » vous a donné accès à sa gestion pour ${quoi}. Ouvrez « Gestion interne » sur Moftal.`);
  }
}

/** Ce que la gestion doit afficher à l'utilisateur connecté. */
export function descriptionAcces(req) {
  const a = req.acces || { role: 'directeur' };
  return a.role === 'enseignant'
    ? { role: 'enseignant', prenom: a.prenom, nom: a.nom, classes: a.classes, droits: { presences: !!a.droits.presences, notes: !!a.droits.notes } }
    : { role: 'directeur' };
}

import multer from 'multer';
import { sequelize } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { enforceGestionAccess } from '../middleware/gestionAccessGuard.js';
import { enregistrerEnBase } from '../services/fichiersBase.js';

/**
 * École — pointage des cours et bibliothèque.
 *
 * Pointage : l'enseignant (fiche du personnel avec son NuméroH) touche « Début
 * du cours » puis « Fin du cours » pour une de ses classes ; l'heure est celle
 * du serveur (jamais celle du téléphone). Le directeur voit tout, jour par jour.
 *
 * Bibliothèque : le directeur ajoute les livres PDF de l'école (enregistrés en
 * base, table « fichiers ») ; seuls les membres de l'école les voient :
 * direction, employés, enseignants, élèves et parents (membres ou fiche élève).
 */
const FUSEAU = 'Africa/Conakry';
const Q = sequelize.QueryTypes;
const PDF_MAX = 25 * 1024 * 1024;
const uploadPdf = multer({ storage: multer.memoryStorage(), limits: { fileSize: PDF_MAX } });

let tablesPretes = null;
function preparerTables() {
  if (!tablesPretes) {
    tablesPretes = sequelize.query(`
      ALTER TABLE school_classrooms ADD COLUMN IF NOT EXISTS emploi_du_temps JSONB DEFAULT '[]';
      CREATE TABLE IF NOT EXISTS school_cours_pointages (
        id            SERIAL PRIMARY KEY,
        tenant_code   VARCHAR(50)  NOT NULL,
        staff_id      INTEGER      NOT NULL,
        numero_h      VARCHAR(100),
        classroom_id  INTEGER      NOT NULL,
        matiere       VARCHAR(120),
        prevu_debut   VARCHAR(5),
        prevu_fin     VARCHAR(5),
        jour          DATE         NOT NULL,
        debut         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        fin           TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_cours_pointages_jour ON school_cours_pointages (tenant_code, jour);
      CREATE TABLE IF NOT EXISTS school_bibliotheque (
        id          SERIAL PRIMARY KEY,
        tenant_code VARCHAR(50)  NOT NULL,
        titre       VARCHAR(255) NOT NULL,
        auteur      VARCHAR(255),
        niveau      VARCHAR(120),
        fichier_url TEXT         NOT NULL,
        taille      INTEGER,
        ajoute_par  VARCHAR(100),
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_school_bibliotheque_tenant ON school_bibliotheque (tenant_code);
    `).catch((e) => { tablesPretes = null; throw e; });
  }
  return tablesPretes;
}

// NuméroH de la fiche du personnel = NuméroH complet du compte (voir numeroHComplet)
const memeNumeroH = `LOWER(TRIM(numero_h)) = LOWER(:nh)`;

/**
 * NuméroH saisi par le directeur → NuméroH complet du compte Moftal (le compteur
 * final « … 1 » est souvent omis, car il n'est pas affiché aux autres). Si
 * plusieurs comptes partagent le début, on garde la saisie telle quelle.
 */
export async function numeroHComplet(saisie) {
  const t = String(saisie || '').trim();
  if (!t) return null;
  const [exact] = await sequelize.query('SELECT numero_h FROM users WHERE LOWER(numero_h) = LOWER(:t) LIMIT 1', { replacements: { t }, type: Q.SELECT });
  if (exact) return exact.numero_h;
  const proches = await sequelize.query(
    `SELECT numero_h FROM users WHERE LOWER(SPLIT_PART(numero_h, ' ', 1)) = LOWER(:t) LIMIT 2`,
    { replacements: { t }, type: Q.SELECT }
  );
  return proches.length === 1 ? proches[0].numero_h : t;
}

const jourSemaine = () => {
  const j = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', timeZone: FUSEAU }).format(new Date());
  return j.charAt(0).toUpperCase() + j.slice(1);
};
const aujourdhui = () => new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU }).format(new Date()); // AAAA-MM-JJ

async function tenantDe(code) {
  const [t] = await sequelize.query('SELECT * FROM management_tenants WHERE tenant_code = :code LIMIT 1', { replacements: { code }, type: Q.SELECT });
  return t || null;
}

/** L'utilisateur connecté est-il un enseignant (fiche du personnel) de cette école ? */
async function verifyEnseignant(req, res, next) {
  try {
    await preparerTables();
    const tenant = await tenantDe(req.params.tenantCode);
    if (!tenant) return res.status(404).json({ success: false, message: 'École introuvable.' });
    const [staff] = await sequelize.query(
      `SELECT * FROM school_staff WHERE tenant_code = :code AND is_active = true AND ${memeNumeroH} LIMIT 1`,
      { replacements: { code: tenant.tenant_code, nh: String(req.userId || '') }, type: Q.SELECT }
    );
    if (!staff) return res.status(403).json({ success: false, message: "Vous n'êtes pas enregistré(e) comme enseignant de cette école. Demandez au directeur d'ajouter votre NuméroH à votre fiche." });
    req.tenant = tenant;
    req.enseignant = staff;
    return enforceGestionAccess(req, res, next);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

/** Lecteurs de la bibliothèque : propriétaire, employés, enseignants, élèves et parents inscrits. */
async function verifyLecteur(req, res, next) {
  try {
    await preparerTables();
    const tenant = await tenantDe(req.params.tenantCode);
    if (!tenant) return res.status(404).json({ success: false, message: 'École introuvable.' });
    const nh = String(req.userId || '');
    const role = req.user?.role || '';
    const admin = !!(req.user?.isMasterAdmin || role === 'admin' || role === 'super-admin');
    let ok = admin || tenant.owner_numero_h === nh;
    if (!ok) {
      const [r] = await sequelize.query(
        `SELECT 1 AS ok WHERE
           EXISTS (SELECT 1 FROM school_members WHERE tenant_code = :code AND numero_h = :nh AND is_active = true)
           OR EXISTS (SELECT 1 FROM school_staff WHERE tenant_code = :code AND ${memeNumeroH} AND is_active = true)
           OR EXISTS (SELECT 1 FROM school_students WHERE tenant_code = :code AND (LOWER(numero_h) = LOWER(:nh) OR LOWER(parent_numero_h) = LOWER(:nh)))
           OR EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'management_staff_access')
              AND EXISTS (SELECT 1 FROM management_staff_access WHERE tenant_code = :code AND LOWER(numero_h) = LOWER(:nh) AND is_active = true)`,
        { replacements: { code: tenant.tenant_code, nh }, type: Q.SELECT }
      ).catch(() => []);
      ok = !!r;
    }
    if (!ok) return res.status(403).json({ success: false, message: "La bibliothèque est réservée aux membres de l'école." });
    req.tenant = tenant;
    return enforceGestionAccess(req, res, next);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
}

/** Classes de l'enseignant : professeur principal ou dans un créneau de l'emploi du temps. */
async function classesDe(enseignant) {
  const classes = await sequelize.query(
    `SELECT id, nom, niveau, professeur_principal_id, COALESCE(emploi_du_temps, '[]'::jsonb) AS emploi_du_temps
       FROM school_classrooms WHERE tenant_code = :code ORDER BY nom`,
    { replacements: { code: enseignant.tenant_code }, type: Q.SELECT }
  );
  const jour = jourSemaine();
  return classes
    .map((c) => {
      const edt = Array.isArray(c.emploi_du_temps) ? c.emploi_du_temps : [];
      const miens = edt.filter((s) => String(s.enseignant_id || '') === String(enseignant.id));
      const principal = String(c.professeur_principal_id || '') === String(enseignant.id);
      if (!principal && miens.length === 0) return null;
      // Créneaux du jour : les miens, sinon (professeur principal sans créneau attribué) ceux sans enseignant
      const duJour = (miens.length ? miens : edt.filter((s) => !s.enseignant_id))
        .filter((s) => s.jour === jour)
        .sort((a, b) => String(a.heure_debut).localeCompare(String(b.heure_debut)));
      return { id: c.id, nom: c.nom, niveau: c.niveau, creneaux: duJour };
    })
    .filter(Boolean);
}

export function ajouterRoutesCoursEtBibliotheque(router, verifyTenant) {
  // ─── Enseignant : mes cours du jour ───────────────────────────────────────
  router.get('/:tenantCode/enseignant/mes-cours', authenticate, verifyEnseignant, async (req, res) => {
    const e = req.enseignant;
    const [classes, pointages] = await Promise.all([
      classesDe(e),
      sequelize.query(
        `SELECT p.*, c.nom AS classe FROM school_cours_pointages p LEFT JOIN school_classrooms c ON c.id = p.classroom_id
          WHERE p.tenant_code = :code AND p.staff_id = :sid AND p.jour = :jour ORDER BY p.debut`,
        { replacements: { code: e.tenant_code, sid: e.id, jour: aujourdhui() }, type: Q.SELECT }
      ),
    ]);
    res.json({
      success: true,
      ecole: { nom: req.tenant.name, logo_url: req.tenant.logo_url },
      enseignant: { id: e.id, prenom: e.prenom, nom: e.nom },
      jour: jourSemaine(),
      classes,
      pointages,
      enCours: pointages.find((p) => !p.fin) || null,
    });
  });

  // POST { classroom_id, matiere, prevu_debut, prevu_fin } — heure du serveur
  router.post('/:tenantCode/enseignant/debut', authenticate, verifyEnseignant, async (req, res) => {
    const e = req.enseignant;
    const { classroom_id, matiere, prevu_debut, prevu_fin } = req.body || {};
    const classes = await classesDe(e);
    if (!classes.some((c) => String(c.id) === String(classroom_id))) {
      return res.status(403).json({ success: false, message: "Cette classe ne fait pas partie de vos classes." });
    }
    const [ouvert] = await sequelize.query(
      'SELECT id FROM school_cours_pointages WHERE tenant_code = :code AND staff_id = :sid AND fin IS NULL LIMIT 1',
      { replacements: { code: e.tenant_code, sid: e.id }, type: Q.SELECT }
    );
    if (ouvert) return res.status(409).json({ success: false, message: "Un cours est déjà en cours : terminez-le d'abord." });
    const [rows] = await sequelize.query(
      `INSERT INTO school_cours_pointages (tenant_code, staff_id, numero_h, classroom_id, matiere, prevu_debut, prevu_fin, jour)
       VALUES (:code, :sid, :nh, :cid, :mat, :pd, :pf, :jour) RETURNING *`,
      { replacements: { code: e.tenant_code, sid: e.id, nh: e.numero_h, cid: classroom_id, mat: matiere || null,
          pd: prevu_debut || null, pf: prevu_fin || null, jour: aujourdhui() }, type: Q.INSERT }
    );
    res.json({ success: true, pointage: rows[0] });
  });

  router.post('/:tenantCode/enseignant/fin', authenticate, verifyEnseignant, async (req, res) => {
    const e = req.enseignant;
    const [rows] = await sequelize.query(
      `UPDATE school_cours_pointages SET fin = NOW() WHERE tenant_code = :code AND staff_id = :sid AND fin IS NULL RETURNING *`,
      { replacements: { code: e.tenant_code, sid: e.id }, type: Q.UPDATE }
    );
    if (!rows?.length) return res.status(404).json({ success: false, message: "Aucun cours en cours." });
    res.json({ success: true, pointage: rows[0] });
  });

  // ─── Directeur : pointages d'un jour ──────────────────────────────────────
  router.get('/:tenantCode/pointages', authenticate, verifyTenant, async (req, res) => {
    await preparerTables();
    const jour = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.jour || '')) ? req.query.jour : aujourdhui();
    const rows = await sequelize.query(
      `SELECT p.*, c.nom AS classe, s.prenom, s.nom
         FROM school_cours_pointages p
         LEFT JOIN school_classrooms c ON c.id = p.classroom_id
         LEFT JOIN school_staff s ON s.id = p.staff_id
        WHERE p.tenant_code = :code AND p.jour = :jour ORDER BY p.debut`,
      { replacements: { code: req.params.tenantCode, jour }, type: Q.SELECT }
    );
    res.json({ success: true, jour, pointages: rows });
  });

  // ─── Bibliothèque ─────────────────────────────────────────────────────────
  router.get('/:tenantCode/bibliotheque', authenticate, verifyLecteur, async (req, res) => {
    const livres = await sequelize.query(
      'SELECT id, titre, auteur, niveau, fichier_url, taille, created_at FROM school_bibliotheque WHERE tenant_code = :code ORDER BY created_at DESC',
      { replacements: { code: req.tenant.tenant_code }, type: Q.SELECT }
    );
    res.json({ success: true, ecole: { nom: req.tenant.name, logo_url: req.tenant.logo_url }, livres });
  });

  router.post('/:tenantCode/bibliotheque', authenticate, verifyTenant, (req, res, next) => {
    uploadPdf.single('fichier')(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'PDF trop lourd (25 Mo maximum).' : err.message });
      next();
    });
  }, async (req, res) => {
    await preparerTables();
    const titre = String(req.body?.titre || '').trim();
    if (!titre) return res.status(400).json({ success: false, message: 'Le titre du livre est obligatoire.' });
    const f = req.file;
    if (!f) return res.status(400).json({ success: false, message: 'Choisissez le fichier PDF du livre.' });
    const estPdf = f.mimetype === 'application/pdf' || /\.pdf$/i.test(f.originalname || '');
    if (!estPdf) return res.status(400).json({ success: false, message: 'Seuls les fichiers PDF sont acceptés.' });
    const url = await enregistrerEnBase({ ...f, mimetype: 'application/pdf' }, { proprietaire: req.params.tenantCode, usage: 'bibliotheque-ecole', tailleMax: PDF_MAX });
    const [rows] = await sequelize.query(
      `INSERT INTO school_bibliotheque (tenant_code, titre, auteur, niveau, fichier_url, taille, ajoute_par)
       VALUES (:code, :titre, :auteur, :niveau, :url, :taille, :par) RETURNING *`,
      { replacements: { code: req.params.tenantCode, titre, auteur: String(req.body?.auteur || '').trim() || null,
          niveau: String(req.body?.niveau || '').trim() || null, url, taille: f.size, par: req.userId }, type: Q.INSERT }
    );
    res.json({ success: true, livre: rows[0] });
  });

  router.delete('/:tenantCode/bibliotheque/:id', authenticate, verifyTenant, async (req, res) => {
    await preparerTables();
    await sequelize.query('DELETE FROM school_bibliotheque WHERE id = :id AND tenant_code = :code',
      { replacements: { id: req.params.id, code: req.params.tenantCode } });
    res.json({ success: true });
  });
}

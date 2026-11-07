import { sequelize } from '../config/database.js';
import { notifierMembreEtablissement, notifierUtilisateur } from '../utils/notificationsEtablissement.js';
import { MASTER_ADMIN_NUMEROS } from './auth.js';

/**
 * Opérations faites hors connexion puis refusées à leur envoi.
 *
 * Le téléphone (ou l'ordinateur) garde les enregistrements faits sans internet
 * et les envoie au retour de la connexion, avec l'en-tête « X-Moftal-Replay ».
 * Quand le serveur refuse un de ces envois, il l'enregistre ici et prévient :
 *   - la personne qui l'a fait (cloche + téléphone) ;
 *   - le responsable de l'établissement ;
 *   - les administrateurs de Moftal.
 * Les messages sont écrits par le serveur (jamais un texte envoyé par l'appareil).
 */

const Q = sequelize.QueryTypes;
const GESTION = /^\/api\/([a-z]+)-mgmt\/([^/?]+)(\/[^?]*)?/;

let tablePrete = null;
function preparerTable() {
  if (!tablePrete) {
    tablePrete = sequelize.query(`
      CREATE TABLE IF NOT EXISTS echecs_synchro (
        id           SERIAL PRIMARY KEY,
        cle          VARCHAR(100) UNIQUE,
        tenant_code  VARCHAR(100) NOT NULL,
        secteur      VARCHAR(30),
        numero_h     VARCHAR(100),
        methode      VARCHAR(10)  NOT NULL,
        chemin       TEXT         NOT NULL,
        operation    VARCHAR(255) NOT NULL,
        statut_http  INTEGER,
        raison       TEXT,
        created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_echecs_synchro_date ON echecs_synchro (created_at DESC);
    `).catch((e) => { tablePrete = null; throw e; });
  }
  return tablePrete;
}

// Ce que l'opération concerne, en mots simples (« Ajout · patients »)
function libelleOperation(methode, sousChemin) {
  const quoi = (sousChemin || '').split('/').filter((p) => p && !/^\d+$/.test(p) && !p.startsWith('hors-ligne-')).join(' › ') || 'enregistrement';
  const action = methode === 'POST' ? 'Ajout' : methode === 'DELETE' ? 'Suppression' : 'Modification';
  return `${action} · ${quoi}`.slice(0, 250);
}

// Refus à signaler : le serveur a répondu, et l'appareil range l'opération parmi
// les refusées. Session expirée (401), abonnement (402) ou envoi déjà en cours
// sont gardés sur l'appareil et renvoyés plus tard : rien à signaler.
function estRefus(statut, corps, essai) {
  if (statut === 401 || statut === 402) return false;
  if (statut === 409 && corps?.enCours) return false;
  if ([502, 503, 504].includes(statut)) return false;
  if (statut >= 500) return essai >= 3; // l'appareil abandonne au 3e échec
  return statut >= 400 || corps?.success === false;
}

async function enregistrerEtPrevenir(req, statut, corps) {
  const m = GESTION.exec(req.originalUrl || '');
  if (!m) return;
  const [, secteur, codeBrut, sousChemin] = m;
  const code = decodeURIComponent(codeBrut);
  const qui = req.userId ? String(req.userId) : null;
  let raison = String(corps?.message || `Refus du serveur (${statut})`).trim().slice(0, 300);
  if (!/[.!?]$/.test(raison)) raison += '.';
  const operation = libelleOperation(req.method, sousChemin);
  const cle = String(req.headers['x-idempotency-key'] || '').slice(0, 100) || null;

  await preparerTable();
  // Une opération n'est signalée qu'une fois, même si elle est renvoyée
  const [lignes] = await sequelize.query(
    `INSERT INTO echecs_synchro (cle, tenant_code, secteur, numero_h, methode, chemin, operation, statut_http, raison)
     VALUES (:cle, :code, :secteur, :qui, :methode, :chemin, :operation, :statut, :raison)
     ON CONFLICT (cle) DO NOTHING RETURNING id`,
    { replacements: { cle, code, secteur, qui, methode: req.method, chemin: (req.originalUrl || '').split('?')[0], operation, statut, raison } }
  );
  if (!lignes?.length) return;

  const [etab] = await sequelize.query(
    'SELECT name, owner_numero_h FROM management_tenants WHERE tenant_code = :code LIMIT 1',
    { replacements: { code }, type: Q.SELECT }
  );
  const nomEtab = etab?.name || code;
  const [personne] = qui ? await sequelize.query(
    'SELECT prenom, nom_famille, tel1 FROM users WHERE numero_h = :n LIMIT 1',
    { replacements: { n: qui }, type: Q.SELECT }
  ) : [];
  const nomPersonne = [personne?.prenom, personne?.nom_famille].filter(Boolean).join(' ') || qui || 'inconnu';
  const quiTexte = personne?.tel1 ? `${nomPersonne} (${personne.tel1})` : nomPersonne;
  const titre = '⚠️ Données non enregistrées';

  if (qui) {
    await notifierMembreEtablissement(code, qui, 'sync_echec',
      `Une opération faite hors connexion n'a pas pu être enregistrée dans « ${nomEtab} » : ${operation} — ${raison} Ouvrez l'application pour la corriger et la réessayer.`,
      { titre });
  }
  // Le responsable n'est prévenu que si la personne a bien accès à l'établissement
  const proprietaire = etab?.owner_numero_h;
  if (req.tenant && proprietaire && proprietaire !== qui && proprietaire !== 'ADMIN-G7') {
    await notifierMembreEtablissement(code, proprietaire, 'sync_echec',
      `Une opération faite hors connexion par ${quiTexte} n'a pas été enregistrée : ${operation} — ${raison}`,
      { titre });
  }
  const admins = await sequelize.query(
    `SELECT numero_h FROM users
      WHERE (LOWER(role) IN ('admin', 'super-admin', 'administrator') OR numero_h IN (:maitres))
        AND COALESCE(is_active, true) = true LIMIT 20`,
    { replacements: { maitres: MASTER_ADMIN_NUMEROS }, type: Q.SELECT }
  );
  for (const a of admins) {
    if (a.numero_h === qui) continue;
    await notifierUtilisateur(a.numero_h, 'sync_echec',
      `« ${nomEtab} » (${code}) : une opération faite hors connexion par ${quiTexte} a été refusée à l'envoi — ${operation} — ${raison}`,
      { titre: '⚠️ Échec de synchronisation' });
  }
}

export function echecsSynchro(req, res, next) {
  if (!req.headers['x-moftal-replay'] || !GESTION.test(req.originalUrl || '')) return next();
  const essai = parseInt(req.headers['x-moftal-replay-essai'], 10) || 1;
  const json = res.json.bind(res);
  res.json = (corps) => {
    const statut = res.statusCode;
    if (estRefus(statut, corps, essai)) {
      enregistrerEtPrevenir(req, statut, corps).catch((e) => console.error('Échec de synchronisation non signalé :', e.message));
    }
    return json(corps);
  };
  next();
}

/** Liste pour l'espace admin : GET /api/admin/echecs-synchro */
export async function listerEchecsSynchro(limite = 100) {
  await preparerTable();
  return sequelize.query(
    `SELECT e.*, t.name AS etablissement, u.prenom, u.nom_famille, u.tel1
       FROM echecs_synchro e
       LEFT JOIN management_tenants t ON t.tenant_code = e.tenant_code
       LEFT JOIN users u ON u.numero_h = e.numero_h
      ORDER BY e.created_at DESC LIMIT :limite`,
    { replacements: { limite }, type: Q.SELECT }
  );
}

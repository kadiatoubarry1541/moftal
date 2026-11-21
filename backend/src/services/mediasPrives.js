import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { ensureTableFichiers } from './fichiersBase.js';
import { uploadToIDrive } from './idriveStorage.js';

/**
 * Médias PRIVÉS (galerie et photos de famille, médias « problèmes de la
 * famille », messages de l'arbre, histoires et stories réservées aux amis).
 *
 * Avant : enregistrés en « data:…;base64,… » dans les lignes des tables (base
 * lourde). Maintenant :
 *  - le contenu est rangé à part, dans la table « fichiers » (prive = true), ou
 *    dans un seau R2 PRIVÉ si R2_BUCKET_PRIVE est réglé (jamais dans le stockage
 *    public) ; une copie de secours part sur IDrive (privé) ;
 *  - la ligne ne garde qu'un repère « prive:<id> » ;
 *  - à chaque réponse, le serveur remplace ce repère par un lien SIGNÉ et
 *    temporaire (≤ 12 h). Seules les routes qui vérifient déjà qui a le droit de
 *    voir le média renvoient ce lien ; sans signature valide, rien n'est servi.
 */

export const PREFIXE = 'prive:';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const RE_REPERE = new RegExp(`"${PREFIXE}(${UUID})"`, 'gi');
const RE_LIEN = new RegExp(`^https?://[^\\s"]*/api/fichiers-prives/(${UUID})\\?e=\\d+&s=[\\w-]+$`, 'i');
const RE_DATA = /^data:((?:image|video|audio)\/[\w.+-]+)(?:;[^,]*)?;base64,(.+)$/s;
const FENETRE = 6 * 3600; // secondes : un même lien pendant 6 h (cache du navigateur)

// La colonne « prive » est créée avec la table (fichiersBase.js)
const ensureColonnePrive = ensureTableFichiers;

// ── Seau R2 privé (facultatif) ──────────────────────────────────────────────
const seauPrive = () => process.env.R2_BUCKET_PRIVE || '';
let client = null;
function clientR2() {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
    });
  }
  return client;
}
const seauPriveConfigure = () => !!(seauPrive() && process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);

async function envoyerSeauPrive(id, donnees, mime) {
  const cle = `prive/${id}`;
  await clientR2().send(new PutObjectCommand({ Bucket: seauPrive(), Key: cle, Body: donnees, ContentType: mime }));
  return `r2prive:${cle}`;
}

async function lireSeauPrive(cle) {
  const r = await clientR2().send(new GetObjectCommand({ Bucket: seauPrive(), Key: cle }));
  return Buffer.from(await r.Body.transformToByteArray());
}

// ── Enregistrement ──────────────────────────────────────────────────────────
const extension = (mime) => String(mime || '').split('/')[1]?.split(/[;+]/)[0] || 'bin';

/** Contenu d'un média privé → repère « prive:<id> » à garder dans la ligne. */
export async function enregistrerPrive(donnees, mime, { proprietaire = null, usage = null } = {}) {
  await ensureColonnePrive();
  const id = randomUUID();
  let urlExterne = null;
  if (seauPriveConfigure()) {
    try { urlExterne = await envoyerSeauPrive(id, donnees, mime); }
    catch (e) { console.warn(`médias privés: seau privé indisponible, gardé en base (${usage}):`, e.message); }
  }
  await sequelize.query(
    `INSERT INTO fichiers (id, mime, taille, donnees, url_externe, proprietaire, usage, prive)
     VALUES (:id, :mime, :taille, :donnees, :urlExterne, :proprietaire, :usage, true)`,
    { replacements: { id, mime, taille: donnees.length, donnees: urlExterne ? null : donnees, urlExterne, proprietaire, usage }, type: QueryTypes.INSERT }
  );
  uploadToIDrive(donnees, `${id}.${extension(mime)}`, mime, 'sauvegarde-prives')
    .catch((e) => console.warn('médias privés: copie IDrive échouée pour', id, e.message));
  return `${PREFIXE}${id}`;
}

/** Fichier reçu par multer (en mémoire) → repère. */
export const priveDepuisFichier = (file, opts) => enregistrerPrive(file.buffer, file.mimetype || 'application/octet-stream', opts);

/** « data:…;base64,… » → repère ; toute autre valeur est rendue telle quelle. */
export async function priveDepuisData(valeur, opts) {
  const m = typeof valeur === 'string' && valeur.match(RE_DATA);
  if (!m) return valeur;
  return enregistrerPrive(Buffer.from(m[2], 'base64'), m[1], opts);
}

export async function lirePrive(id) {
  await ensureColonnePrive();
  const [row] = await sequelize.query(
    'SELECT mime, donnees, url_externe FROM fichiers WHERE id = :id AND prive = true',
    { replacements: { id }, type: QueryTypes.SELECT }
  );
  if (!row) return null;
  if (row.donnees) return { mime: row.mime, contenu: Buffer.from(row.donnees) };
  if (row.url_externe?.startsWith('r2prive:') && seauPriveConfigure()) {
    return { mime: row.mime, contenu: await lireSeauPrive(row.url_externe.slice('r2prive:'.length)) };
  }
  return null;
}

// ── Liens signés ────────────────────────────────────────────────────────────
function cle() {
  const k = process.env.FICHIERS_PRIVES_CLE || process.env.JWT_SECRET;
  if (!k) throw new Error('Clé de signature absente (JWT_SECRET).');
  return k;
}
const signature = (id, e) => createHmac('sha256', cle()).update(`${id}.${e}`).digest('base64url').slice(0, 32);

export function verifierLien(id, e, s) {
  const exp = Number(e);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now() || typeof s !== 'string') return false;
  const attendu = Buffer.from(signature(id.toLowerCase(), exp));
  const recu = Buffer.from(s);
  return attendu.length === recu.length && timingSafeEqual(attendu, recu);
}

function adresseServeur(req) {
  if (process.env.PUBLIC_API_URL) return process.env.PUBLIC_API_URL.replace(/\/$/, '');
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  return `${proto}://${req.get('host')}`;
}

export function lienSigne(req, id) {
  const maintenant = Math.floor(Date.now() / 1000);
  const e = (Math.floor(maintenant / FENETRE) + 2) * FENETRE; // valable 6 à 12 h
  return `${adresseServeur(req)}/api/fichiers-prives/${id.toLowerCase()}?e=${e}&s=${signature(id.toLowerCase(), e)}`;
}

/**
 * Middleware (au début du serveur) :
 *  - réponses : chaque « prive:<id> » devient un lien signé ;
 *  - envois : un lien signé renvoyé par le site (ex. liste de photos modifiée
 *    puis renvoyée) redevient « prive:<id> », pour ne jamais enregistrer un lien
 *    qui expire.
 */
export function mediasPrivesMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') req.body = restaurerReperes(req.body);
  const json = res.json.bind(res);
  res.json = (corps) => {
    let texte;
    try { texte = JSON.stringify(corps); } catch { return json(corps); }
    if (texte === undefined || !texte.includes(`"${PREFIXE}`)) return json(corps);
    texte = texte.replace(RE_REPERE, (_t, id) => JSON.stringify(lienSigne(req, id)));
    if (!res.get('Content-Type')) res.type('application/json');
    return res.send(texte);
  };
  next();
}

export function restaurerReperes(valeur) {
  if (typeof valeur === 'string') {
    const m = valeur.match(RE_LIEN);
    return m ? `${PREFIXE}${m[1].toLowerCase()}` : valeur;
  }
  if (Array.isArray(valeur)) return valeur.map(restaurerReperes);
  if (valeur && typeof valeur === 'object' && Object.getPrototypeOf(valeur) === Object.prototype) {
    for (const k of Object.keys(valeur)) valeur[k] = restaurerReperes(valeur[k]);
  }
  return valeur;
}

// ── Anciens médias en base64 → rangés à part ───────────────────────────────

/** Remplace chaque « data:… » d'une valeur JSON (texte, liste, objet) par un repère. */
async function convertirJson(valeur, opts) {
  if (typeof valeur === 'string') return valeur.startsWith('data:') ? priveDepuisData(valeur, opts) : valeur;
  if (Array.isArray(valeur)) {
    const out = [];
    for (const v of valeur) out.push(await convertirJson(v, opts));
    return out;
  }
  if (valeur && typeof valeur === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(valeur)) out[k] = await convertirJson(v, opts);
    return out;
  }
  return valeur;
}

// table, clé, colonne, colonne du propriétaire, format (texte simple ou JSON stocké en texte)
const CIBLES = [
  { table: 'family_gallery', cle: 'id', col: 'url', proprio: 'uploader_numero_h', json: false, usage: 'galerie-famille' },
  { table: 'family_problem_media', cle: 'id', col: 'media_url', proprio: 'numero_h', json: false, usage: 'probleme-famille' },
  { table: 'family_tree_messages', cle: 'id', col: 'media_url', proprio: 'numero_h', json: false, usage: 'message-arbre' },
  { table: 'users', cle: 'numero_h', col: 'family_photo', proprio: 'numero_h', json: false, usage: 'photo-famille' },
  { table: 'users', cle: 'numero_h', col: 'man_photo', proprio: 'numero_h', json: false, usage: 'photo-famille' },
  { table: 'users', cle: 'numero_h', col: 'wife_photo', proprio: 'numero_h', json: false, usage: 'photo-famille' },
  { table: 'users', cle: 'numero_h', col: 'children_photos', proprio: 'numero_h', json: true, usage: 'photo-enfant' },
  { table: 'users', cle: 'numero_h', col: 'gallery_albums', proprio: 'numero_h', json: true, usage: 'galerie-privee' },
  { table: 'users', cle: 'numero_h', col: 'user_stories', proprio: 'numero_h', json: true, usage: 'histoire' },
  { table: 'published_stories', cle: 'id', col: 'photos', proprio: 'numero_h', json: 'natif', usage: 'story' },
  { table: 'published_stories', cle: 'id', col: 'videos', proprio: 'numero_h', json: 'natif', usage: 'story' },
];

async function colonneExiste(table, col) {
  const [r] = await sequelize.query(
    `SELECT data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = :table AND column_name = :col`,
    { replacements: { table, col }, type: QueryTypes.SELECT }
  );
  return r || null;
}

/**
 * Au démarrage, en arrière-plan : chaque média encore en base64 dans une ligne
 * est rangé à part, puis la ligne reçoit le repère. La ligne n'est modifiée que
 * si elle n'a pas changé entre-temps (sinon elle sera reprise au prochain tour).
 */
export async function sortirMediasBase64({ lot = 5, pause = 1000 } = {}) {
  await ensureColonnePrive();
  let convertis = 0;
  for (const c of CIBLES) {
    const info = await colonneExiste(c.table, c.col);
    if (!info) continue;
    const texte = c.json === 'natif' ? `"${c.col}"::text` : `"${c.col}"`;
    const proprio = (await colonneExiste(c.table, c.proprio)) ? `"${c.proprio}"` : 'NULL';
    const deja = new Set();
    for (;;) {
      const lignes = await sequelize.query(
        `SELECT "${c.cle}" AS cle, ${texte} AS valeur, ${proprio} AS proprio, md5(${texte}) AS empreinte
         FROM "${c.table}" WHERE ${texte} LIKE '%data:%' AND NOT ("${c.cle}"::text = ANY(CAST(:deja AS text[])))
         LIMIT :lot`,
        { replacements: { deja: `{${[...deja].map((d) => `"${d}"`).join(',')}}`, lot }, type: QueryTypes.SELECT }
      );
      if (!lignes.length) break;
      for (const l of lignes) {
        deja.add(String(l.cle));
        try {
          const opts = { proprietaire: l.proprio, usage: c.usage };
          let nouvelle;
          if (c.json) {
            let objet;
            try { objet = JSON.parse(l.valeur); } catch { continue; }
            nouvelle = JSON.stringify(await convertirJson(objet, opts));
          } else {
            nouvelle = await priveDepuisData(l.valeur, opts);
          }
          if (nouvelle === l.valeur) continue;
          const affecter = c.json === 'natif' ? `CAST(:nouvelle AS ${info.data_type === 'jsonb' ? 'jsonb' : 'json'})` : ':nouvelle';
          const [, n] = await sequelize.query(
            `UPDATE "${c.table}" SET "${c.col}" = ${affecter} WHERE "${c.cle}"::text = :cle AND md5(${texte}) = :empreinte`,
            { replacements: { nouvelle, cle: String(l.cle), empreinte: l.empreinte } }
          );
          if ((n?.rowCount ?? n) > 0) convertis++;
        } catch (e) {
          console.warn(`médias privés: ${c.table}.${c.col} ${l.cle} gardé tel quel —`, e.message);
        }
      }
      if (pause) await new Promise((r) => setTimeout(r, pause));
    }
  }
  if (convertis) console.log(`🔒 Médias base64 rangés à part (privés) : ${convertis} ligne(s).`);
  return { convertis };
}

/**
 * Quand R2_BUCKET_PRIVE est réglé : les médias privés encore dans la table
 * « fichiers » partent dans le seau privé (relu à l'identique avant de vider la base).
 */
export async function deplacerPrivesVersSeau({ lot = 5, pause = 2000 } = {}) {
  if (!seauPriveConfigure()) return { deplaces: 0, raison: 'seau privé non configuré' };
  await ensureColonnePrive();
  const echecs = [];
  let deplaces = 0;
  for (;;) {
    const lignes = await sequelize.query(
      `SELECT id, mime, donnees FROM fichiers
       WHERE prive = true AND donnees IS NOT NULL AND url_externe IS NULL
         AND NOT (id = ANY(CAST(:echecs AS uuid[]))) ORDER BY created_at LIMIT :lot`,
      { replacements: { echecs: `{${echecs.join(',')}}`, lot }, type: QueryTypes.SELECT }
    );
    if (!lignes.length) break;
    for (const l of lignes) {
      try {
        const donnees = Buffer.from(l.donnees);
        const url = await envoyerSeauPrive(l.id, donnees, l.mime);
        const relu = await lireSeauPrive(url.slice('r2prive:'.length));
        if (!relu.equals(donnees)) throw new Error('copie différente');
        await sequelize.query(
          'UPDATE fichiers SET url_externe = :url, donnees = NULL WHERE id = :id AND url_externe IS NULL',
          { replacements: { url, id: l.id } }
        );
        deplaces++;
      } catch (e) {
        echecs.push(l.id);
        console.warn('médias privés: gardé en base', l.id, '—', e.message);
      }
    }
    if (pause) await new Promise((r) => setTimeout(r, pause));
  }
  if (deplaces || echecs.length) console.log(`🔒 Médias privés → seau privé : ${deplaces} déplacé(s), ${echecs.length} gardé(s).`);
  return { deplaces, gardes: echecs.length };
}

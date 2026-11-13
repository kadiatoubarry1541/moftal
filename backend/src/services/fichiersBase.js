import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { uploadToIDrive } from './idriveStorage.js';
import { uploadToImageKit } from './imagekitStorage.js';
import { uploadToR2 } from './r2Storage.js';

/**
 * Fichiers (photos de profil, vitrines, cartes Info, bibliothèque…) répertoriés
 * dans la table « fichiers » et servis par GET /api/fichiers/:id.
 *
 * Pour ne pas remplir la base Neon, le contenu est envoyé au stockage en ligne
 * (ImageKit pour les images, R2 pour le reste, copie de secours sur IDrive) :
 * la base ne garde que le lien (url_externe). Si le stockage en ligne n'est pas
 * joignable, le contenu reste dans la base (donnees) : rien n'est jamais perdu.
 */
const TAILLE_MAX = 5 * 1024 * 1024; // une photo compressée fait quelques centaines de Ko

let tablePrete = null;
export function ensureTableFichiers() {
  if (!tablePrete) {
    tablePrete = (async () => {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS fichiers (
          id UUID PRIMARY KEY,
          mime VARCHAR(100) NOT NULL,
          taille INTEGER NOT NULL,
          donnees BYTEA,
          url_externe TEXT,
          proprietaire VARCHAR(80),
          usage VARCHAR(40),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
      // Tables créées avant le stockage en ligne
      await sequelize.query('ALTER TABLE fichiers ADD COLUMN IF NOT EXISTS url_externe TEXT');
      await sequelize.query('ALTER TABLE fichiers ALTER COLUMN donnees DROP NOT NULL');
    })().catch((e) => { tablePrete = null; throw e; });
  }
  return tablePrete;
}

const stockageEnLigneConfigure = () => !!(
  process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_URL_ENDPOINT
  && process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
);
const sauvegardeIDriveConfiguree = () => !!(process.env.IDRIVE_ACCESS_KEY && process.env.IDRIVE_SECRET_KEY);

const nomFichier = (id, mime, nom) => nom || `${id}.${String(mime || '').split('/')[1]?.split(/[;+]/)[0] || 'bin'}`;

/**
 * Adresse qui renvoie le fichier EXACT : ImageKit peut sinon servir l'image
 * recompressée dans un autre format (« tr=orig-true » = fichier d'origine).
 */
export function urlContenuOriginal(url) {
  const ik = process.env.IMAGEKIT_URL_ENDPOINT;
  const estImageKit = (ik && url.startsWith(ik)) || /(^|\.)imagekit\.io$/i.test(new URL(url).hostname);
  return estImageKit ? `${url}${url.includes('?') ? '&' : '?'}tr=orig-true` : url;
}

/** Envoie le contenu au stockage en ligne et renvoie son adresse publique. */
async function envoyerEnLigne(donnees, mime, nom) {
  return String(mime || '').startsWith('image/')
    ? uploadToImageKit(donnees, nom, 'fichiers')
    : uploadToR2(donnees, nom, mime || 'application/octet-stream', 'fichiers');
}

/** Fichier reçu par multer → stockage en ligne (ou base en secours) → URL « /api/fichiers/<id> ». */
export async function enregistrerEnBase(file, { proprietaire = null, usage = null, tailleMax = TAILLE_MAX } = {}) {
  const donnees = file.buffer || await fs.readFile(file.path);
  if (file.path) fs.unlink(file.path).catch(() => {});
  if (donnees.length > tailleMax) throw new Error(`Fichier trop lourd (${Math.round(tailleMax / 1048576)} Mo maximum).`);
  await ensureTableFichiers();
  const id = randomUUID();
  const mime = file.mimetype || 'application/octet-stream';
  const nom = nomFichier(id, mime, file.originalname);

  let urlExterne = null;
  if (stockageEnLigneConfigure()) {
    try { urlExterne = await envoyerEnLigne(donnees, mime, nom); }
    catch (e) { console.warn(`fichiers: stockage en ligne indisponible, gardé en base (${usage}):`, e.message); }
  }
  await sequelize.query(
    `INSERT INTO fichiers (id, mime, taille, donnees, url_externe, proprietaire, usage)
     VALUES (:id, :mime, :taille, :donnees, :urlExterne, :proprietaire, :usage)`,
    { replacements: { id, mime, taille: donnees.length, donnees: urlExterne ? null : donnees, urlExterne, proprietaire, usage }, type: QueryTypes.INSERT }
  );
  // Copie de sauvegarde sur IDrive, comme les autres médias de Moftal
  uploadToIDrive(donnees, nom, mime, 'sauvegarde-photos')
    .catch((e) => console.warn('fichiers: copie IDrive échouée pour', id, e.message));
  return `/api/fichiers/${id}`;
}

export async function lireFichier(id) {
  await ensureTableFichiers();
  const [row] = await sequelize.query('SELECT mime, donnees, url_externe FROM fichiers WHERE id = :id', { replacements: { id }, type: QueryTypes.SELECT });
  return row || null;
}

/**
 * Fichiers encore stockés DANS la base → stockage en ligne, pour libérer Neon.
 * Le contenu n'est retiré de la base qu'après avoir vérifié que la copie en ligne
 * se relit ET que la copie de secours IDrive est faite. Au moindre doute, on garde.
 */
export async function deplacerFichiersHorsBase({ lot = 5, pause = 2000 } = {}) {
  if (!stockageEnLigneConfigure() || !sauvegardeIDriveConfiguree()) {
    return { deplaces: 0, gardes: 0, raison: 'stockage en ligne ou IDrive non configuré' };
  }
  await ensureTableFichiers();
  const echecs = [];
  let deplaces = 0;
  for (;;) {
    const lignes = await sequelize.query(
      `SELECT id, mime, donnees FROM fichiers
       WHERE donnees IS NOT NULL AND url_externe IS NULL
         AND NOT (id = ANY(CAST(:echecs AS uuid[])))
       ORDER BY created_at LIMIT :lot`,
      { replacements: { echecs: `{${echecs.join(',')}}`, lot }, type: QueryTypes.SELECT }
    );
    if (!lignes.length) break;
    for (const l of lignes) {
      try {
        const donnees = Buffer.from(l.donnees);
        const nom = nomFichier(l.id, l.mime);
        const url = await envoyerEnLigne(donnees, l.mime, nom);
        // La copie en ligne doit se relire à l'identique, octet par octet
        const verif = await fetch(urlContenuOriginal(url));
        const relu = verif.ok ? Buffer.from(await verif.arrayBuffer()) : null;
        if (!relu || !relu.equals(donnees)) throw new Error(`copie en ligne différente ou illisible (${verif.status})`);
        await uploadToIDrive(donnees, nom, l.mime, 'sauvegarde-photos');
        await sequelize.query(
          'UPDATE fichiers SET url_externe = :url, donnees = NULL WHERE id = :id AND url_externe IS NULL',
          { replacements: { url, id: l.id } }
        );
        deplaces++;
      } catch (e) {
        echecs.push(l.id);
        console.warn('fichiers: gardé en base', l.id, '—', e.message);
      }
    }
    if (pause) await new Promise((r) => setTimeout(r, pause));
  }
  if (deplaces || echecs.length) {
    console.log(`🗄️ Fichiers sortis de la base : ${deplaces} déplacé(s), ${echecs.length} gardé(s) en base.`);
  }
  return { deplaces, gardes: echecs.length };
}

const MIMES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };

/**
 * Au démarrage : les photos de profil / vitrine encore sur le disque du serveur
 * (/uploads/…) sont copiées dans la base. Celles que le disque n'a plus sont
 * comptées dans le journal (le téléphone du membre peut encore les renvoyer).
 */
export async function migrerPhotosDisque(dossierUploads) {
  const { default: path } = await import('path');
  await ensureTableFichiers();
  const lignes = await sequelize.query(
    `SELECT numero_h, photo, vitrine_photo1, vitrine_photo2 FROM users
     WHERE photo LIKE '%/uploads/%' OR vitrine_photo1 LIKE '%/uploads/%' OR vitrine_photo2 LIKE '%/uploads/%'`,
    { type: QueryTypes.SELECT }
  );
  let copiees = 0, introuvables = 0;
  for (const l of lignes) {
    for (const [col, usage] of [['photo', 'photo-profil'], ['vitrine_photo1', 'vitrine-photo1'], ['vitrine_photo2', 'vitrine-photo2']]) {
      const v = l[col];
      if (!v || !v.includes('/uploads/')) continue;
      const nom = path.basename(v.split('?')[0]);
      const chemin = path.join(dossierUploads, nom);
      let buffer;
      try { buffer = await fs.readFile(chemin); } catch { introuvables++; continue; }
      const mime = MIMES[path.extname(nom).toLowerCase()] || 'image/jpeg';
      const url = await enregistrerEnBase({ buffer, mimetype: mime, originalname: nom }, { proprietaire: l.numero_h, usage });
      await sequelize.query(`UPDATE users SET ${col} = :url WHERE numero_h = :n AND ${col} = :ancien`,
        { replacements: { url, n: l.numero_h, ancien: v } });
      copiees++;
    }
  }
  console.log(`🖼️ Photos du disque → base : ${copiees} copiée(s), ${introuvables} introuvable(s) sur le disque.`);
}

/**
 * Photo envoyée par un formulaire en « data:image/…;base64,… » → enregistrée
 * dans la table fichiers → URL « /api/fichiers/<id> ».
 * undefined / vide → null (le champ n'est pas modifié) ; une URL déjà
 * enregistrée est gardée telle quelle.
 */
export async function photoDepuisFormulaire(valeur, { proprietaire = null, usage = null } = {}) {
  if (typeof valeur !== 'string' || !valeur) return null;
  const m = valeur.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
  if (!m) return valeur.startsWith('data:') ? null : valeur;
  return enregistrerEnBase({ buffer: Buffer.from(m[2], 'base64'), mimetype: m[1], originalname: `photo.${m[1].split('/')[1]}` }, { proprietaire, usage });
}

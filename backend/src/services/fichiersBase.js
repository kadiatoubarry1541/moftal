import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { uploadToIDrive } from './idriveStorage.js';

/**
 * Photos enregistrées DANS la base de données (table « fichiers ») : rien ne
 * dépend du disque du serveur, qui est effacé à chaque mise en ligne.
 * Une photo est servie par GET /api/fichiers/:id.
 */
const TAILLE_MAX = 5 * 1024 * 1024; // une photo compressée fait quelques centaines de Ko

let tablePrete = null;
export function ensureTableFichiers() {
  if (!tablePrete) {
    tablePrete = sequelize.query(`
      CREATE TABLE IF NOT EXISTS fichiers (
        id UUID PRIMARY KEY,
        mime VARCHAR(100) NOT NULL,
        taille INTEGER NOT NULL,
        donnees BYTEA NOT NULL,
        proprietaire VARCHAR(80),
        usage VARCHAR(40),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`).catch((e) => { tablePrete = null; throw e; });
  }
  return tablePrete;
}

/** Fichier reçu par multer → enregistré en base → URL « /api/fichiers/<id> ». */
export async function enregistrerEnBase(file, { proprietaire = null, usage = null, tailleMax = TAILLE_MAX } = {}) {
  const donnees = file.buffer || await fs.readFile(file.path);
  if (file.path) fs.unlink(file.path).catch(() => {});
  if (donnees.length > tailleMax) throw new Error(`Fichier trop lourd (${Math.round(tailleMax / 1048576)} Mo maximum).`);
  await ensureTableFichiers();
  const id = randomUUID();
  await sequelize.query(
    'INSERT INTO fichiers (id, mime, taille, donnees, proprietaire, usage) VALUES (:id, :mime, :taille, :donnees, :proprietaire, :usage)',
    { replacements: { id, mime: file.mimetype || 'application/octet-stream', taille: donnees.length, donnees, proprietaire, usage }, type: QueryTypes.INSERT }
  );
  // Copie de sauvegarde sur IDrive, comme les autres médias de Moftal
  uploadToIDrive(donnees, file.originalname || `${id}.jpg`, file.mimetype, 'sauvegarde-photos').catch(() => {});
  return `/api/fichiers/${id}`;
}

export async function lireFichier(id) {
  await ensureTableFichiers();
  const [row] = await sequelize.query('SELECT mime, donnees FROM fichiers WHERE id = :id', { replacements: { id }, type: QueryTypes.SELECT });
  return row || null;
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

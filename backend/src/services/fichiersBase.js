import fs from 'fs/promises';
import { randomUUID } from 'crypto';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

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
export async function enregistrerEnBase(file, { proprietaire = null, usage = null } = {}) {
  const donnees = file.buffer || await fs.readFile(file.path);
  if (file.path) fs.unlink(file.path).catch(() => {});
  if (donnees.length > TAILLE_MAX) throw new Error('Photo trop lourde (5 Mo maximum).');
  await ensureTableFichiers();
  const id = randomUUID();
  await sequelize.query(
    'INSERT INTO fichiers (id, mime, taille, donnees, proprietaire, usage) VALUES (:id, :mime, :taille, :donnees, :proprietaire, :usage)',
    { replacements: { id, mime: file.mimetype || 'application/octet-stream', taille: donnees.length, donnees, proprietaire, usage }, type: QueryTypes.INSERT }
  );
  return `/api/fichiers/${id}`;
}

export async function lireFichier(id) {
  await ensureTableFichiers();
  const [row] = await sequelize.query('SELECT mime, donnees FROM fichiers WHERE id = :id', { replacements: { id }, type: QueryTypes.SELECT });
  return row || null;
}

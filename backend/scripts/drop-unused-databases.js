/**
 * drop-unused-databases.js
 *
 * Supprime les anciennes bases PostgreSQL qui ne sont plus utilisées.
 * Toutes les tables ont été consolidées dans : enfants_adam_eve
 *
 * Bases supprimées :
 *   - professionnel   (remplacée par enfants_adam_eve)
 *   - IAscience       (remplacée par enfants_adam_eve)
 *   - temps           (remplacée par enfants_adam_eve)
 *   - diangou         (remplacée par enfants_adam_eve)
 *   - inspire         (remplacée par enfants_adam_eve)
 *
 * Usage :
 *   cd backend
 *   node scripts/drop-unused-databases.js
 *
 * ⚠️  IRRÉVERSIBLE — vérifiez bien que vous avez une sauvegarde avant.
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../config.env') });

const DB_HOST     = process.env.DB_HOST     || 'localhost';
const DB_PORT     = parseInt(process.env.DB_PORT) || 5432;
const DB_USER     = process.env.DB_USER     || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

// Bases à supprimer (toutes obsolètes — remplacées par enfants_adam_eve)
const DATABASES_TO_DROP = [
  'professionnel',
  'IAscience',
  'temps',
  'diangou',
  'inspire',
];

// ─── Confirmation interactive ─────────────────────────────────────────────────

function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ─── Connexion à postgres (base système, pas à la base à supprimer) ──────────

async function getAdminClient() {
  const client = new pg.Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'postgres',   // base système toujours disponible
  });
  await client.connect();
  return client;
}

// ─── Vérifie si une base existe ───────────────────────────────────────────────

async function databaseExists(client, dbName) {
  const result = await client.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    [dbName]
  );
  return result.rowCount > 0;
}

// ─── Ferme toutes les connexions actives puis supprime ────────────────────────

async function dropDatabase(client, dbName) {
  // Termine toutes les connexions actives sur cette base
  await client.query(`
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = $1 AND pid <> pg_backend_pid()
  `, [dbName]);

  await client.query(`DROP DATABASE "${dbName}"`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║   Suppression des bases PostgreSQL obsolètes             ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  console.log(`  Serveur  : ${DB_HOST}:${DB_PORT}`);
  console.log(`  Utilisateur : ${DB_USER}`);
  console.log(`  Base conservée : enfants_adam_eve  ✅\n`);
  console.log('  Bases qui seront supprimées :');
  DATABASES_TO_DROP.forEach(db => console.log(`    ❌  ${db}`));

  console.log('\n  ⚠️  Cette opération est IRRÉVERSIBLE.');
  const answer = await askConfirmation('\n  Tapez "OUI" pour confirmer la suppression : ');

  if (answer !== 'oui') {
    console.log('\n  Opération annulée.\n');
    process.exit(0);
  }

  let client;
  try {
    client = await getAdminClient();
    console.log('\n  Connexion PostgreSQL établie ✅\n');

    for (const dbName of DATABASES_TO_DROP) {
      const exists = await databaseExists(client, dbName);
      if (!exists) {
        console.log(`  ⏭️  "${dbName}" — introuvable (déjà supprimée ou jamais créée)`);
        continue;
      }
      try {
        await dropDatabase(client, dbName);
        console.log(`  ✅  "${dbName}" — supprimée`);
      } catch (err) {
        console.error(`  ❌  "${dbName}" — erreur : ${err.message}`);
      }
    }

    console.log('\n  Terminé.\n');
  } catch (err) {
    console.error('\n  ❌ Erreur de connexion :', err.message);
    console.error('     Vérifiez DB_HOST, DB_PORT, DB_USER, DB_PASSWORD dans config.env\n');
    process.exit(1);
  } finally {
    if (client) await client.end();
  }
}

main();

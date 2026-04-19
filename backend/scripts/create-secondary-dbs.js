/**
 * Script : Création automatique des bases secondaires
 * Usage  : cd backend && node scripts/create-secondary-dbs.js
 *
 * Crée les bases : professionnel, IAscience, temps
 * (se connecte à postgres pour pouvoir créer les DB)
 */
import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || 5432;
const user = process.env.DB_USER || 'postgres';
const password = process.env.DB_PASSWORD || '';

// Se connecter à la DB "postgres" (toujours disponible) pour créer les autres
const admin = new Sequelize({
  dialect: 'postgres',
  host,
  port,
  database: 'postgres',
  username: user,
  password,
  logging: false
});

const bases = [
  { name: 'professionnel', envVar: 'DB_PRO_NAME'     },
  { name: 'IAscience',     envVar: 'DB_IA_NAME'      },
  { name: 'temps',         envVar: 'DB_TEMPS_NAME'   },
  { name: 'diangou',       envVar: 'DB_DIANGOU_NAME' }
];

async function createDatabases() {
  try {
    await admin.authenticate();
    console.log('✅ Connecté à PostgreSQL (admin)');

    for (const { name, envVar } of bases) {
      const dbName = process.env[envVar] || name;
      try {
        // Vérifie si la base existe déjà
        const [rows] = await admin.query(
          `SELECT 1 FROM pg_database WHERE datname = '${dbName}'`
        );
        if (rows.length > 0) {
          console.log(`ℹ️  Base "${dbName}" existe déjà — ignorée`);
        } else {
          await admin.query(`CREATE DATABASE "${dbName}" ENCODING 'UTF8'`);
          console.log(`✅ Base "${dbName}" créée avec succès`);
        }
      } catch (err) {
        console.error(`❌ Erreur pour "${dbName}":`, err.message);
      }
    }

    console.log('\n✅ Terminé ! Redémarrez le backend pour synchroniser les modèles.');
    console.log('   Les tables seront créées automatiquement au démarrage (sync: alter).');
  } catch (err) {
    console.error('❌ Impossible de se connecter à PostgreSQL:', err.message);
    console.error('   Vérifiez DB_HOST, DB_USER, DB_PASSWORD dans backend/config.env');
  } finally {
    await admin.close();
  }
}

createDatabases();
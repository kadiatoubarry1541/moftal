import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Charger le meme fichier d'env que le serveur (backend/config.env)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

// Configuration de la base de donnees PostgreSQL
// Support pour Neon (URL de connexion complete) ou configuration classique
let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  });
} else {
  sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'enfants_adam_eve',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    logging: false,
    dialectOptions: process.env.DB_SSL === 'true' ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {},
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  });
}

const MAX_DB_RETRIES = 5;
const DB_RETRY_DELAY_MS = 2000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const connectDB = async () => {
  let lastError;
  for (let attempt = 1; attempt <= MAX_DB_RETRIES; attempt++) {
    try {
      await sequelize.authenticate();
      console.log('PostgreSQL connecte avec succes');
      try {
        if (process.env.NODE_ENV === 'development') {
          // En dev : alter=true pour appliquer les nouvelles colonnes/types
          await sequelize.sync({ alter: true });
          console.log('Modeles synchronises avec la base de donnees (dev)');
        } else {
          // alter:true pour ajouter les colonnes manquantes dans Neon
          await sequelize.sync({ alter: true });
          console.log('Modeles synchronises avec la base de donnees (production)');
        }
      } catch (syncError) {
        console.warn('Sync partiel (certaines colonnes/ENUM non appliques):', syncError.message);
        console.warn('Si colonne manquante : npm run fix-users-table | Si ENUM manquante : npm run fix-pro-enum');
      }
      return sequelize;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_DB_RETRIES) {
        console.warn('Connexion PostgreSQL tentative ' + attempt + '/' + MAX_DB_RETRIES + ', nouvel essai dans ' + (DB_RETRY_DELAY_MS / 1000) + 's...');
        await sleep(DB_RETRY_DELAY_MS);
      }
    }
  }
  console.error('Connexion PostgreSQL impossible apres ' + MAX_DB_RETRIES + ' tentatives.');
  console.error('Derniere erreur:', lastError?.message || lastError);
  console.error('Verifiez que PostgreSQL tourne et que backend/config.env est correct.');
  throw lastError;
};

const closeDB = async () => {
  try {
    await sequelize.close();
    console.log('Connexion PostgreSQL fermee');
  } catch (error) {
    console.error('Erreur lors de la fermeture:', error.message);
  }
};

export { sequelize, connectDB, closeDB };
export default connectDB;

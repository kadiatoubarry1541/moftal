import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

// Connexion à la base de données "temps"
// Contient : Histoire, Préhistoire, Antiquité, Civilisations
let sequelizeTemps;

if (process.env.DATABASE_URL_TEMPS) {
  sequelizeTemps = new Sequelize(process.env.DATABASE_URL_TEMPS, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true, freezeTableName: true }
  });
} else {
  sequelizeTemps = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_TEMPS_NAME || 'enfants_adam_eve',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true, freezeTableName: true }
  });
}

const connectDB_Temps = async () => {
  try {
    await sequelizeTemps.authenticate();
    console.log('✅ PostgreSQL [temps → enfants_adam_eve] connecté');
    if (process.env.NODE_ENV === 'development') {
      await sequelizeTemps.sync({ alter: true });
      console.log('✅ Modèles [temps] synchronisés');
    } else {
      await sequelizeTemps.sync({ force: false });
    }
  } catch (error) {
    console.error('❌ Connexion [temps] échouée:', error.message);
    console.error('   → Créez la base : CREATE DATABASE temps;');
  }
};

export { sequelizeTemps, sequelizeTemps as sequelize, connectDB_Temps };
export default connectDB_Temps;
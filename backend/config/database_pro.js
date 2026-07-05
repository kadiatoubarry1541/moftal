import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

// Connexion à la base de données pro — utilise DATABASE_URL_PRO, ou DATABASE_URL comme fallback
let sequelizePro;

const urlPro = process.env.DATABASE_URL_PRO || process.env.DATABASE_URL;

if (urlPro) {
  sequelizePro = new Sequelize(urlPro, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true, freezeTableName: true }
  });
} else {
  sequelizePro = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_PRO_NAME || 'enfants_adam_eve',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true, freezeTableName: true }
  });
}

const connectDB_Pro = async () => {
  try {
    await sequelizePro.authenticate();
    console.log('✅ PostgreSQL [pro → enfants_adam_eve] connecté');
    if (process.env.NODE_ENV === 'development') {
      await sequelizePro.sync({ alter: true });
      console.log('✅ Modèles [pro] synchronisés');
    } else {
      await sequelizePro.sync({ force: false });
    }
  } catch (error) {
    console.error('❌ Connexion [professionnel] échouée:', error.message);
    console.error('   → Créez la base : CREATE DATABASE professionnel;');
  }
};

// Export avec alias 'sequelize' pour que les modèles existants fonctionnent sans changer leur import
export { sequelizePro, sequelizePro as sequelize, connectDB_Pro };
export default connectDB_Pro;
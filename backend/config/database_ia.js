import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

// Connexion à la base de données "IAscience"
let sequelizeIA;

if (process.env.DATABASE_URL_IA) {
  sequelizeIA = new Sequelize(process.env.DATABASE_URL_IA, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true, freezeTableName: true }
  });
} else {
  sequelizeIA = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_IA_NAME || 'enfants_adam_eve',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true, freezeTableName: true }
  });
}

const connectDB_IA = async () => {
  try {
    await sequelizeIA.authenticate();
    console.log('✅ PostgreSQL [IA → enfants_adam_eve] connecté');
    if (process.env.NODE_ENV === 'development') {
      await sequelizeIA.sync({ alter: true });
      console.log('✅ Modèles [IA] synchronisés');
    } else {
      await sequelizeIA.sync({ force: false });
    }
  } catch (error) {
    console.error('❌ Connexion [IAscience] échouée:', error.message);
    console.error('   → Créez la base : CREATE DATABASE "IAscience";');
  }
};

export { sequelizeIA, sequelizeIA as sequelize, connectDB_IA };
export default connectDB_IA;
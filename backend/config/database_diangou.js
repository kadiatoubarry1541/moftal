import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

// Connexion à la base de données "diangou"
// Contient : Professeurs, Cours, Formations, Inscriptions aux formations
// Note : cette base est aussi utilisée par le backend IA Diangou (IA Diangou/backend/)
let sequelizeDiangou;

if (process.env.DATABASE_URL_DIANGOU) {
  sequelizeDiangou = new Sequelize(process.env.DATABASE_URL_DIANGOU, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true, freezeTableName: true }
  });
} else {
  sequelizeDiangou = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_DIANGOU_NAME || 'enfants_adam_eve',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    define: { timestamps: true, underscored: true, freezeTableName: true }
  });
}

const connectDB_Diangou = async () => {
  try {
    await sequelizeDiangou.authenticate();
    console.log('✅ PostgreSQL [diangou → enfants_adam_eve] connecté');
    if (process.env.NODE_ENV === 'development') {
      await sequelizeDiangou.sync({ alter: true });
      console.log('✅ Modèles [diangou] synchronisés');
    } else {
      await sequelizeDiangou.sync({ force: false });
    }
  } catch (error) {
    console.error('❌ Connexion [diangou] échouée:', error.message);
    console.error('   → Créez la base : CREATE DATABASE diangou;');
  }
};

export { sequelizeDiangou, sequelizeDiangou as sequelize, connectDB_Diangou };
export default connectDB_Diangou;
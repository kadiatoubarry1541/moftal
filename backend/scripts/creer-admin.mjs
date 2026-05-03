import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const { Client } = pg;

const client = new Client({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'enfants_adam_eve',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

const NUMERO_H = 'G0C0P0R0E0F0 0';
const PASSWORD = 'Neneyaya1';

try {
  await client.connect();
  console.log('✅ Connecté à PostgreSQL');

  const hash = await bcrypt.hash(PASSWORD, 10);

  await client.query(`
    INSERT INTO users (
      numero_h, password, role, is_active, is_verified,
      type, prenom, nom_famille, genre, generation,
      created_at, updated_at
    ) VALUES ($1,$2,'admin',true,true,'vivant','Admin','Principal','AUTRE','G0',NOW(),NOW())
    ON CONFLICT (numero_h) DO UPDATE SET
      password   = EXCLUDED.password,
      role       = 'admin',
      is_active  = true
  `, [NUMERO_H, hash]);

  console.log('');
  console.log('✅ Compte admin créé/mis à jour !');
  console.log('   NumeroH      :', NUMERO_H);
  console.log('   Mot de passe :', PASSWORD);
  console.log('');
  console.log('👉 Tu peux maintenant te connecter sur http://localhost:3000/login');

} catch (err) {
  console.error('❌ Erreur :', err.message);
  if (err.message.includes('password authentication')) {
    console.error('   → Mauvais mot de passe PostgreSQL dans config.env');
    console.error('   → Vérifie DB_PASSWORD= dans backend/config.env');
  }
  if (err.message.includes('does not exist')) {
    console.error('   → La table users n\'existe pas encore');
    console.error('   → Lance d\'abord : npm run migrate dans le dossier backend');
  }
} finally {
  await client.end();
}

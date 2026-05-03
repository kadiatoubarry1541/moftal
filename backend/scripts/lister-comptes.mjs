import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'config.env') });

const { Client } = pg;

// Essaie plusieurs mots de passe courants si le premier échoue
const passwords = [
  process.env.DB_PASSWORD || '',
  '',
  'postgres',
  'admin',
  'password',
  '1234',
  'root'
];

let client;
let connected = false;

for (const pwd of passwords) {
  client = new Client({
    host:     process.env.DB_HOST || 'localhost',
    port:     process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'enfants_adam_eve',
    user:     process.env.DB_USER || 'postgres',
    password: pwd,
  });
  try {
    await client.connect();
    if (pwd) console.log(`✅ Connecté avec mot de passe : "${pwd}"`);
    else      console.log('✅ Connecté sans mot de passe');
    connected = true;

    // Mémorise le bon mot de passe
    const fs = await import('fs');
    const envPath = path.join(__dirname, '..', 'config.env');
    let envContent = fs.readFileSync(envPath, 'utf8');
    envContent = envContent.replace(/^DB_PASSWORD=.*/m, `DB_PASSWORD=${pwd}`);
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ config.env mis à jour avec DB_PASSWORD=${pwd || '(vide)'}`);
    break;
  } catch {
    await client.end().catch(() => {});
  }
}

if (!connected) {
  console.error('❌ Impossible de se connecter à PostgreSQL.');
  console.error('   Ouvre pgAdmin → clic droit sur PostgreSQL 18 → Properties → Connection');
  console.error('   Dis-moi le mot de passe affiché dans le champ "Password"');
  process.exit(1);
}

try {
  // Liste tous les comptes
  const result = await client.query(`
    SELECT
      numero_h,
      prenom,
      nom_famille,
      role,
      is_active,
      is_verified,
      type,
      created_at
    FROM users
    ORDER BY created_at DESC
  `);

  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  ${result.rows.length} compte(s) trouvé(s) dans la base`);
  console.log('═══════════════════════════════════════════════════');

  if (result.rows.length === 0) {
    console.log('  ⚠️  Aucun compte — la table est vide.');
    console.log('  Lance ensuite : node scripts/creer-admin.mjs');
  } else {
    result.rows.forEach((u, i) => {
      console.log(`\n  Compte ${i + 1}`);
      console.log(`    NumeroH    : ${u.numero_h}`);
      console.log(`    Nom        : ${u.prenom} ${u.nom_famille}`);
      console.log(`    Rôle       : ${u.role}`);
      console.log(`    Actif      : ${u.is_active ? 'Oui' : 'Non'}`);
      console.log(`    Vérifié    : ${u.is_verified ? 'Oui' : 'Non'}`);
      console.log(`    Type       : ${u.type}`);
    });
  }
  console.log('\n═══════════════════════════════════════════════════');

} catch (err) {
  if (err.message.includes('does not exist')) {
    console.error('❌ La table "users" n\'existe pas encore dans la base.');
    console.error('   Lance : npm run migrate  dans le dossier backend');
  } else {
    console.error('❌ Erreur :', err.message);
  }
} finally {
  await client.end();
}

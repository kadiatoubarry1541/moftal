/**
 * Script d'initialisation locale — génère les migrations + seed avec le bon mot de passe
 * Usage : node backend/scripts/setup-local.mjs
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const backendDir = join(__dirname, '..');

const PASSWORD = 'Neneyaya1';
const ROUNDS = 6;

console.log('🔑 Génération du hash bcrypt pour le mot de passe...');
const hash = await bcrypt.hash(PASSWORD, ROUNDS);
console.log('✅ Hash généré');

const seedSQL = `-- Seed admin avec mot de passe : ${PASSWORD}
INSERT OR REPLACE INTO users (
  numero_h, password, type, role, is_active, is_verified,
  prenom, nom_famille, genre, generation,
  created_at, updated_at
) VALUES
  (
    'G7C7P7R7E7F7 7',
    '${hash}',
    'vivant', 'admin', 1, 1,
    'Super', 'Admin', 'MASCULIN', 'G7',
    datetime('now'), datetime('now')
  ),
  (
    'G0C0P0R0E0F0 0',
    '${hash}',
    'vivant', 'admin', 1, 1,
    'Admin', 'Principal', 'MASCULIN', 'G0',
    datetime('now'), datetime('now')
  );
`;

const seedPath = join(backendDir, 'migrations', '0002_admin_seed.sql');
writeFileSync(seedPath, seedSQL);
console.log('✅ Fichier seed mis à jour avec le mot de passe :', PASSWORD);

console.log('\n📦 Application des migrations locales...');
try {
  execSync('npx wrangler d1 execute enfants-adam-db --local --file=./migrations/0001_initial.sql', {
    cwd: backendDir, stdio: 'inherit'
  });
  console.log('✅ Tables créées');
} catch (e) {
  console.log('⚠️  Tables déjà existantes (normal)');
}

console.log('\n🌱 Application du seed (comptes admin)...');
execSync('npx wrangler d1 execute enfants-adam-db --local --file=./migrations/0002_admin_seed.sql', {
  cwd: backendDir, stdio: 'inherit'
});
console.log('✅ Comptes admin créés\n');

console.log('═══════════════════════════════════════════════');
console.log('✅ Base de données locale prête !');
console.log('');
console.log('  Connexion Admin principal :');
console.log('  NumeroH  : G0C0P0R0E0F0 0');
console.log(`  Mot de passe : ${PASSWORD}`);
console.log('');
console.log('  Connexion Super Admin :');
console.log('  NumeroH  : G7C7P7R7E7F7 7');
console.log(`  Mot de passe : ${PASSWORD}`);
console.log('═══════════════════════════════════════════════');

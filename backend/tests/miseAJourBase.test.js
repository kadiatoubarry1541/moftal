// Mise à jour de la base au démarrage (src/db/miseAJourBase.js) : elle doit
// fonctionner sur une base vide, puis une deuxième fois sans rien casser ni
// rien perdre — comme à chaque redémarrage du serveur en ligne.
// Base PostgreSQL de test VIDE : TEST_DB_VIDE=1 DB_NAME=… (sinon le test est sauté).
import test from 'node:test';
import assert from 'node:assert/strict';

test('mise à jour de la base au démarrage : base vide, deux fois de suite', {
  skip: !process.env.TEST_DB_VIDE && 'TEST_DB_VIDE non défini (base de test vide)',
  timeout: 300000,
}, async () => {
  // Comme au vrai démarrage : tous les modèles sont chargés avant de créer les tables
  const { readdir } = await import('node:fs/promises');
  const dossierModeles = new URL('../src/models/', import.meta.url);
  for (const f of (await readdir(dossierModeles)).filter((x) => x.endsWith('.js'))) {
    await import(new URL(f, dossierModeles).href);
  }
  const { default: connectDB, sequelize } = await import('../config/database.js');
  const { ensureAdmin, initAllTables, creerTablesManquantesSecondaires } = await import('../src/db/miseAJourBase.js');

  const demarrer = async () => {
    await connectDB();
    await creerTablesManquantesSecondaires();
    await initAllTables();
    await ensureAdmin();
  };
  const etat = async () => {
    const tables = await sequelize.query(
      "SELECT table_name AS nom FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1", { type: 'SELECT' });
    const colonnes = await sequelize.query(
      "SELECT table_name || '.' || column_name AS c FROM information_schema.columns WHERE table_schema = 'public' ORDER BY 1", { type: 'SELECT' });
    return { tables: tables.map((t) => t.nom), colonnes: colonnes.map((c) => c.c) };
  };

  await demarrer();
  const apres1 = await etat();
  assert.ok(apres1.tables.includes('users'), `la table des comptes existe (${apres1.tables.length} tables : ${JSON.stringify(apres1.tables.slice(0, 3))})`);
  assert.ok(apres1.colonnes.includes('users.sessions_valides_depuis'));
  assert.ok(apres1.tables.length > 50, `toutes les tables sont créées (${apres1.tables.length})`);

  // Une donnée enregistrée entre deux démarrages n'est jamais perdue
  await sequelize.query(`INSERT INTO users (numero_h, prenom, nom_famille, password, genre, generation, type, is_active, created_at, updated_at)
    VALUES ('TEST-DEMARRAGE 1', 'Awa', 'Test', 'x', 'FEMME', 'G95', 'vivant', true, NOW(), NOW())`);

  await demarrer();
  const apres2 = await etat();
  assert.deepEqual(apres2.tables, apres1.tables, 'aucune table ajoutée ni perdue au 2e démarrage');
  assert.deepEqual(apres2.colonnes, apres1.colonnes, 'aucune colonne ajoutée ni perdue au 2e démarrage');
  const [compte] = await sequelize.query("SELECT prenom FROM users WHERE numero_h = 'TEST-DEMARRAGE 1'", { type: 'SELECT' });
  assert.equal(compte?.prenom, 'Awa', 'la donnée est intacte');

  await sequelize.close();
});

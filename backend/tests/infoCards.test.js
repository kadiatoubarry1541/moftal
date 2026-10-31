// Cartes d'Info Moftal enregistrées en base : carte gratuite, paiement en points,
// refus sans points, suppression. Lancé seulement avec une base PostgreSQL de test :
//   TEST_DB=1 DB_NAME=moftal_test DB_USER=postgres DB_PASSWORD=… npm test
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

const actif = !!process.env.TEST_DB;

test('cartes Info Moftal', { skip: !actif && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  // Connexion simulée : l'utilisateur est donné par l'en-tête x-test-user
  mock.module(new URL('../src/middleware/auth.js', import.meta.url).href, {
    namedExports: { authenticate: (req, _res, next) => { req.user = { numeroH: req.headers['x-test-user'] }; next(); } },
  });
  // Pas de copie de sauvegarde vers l'extérieur pendant le test
  mock.module(new URL('../src/services/idriveStorage.js', import.meta.url).href, {
    namedExports: { uploadToIDrive: async () => null },
  });
  const { default: router } = await import('../src/routes/infoCards.js');
  const { sequelize } = await import('../src/config/database.js');

  await sequelize.query(`CREATE TABLE IF NOT EXISTS gallery_points (numero_h VARCHAR(80) PRIMARY KEY, points_disponibles INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW())`);
  const qui = `TEST-${Date.now()}`;
  await sequelize.query(`INSERT INTO gallery_points (numero_h, points_disponibles) VALUES (:qui, 3)`, { replacements: { qui } });

  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use('/api/info-cards', router);
  const serveur = app.listen(0);
  t.after(async () => { serveur.close(); await sequelize.close(); });
  const base = `http://127.0.0.1:${serveur.address().port}/api/info-cards`;
  const appel = (chemin, methode = 'GET', corps) => fetch(base + chemin, {
    method: methode,
    headers: { 'x-test-user': qui, 'Content-Type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
  }).then(async (r) => ({ statut: r.status, d: await r.json() }));

  let r = await appel('/mine');
  assert.equal(r.d.carteGratuiteDisponible, true);
  assert.deepEqual(r.d.cards, []);

  // 1re carte : gratuite, la photo est enregistrée en base (adresse /api/fichiers/…)
  const photo = 'data:image/png;base64,' + Buffer.from('photo').toString('base64');
  r = await appel('', 'POST', { type: 'mariage', card: { epoux: 'A', photoCouple: photo } });
  assert.equal(r.statut, 201);
  assert.equal(r.d.gratuite, true);
  assert.match(r.d.card.card.photoCouple, /^\/api\/fichiers\/[0-9a-f-]{36}$/);
  const premiere = r.d.card.id;

  // 2e carte : 2 points (il en reste 1)
  r = await appel('', 'POST', { type: 'bapteme', card: { prenomBebe: 'B' } });
  assert.equal(r.statut, 201);
  assert.equal(r.d.gratuite, false);
  assert.equal(r.d.pointsRestants, 1);

  // 3e carte : plus assez de points → refus, et aucune carte créée
  r = await appel('', 'POST', { type: 'deces', card: { nomDefunt: 'C' } });
  assert.equal(r.statut, 402);
  r = await appel('/mine');
  assert.equal(r.d.cards.length, 2);

  // Modifier puis supprimer : la carte gratuite ne revient pas
  r = await appel(`/${premiere}`, 'PUT', { type: 'mariage', card: { epoux: 'A2' } });
  assert.equal(r.d.card.card.epoux, 'A2');
  r = await appel(`/${premiere}`, 'DELETE');
  assert.equal(r.d.success, true);
  r = await appel('/mine');
  assert.equal(r.d.cards.length, 1);
  assert.equal(r.d.carteGratuiteDisponible, false);

  // La carte d'un autre utilisateur n'est ni modifiable ni supprimable
  const autre = await fetch(`${base}/${r.d.cards[0].id}`, { method: 'DELETE', headers: { 'x-test-user': 'QUELQU-UN-D-AUTRE' } });
  assert.equal(autre.status, 404);
});

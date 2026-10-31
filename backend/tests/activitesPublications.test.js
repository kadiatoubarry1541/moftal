// Activités 2 et 3 : une publication apparaît dans le groupe ; inscription en son nom, places limitées.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

test('publications et inscriptions des activités', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  mock.module(new URL('../src/middleware/auth.js', import.meta.url).href, {
    namedExports: { authenticate: (req, _res, next) => { req.user = { numeroH: req.headers['x-test-user'] }; next(); }, isProvisionalNumeroH: () => false },
  });
  mock.module(new URL('../src/models/User.js', import.meta.url).href, { defaultExport: { findOne: async () => ({ prenom: 'Awa', nomFamille: 'Test' }) } });
  mock.module(new URL('../src/services/notificationMessages.js', import.meta.url).href, { namedExports: { notifierNouveauMessage: () => {} } });
  const { default: router } = await import('../src/routes/activities.js');
  const { default: ActivityGroup } = await import('../src/models/ActivityGroup.js');
  const { sequelize } = await import('../src/config/database.js');
  await ActivityGroup.sync();
  const g = await ActivityGroup.create({ name: `Test ${Date.now()}`, activity: 'Activité2', members: ['A', 'B', 'C'], posts: [], createdBy: 'A' });
  const app = express(); app.use(express.json()); app.use('/api/activities', router);
  const serveur = app.listen(0);
  t.after(async () => { await g.destroy(); serveur.close(); await sequelize.close(); });
  const base = `http://127.0.0.1:${serveur.address().port}/api/activities`;
  const appel = (qui, chemin, corps) => fetch(base + chemin, { method: 'POST', headers: { 'x-test-user': qui, 'Content-Type': 'application/json' }, body: JSON.stringify(corps || {}) });

  let r = await appel('A', `/groups/${g.id}/posts`, { type: 'workshop', content: 'Atelier', workshopDetails: JSON.stringify({ maxParticipants: 1, participants: ['triche'] }) });
  assert.equal(r.status, 201);
  const post = (await r.json()).post;
  assert.deepEqual(post.workshopDetails.participants, []);
  assert.equal((await ActivityGroup.findByPk(g.id)).posts[0].id, post.id);

  r = await appel('X', `/groups/${g.id}/posts`, { content: 'pas membre' });
  assert.equal(r.status, 403);

  r = await appel('B', `/activity2/posts/${post.id}/join-workshop`);
  assert.equal(r.status, 200);
  r = await appel('C', `/activity2/posts/${post.id}/join-workshop`);
  assert.equal(r.status, 409); // une seule place
  const final = (await ActivityGroup.findByPk(g.id)).posts[0];
  assert.deepEqual(final.workshopDetails.participants, ['B']);
});

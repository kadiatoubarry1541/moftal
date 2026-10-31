// Réfléchissons : publier puis relire une réflexion (base PostgreSQL de test).
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

test('réflexions', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  mock.module(new URL('../src/middleware/auth.js', import.meta.url).href, {
    namedExports: { authenticate: (req, _res, next) => { req.user = { numeroH: 'TEST-REFLEXION' }; next(); } },
  });
  const { default: router } = await import('../src/routes/faith.js');
  const { default: FaithContent } = await import('../src/models/FaithContent.js');
  const { sequelize } = await import('../src/config/database.js');
  await FaithContent.sync();
  const app = express(); app.use(express.json()); app.use('/api/faith', router);
  const serveur = app.listen(0);
  t.after(async () => { serveur.close(); await sequelize.close(); });
  const base = `http://127.0.0.1:${serveur.address().port}/api/faith/reflections`;

  let r = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Patience', description: 'd', type: 'message', content: 'Texte', category: 'reflexion', tags: ['a', ''], createdBy: 'QUELQU-UN' }) });
  assert.equal(r.status, 201);
  const cree = (await r.json()).reflection;
  assert.equal(cree.createdBy, 'TEST-REFLEXION');
  assert.equal(cree.content.text, 'Texte');
  r = await fetch(base); const d = await r.json();
  assert.ok(d.reflections.some((x) => x.id === cree.id && x.tags[0] === 'a'));
  r = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '' }) });
  assert.equal(r.status, 400);
});

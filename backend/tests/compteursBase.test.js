// Compteurs d'essais gardés dans la base : fenêtre, remise à zéro, magasin des limites
import test from 'node:test';
import assert from 'node:assert/strict';

test('compteurs d\'essais dans la base', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  const c = await import('../src/utils/compteursBase.js');
  const { sequelize } = await import('../src/config/database.js');
  const cle = `test-compteur-${Date.now()}`;
  t.after(async () => { await c.effacer(cle); await c.effacer(`m:${cle}`); await sequelize.close(); });

  assert.equal(await c.lire(cle), 0);
  assert.equal((await c.ajouter(cle, 60000)).compte, 1);
  assert.equal((await c.ajouter(cle, 60000)).compte, 2);
  assert.equal(await c.lire(cle), 2);
  assert.equal((await c.ajouter(cle, 60000, -5)).compte, 0, 'jamais négatif');
  await c.effacer(cle);
  assert.equal(await c.lire(cle), 0);

  // Fenêtre finie → le compteur repart de 1
  await c.ajouter(cle, 1);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(await c.lire(cle), 0);
  assert.equal((await c.ajouter(cle, 60000)).compte, 1);

  // Magasin pour express-rate-limit
  const m = new c.MagasinBase('m');
  m.init({ windowMs: 60000 });
  assert.equal((await m.increment(cle)).totalHits, 1);
  assert.equal((await m.increment(cle)).totalHits, 2);
  await m.decrement(cle);
  assert.equal((await m.increment(cle)).totalHits, 2);
  await m.resetKey(cle);
  assert.equal((await m.increment(cle)).totalHits, 1);
});

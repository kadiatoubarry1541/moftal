// Échanges : l'administrateur déplace une publication dans le bon secteur — base PostgreSQL de test.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

test('échanges : changer le secteur d’une publication (admin seulement)', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  const vendeur = { numeroH: 'TEST-ECH-VENDEUR', role: 'user' };
  let moi = vendeur;
  mock.module(new URL('../src/middleware/auth.js', import.meta.url).href, {
    namedExports: { authenticate: (req, _res, next) => { req.user = moi; req.userId = moi.numeroH; next(); } },
  });
  const { default: router } = await import('../src/routes/exchange.js');
  const { default: User } = await import('../src/models/User.js');
  const { default: ExchangeProduct } = await import('../src/models/ExchangeProduct.js');
  const { default: Supplier } = await import('../src/models/Supplier.js');
  const { sequelize } = await import('../src/config/database.js');
  await User.sync();
  await Supplier.sync();
  await ExchangeProduct.sync();

  await User.findOrCreate({
    where: { numeroH: vendeur.numeroH },
    defaults: { numeroH: vendeur.numeroH, password: 'x', prenom: 'Test', nomFamille: 'Vendeur', genre: 'AUTRE', generation: 'G1', type: 'vivant', role: 'user' },
  });
  const produit = await ExchangeProduct.create({
    title: 'Tenue scolaire', description: 'Kaki', category: 'primaire', price: 1000,
    numeroH: vendeur.numeroH, createdBy: vendeur.numeroH,
  });

  const app = express(); app.use(express.json()); app.use('/api/exchange', router);
  const serveur = app.listen(0);
  t.after(async () => {
    serveur.close();
    await sequelize.query("DELETE FROM exchange_products WHERE numero_h = 'TEST-ECH-VENDEUR'").catch(() => {});
    await sequelize.query("DELETE FROM users WHERE numero_h = 'TEST-ECH-VENDEUR'").catch(() => {});
    await sequelize.close();
  });
  const appel = async (corps, id = produit.id) => {
    const r = await fetch(`http://127.0.0.1:${serveur.address().port}/api/exchange/products/${id}/secteur`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps),
    });
    return { status: r.status, d: await r.json().catch(() => ({})) };
  };

  // Le vendeur lui-même ne peut pas déplacer
  assert.equal((await appel({ secteur: 'secondaire' })).status, 403);

  moi = { numeroH: 'TEST-ECH-ADMIN', role: 'admin' };
  assert.equal((await appel({ secteur: 'inconnu' })).status, 400);
  assert.equal((await appel({ secteur: 'secondaire' }, '00000000-0000-0000-0000-000000000000')).status, 404);

  const r = await appel({ secteur: 'Secondaire' });
  assert.equal(r.status, 200, r.d.message);
  await produit.reload();
  assert.equal(produit.category, 'secondaire', 'enregistré en base');
});

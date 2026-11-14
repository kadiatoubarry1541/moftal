// Échange : inscription fournisseur depuis n'importe quel secteur — base PostgreSQL de test.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

test('inscription fournisseur, tous secteurs', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  const nh = 'TEST-FOURN-MARIAMA';
  mock.module(new URL('../src/middleware/auth.js', import.meta.url).href, {
    namedExports: {
      authenticate: (req, _res, next) => { req.user = { numeroH: nh, role: 'user' }; next(); },
      requireAdmin: (_req, res) => res.status(403).end(),
      isProvisionalNumeroH: () => false,
      estAdminUtilisateur: () => false,
    },
  });
  const { default: router } = await import('../src/routes/exchange.js');
  const { default: User } = await import('../src/models/User.js');
  const { default: Supplier } = await import('../src/models/Supplier.js');
  const { sequelize } = await import('../src/config/database.js');
  await User.sync();
  await Supplier.sync();
  await User.findOrCreate({ where: { numeroH: nh }, defaults: { numeroH: nh, password: 'x', prenom: 'Mariama', nomFamille: 'Test', genre: 'FEMME', generation: 'G95', type: 'vivant' } });
  await Supplier.destroy({ where: { numeroH: nh } });

  const app = express(); app.use(express.json()); app.use('/api/exchange', router);
  const serveur = app.listen(0);
  t.after(async () => {
    serveur.close();
    await Supplier.destroy({ where: { numeroH: nh } });
    await User.destroy({ where: { numeroH: nh } });
    await sequelize.close();
  });
  const envoyer = async (corps) => {
    const r = await fetch(`http://127.0.0.1:${serveur.address().port}/api/exchange/suppliers`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps),
    });
    return { status: r.status, d: await r.json().catch(() => ({})) };
  };
  const demande = { businessName: 'Imprimerie Diallo', businessType: 'entreprise', categories: ['tertiaire'], contactInfo: { phone: '620000000' }, address: { city: 'Kindia' } };

  // Formulaire incomplet : refus clair (avant : erreur serveur)
  assert.equal((await envoyer({ ...demande, businessName: '' })).status, 400);
  assert.equal((await envoyer({ ...demande, businessType: 'autre' })).status, 400);
  assert.equal((await envoyer({ ...demande, categories: 'tertiaire' })).status, 400);

  // Depuis le Tertiaire (avant : « arrive bientôt ») : enregistré, en attente de validation
  const r = await envoyer(demande);
  assert.equal(r.status, 201, r.d.message);
  const enBase = await Supplier.findOne({ where: { numeroH: nh } });
  assert.equal(enBase.isApproved, false);
  assert.deepEqual(enBase.categories, ['tertiaire']);

  // Un seul compte fournisseur par personne
  assert.equal((await envoyer({ ...demande, categories: ['quaternaire'] })).status, 400);
});

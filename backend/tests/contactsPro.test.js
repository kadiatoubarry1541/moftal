// Contacts des professionnels : cachés au public (sauf urgences) — base PostgreSQL de test.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

test('contacts des pros : ni téléphone ni e-mail pour le public, sauf urgences', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  process.env.JWT_SECRET ||= 'secret-de-test-uniquement';
  const { default: router } = await import('../src/routes/professionals.js');
  const { default: ProfessionalAccount } = await import('../src/models/ProfessionalAccount.js');
  const { sequelize } = await import('../src/config/database.js');
  await ProfessionalAccount.sync();

  const commun = { status: 'approved', isActive: true, subscriptionStatus: 'active', ownerNumeroH: 'TEST-CONTACTS-PRO', phone: '620000001', email: 'pro@exemple.test' };
  const salon = await ProfessionalAccount.create({ ...commun, type: 'beauty', name: 'TEST Salon Contacts' });
  const clinique = await ProfessionalAccount.create({ ...commun, type: 'clinic', name: 'TEST Clinique Contacts', phone: '620000002' });

  const app = express(); app.use(express.json()); app.use('/api/professionals', router);
  const serveur = app.listen(0);
  t.after(async () => {
    serveur.close();
    await sequelize.query("DELETE FROM professional_accounts WHERE owner_numero_h = 'TEST-CONTACTS-PRO'").catch(() => {});
    await sequelize.close();
  });
  const lire = async (chemin) => {
    const r = await fetch(`http://127.0.0.1:${serveur.address().port}/api/professionals${chemin}`);
    return r.json();
  };

  // Salon de beauté : ni téléphone ni e-mail, partout
  let d = await lire('/approved?type=beauty');
  const s = d.accounts.find((a) => a.id === salon.id);
  assert.ok(s, 'le salon est listé');
  assert.equal(s.phone, undefined);
  assert.equal(s.email, undefined);
  d = await lire(`/detail/${salon.id}`);
  assert.equal(d.account.phone, undefined);
  assert.equal(d.account.email, undefined);
  d = await lire('/search?q=TEST%20Salon%20Contacts');
  assert.equal(d.accounts.find((a) => a.id === salon.id)?.phone, undefined);

  // Urgence (clinique) : le numéro reste visible, pas l'e-mail
  d = await lire(`/detail/${clinique.id}`);
  assert.equal(d.account.phone, '620000002');
  assert.equal(d.account.email, undefined);
});

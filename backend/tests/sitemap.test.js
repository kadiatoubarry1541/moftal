// Plan du site (sitemap.xml) — base PostgreSQL de test.
// Pages publiques + vitrine de chaque établissement visible ; jamais un
// établissement inactif, de démonstration ou en formule Visibilité + Rendez-vous.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

test('plan du site : pages publiques et vitrines visibles', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  const { default: router } = await import('../src/routes/sitemap.js');
  const { default: ProfessionalAccount } = await import('../src/models/ProfessionalAccount.js');
  const { default: Payment } = await import('../src/models/Payment.js');
  const { sequelize } = await import('../src/config/database.js');
  await ProfessionalAccount.sync({ alter: true });
  await Payment.sync();
  await sequelize.query(`CREATE TABLE IF NOT EXISTS management_tenants (
    tenant_code VARCHAR(80) PRIMARY KEY, type VARCHAR(40), name VARCHAR(200), is_active BOOLEAN DEFAULT true)`);

  const codes = { ecole: 'TSTSM-ECOLE', salon: 'TSTSM-SALON', rdv: 'TSTSM-RDV', inactif: 'TSTSM-OFF', demo: 'DEMO-REF-TSTSM' };
  const nettoyer = async () => {
    await sequelize.query('DELETE FROM management_tenants WHERE tenant_code IN (:c)', { replacements: { c: Object.values(codes) } });
    await sequelize.query("DELETE FROM professional_accounts WHERE owner_numero_h = 'TEST-SITEMAP'");
  };
  await nettoyer();
  const tenant = (code, type, actif = true) => sequelize.query(
    'INSERT INTO management_tenants (tenant_code, type, name, is_active) VALUES (:code, :type, :code, :actif)',
    { replacements: { code, type, actif } });
  await tenant(codes.ecole, 'school');
  await tenant(codes.salon, 'beauty');
  await tenant(codes.rdv, 'clinic');
  await tenant(codes.inactif, 'restaurant', false);
  await tenant(codes.demo, 'school');
  // Établissement en formule Visibilité + Rendez-vous : pas de site vitrine
  const rdv = await ProfessionalAccount.create({ type: 'clinic', name: 'Clinique RDV', ownerNumeroH: 'TEST-SITEMAP', status: 'approved', planType: 'visibility' });
  await sequelize.query('UPDATE professional_accounts SET tenant_code = :c WHERE id = :id', { replacements: { c: codes.rdv, id: rdv.id } });

  const app = express(); app.use('/api/sitemap.xml', router);
  const serveur = app.listen(0);
  t.after(async () => { serveur.close(); await nettoyer(); await sequelize.close(); });

  const r = await fetch(`http://127.0.0.1:${serveur.address().port}/api/sitemap.xml`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /xml/);
  const plan = await r.text();
  assert.match(plan, /^<\?xml/);
  assert.ok(plan.includes('<loc>https://moftal.com/</loc>'));
  assert.ok(plan.includes('<loc>https://moftal.com/conditions-utilisation</loc>'));
  assert.ok(plan.includes(`<loc>https://moftal.com/ecole/${codes.ecole}</loc>`));
  assert.ok(plan.includes(`<loc>https://moftal.com/beaute-vitrine/${codes.salon}</loc>`));
  assert.equal(plan.includes(codes.rdv), false, 'formule Rendez-vous : pas de vitrine');
  assert.equal(plan.includes(codes.inactif), false, 'établissement inactif absent');
  assert.equal(plan.includes(codes.demo), false, 'démonstration absente');
});

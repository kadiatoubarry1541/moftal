// Moftal Pay Pro pour tous les secteurs en formule Visibilité + Gestion Interne
// (jamais la formule Visibilité + Rendez-vous) — base PostgreSQL de test.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

test('Moftal Pay Pro : tous les secteurs en formule Gestion Interne', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  let moi = 'TEST-PAY-SALON';
  mock.module(new URL('../src/middleware/auth.js', import.meta.url).href, {
    namedExports: { authenticate: (req, _res, next) => { req.user = { numeroH: moi, prenom: 'A', nomFamille: 'B' }; next(); } },
  });
  const { default: moftalPay } = await import('../src/routes/MoftalPay.js');
  const { default: retraits } = await import('../src/routes/withdrawalRequests.js');
  const { default: ProfessionalAccount } = await import('../src/models/ProfessionalAccount.js');
  const { default: ProfessionalWallet } = await import('../src/models/ProfessionalWallet.js');
  const { default: ProWithdrawalRequest } = await import('../src/models/ProWithdrawalRequest.js');
  const { sequelize } = await import('../src/config/database.js');
  await ProfessionalAccount.sync({ alter: true });
  await ProfessionalWallet.sync();
  await ProWithdrawalRequest.sync();

  const proprietaires = ['TEST-PAY-SALON', 'TEST-PAY-RDV', 'TEST-PAY-JEUNE'];
  const nettoyer = async () => {
    const ids = (await ProfessionalAccount.findAll({ where: { ownerNumeroH: proprietaires } })).map((p) => p.id);
    await ProWithdrawalRequest.destroy({ where: { proAccountId: ids } });
    await ProfessionalWallet.destroy({ where: { proAccountId: ids } });
    await ProfessionalAccount.destroy({ where: { id: ids } });
  };
  await nettoyer();

  const app = express(); app.use(express.json());
  app.use('/api/moftal-pay', moftalPay); app.use('/api/withdrawal-requests', retraits);
  const serveur = app.listen(0);
  t.after(async () => { serveur.close(); await nettoyer(); await sequelize.close(); });
  const appel = async (methode, chemin, corps) => {
    const r = await fetch(`http://127.0.0.1:${serveur.address().port}/api${chemin}`, {
      method: methode, headers: { 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined,
    });
    return { status: r.status, d: await r.json().catch(() => ({})) };
  };

  const ilYaDeuxAns = new Date(Date.now() - 2 * 365 * 24 * 3600 * 1000);
  const creer = (ownerNumeroH, planType) => ProfessionalAccount.create({
    type: 'beauty', name: `Salon ${ownerNumeroH}`, ownerNumeroH, status: 'approved', isActive: true, planType,
  });
  const salon = await creer('TEST-PAY-SALON', 'full');
  const salonRdv = await creer('TEST-PAY-RDV', 'visibility');
  const salonJeune = await creer('TEST-PAY-JEUNE', 'full');
  await sequelize.query('UPDATE professional_accounts SET created_at = :d WHERE id IN (:ids)',
    { replacements: { d: ilYaDeuxAns, ids: [salon.id, salonRdv.id] } });

  // Salon de beauté, formule Gestion Interne : Moftal Pay Pro ouvert (avant : « Bientôt disponible »)
  moi = 'TEST-PAY-SALON';
  let r = await appel('GET', '/moftal-pay/mon-moftal-pay-pro');
  assert.equal(r.status, 200, r.d.message);
  assert.equal(r.d.comptePro.typePro, 'beauty');

  // Retrait : la règle « cliniques uniquement » ne bloque plus ; les autres règles restent
  r = await appel('POST', '/withdrawal-requests', { proAccountId: salon.id, montant: 1_000_000 });
  assert.equal(r.status, 400);
  assert.match(r.d.message, /Solde insuffisant/);
  await ProfessionalWallet.update({ solde: 2_000_000 }, { where: { proAccountId: salon.id } });
  r = await appel('POST', '/withdrawal-requests', { proAccountId: salon.id, montant: 1_000_000 });
  assert.equal(r.status, 200, r.d.message);

  // Formule Visibilité + Rendez-vous : pas de Moftal Pay, pas de retrait
  moi = 'TEST-PAY-RDV';
  r = await appel('GET', '/moftal-pay/mon-moftal-pay-pro');
  assert.equal(r.status, 403);
  assert.equal(r.d.restricted, true);
  assert.match(r.d.message, /Gestion Interne/);
  r = await appel('POST', '/withdrawal-requests', { proAccountId: salonRdv.id, montant: 1_000_000 });
  assert.equal(r.status, 403);

  // Établissement de moins d'un an : retrait toujours refusé
  moi = 'TEST-PAY-JEUNE';
  r = await appel('POST', '/withdrawal-requests', { proAccountId: salonJeune.id, montant: 1_000_000 });
  assert.equal(r.status, 403);
  assert.match(r.d.message, /1 an/);
});

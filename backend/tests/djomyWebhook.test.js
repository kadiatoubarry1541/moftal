// Paiements Djomy : la notification de paiement (webhook) — base PostgreSQL de test.
// Ce qui ne doit JAMAIS arriver : créditer sans signature valide, créditer deux
// fois le même paiement, ou créditer un montant payé inférieur au montant dû.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';

test('notification de paiement Djomy', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  process.env.DJOMY_CLIENT_ID = 'client-test';
  process.env.DJOMY_CLIENT_SECRET = 'secret-test';

  const debloques = [];
  mock.module(new URL('../src/routes/payment.js', import.meta.url).href, {
    namedExports: {
      computeAmountForPurpose: async () => 1000,
      debloquerPaiement: async (p) => { debloques.push(p.txRef); },
    },
  });
  mock.module(new URL('../src/middleware/auth.js', import.meta.url).href, {
    namedExports: { authenticate: (req, _res, next) => { req.user = { numeroH: 'TEST-DJOMY' }; next(); } },
  });

  const { default: router } = await import('../src/routes/djomyPayment.js');
  const { default: Payment } = await import('../src/models/Payment.js');
  const { sequelize } = await import('../src/config/database.js');
  await Payment.sync();
  await Payment.destroy({ where: { payerNumeroH: 'TEST-DJOMY' } });

  // Comme server.js : le texte exact reçu est gardé pour vérifier la signature
  const app = express();
  app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf.toString('utf8'); } }));
  app.use('/api/djomy', router);
  const serveur = app.listen(0);
  t.after(async () => {
    serveur.close();
    await Payment.destroy({ where: { payerNumeroH: 'TEST-DJOMY' } });
    await sequelize.close();
  });

  const signer = (corps) => `v1:${crypto.createHmac('sha256', 'secret-test').update(corps).digest('hex')}`;
  const envoyer = async (evenement, signature) => {
    const corps = JSON.stringify(evenement);
    const r = await fetch(`http://127.0.0.1:${serveur.address().port}/api/djomy/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature ?? signer(corps) },
      body: corps,
    });
    return r.status;
  };
  const statut = async (txRef) => (await Payment.findOne({ where: { txRef } })).status;

  await Payment.create({ txRef: 'TX-A', gatewayRef: 'DJ-A', payerNumeroH: 'TEST-DJOMY', amount: 1000, purpose: 'subscription_pro' });
  await Payment.create({ txRef: 'TX-B', gatewayRef: 'DJ-B', payerNumeroH: 'TEST-DJOMY', amount: 1000, purpose: 'subscription_pro' });
  const succes = (transactionId, paidAmount) => ({
    eventType: 'payment.success',
    data: { transactionId, paidAmount, currency: 'GNF', paymentMethod: 'OM' },
  });

  // 1. Fausse notification (mauvaise signature / sans signature) : refusée, rien de crédité
  assert.equal(await envoyer(succes('DJ-A', 1000), 'v1:fausse'), 400);
  assert.equal(await envoyer(succes('DJ-A', 1000), ''), 400);
  assert.equal(await statut('TX-A'), 'pending');
  assert.deepEqual(debloques, []);

  // 2. Montant payé insuffisant : rien de crédité
  assert.equal(await envoyer(succes('DJ-B', 500)), 200);
  assert.equal(await statut('TX-B'), 'pending');
  assert.deepEqual(debloques, []);

  // 3. Vraie notification : crédité une fois
  assert.equal(await envoyer(succes('DJ-A', 1000)), 200);
  assert.equal(await statut('TX-A'), 'completed');
  assert.deepEqual(debloques, ['TX-A']);

  // 4. Même notification renvoyée (Djomy réessaie) : jamais crédité deux fois
  assert.equal(await envoyer(succes('DJ-A', 1000)), 200);
  await Promise.all([envoyer(succes('DJ-A', 1000)), envoyer(succes('DJ-A', 1000))]);
  assert.deepEqual(debloques, ['TX-A']);

  // 5. Arrivées simultanées sur un paiement neuf : un seul crédit
  await Promise.all([envoyer(succes('DJ-B', 1000)), envoyer(succes('DJ-B', 1000)), envoyer(succes('DJ-B', 1000))]);
  assert.deepEqual(debloques, ['TX-A', 'TX-B']);

  // 6. Paiement inconnu : réponse normale, rien de crédité
  assert.equal(await envoyer(succes('DJ-INCONNU', 1000)), 200);
  assert.deepEqual(debloques, ['TX-A', 'TX-B']);

  // 7. Paiement refusé : marqué « échoué » (plus « en attente » pour toujours)
  const echec = (transactionId) => ({ eventType: 'payment.failed', data: { transactionId } });
  await Payment.create({ txRef: 'TX-C', gatewayRef: 'DJ-C', payerNumeroH: 'TEST-DJOMY', amount: 1000, purpose: 'subscription_pro' });
  assert.equal(await envoyer(echec('DJ-C'), 'v1:fausse'), 400);
  assert.equal(await statut('TX-C'), 'pending', 'une fausse notification ne change rien');
  assert.equal(await envoyer(echec('DJ-C')), 200);
  assert.equal(await statut('TX-C'), 'failed');

  // 8. Un paiement réussi n'est jamais redescendu en « échoué »
  assert.equal(await envoyer(echec('DJ-A')), 200);
  assert.equal(await statut('TX-A'), 'completed');
  assert.deepEqual(debloques, ['TX-A', 'TX-B']);
});

// Coût Neon : la vérification des abonnements, lancée toutes les heures, ne
// doit interroger (donc réveiller) la base qu'une fois par jour.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

test('vérification des abonnements : la base n’est réveillée qu’une fois par jour', async () => {
  let requetes = 0;
  const faux = { query: async () => { requetes++; return [[]]; } };
  mock.module(new URL('../src/config/database.js', import.meta.url).href, { namedExports: { sequelize: faux }, defaultExport: faux });
  for (const m of ['../src/models/ProfessionalAccount.js', '../src/models/User.js']) {
    mock.module(new URL(m, import.meta.url).href, { defaultExport: { findAll: async () => [] } });
  }
  mock.module(new URL('../src/middleware/gestionAccessGuard.js', import.meta.url).href, { namedExports: { GRACE_MOIS_VISIBILITE: 3 } });

  const { runSubscriptionCheck } = await import('../src/services/subscriptionChecker.js');
  await runSubscriptionCheck(); // au démarrage : la base est consultée (registre du jour)
  const apresPremiere = requetes;
  assert.ok(apresPremiere > 0);

  // Les 23 passages horaires suivants du même jour : aucune requête
  for (let h = 0; h < 23; h++) await runSubscriptionCheck();
  assert.equal(requetes, apresPremiere, 'aucun réveil de la base dans la journée');
});

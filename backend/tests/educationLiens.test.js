// « Mes formations », « Mes demandes » et statistiques : les liens entre modèles fonctionnent.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';

test('formations et professeurs liés', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  mock.module(new URL('../src/middleware/auth.js', import.meta.url).href, {
    namedExports: { authenticate: (_q, _r, n) => n(), requireAdmin: (_q, _r, n) => n() },
  });
  await import('../src/routes/education.js'); // déclare les liens
  const { default: Formation } = await import('../src/models/Formation.js');
  const { default: FormationRegistration } = await import('../src/models/FormationRegistration.js');
  const { default: Professor } = await import('../src/models/Professor.js');
  const { default: ProfessorRequest } = await import('../src/models/ProfessorRequest.js');
  const { sequelize } = await import('../src/config/database.js');
  t.after(() => sequelize.close());
  const { default: User } = await import('../src/models/User.js');
  for (const m of [User, Formation, FormationRegistration, Professor, ProfessorRequest]) await m.sync();
  assert.ok(Array.isArray(await FormationRegistration.getUserRegistrations('PERSONNE')));
  assert.ok(Array.isArray(await ProfessorRequest.getUserRequests('PERSONNE')));
  assert.ok(Array.isArray(await Formation.getFormationStats()));
  assert.ok(Array.isArray(await Professor.getProfessorStats()));
});

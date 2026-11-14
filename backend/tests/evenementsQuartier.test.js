// Événements du quartier : « Je participe », enregistré en base — base PostgreSQL de test.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

test('événements du quartier : je participe', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  let moi = 'TEST-QRT-AMINATA';
  mock.module(new URL('../src/middleware/auth.js', import.meta.url).href, {
    namedExports: {
      authenticate: (req, _res, next) => { req.user = { numeroH: moi, role: 'user' }; next(); },
      requireAdmin: (_req, res) => res.status(403).end(),
      isProvisionalNumeroH: () => false,
    },
  });
  const { default: router } = await import('../src/routes/residences.js');
  const { default: ResidenceGroup } = await import('../src/models/ResidenceGroup.js');
  const { default: ResidenceMessage } = await import('../src/models/ResidenceMessage.js');
  const { sequelize } = await import('../src/config/database.js');
  const { default: User } = await import('../src/models/User.js');
  await User.sync();
  await ResidenceGroup.sync();
  await ResidenceMessage.sync();
  const habitants = ['TEST-QRT-AMINATA', 'TEST-QRT-IBRAHIMA'];
  for (const numeroH of habitants) {
    await User.findOrCreate({ where: { numeroH }, defaults: {
      numeroH, password: 'x', prenom: numeroH.split('-').pop(), nomFamille: 'Test', genre: 'AUTRE', generation: 'G95', type: 'vivant',
    } });
  }

  const groupe = await ResidenceGroup.create({
    location: `test-quartier-${Date.now()}`, title: 'Quartier test', description: 'test',
    admin: 'TEST-QRT-AMINATA', members: ['TEST-QRT-AMINATA', 'TEST-QRT-IBRAHIMA'], createdBy: 'TEST-QRT-AMINATA',
  });
  const fete = await ResidenceMessage.create({ groupId: groupe.id, numeroH: 'TEST-QRT-AMINATA', messageType: 'text', category: 'fete', content: 'Fête du quartier samedi' });
  const info = await ResidenceMessage.create({ groupId: groupe.id, numeroH: 'TEST-QRT-AMINATA', messageType: 'text', category: 'information', content: 'Coupure d’eau' });

  const app = express(); app.use(express.json()); app.use('/api/residences', router);
  const serveur = app.listen(0);
  t.after(async () => {
    serveur.close();
    await sequelize.query('DELETE FROM residence_participations WHERE message_id IN (:ids)', { replacements: { ids: [fete.id, info.id] } }).catch(() => {});
    await ResidenceMessage.destroy({ where: { groupId: groupe.id } });
    await groupe.destroy();
    await User.destroy({ where: { numeroH: habitants } });
    await sequelize.close();
  });
  const appel = async (methode, chemin, corps) => {
    const r = await fetch(`http://127.0.0.1:${serveur.address().port}/api/residences${chemin}`, {
      method: methode, headers: { 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined,
    });
    return { status: r.status, d: await r.json().catch(() => ({})) };
  };
  const lire = async () => {
    const r = await appel('GET', `/groups/${groupe.id}/messages`);
    return Object.fromEntries(r.d.messages.map((m) => [m.id, m]));
  };

  // Un événement montre ses participants ; une information, non
  let m = await lire();
  assert.equal(m[fete.id].evenement, true);
  assert.equal(m[fete.id].participants, 0);
  assert.equal(m[info.id].evenement, undefined);

  // Deux habitants participent (cliquer deux fois ne compte qu'une fois)
  assert.equal((await appel('POST', `/messages/${fete.id}/participation`, { participer: true })).d.participants, 1);
  assert.equal((await appel('POST', `/messages/${fete.id}/participation`, { participer: true })).d.participants, 1);
  moi = 'TEST-QRT-IBRAHIMA';
  let r = await appel('POST', `/messages/${fete.id}/participation`, { participer: true });
  assert.deepEqual([r.d.participants, r.d.jeParticipe], [2, true]);

  // Enregistré en base : relu par chacun avec « je participe » à jour
  m = await lire();
  assert.deepEqual([m[fete.id].participants, m[fete.id].jeParticipe], [2, true]);

  // Se désister
  r = await appel('POST', `/messages/${fete.id}/participation`, { participer: false });
  assert.deepEqual([r.d.participants, r.d.jeParticipe], [1, false]);

  // Refus : pas un événement, pas habitant du quartier, message inconnu
  assert.equal((await appel('POST', `/messages/${info.id}/participation`, { participer: true })).status, 400);
  moi = 'TEST-QRT-ETRANGER';
  assert.equal((await appel('POST', `/messages/${fete.id}/participation`, { participer: true })).status, 403);
  assert.equal((await appel('POST', '/messages/00000000-0000-0000-0000-000000000000/participation', { participer: true })).status, 404);
  moi = 'TEST-QRT-AMINATA';
  assert.equal((await lire())[fete.id].participants, 1, 'rien n’a changé');
});

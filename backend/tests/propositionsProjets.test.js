// Développement : proposer un projet, examen par l'administrateur — base PostgreSQL de test.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

test('propositions de projets : envoi, examen, publication', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  let moi = { numeroH: 'TEST-DEV-FATOU', prenom: 'Fatou', nomFamille: 'Camara', role: 'user' };
  const notifications = [];
  mock.module(new URL('../src/middleware/auth.js', import.meta.url).href, {
    namedExports: {
      authenticate: (req, _res, next) => { req.user = moi; next(); },
      estAdminUtilisateur: (u) => u?.role === 'admin',
    },
  });
  mock.module(new URL('../src/utils/notifier.js', import.meta.url).href, {
    namedExports: { notifier: async (...a) => { notifications.push(a); } },
  });
  const { default: router } = await import('../src/routes/developpement.js');
  const { sequelize } = await import('../src/config/database.js');

  const app = express(); app.use(express.json()); app.use('/api/developpement', router);
  const serveur = app.listen(0);
  t.after(async () => {
    serveur.close();
    await sequelize.query("DELETE FROM dev_propositions WHERE auteur_numero_h LIKE 'TEST-DEV-%'").catch(() => {});
    await sequelize.close();
  });
  const appel = async (methode, chemin, corps) => {
    const r = await fetch(`http://127.0.0.1:${serveur.address().port}/api/developpement${chemin}`, {
      method: methode, headers: { 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined,
    });
    return { status: r.status, d: await r.json().catch(() => ({})) };
  };
  const projet = { domaine: 'infrastructure', titre: 'Un forage pour le quartier', description: 'Le quartier manque d’eau potable : un forage solaire au marché.', lieu: 'Ratoma' };

  // Refus : domaine inconnu, titre ou description trop courts
  assert.equal((await appel('POST', '/propositions', { ...projet, domaine: 'inconnu' })).status, 400);
  assert.equal((await appel('POST', '/propositions', { ...projet, titre: 'Eau' })).status, 400);
  assert.equal((await appel('POST', '/propositions', { ...projet, description: 'Trop court' })).status, 400);

  // Envoi : enregistré « en attente », visible par son auteur seulement
  let r = await appel('POST', '/propositions', projet);
  assert.equal(r.status, 201, r.d.message);
  const id = r.d.proposition.id;
  assert.equal(r.d.proposition.statut, 'en_attente');
  r = await appel('GET', '/propositions?domaine=infrastructure');
  assert.equal(r.d.projets.some((p) => p.id === id), false, 'pas publié avant examen');
  assert.equal(r.d.mesPropositions.find((p) => p.id === id)?.statut, 'en_attente');

  // Seul l'administrateur examine
  assert.equal((await appel('GET', '/propositions/a-examiner')).status, 403);
  assert.equal((await appel('PATCH', `/propositions/${id}/decision`, { decision: 'approuve' })).status, 403);

  const fatou = moi;
  moi = { numeroH: 'TEST-DEV-ADMIN', role: 'admin' };
  r = await appel('GET', '/propositions/a-examiner');
  assert.ok(r.d.propositions.some((p) => p.id === id));
  assert.equal((await appel('PATCH', `/propositions/${id}/decision`, { decision: 'refuse' })).status, 400, 'motif obligatoire');
  r = await appel('PATCH', `/propositions/${id}/decision`, { decision: 'approuve' });
  assert.equal(r.status, 200);
  assert.equal((await appel('PATCH', `/propositions/${id}/decision`, { decision: 'approuve' })).status, 409, 'déjà traitée');
  assert.equal(notifications.at(-1)[0], 'TEST-DEV-FATOU', 'l’auteur est prévenu');

  // Publié : visible par tous, compté « en cours »
  moi = { numeroH: 'TEST-DEV-AUTRE', role: 'user' };
  r = await appel('GET', '/propositions?domaine=infrastructure');
  assert.equal(r.d.projets.find((p) => p.id === id)?.statut, 'approuve');
  assert.ok(r.d.stats.enCours >= 1);

  // Refus avec motif, montré à l'auteur
  moi = fatou;
  const id2 = (await appel('POST', '/propositions', { ...projet, titre: 'Une deuxième idée de projet' })).d.proposition.id;
  moi = { numeroH: 'TEST-DEV-ADMIN', role: 'admin' };
  assert.equal((await appel('PATCH', `/propositions/${id2}/decision`, { decision: 'refuse', motif: 'Déjà prévu par la mairie.' })).status, 200);
  moi = fatou;
  r = await appel('GET', '/propositions');
  assert.equal(r.d.mesPropositions.find((p) => p.id === id2)?.motifRefus, 'Déjà prévu par la mairie.');
  assert.equal(r.d.projets.some((p) => p.id === id2), false, 'un refus n’est jamais publié');

  // Pas plus de 5 propositions en attente à la fois
  for (let i = 0; i < 5; i++) await appel('POST', '/propositions', { ...projet, titre: `Idée numéro ${i + 1} pour le quartier` });
  assert.equal((await appel('POST', '/propositions', { ...projet, titre: 'Une idée de trop pour le quartier' })).status, 429);
});

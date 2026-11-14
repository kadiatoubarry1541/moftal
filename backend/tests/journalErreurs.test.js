// Journal des erreurs (site et serveur), enregistré en base — base PostgreSQL de test.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

test('journal des erreurs : enregistrement, regroupement, alerte, résolution', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  let estAdmin = false;
  const alertes = [];
  mock.module(new URL('../src/middleware/auth.js', import.meta.url).href, {
    namedExports: {
      MASTER_ADMIN_NUMEROS: ['ADMIN-TEST 1'],
      authenticate: (req, _res, next) => { req.user = { numeroH: estAdmin ? 'ADMIN-TEST 1' : 'TEST-ERR-USER' }; next(); },
      requireAdmin: (_req, res, next) => (estAdmin ? next() : res.status(403).json({ success: false })),
    },
  });
  mock.module(new URL('../src/utils/notifier.js', import.meta.url).href, {
    namedExports: { notifier: async (...a) => { alertes.push(a); } },
  });
  const { default: router } = await import('../src/routes/erreurs.js');
  const { enregistrerErreur } = await import('../src/services/journalErreurs.js');
  const { erreursDonnees, surPanneServeur } = await import('../src/middleware/erreursDonnees.js');
  const { sequelize } = await import('../src/config/database.js');

  const marque = `test-${Date.now()}`;
  const app = express();
  app.use(express.json());
  app.use(erreursDonnees);
  surPanneServeur(enregistrerErreur);
  app.use('/api/erreurs', router);
  // Route qui tombe en panne, comme une vraie route en erreur
  app.get('/api/panne/:id', (_req, res) => res.status(500).json({ success: false, message: `relation "table_${marque}" does not exist` }));
  const serveur = app.listen(0);
  t.after(async () => {
    serveur.close();
    await sequelize.query('DELETE FROM erreurs_signalees WHERE message LIKE :m', { replacements: { m: `%${marque}%` } });
    await sequelize.close();
  });
  const appel = async (methode, chemin, corps) => {
    const r = await fetch(`http://127.0.0.1:${serveur.address().port}${chemin}`, {
      method: methode, headers: { 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined,
    });
    return { status: r.status, d: await r.json().catch(() => ({})) };
  };
  const mesLignes = async () => sequelize.query(
    'SELECT * FROM erreurs_signalees WHERE message LIKE :m ORDER BY origine', { replacements: { m: `%${marque}%` }, type: 'SELECT' });

  // Le site signale une erreur deux fois : une seule ligne, comptée 2 fois, une seule alerte
  const erreurSite = { message: `Cannot read properties of undefined ${marque}`, pile: 'TypeError\n    at Page (page.tsx:10:5)', adresse: '/services' };
  assert.equal((await appel('POST', '/api/erreurs', erreurSite)).status, 201);
  assert.equal((await appel('POST', '/api/erreurs', erreurSite)).status, 201);
  assert.equal((await appel('POST', '/api/erreurs', { message: '' })).status, 400);

  // Une route en panne (500) est enregistrée avec son vrai message ; l'utilisateur lit « Erreur serveur »
  let r = await appel('GET', '/api/panne/11111111-2222-3333-4444-555555555555');
  assert.equal(r.d.message, 'Erreur serveur');
  await appel('GET', '/api/panne/99999999-2222-3333-4444-555555555555');
  await new Promise((ok) => setTimeout(ok, 300));

  const lignes = await mesLignes();
  assert.deepEqual(lignes.map((l) => [l.origine, l.occurrences]), [['serveur', 2], ['site', 2]], 'regroupées par erreur');
  assert.match(lignes[0].adresse, /^GET \/api\/panne\//);
  assert.equal(alertes.filter((a) => String(a[2]).includes(marque)).length, 2, 'une alerte par nouvelle erreur, pas par répétition');

  // Seul l'admin voit le journal et marque une erreur résolue
  assert.equal((await appel('GET', '/api/erreurs/admin')).status, 403);
  estAdmin = true;
  r = await appel('GET', '/api/erreurs/admin');
  assert.ok(r.d.erreurs.some((e) => e.id === lignes[1].id));
  assert.equal((await appel('PATCH', `/api/erreurs/admin/${lignes[1].id}`, { resolue: true })).status, 200);
  r = await appel('GET', '/api/erreurs/admin');
  assert.equal(r.d.erreurs.some((e) => e.id === lignes[1].id), false, 'une erreur résolue quitte la liste');

  // Si elle revient, elle réapparaît
  await appel('POST', '/api/erreurs', { ...erreurSite, message: `${erreurSite.message} ` });
  await enregistrerErreur({ origine: 'site', message: erreurSite.message, adresse: '/services', pile: erreurSite.pile });
  r = await appel('GET', '/api/erreurs/admin');
  assert.ok(r.d.erreurs.some((e) => e.id === lignes[1].id), 'une erreur qui revient est de nouveau à traiter');
});

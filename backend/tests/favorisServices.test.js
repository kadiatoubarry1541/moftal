// Favoris de la page Services enregistrés en base — base PostgreSQL de test.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

test('favoris des Services enregistrés en base', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  process.env.JWT_SECRET ||= 'secret-de-test-uniquement';
  const { default: router } = await import('../src/routes/auth.js');
  const { default: User } = await import('../src/models/User.js');
  const { sequelize } = await import('../src/config/database.js');
  await User.sync();

  const tel = `65${String(Date.now()).slice(-7)}`;
  const app = express(); app.use(express.json()); app.use('/api/auth', router);
  const serveur = app.listen(0);
  t.after(async () => {
    serveur.close();
    await sequelize.query('DELETE FROM users WHERE tel1 = :tel', { replacements: { tel } });
    await sequelize.close();
  });
  const appel = async (methode, chemin, { jeton, corps } = {}) => {
    const r = await fetch(`http://127.0.0.1:${serveur.address().port}/api/auth${chemin}`, {
      method: methode,
      headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
      body: corps ? JSON.stringify(corps) : undefined,
    });
    return { status: r.status, d: await r.json().catch(() => ({})) };
  };

  const jeton = (await appel('POST', '/register-quick', { corps: { telephone: tel, password: 'motdepasse1' } })).d.token;

  // Jamais enregistrés : null (le téléphone peut envoyer ceux qu'il gardait)
  let r = await appel('GET', '/me/favoris-services', { jeton });
  assert.equal(r.status, 200);
  assert.equal(r.d.favoris, null);

  // Enregistrés en base, relus depuis un autre appareil (autre connexion)
  r = await appel('PUT', '/me/favoris-services', { jeton, corps: { favoris: ['/sante', '/education', '/sante'] } });
  assert.equal(r.status, 200);
  const autreAppareil = (await appel('POST', '/login', { corps: { numeroH: tel, password: 'motdepasse1' } })).d.token;
  r = await appel('GET', '/me/favoris-services', { jeton: autreAppareil });
  assert.deepEqual(r.d.favoris, ['/sante', '/education'], 'sans doublon, sur tous les appareils');

  // Vider ses favoris : liste vide (pas null)
  assert.equal((await appel('PUT', '/me/favoris-services', { jeton, corps: { favoris: [] } })).status, 200);
  assert.deepEqual((await appel('GET', '/me/favoris-services', { jeton })).d.favoris, []);

  // Refus : plus de 4, valeur invalide, sans connexion
  assert.equal((await appel('PUT', '/me/favoris-services', { jeton, corps: { favoris: ['/a', '/b', '/c', '/d', '/e'] } })).status, 400);
  assert.equal((await appel('PUT', '/me/favoris-services', { jeton, corps: { favoris: ['javascript:alert(1)'] } })).status, 400);
  assert.equal((await appel('PUT', '/me/favoris-services', { jeton, corps: { favoris: 'sante' } })).status, 400);
  assert.equal((await appel('GET', '/me/favoris-services')).status, 401);
  assert.deepEqual((await appel('GET', '/me/favoris-services', { jeton })).d.favoris, [], 'rien n’a changé');
});

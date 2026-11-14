// Appareils connectés et déconnexion à distance — base PostgreSQL de test.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A146B) AppleWebKit/537.36 Mobile Safari/537.36';
const PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

test('appareils connectés et déconnexion à distance', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  process.env.JWT_SECRET ||= 'secret-de-test-uniquement';
  const { default: router } = await import('../src/routes/auth.js');
  const { default: User } = await import('../src/models/User.js');
  const { sequelize } = await import('../src/config/database.js');
  const { config } = await import('../config.js');
  await User.sync();
  await sequelize.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS sessions_valides_depuis TIMESTAMPTZ');

  const tel = `66${String(Date.now()).slice(-7)}`;
  const app = express(); app.use(express.json()); app.use('/api/auth', router);
  const serveur = app.listen(0);
  let numeroH;
  t.after(async () => {
    serveur.close();
    await sequelize.query('DELETE FROM sessions_appareils WHERE numero_h = :n', { replacements: { n: numeroH } }).catch(() => {});
    await sequelize.query('DELETE FROM users WHERE tel1 = :tel', { replacements: { tel } });
    await sequelize.close();
  });
  const appel = async (methode, chemin, { jeton, corps, agent = PC } = {}) => {
    const r = await fetch(`http://127.0.0.1:${serveur.address().port}/api/auth${chemin}`, {
      method: methode,
      headers: {
        'Content-Type': 'application/json', 'User-Agent': agent,
        ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
      },
      body: corps ? JSON.stringify(corps) : undefined,
    });
    return { status: r.status, d: await r.json().catch(() => ({})) };
  };
  const connexion = async (agent) => (await appel('POST', '/login', { corps: { numeroH: tel, password: 'motdepasse1' }, agent })).d.token;

  // Inscription sur un ordinateur, puis connexion sur un iPhone et un Android
  let r = await appel('POST', '/register-quick', { corps: { telephone: tel, password: 'motdepasse1' } });
  assert.equal(r.status, 201, r.d.message);
  numeroH = r.d.user.numeroH;
  const pc = r.d.token;
  const iphone = await connexion(IPHONE);
  const android = await connexion(ANDROID);

  // La liste montre les 3 appareils, celui qui demande est « actuel »
  r = await appel('GET', '/sessions', { jeton: iphone });
  assert.equal(r.status, 200);
  assert.deepEqual(r.d.sessions.map((s) => s.appareil).sort(), ['Ordinateur Windows', 'Téléphone Android', 'iPhone']);
  assert.equal(r.d.sessions.find((s) => s.actuel)?.appareil, 'iPhone');
  const idAndroid = r.d.sessions.find((s) => s.appareil === 'Téléphone Android').id;

  // Déconnecter l'Android depuis l'iPhone : l'Android est refusé tout de suite
  assert.equal((await appel('GET', '/me', { jeton: android })).status, 200);
  r = await appel('DELETE', `/sessions/${idAndroid}`, { jeton: iphone });
  assert.equal(r.status, 200);
  r = await appel('GET', '/me', { jeton: android });
  assert.equal(r.status, 401);
  assert.equal(r.d.expired, true);
  assert.equal((await appel('GET', '/me', { jeton: iphone })).status, 200, 'l’iPhone reste connecté');

  // Personne ne peut déconnecter l'appareil d'un autre compte
  const { ouvrirSession } = await import('../src/services/sessionsAppareils.js');
  const autre = jwt.decode(await ouvrirSession({ headers: {} }, 'AUTRE-COMPTE-TEST')).sid;
  assert.equal((await appel('DELETE', `/sessions/${autre}`, { jeton: iphone })).status, 404);
  await sequelize.query('DELETE FROM sessions_appareils WHERE id = :autre', { replacements: { autre } });

  // Ancienne connexion (jeton d'avant la liste des appareils) : acceptée, puis
  // inscrite dans la liste à la visite suivante
  const ancien = jwt.sign({ userId: numeroH, numeroH, iat: Math.floor(Date.now() / 1000) - 60 }, config.JWT_SECRET);
  r = await appel('GET', '/me', { jeton: ancien, agent: ANDROID });
  assert.equal(r.status, 200);
  assert.ok(jwt.decode(r.d.token).sid, 'jeton renouvelé avec une session');

  // « Déconnecter tous les autres » depuis l'ordinateur
  r = await appel('POST', '/sessions/deconnecter-autres', { jeton: pc });
  assert.equal(r.status, 200);
  const pcNeuf = r.d.token;
  assert.equal((await appel('GET', '/me', { jeton: iphone })).status, 401);
  assert.equal((await appel('GET', '/me', { jeton: ancien })).status, 401, 'les anciennes connexions aussi');
  assert.equal((await appel('GET', '/me', { jeton: pcNeuf })).status, 200, 'cet appareil reste connecté');
  r = await appel('GET', '/sessions', { jeton: pcNeuf });
  assert.deepEqual(r.d.sessions.map((s) => s.appareil), ['Ordinateur Windows']);

  // Changer le mot de passe : les autres appareils sont déconnectés, pas celui-ci
  const iphone2 = await connexion(IPHONE);
  r = await appel('PUT', '/change-password', { jeton: pcNeuf, corps: { currentPassword: 'motdepasse1', newPassword: 'motdepasse2' } });
  assert.equal(r.status, 200, r.d.message);
  assert.equal((await appel('GET', '/me', { jeton: iphone2 })).status, 401);
  const pcApres = r.d.token;
  assert.equal((await appel('GET', '/me', { jeton: pcApres })).status, 200);

  // Se déconnecter ferme la session de cet appareil
  assert.equal((await appel('POST', '/logout', { jeton: pcApres })).status, 200);
  assert.equal((await appel('GET', '/me', { jeton: pcApres })).status, 401);
  r = await appel('GET', '/sessions', { jeton: await connexionMdp2() });
  assert.equal(r.d.sessions.length, 1, 'seule la nouvelle connexion reste');

  async function connexionMdp2() {
    return (await appel('POST', '/login', { corps: { numeroH: tel, password: 'motdepasse2' } })).d.token;
  }
});

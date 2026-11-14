// Inscription rapide (téléphone + mot de passe) et connexion — base PostgreSQL de test.
// Un compte créé est un vrai compte en base (NuméroH provisoire TMP-…), son mot
// de passe n'est jamais renvoyé ni gardé en clair, et un mauvais mot de passe
// n'ouvre jamais la session.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';

test('inscription rapide et connexion', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  process.env.JWT_SECRET ||= 'secret-de-test-uniquement';
  const { default: router } = await import('../src/routes/auth.js');
  const { default: User } = await import('../src/models/User.js');
  const { sequelize } = await import('../src/config/database.js');
  await User.sync();

  const tel = `62${String(Date.now()).slice(-7)}`;
  const email = `test-${Date.now()}@exemple.org`;
  const nettoyer = () => sequelize.query(
    'DELETE FROM users WHERE tel1 = :tel OR email = :email', { replacements: { tel, email } });
  await nettoyer();

  const app = express(); app.use(express.json()); app.use('/api/auth', router);
  const serveur = app.listen(0);
  t.after(async () => { serveur.close(); await nettoyer(); await sequelize.close(); });
  const appel = async (chemin, corps) => {
    const r = await fetch(`http://127.0.0.1:${serveur.address().port}/api/auth${chemin}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps),
    });
    return { status: r.status, d: await r.json() };
  };

  // Inscription : vrai compte en base, NuméroH provisoire, jamais de mot de passe renvoyé
  let r = await appel('/register-quick', { telephone: tel, password: 'motdepasse1' });
  assert.equal(r.status, 201, r.d.message);
  assert.match(r.d.user.numeroH, /^TMP-/);
  assert.equal(r.d.user.password, undefined);
  assert.equal(jwt.verify(r.d.token, process.env.JWT_SECRET).numeroH, r.d.user.numeroH);
  const [enBase] = await sequelize.query('SELECT password FROM users WHERE tel1 = :tel', { replacements: { tel }, type: 'SELECT' });
  assert.ok(enBase, 'compte enregistré en base');
  assert.notEqual(enBase.password, 'motdepasse1', 'mot de passe jamais en clair');

  // Doublon et mot de passe trop court : refus clairs
  assert.equal((await appel('/register-quick', { telephone: tel, password: 'autre12' })).status, 409);
  assert.equal((await appel('/register-quick', { email, password: '123' })).status, 400);
  assert.equal((await appel('/register-quick', { password: 'motdepasse1' })).status, 400);

  // Connexion par téléphone (formats différents) : ouverte avec le bon mot de passe seulement
  r = await appel('/login', { numeroH: tel, password: 'motdepasse1' });
  assert.equal(r.status, 200, r.d.message);
  assert.ok(r.d.token);
  assert.equal(r.d.user?.password, undefined);
  r = await appel('/login', { numeroH: `+224 ${tel}`, password: 'motdepasse1' });
  assert.equal(r.status, 200, r.d.message);
  r = await appel('/login', { numeroH: tel, password: 'mauvais' });
  assert.notEqual(r.status, 200);
  assert.equal(r.d.token, undefined);

  // Connexion par e-mail
  assert.equal((await appel('/register-quick', { email, password: 'motdepasse2' })).status, 201);
  r = await appel('/login', { numeroH: email.toUpperCase(), password: 'motdepasse2' });
  assert.equal(r.status, 200, r.d.message);

  // Compte inconnu / champs manquants : jamais de session
  r = await appel('/login', { numeroH: 'H-INCONNU-999', password: 'x' });
  assert.notEqual(r.status, 200);
  assert.equal(r.d.token, undefined);
  assert.equal((await appel('/login', { numeroH: '', password: '' })).status, 400);
});

// Déclaration d'un défunt — base PostgreSQL de test.
// Un défunt est enregistré dans l'arbre, sans compte : ni mot de passe, ni
// connexion possible, et seule une personne connectée peut le déclarer.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

test('déclaration d’un défunt, sans compte ni mot de passe', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  process.env.JWT_SECRET ||= 'secret-de-test-uniquement';
  const { default: router } = await import('../src/routes/auth.js');
  const { default: User } = await import('../src/models/User.js');
  const { default: DeceasedMember } = await import('../src/models/DeceasedMember.js');
  const { sequelize } = await import('../src/config/database.js');
  await User.sync();
  await DeceasedMember.sync();
  const { FamilyTree } = await import('../src/models/additional.js');
  await FamilyTree.sync();

  const tel = `64${String(Date.now()).slice(-7)}`;
  const app = express(); app.use(express.json()); app.use('/api/auth', router);
  const serveur = app.listen(0);
  let declarant;
  t.after(async () => {
    serveur.close();
    await DeceasedMember.destroy({ where: { createdBy: declarant } }).catch(() => {});
    await sequelize.query('DELETE FROM users WHERE tel1 = :tel', { replacements: { tel } });
    await sequelize.close();
  });
  const appel = async (chemin, corps, jeton) => {
    const r = await fetch(`http://127.0.0.1:${serveur.address().port}/api/auth${chemin}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
      body: JSON.stringify(corps),
    });
    return { status: r.status, d: await r.json().catch(() => ({})) };
  };

  const inscription = (await appel('/register-quick', { telephone: tel, password: 'motdepasse1' })).d;
  declarant = inscription.user.numeroH;
  const defunt = { type: 'defunt', isDeceased: true, prenom: 'Mamadou', nomFamille: 'Diallo', genre: 'HOMME', dateNaissance: '1940-01-01', anneeDeces: 2001, generation: 'G95' };

  // Sans connexion : refusé
  assert.equal((await appel('/register', defunt)).status, 401);

  // Connecté, sans mot de passe ni e-mail : enregistré dans l'arbre avec un NuméroHD
  const r = await appel('/register', defunt, inscription.token);
  assert.equal(r.status, 201, r.d.message || JSON.stringify(r.d.errors));
  assert.match(r.d.deceased.numeroHD, /^DM\d{4,}$/);
  assert.equal(r.d.deceased.createdBy, declarant);
  assert.equal(r.d.deceased.password, undefined);

  // Aucun compte créé : pas de connexion possible avec son NuméroHD
  const [compte] = await sequelize.query('SELECT 1 FROM users WHERE numero_h = :n', { replacements: { n: r.d.deceased.numeroHD }, type: 'SELECT' });
  assert.equal(compte, undefined);
  const connexion = await appel('/login', { numeroH: r.d.deceased.numeroHD, password: 'defunt123' });
  assert.notEqual(connexion.status, 200);
  assert.equal(connexion.d.token, undefined);

  // Un vivant, lui, doit toujours avoir un mot de passe
  const vivant = await appel('/register', { numeroH: 'G1C1P1R1E1F1 1', prenom: 'A', nomFamille: 'B' });
  assert.equal(vivant.status, 400);
});

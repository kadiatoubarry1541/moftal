// Sécurité de l'espace Famille et du Moftal Pay familial (audit de sécurité) :
// - déclarer un parent depuis son profil ne fait pas entrer dans l'arbre d'autrui ;
// - messages de famille : seulement ceux des membres de SES arbres (pas des homonymes) ;
// - Moftal Pay familial : gérant et Conseiller automatiques seulement parmi les
//   membres reconnus (jamais sur une date de naissance qu'on s'est donnée) ;
// - changer d'e-mail demande le mot de passe ;
// - jeton de connexion renouvelé une fois par jour.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

test('famille : arbre, messages, Moftal Pay, e-mail, jeton', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  process.env.JWT_SECRET ||= 'secret-de-test-uniquement';
  const { default: authRouter } = await import('../src/routes/auth.js');
  const { default: familyTreeRouter } = await import('../src/routes/familyTree.js');
  const { default: familyFundRouter } = await import('../src/routes/familyFund.js');
  const { default: User } = await import('../src/models/User.js');
  const { default: FamilyFund } = await import('../src/models/FamilyFund.js');
  const { default: FamilyFundTransaction } = await import('../src/models/FamilyFundTransaction.js');
  const { default: FamilyTreeMessage } = await import('../src/models/FamilyTreeMessage.js');
  const { default: FamilyTreeConfirmation } = await import('../src/models/FamilyTreeConfirmation.js');
  const { default: ParentChildLink } = await import('../src/models/ParentChildLink.js');
  const { FamilyTree } = await import('../src/models/additional.js');
  const { sequelize } = await import('../src/config/database.js');
  const { config } = await import('../config.js');
  for (const m of [User, FamilyTree, FamilyTreeMessage, FamilyTreeConfirmation, ParentChildLink, FamilyFund, FamilyFundTransaction]) await m.sync().catch(() => {}); // index déjà là (nom raccourci par PostgreSQL)

  const base = String(Date.now()).slice(-7);
  const nom = `TESTSEC${base}`;
  const n = (i) => `G9${i}TESTSEC${base}`;
  const [pere, fils, fille, pirate] = [0, 1, 2, 3].map(n);
  const mdp = await bcrypt.hash('motdepasse1', 10);
  const creer = (numeroH, prenom, dateNaissance, nomFamille = nom) => User.create({
    numeroH, password: mdp, prenom, nomFamille, genre: 'HOMME', generation: 'G96',
    type: 'vivant', isActive: true, isVerified: false, role: 'user', dateNaissance,
    email: `${numeroH.toLowerCase()}@test.gn`,
  });
  await creer(pere, 'Pere', '1960-01-01');
  await creer(fils, 'Fils', '1990-01-01');
  await creer(fille, 'Fille', '1992-01-01');
  await creer(pirate, 'Pirate', '1995-01-01', `AUTRE${base}`);
  const arbre = await FamilyTree.create({ rootMember: fils, numeroHPere: pere, members: [pere, fils, fille], deceasedMembers: [], familyName: nom, isActive: true });
  await FamilyTreeMessage.create({ familyName: nom, numeroH: fils, messageType: 'text', content: 'message privé', category: 'information', isActive: true });

  const app = express(); app.use(express.json());
  app.use('/api/auth', authRouter); app.use('/api/family-tree', familyTreeRouter); app.use('/api/family-fund', familyFundRouter);
  const serveur = app.listen(0);
  const tous = [pere, fils, fille, pirate];
  t.after(async () => {
    serveur.close();
    const rep = { replacements: { n: tous } };
    await sequelize.query('DELETE FROM family_fund_transactions WHERE fund_id IN (SELECT id FROM family_funds WHERE tree_id = :a)', { replacements: { a: arbre.id } }).catch(() => {});
    await sequelize.query('DELETE FROM family_funds WHERE tree_id = :a', { replacements: { a: arbre.id } }).catch(() => {});
    await sequelize.query('DELETE FROM family_tree_messages WHERE family_name = :f', { replacements: { f: nom } }).catch(() => {});
    await sequelize.query('DELETE FROM family_tree_confirmations WHERE child_numero_h IN (:n)', rep).catch(() => {});
    await sequelize.query('DELETE FROM family_trees WHERE id = :a', { replacements: { a: arbre.id } }).catch(() => {});
    await sequelize.query('DELETE FROM users WHERE numero_h IN (:n)', rep).catch(() => {});
    await sequelize.close();
  });

  const jeton = (numeroH, iat) => jwt.sign({ userId: numeroH, numeroH, ...(iat ? { iat } : {}) }, config.JWT_SECRET, { expiresIn: '30d' }); // exp compté depuis iat
  const appel = async (methode, chemin, qui, corps) => {
    const r = await fetch(`http://127.0.0.1:${serveur.address().port}${chemin}`, {
      method: methode,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${typeof qui === 'string' && qui.includes('.') ? qui : jeton(qui)}` },
      body: corps ? JSON.stringify(corps) : undefined,
    });
    return { status: r.status, d: await r.json().catch(() => ({})), h: r.headers };
  };
  const membres = async () => (await FamilyTree.findByPk(arbre.id)).members;

  // 1. Déclarer le père d'une autre famille depuis son profil : demande de confirmation, pas d'entrée
  let r = await appel('PUT', '/api/auth/profile', pirate, { numeroH: pirate, numeroHPere: pere, nomFamille: nom, dateNaissance: '1900-01-01' });
  assert.equal(r.status, 200, r.d.message);
  assert.deepEqual(await membres(), [pere, fils, fille], 'le pirate n\'entre pas dans l\'arbre');
  assert.equal(await FamilyTreeConfirmation.count({ where: { childNumeroH: pirate, status: 'pending' } }), 1, 'une demande au père');
  // Enregistrer à nouveau le même profil ne crée pas de doublon
  await appel('PUT', '/api/auth/profile', pirate, { numeroH: pirate, numeroHPere: pere });
  assert.equal(await FamilyTreeConfirmation.count({ where: { childNumeroH: pirate, status: 'pending' } }), 1);

  // 2. Même nom de famille, pas dans l'arbre : ne lit pas les messages
  r = await appel('GET', '/api/family-tree/messages', pirate);
  assert.equal(r.d.messages?.length || 0, 0, 'aucun message d\'homonyme');
  r = await appel('GET', '/api/family-tree/messages', fille);
  assert.equal(r.d.messages.length, 1, 'un membre lit les messages de sa famille');

  // 3. Même entré dans l'arbre avec une date de 1900, le pirate n'a aucun rôle d'argent
  await arbre.update({ members: [pere, fils, fille, pirate] });
  r = await appel('GET', '/api/family-fund/mon-compte', pirate);
  const fonds = await FamilyFund.findOne({ where: { treeId: arbre.id } });
  assert.ok(fonds, 'compte famille créé');
  assert.notEqual(fonds.gerant1NumeroH, pirate, 'pas gérant automatique');
  assert.equal(fonds.gerant1NumeroH, null);
  assert.equal(fonds.conseillerNumeroH, pere, 'le Conseiller est le doyen reconnu (père de l\'arbre)');
  await fonds.update({ solde_urgence: 500000 });
  r = await appel('POST', '/api/family-fund/payer', pirate, { type: 'urgence', montant: 500000, beneficiaireNom: 'Pirate' });
  assert.equal(r.status, 403, 'le pirate ne peut pas payer');
  assert.equal(Number((await FamilyFund.findByPk(fonds.id)).solde_urgence), 500000, 'argent intact');
  r = await appel('PUT', '/api/family-fund/gerants', pirate, { gerant1NumeroH: pirate });
  assert.equal(r.status, 403, 'ne se nomme pas gérant');

  // 4. Changer d'e-mail demande le mot de passe
  r = await appel('PUT', '/api/auth/profile', fille, { numeroH: fille, email: `vole${base}@test.gn` });
  assert.equal(r.status, 403);
  assert.equal(r.d.code, 'MOT_DE_PASSE_REQUIS');
  r = await appel('PUT', '/api/auth/profile', fille, { numeroH: fille, email: `nouveau${base}@test.gn`, motDePasseActuel: 'motdepasse1' });
  assert.equal(r.status, 200, r.d.message);

  // 5. Jeton de plus d'un jour : un jeton neuf est renvoyé ; jeton récent : rien
  const vieux = jeton(fils, Math.floor(Date.now() / 1000) - 2 * 24 * 3600);
  r = await appel('GET', '/api/family-tree/messages', vieux);
  const neuf = r.h.get('x-nouveau-jeton');
  assert.ok(neuf, 'jeton renouvelé');
  assert.equal(jwt.verify(neuf, config.JWT_SECRET).numeroH, fils);
  r = await appel('GET', '/api/family-tree/messages', fils);
  assert.equal(r.h.get('x-nouveau-jeton'), null);
});

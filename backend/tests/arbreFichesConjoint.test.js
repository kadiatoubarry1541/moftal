// Arbre familial : fiche sans compte (hôpital ou mairie), récupération confirmée
// par un parent, règle d'un an du conjoint, placement par l'admin — base de test.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

test('arbre : fiches, confirmation parentale, un an de couple, admin', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  const P = 'TEST-ARB-';
  const papa = { numeroH: `${P}PAPA`, prenom: 'Mamadou', nomFamille: 'Diallo', genre: 'HOMME', role: 'user' };
  const maman = { numeroH: `${P}MAMAN`, prenom: 'Aïssatou', nomFamille: 'Bah', genre: 'FEMME', role: 'user' };
  const grand = { numeroH: `${P}GRAND`, prenom: 'Alpha', nomFamille: 'Diallo', genre: 'HOMME', role: 'user', dateNaissance: '2008-03-15' };
  const neveu = { numeroH: `${P}NEVEU`, prenom: 'Ibrahima', nomFamille: 'Diallo', genre: 'HOMME', role: 'user' };
  const admin = { numeroH: `${P}ADMIN`, prenom: 'Admin', genre: 'HOMME', role: 'admin' };
  let moi = papa;
  mock.module(new URL('../src/middleware/auth.js', import.meta.url).href, {
    namedExports: {
      authenticate: (req, _res, next) => { req.user = moi; req.userId = moi.numeroH; next(); },
      isProvisionalNumeroH: (n) => typeof n === 'string' && n.startsWith('TMP-'),
      MASTER_ADMIN_NUMEROS: [],
    },
  });
  const { default: pcRouter } = await import('../src/routes/parentChild.js');
  const { default: ftRouter } = await import('../src/routes/familyTree.js');
  const { default: User } = await import('../src/models/User.js');
  const { default: ParentChildLink } = await import('../src/models/ParentChildLink.js');
  const { default: CoupleLink } = await import('../src/models/CoupleLink.js');
  const { default: EnfantSansCompte } = await import('../src/models/EnfantSansCompte.js');
  const { default: Notification } = await import('../src/models/Notification.js');
  const { FamilyTree } = await import('../src/models/additional.js');
  const { default: DeceasedMember } = await import('../src/models/DeceasedMember.js');
  const { ensureTableFiches } = await import('../src/services/enfantsSansCompte.js');
  const { sequelize } = await import('../src/config/database.js');
  for (const m of [User, ParentChildLink, CoupleLink, Notification, FamilyTree, DeceasedMember]) await m.sync();
  await ensureTableFiches();

  for (const u of [papa, maman, grand, neveu, admin]) {
    await User.findOrCreate({
      where: { numeroH: u.numeroH },
      defaults: { ...u, password: 'x', nomFamille: u.nomFamille || 'Test', generation: 'G1', type: 'vivant', isActive: true },
    });
  }

  const app = express(); app.use(express.json({ limit: '5mb' }));
  app.use('/api/parent-child', pcRouter); app.use('/api/family-tree', ftRouter);
  const serveur = app.listen(0);
  t.after(async () => {
    serveur.close();
    await sequelize.query(`DELETE FROM parent_child_links WHERE parent_numero_h LIKE '${P}%' OR child_numero_h LIKE '${P}%'`).catch(() => {});
    await sequelize.query(`DELETE FROM enfants_sans_compte WHERE cree_par LIKE '${P}%'`).catch(() => {});
    await sequelize.query(`DELETE FROM couple_links WHERE husband_numero_h LIKE '${P}%'`).catch(() => {});
    await sequelize.query(`DELETE FROM notifications WHERE recipient_numero_h LIKE '${P}%'`).catch(() => {});
    await sequelize.query(`DELETE FROM family_trees WHERE "rootMember" LIKE '${P}%'`).catch(() => {});
    await sequelize.query(`DELETE FROM users WHERE numero_h LIKE '${P}%'`).catch(() => {});
    await sequelize.close();
  });
  const appel = async (methode, chemin, corps) => {
    const r = await fetch(`http://127.0.0.1:${serveur.address().port}/api${chemin}`, {
      method: methode, headers: { 'Content-Type': 'application/json' }, body: corps ? JSON.stringify(corps) : undefined,
    });
    return { status: r.status, d: await r.json().catch(() => ({})) };
  };

  // ── 1. Fiche sans compte : enfant vivant → photo, date et pièce obligatoires
  const fiche = {
    prenom: 'Alpha', genre: 'HOMME', estVivant: true, dateNaissance: '2008-03-15', autreParentInconnu: true,
    photo: 'https://exemple.test/alpha.jpg',
    pieceType: 'hopital', extraitNumero: 'N° 0457', extraitCommune: 'Hôpital Donka', extraitAnnee: '2008',
  };
  assert.equal((await appel('POST', '/parent-child/enfants-sans-compte', { ...fiche, photo: undefined })).status, 400, 'photo obligatoire');
  assert.equal((await appel('POST', '/parent-child/enfants-sans-compte', { ...fiche, extraitNumero: '' })).status, 400, 'pièce obligatoire');
  let r = await appel('POST', '/parent-child/enfants-sans-compte', fiche);
  assert.equal(r.status, 201, r.d.message);
  const ficheId = r.d.enfant.ficheId;

  // Unique : même numéro + même hôpital + même année, autre date → refusé
  r = await appel('POST', '/parent-child/enfants-sans-compte', { ...fiche, prenom: 'Bobo', dateNaissance: '2008-09-01', extraitNumero: '457', extraitCommune: 'hopital donka' });
  assert.equal(r.status, 409);
  // Le même numéro à la mairie n'est pas le même enfant (types différents)
  r = await appel('POST', '/parent-child/enfants-sans-compte', { ...fiche, prenom: 'Kadiatou', genre: 'FEMME', pieceType: 'mairie', extraitCommune: 'Dixinn', dateNaissance: '2008-05-02' });
  assert.equal(r.status, 201, r.d.message);

  // ── 2. L'enfant devenu grand demande sa fiche : rien n'est relié avant la confirmation
  moi = grand;
  r = await appel('POST', '/parent-child/rejoindre-ma-fiche', { pieceType: 'hopital', extraitNumero: '457', extraitCommune: 'Donka', extraitAnnee: '2008' });
  assert.equal(r.status, 200, r.d.message);
  assert.equal(r.d.enAttente, true);
  let f = await EnfantSansCompte.findByPk(ficheId);
  assert.equal(f.fusionneAvec, null, 'pas encore relié');
  assert.equal(f.demandeNumeroH, grand.numeroH);

  moi = neveu; // un autre ne peut pas répondre à la place du parent
  assert.equal((await appel('POST', `/parent-child/enfants-sans-compte/${ficheId}/demande`, { decision: 'accepter' })).status, 403);

  moi = papa;
  r = await appel('GET', '/parent-child/enfants-sans-compte/demandes');
  assert.equal(r.d.demandes.length, 1);
  assert.equal(r.d.demandes[0].demandeur.numeroH, grand.numeroH);
  r = await appel('POST', `/parent-child/enfants-sans-compte/${ficheId}/demande`, { decision: 'accepter' });
  assert.equal(r.status, 200, r.d.message);
  f = await EnfantSansCompte.findByPk(ficheId);
  assert.equal(f.fusionneAvec, grand.numeroH, 'relié après confirmation du parent');
  assert.ok(await ParentChildLink.findOne({ where: { parentNumeroH: papa.numeroH, childNumeroH: grand.numeroH, isActive: true } }));

  // ── 3. Couple : rien de l'autre famille pendant la première année
  await FamilyTree.create({ rootMember: maman.numeroH, members: [maman.numeroH], isActive: true });
  const couple = await CoupleLink.create({
    numeroH1: papa.numeroH, numeroH2: maman.numeroH, husbandNumeroH: papa.numeroH, wifeNumeroH: maman.numeroH,
    initiatedByNumeroH: papa.numeroH, status: 'active', confirmedAt: new Date(), isActive: true, isArchived: false,
  });
  r = await appel('GET', `/family-tree/spouse-tree/${maman.numeroH}`);
  assert.equal(r.status, 200, r.d.message);
  assert.equal(r.d.accessLevel, 'limited');
  assert.equal(r.d.tree, null, 'ni noms ni nombre de membres avant un an');

  await couple.update({ confirmedAt: new Date(Date.now() - 400 * 24 * 3600 * 1000) });
  r = await appel('GET', `/family-tree/spouse-tree/${maman.numeroH}`);
  assert.equal(r.d.accessLevel, 'full');
  assert.ok(r.d.tree.members.some((m) => m.numeroH === maman.numeroH));

  moi = grand; // un autre membre de la famille : jamais
  assert.equal((await appel('GET', `/family-tree/spouse-tree/${maman.numeroH}`)).status, 403);

  // ── 4. Admin : placer une personne à n'importe quelle place
  moi = neveu;
  assert.equal((await appel('POST', '/parent-child/admin/placer', { personneNumeroH: papa.numeroH, position: 'enfant', autreNumeroH: neveu.numeroH })).status, 403);
  moi = admin;
  r = await appel('POST', '/parent-child/admin/placer', { personneNumeroH: papa.numeroH, position: 'enfant', autreNumeroH: neveu.numeroH });
  assert.equal(r.status, 200, r.d.message);
  assert.ok(await ParentChildLink.findOne({ where: { parentNumeroH: papa.numeroH, childNumeroH: neveu.numeroH, parentType: 'pere', isActive: true } }));
  r = await appel('POST', '/parent-child/admin/placer', {
    personneNumeroH: maman.numeroH, position: 'enfant',
    sansCompte: { prenom: 'Mariama', genre: 'FEMME', estVivant: true, dateNaissance: '2024-01-10', photo: 'https://exemple.test/m.jpg', pieceType: 'mairie', extraitNumero: '12', extraitCommune: 'Kaloum', extraitAnnee: '2024' },
  });
  assert.equal(r.status, 201, r.d.message);
  const mariama = await EnfantSansCompte.findOne({ where: { prenom: 'Mariama', creePar: maman.numeroH } });
  assert.ok(await ParentChildLink.findOne({ where: { parentNumeroH: maman.numeroH, childNumeroH: mariama.numero, parentType: 'mere', isActive: true } }));
});

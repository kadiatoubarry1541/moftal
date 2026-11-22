// Galeries : galerie personnelle (privée, 3 photos + 1 vidéo), offre gratuite
// 5 photos + 2 vidéos (Noyau), 4 + 2 (amis), 10 + 2 (famille) ; supprimer / remplacer libère une
// place, au-delà on paie avec ses points — base PostgreSQL de test.
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';

test('galeries : galerie personnelle, offre gratuite, remplacement et points', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  process.env.JWT_SECRET ||= 'secret-de-test-uniquement';
  const { default: authRouter } = await import('../src/routes/auth.js');
  const { default: familyRouter } = await import('../src/routes/family.js');
  const { default: quotasRouter } = await import('../src/routes/quotas.js');
  const { default: parentChildRouter } = await import('../src/routes/parentChild.js');
  const { default: friendsRouter } = await import('../src/routes/friends.js');
  const { default: Friend } = await import('../src/models/Friend.js');
  const { FamilyTree } = await import('../src/models/additional.js');
  const { default: User } = await import('../src/models/User.js');
  const { default: FamilyGallery } = await import('../src/models/FamilyGallery.js');
  const { default: ParentChildLink } = await import('../src/models/ParentChildLink.js');
  const { default: ParentChildActivity } = await import('../src/models/ParentChildActivity.js');
  const { sequelize } = await import('../src/config/database.js');
  await User.sync();
  await FamilyGallery.sync();
  await ParentChildLink.sync();
  await ParentChildActivity.sync();
  await Friend.sync();
  await FamilyTree.sync();
  await new Promise((r) => setTimeout(r, 500)); // tables des points (quotas.js)

  const base = String(Date.now()).slice(-7);
  const tels = [`64${base}`, `63${base}`];
  const nomFamille = `TESTGAL${base}`;
  const app = express(); app.use(express.json());
  app.use('/api/auth', authRouter); app.use('/api/family', familyRouter);
  app.use('/api/quotas', quotasRouter); app.use('/api/parent-child', parentChildRouter);
  app.use('/api/friends', friendsRouter);
  const serveur = app.listen(0);
  const numeros = [];
  let arbre = null;
  t.after(async () => {
    serveur.close();
    const rep = { replacements: { n: numeros } };
    await sequelize.query('DELETE FROM galerie_personnelle WHERE numero_h IN (:n)', rep).catch(() => {});
    await sequelize.query('DELETE FROM family_gallery WHERE family_name = :f', { replacements: { f: nomFamille } }).catch(() => {});
    await sequelize.query('DELETE FROM parent_child_activities WHERE parent_numero_h IN (:n)', rep).catch(() => {});
    await sequelize.query('DELETE FROM parent_child_links WHERE parent_numero_h IN (:n)', rep).catch(() => {});
    await sequelize.query('DELETE FROM friend_souvenirs WHERE numero_h IN (:n)', rep).catch(() => {});
    if (arbre) await arbre.destroy().catch(() => {});
    await sequelize.query('DELETE FROM friends WHERE user_numero_h IN (:n)', rep).catch(() => {});
    await sequelize.query('DELETE FROM gallery_points WHERE numero_h IN (:n)', rep).catch(() => {});
    await sequelize.query('DELETE FROM users WHERE tel1 IN (:t)', { replacements: { t: tels } });
    await sequelize.close();
  });

  const url = (chemin) => `http://127.0.0.1:${serveur.address().port}${chemin}`;
  const json = async (methode, chemin, jeton, corps) => {
    const r = await fetch(url(chemin), {
      method: methode,
      headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
      body: corps ? JSON.stringify(corps) : undefined,
    });
    return { status: r.status, d: await r.json().catch(() => ({})) };
  };
  const fichier = async (methode, chemin, jeton, video = false, champ = 'media', extra = {}) => {
    const form = new FormData();
    form.append(champ, new Blob([Buffer.from(video ? 'video' : 'image')], { type: video ? 'video/mp4' : 'image/png' }), video ? 'v.mp4' : 'p.png');
    for (const [k, v] of Object.entries(extra)) form.append(k, v);
    const r = await fetch(url(chemin), { method: methode, headers: { Authorization: `Bearer ${jeton}` }, body: form });
    return { status: r.status, d: await r.json().catch(() => ({})) };
  };

  // Deux comptes au profil complété (vrai NuméroH), de la même famille
  const { config } = await import('../config.js');
  const jetons = [];
  for (const [i, tel] of tels.entries()) {
    const r = await json('POST', '/api/auth/register-quick', null, { telephone: tel, password: 'motdepasse1' });
    assert.equal(r.status, 201, r.d.message);
    const numeroH = `G${i}TESTGAL${base}`;
    await sequelize.query('UPDATE users SET numero_h = :n, nom_famille = :f, prenom = :p, genre = \'FEMME\' WHERE tel1 = :tel',
      { replacements: { n: numeroH, f: nomFamille, p: `Test${i}`, tel } });
    numeros.push(numeroH);
    jetons.push(jwt.sign({ userId: numeroH, numeroH }, config.JWT_SECRET, { expiresIn: '1h' }));
  }
  const [moi, autre] = jetons;
  // Les deux personnes sont dans le même arbre familial (galerie famille)
  arbre = await FamilyTree.create({ rootMember: numeros[0], members: [numeros[0], numeros[1]], isActive: true });

  // ── Galerie personnelle : 3 photos gratuites, puis refus (pas de points)
  for (let i = 0; i < 3; i++) {
    const r = await fichier('POST', '/api/family/personal-gallery', moi);
    assert.equal(r.status, 200, r.d.message);
  }
  let r = await fichier('POST', '/api/family/personal-gallery', moi);
  assert.equal(r.status, 402);
  assert.equal(r.d.code, 'QUOTA_EXCEEDED');

  // Visible uniquement par son propriétaire
  r = await json('GET', '/api/family/personal-gallery', autre);
  assert.equal(r.d.items.length, 0, 'une autre personne ne voit rien');
  r = await json('GET', '/api/family/personal-gallery', moi);
  assert.equal(r.d.items.length, 3);
  assert.equal(r.d.offre.photosRestantes, 0);
  const premier = r.d.items[0].id;
  assert.equal((await json('DELETE', `/api/family/personal-gallery/${premier}`, autre)).status, 404, 'personne d\'autre ne supprime');
  assert.equal((await fichier('PUT', `/api/family/personal-gallery/${premier}`, autre)).status, 404, 'personne d\'autre ne remplace');

  // Remplacer garde la place (toujours gratuit), supprimer la libère
  r = await fichier('PUT', `/api/family/personal-gallery/${premier}`, moi);
  assert.equal(r.status, 200, r.d.message);
  assert.equal(r.d.items.length, 3);
  r = await json('DELETE', `/api/family/personal-gallery/${premier}`, moi);
  assert.equal(r.d.offre.photosRestantes, 1);
  assert.equal((await fichier('POST', '/api/family/personal-gallery', moi)).status, 200, 'la place libérée resservit gratuitement');

  // 1 vidéo gratuite, puis payée avec des points (selon la durée)
  assert.equal((await fichier('POST', '/api/family/personal-gallery', moi, true)).status, 200);
  assert.equal((await fichier('POST', '/api/family/personal-gallery', moi, true, 'media', { videoDuration: '8' })).status, 402);
  await sequelize.query(`INSERT INTO gallery_points (id, numero_h, points_disponibles, total_achete, created_at, updated_at)
    VALUES (gen_random_uuid(), :n, 3, 3, NOW(), NOW())
    ON CONFLICT (numero_h) DO UPDATE SET points_disponibles = 3`, { replacements: { n: numeros[0] } });
  assert.equal((await fichier('POST', '/api/family/personal-gallery', moi, true, 'media', { videoDuration: '8' })).status, 200, 'vidéo de 8 s payée 2 points');
  assert.equal((await fichier('POST', '/api/family/personal-gallery', moi)).status, 200, 'photo payée 1 point');
  r = await json('GET', '/api/quotas/my-points', moi);
  assert.equal(r.d.pointsDisponibles, 0);
  assert.equal((await fichier('POST', '/api/family/personal-gallery', moi)).status, 402, 'plus de points');

  // ── Galerie famille : 10 photos + 2 vidéos gratuites pour toute la famille
  for (let i = 0; i < 10; i++) {
    assert.equal((await fichier('POST', '/api/family/shared-gallery/mariage', i % 2 ? autre : moi)).status, 200);
  }
  r = await fichier('POST', '/api/family/shared-gallery/mariage', autre);
  assert.equal(r.status, 402);
  r = await json('GET', '/api/quotas/family', moi);
  assert.equal(r.d.quota.photosLibres, 10);
  assert.equal(r.d.quota.photosRestantes, 0);
  assert.equal(r.d.quota.videosLibres, 2);
  const familiale = (await json('GET', '/api/family/shared-gallery', moi)).d.items.find((i) => i.uploaderNumeroH === numeros[1]);
  assert.equal((await fichier('PUT', `/api/family/shared-gallery/${familiale.id}`, moi)).status, 403, 'on ne remplace que les siennes');
  assert.equal((await fichier('PUT', `/api/family/shared-gallery/${familiale.id}`, autre)).status, 200);
  assert.equal((await json('DELETE', `/api/family/shared-gallery/${familiale.id}`, autre)).status, 200);
  r = await json('GET', '/api/family/shared-gallery/offre', autre);
  assert.equal(r.d.offre.photosRestantes, 1);

  // ── Galerie commune parent-enfant (Noyau) : 5 photos + 2 vidéos
  await ParentChildLink.create({
    parentNumeroH: numeros[0], childNumeroH: numeros[1], codeLiaison: `T${base}`, parentType: 'pere',
    status: 'active', isActive: true
  });
  const paire = { parentNumeroH: numeros[0], childNumeroH: numeros[1], toNumeroH: numeros[1], type: 'souvenir_avant' };
  for (let i = 0; i < 5; i++) {
    r = await json('POST', '/api/parent-child/activity', i % 2 ? autre : moi, { ...paire, mediaUrl: 'data:image/png;base64,aW1hZ2U=' });
    assert.equal(r.status, 200, r.d.message);
  }
  r = await json('POST', '/api/parent-child/activity', autre, { ...paire, mediaUrl: 'data:image/png;base64,aW1hZ2U=' });
  assert.equal(r.status, 402);
  r = await json('POST', '/api/parent-child/activity', moi, { ...paire, type: 'message', content: 'Bonjour' });
  assert.equal(r.status, 200, 'un simple message n\'est pas compté');
  r = await json('POST', '/api/parent-child/activity', autre, { ...paire, mediaUrl: 'data:video/mp4;base64,dmlkZW8=' });
  assert.equal(r.status, 200, 'une vidéo a sa propre offre');
  r = await json('POST', '/api/parent-child/activity', autre, { ...paire, content: '{"caption":"","mediaType":"video"}', mediaUrl: 'https://exemple.test/v.webm' });
  assert.equal(r.status, 200);
  r = await json('POST', '/api/parent-child/activity', moi, { ...paire, mediaUrl: 'data:video/mp4;base64,dmlkZW8=' });
  assert.equal(r.status, 402, 'troisième vidéo : payante');
  r = await json('GET', `/api/parent-child/gallery-offer?parentNumeroH=${numeros[0]}&childNumeroH=${numeros[1]}`, moi);
  assert.equal(r.d.offre.photosUtilisees, 5);
  assert.equal(r.d.offre.videosUtilisees, 2);
  const souvenirs = (await json('GET', `/api/parent-child/activities?parentNumeroH=${numeros[0]}&childNumeroH=${numeros[1]}`, moi)).d.activities;
  const sienne = souvenirs.find((a) => a.fromNumeroH === numeros[1] && a.mediaUrl?.startsWith('data:image'));
  assert.equal((await json('DELETE', `/api/parent-child/activity/${sienne.id}`, moi)).status, 403, 'on ne supprime que les siens');
  assert.equal((await json('DELETE', `/api/parent-child/activity/${sienne.id}`, autre)).status, 200);
  r = await json('POST', '/api/parent-child/activity', moi, { ...paire, mediaUrl: 'data:image/png;base64,aW1hZ2U=' });
  assert.equal(r.status, 200, 'la place libérée resservit gratuitement');

  // ── Souvenirs entre amis précieux : 4 photos + 2 vidéos, puis points
  const amitie = await Friend.create({
    userNumeroH: numeros[0], friendNumeroH: numeros[1], status: 'accepted', precieuxUser: true, precieuxFriend: true
  });
  r = await json('GET', `/api/friends/souvenirs?linkId=${amitie.id}`, moi);
  assert.equal(r.status, 200, r.d.message);
  assert.deepEqual([r.d.offre.photosLibres, r.d.offre.videosLibres], [4, 2]);
  for (let i = 0; i < 4; i++) {
    await sequelize.query(`INSERT INTO friend_souvenirs (link_id, numero_h, media_type, media_url)
      VALUES (:l, :n, 'image', 'https://exemple.test/p.png')`, { replacements: { l: amitie.id, n: numeros[i % 2] } });
  }
  r = await fichier('POST', '/api/friends/souvenirs', autre, false, 'media', { linkId: amitie.id });
  assert.equal(r.status, 402, 'cinquième photo : payante (pas de points)');
  assert.equal(r.d.code, 'QUOTA_EXCEEDED');
  r = await json('GET', `/api/friends/souvenirs?linkId=${amitie.id}`, autre);
  assert.equal(r.d.offre.photosRestantes, 0);
  assert.equal(r.d.offre.videosRestantes, 2);
  const souvenirAmi = r.d.souvenirs.find((x) => x.numeroH === numeros[1]);
  assert.equal((await json('DELETE', `/api/friends/souvenirs/${souvenirAmi.id}`, autre)).status, 200);
  r = await json('GET', `/api/friends/souvenirs?linkId=${amitie.id}`, autre);
  assert.equal(r.d.offre.photosRestantes, 1, 'retirer un souvenir libère sa place');
});

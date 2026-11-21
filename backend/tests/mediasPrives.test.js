// Médias privés de la famille : plus de base64 dans les lignes, liens signés et
// temporaires, jamais servis par la route publique, anciens médias déplacés
// sans rien perdre (base PostgreSQL de test).
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

test('médias privés : repère en base, lien signé, anciens base64 déplacés', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'cle-de-test-medias-prives-assez-longue';
  delete process.env.R2_BUCKET_PRIVE;
  let copiesIDrive = 0;
  mock.module(new URL('../src/services/idriveStorage.js', import.meta.url).href, {
    namedExports: { uploadToIDrive: async () => { copiesIDrive++; return 'ok'; }, deleteFromIDrive: async () => {} },
  });
  const P = 'TEST-MP-';
  const moi = { numeroH: `${P}MOI`, prenom: 'Fanta', nomFamille: `${P}Camara`, genre: 'FEMME', role: 'user' };
  mock.module(new URL('../src/middleware/auth.js', import.meta.url).href, {
    namedExports: {
      authenticate: (req, _res, next) => { req.user = moi; req.userId = moi.numeroH; next(); },
      isProvisionalNumeroH: () => false,
      MASTER_ADMIN_NUMEROS: [],
      estAdminUtilisateur: () => false,
      requireAdmin: (_req, res) => res.status(403).end(),
    },
  });

  const { mediasPrivesMiddleware, sortirMediasBase64, PREFIXE } = await import('../src/services/mediasPrives.js');
  const { default: familyRouter } = await import('../src/routes/family.js');
  const { default: privesRouter } = await import('../src/routes/fichiersPrives.js');
  const { default: publicRouter } = await import('../src/routes/fichiers.js');
  const { default: User } = await import('../src/models/User.js');
  const { default: FamilyGallery } = await import('../src/models/FamilyGallery.js');
  const { default: PublishedStory } = await import('../src/models/PublishedStory.js');
  await PublishedStory.sync();
  const { sequelize } = await import('../src/config/database.js');
  await User.sync();
  await User.findOrCreate({ where: { numeroH: moi.numeroH }, defaults: { ...moi, password: 'x', generation: 'G1', type: 'vivant', isActive: true } });

  const app = express();
  app.use(express.json({ limit: '20mb' }));
  app.use('/api/fichiers', publicRouter);
  app.use('/api/fichiers-prives', privesRouter);
  app.use('/api', mediasPrivesMiddleware);
  app.use('/api/family', familyRouter);
  app.post('/api/echo', (req, res) => res.json({ repere: String(req.body.photos[0]).startsWith('prive:'), autre: req.body.photos[1] }));
  const serveur = app.listen(0);
  const base = `http://127.0.0.1:${serveur.address().port}`;
  t.after(async () => {
    serveur.close();
    await sequelize.query(`DELETE FROM published_stories WHERE numero_h LIKE '${P}%'`).catch(() => {});
    await sequelize.query(`DELETE FROM family_gallery WHERE uploader_numero_h LIKE '${P}%'`).catch(() => {});
    await sequelize.query(`DELETE FROM fichiers WHERE proprietaire LIKE '${P}%'`).catch(() => {});
    await sequelize.query(`DELETE FROM users WHERE numero_h LIKE '${P}%'`).catch(() => {});
    await sequelize.close();
  });

  // ── 1. Nouvelle photo de la galerie familiale : repère en base, lien signé en réponse
  const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4c70000000049454e44ae426082', 'hex');
  const form = new FormData();
  form.append('media', new Blob([png], { type: 'image/png' }), 'bapteme.png');
  let r = await fetch(`${base}/api/family/shared-gallery/bapteme`, { method: 'POST', body: form });
  let d = await r.json();
  assert.equal(r.status, 200, d.message);
  assert.match(d.item.url, /^http:\/\/127\.0\.0\.1:\d+\/api\/fichiers-prives\/[0-9a-f-]{36}\?e=\d+&s=[\w-]+$/);
  const ligne = await FamilyGallery.findByPk(d.item.id);
  assert.ok(ligne.url.startsWith(PREFIXE), 'la ligne ne garde qu\'un repère');
  assert.ok(!ligne.url.includes('base64'));
  assert.equal(copiesIDrive, 1, 'copie de secours IDrive');

  // Le lien signé sert exactement la photo, en cache privé seulement
  r = await fetch(d.item.url);
  assert.equal(r.status, 200);
  assert.ok(Buffer.from(await r.arrayBuffer()).equals(png));
  assert.match(r.headers.get('cache-control'), /^private/);

  // Signature modifiée, expirée ou absente : rien
  const id = ligne.url.slice(PREFIXE.length);
  assert.equal((await fetch(d.item.url.replace(/s=[\w-]+/, 's=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'))).status, 404);
  assert.equal((await fetch(d.item.url.replace(/e=\d+/, 'e=1000'))).status, 404);
  assert.equal((await fetch(`${base}/api/fichiers-prives/${id}`)).status, 404);
  // La route publique ne sert jamais un média privé
  assert.equal((await fetch(`${base}/api/fichiers/${id}`)).status, 404);

  // Un lien signé renvoyé par le site redevient un repère (jamais un lien qui expire)
  r = await fetch(`${base}/api/echo`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photos: [d.item.url, 'https://ailleurs.test/x.jpg'] }) });
  d = await r.json();
  assert.equal(d.repere, true);
  assert.equal(d.autre, 'https://ailleurs.test/x.jpg', 'les autres liens ne changent pas');

  // ── 2. Anciens médias en base64 : déplacés, contenu identique
  const ancien = `data:image/png;base64,${png.toString('base64')}`;
  await sequelize.query(`UPDATE users SET gallery_albums = :g, family_photo = :f WHERE numero_h = :n`, {
    replacements: { n: moi.numeroH, f: ancien, g: JSON.stringify({ mariage: [{ url: ancien, type: 'image' }], bapteme: [] }) },
  });
  const vieux = await FamilyGallery.create({ familyName: moi.nomFamille, uploaderNumeroH: moi.numeroH, uploaderName: 'Fanta', album: 'mariage', url: ancien, type: 'image' });
  const story = await PublishedStory.create({ numeroH: moi.numeroH, authorName: 'Fanta', sectionId: 'mes_amours_story', sectionTitle: 'Story', content: 'x', photos: [ancien], videos: [], isPublished: true, publishedAt: new Date() });
  const res = await sortirMediasBase64({ pause: 0 });
  assert.ok(res.convertis >= 4, `convertis: ${res.convertis}`);

  const [u] = await sequelize.query('SELECT gallery_albums, family_photo FROM users WHERE numero_h = :n', { replacements: { n: moi.numeroH }, type: 'SELECT' });
  assert.ok(u.family_photo.startsWith(PREFIXE));
  const albums = JSON.parse(u.gallery_albums);
  assert.ok(albums.mariage[0].url.startsWith(PREFIXE));
  assert.equal(albums.mariage[0].type, 'image', 'le reste de l\'album est gardé');
  await story.reload();
  assert.ok(String(story.photos[0]).startsWith(PREFIXE), 'story : photo dans la liste JSON déplacée');
  await vieux.reload();
  assert.ok(vieux.url.startsWith(PREFIXE));

  // Et la galerie privée les renvoie en liens signés qui servent la même photo
  r = await fetch(`${base}/api/family/gallery`);
  d = await r.json();
  r = await fetch(d.albums.mariage[0].url);
  assert.ok(Buffer.from(await r.arrayBuffer()).equals(png), 'photo identique après déplacement');

  // Rien à refaire au tour suivant
  assert.equal((await sortirMediasBase64({ pause: 0 })).convertis, 0);
});

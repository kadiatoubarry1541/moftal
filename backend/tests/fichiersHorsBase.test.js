// Fichiers sortis de la base Neon vers le stockage en ligne (base PostgreSQL de test).
// Rien ne doit être retiré de la base tant que la copie en ligne ne se relit pas
// à l'identique ET que la copie de secours IDrive n'est pas faite.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

test('fichiers sortis de la base sans jamais rien perdre', { skip: !process.env.TEST_DB && 'TEST_DB non défini (pas de base de test)' }, async (t) => {
  Object.assign(process.env, {
    IMAGEKIT_PUBLIC_KEY: 'test', IMAGEKIT_PRIVATE_KEY: 'test', IMAGEKIT_URL_ENDPOINT: 'https://ik.imagekit.io/test',
    R2_ACCOUNT_ID: 'test', R2_ACCESS_KEY_ID: 'test', R2_SECRET_ACCESS_KEY: 'test',
    IDRIVE_ACCESS_KEY: 'test', IDRIVE_SECRET_KEY: 'test',
  });

  // Stockages simulés : ce qui est « en ligne » est gardé ici
  const enLigne = new Map();
  let compteur = 0;
  let enLignePanne = false;
  let idrivePanne = false;
  let copiesIDrive = 0;
  const stocker = (prefixe) => async (buffer) => {
    if (enLignePanne) throw new Error('stockage en ligne injoignable');
    const url = `${prefixe}/f${++compteur}`;
    enLigne.set(url, Buffer.from(buffer));
    return url;
  };
  mock.module(new URL('../src/services/imagekitStorage.js', import.meta.url).href, {
    namedExports: { uploadToImageKit: stocker('https://ik.imagekit.io/test/moftal'), deleteFromImageKit: async () => {} },
  });
  mock.module(new URL('../src/services/r2Storage.js', import.meta.url).href, {
    namedExports: { uploadToR2: stocker('https://files.moftal.com'), deleteFromR2: async () => {} },
  });
  mock.module(new URL('../src/services/idriveStorage.js', import.meta.url).href, {
    namedExports: {
      uploadToIDrive: async () => { if (idrivePanne) throw new Error('IDrive injoignable'); copiesIDrive++; return 'ok'; },
      deleteFromIDrive: async () => {},
    },
  });
  const fetchReel = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    const u = String(url).replace(/[?&]tr=orig-true$/, '');
    if (enLigne.has(u)) return new Response(enLigne.get(u), { status: 200 });
    if (/imagekit|files\.moftal/.test(u)) return new Response('', { status: 404 });
    return fetchReel(url, opts);
  };

  const { enregistrerEnBase, deplacerFichiersHorsBase } = await import('../src/services/fichiersBase.js');
  const { default: router } = await import('../src/routes/fichiers.js');
  const { sequelize } = await import('../src/config/database.js');
  const app = express(); app.use('/api/fichiers', router);
  const serveur = app.listen(0);
  t.after(async () => {
    globalThis.fetch = fetchReel;
    serveur.close();
    await sequelize.query("DELETE FROM fichiers WHERE proprietaire = 'TEST-HORS-BASE'");
    await sequelize.close();
  });
  const lire = async (chemin) => {
    const r = await fetchReel(`http://127.0.0.1:${serveur.address().port}${chemin}`);
    return { status: r.status, contenu: Buffer.from(await r.arrayBuffer()) };
  };
  const ligne = async (chemin) => (await sequelize.query(
    'SELECT donnees, url_externe FROM fichiers WHERE id = :id',
    { replacements: { id: chemin.split('/').pop() }, type: 'SELECT' }))[0];

  const photo = Buffer.from('photo-de-profil-JPEG');
  const pdf = Buffer.from('%PDF-livre');

  // 1. Stockage en ligne joignable : la base ne garde que le lien
  const c1 = await enregistrerEnBase({ buffer: photo, mimetype: 'image/jpeg', originalname: 'p.jpg' }, { proprietaire: 'TEST-HORS-BASE' });
  let l = await ligne(c1);
  assert.equal(l.donnees, null);
  assert.match(l.url_externe, /^https:\/\/ik\.imagekit\.io\//);
  assert.deepEqual((await lire(c1)).contenu, photo, 'même adresse, même photo');

  // 2. Stockage en ligne en panne : gardé dans la base, jamais perdu
  enLignePanne = true;
  const c2 = await enregistrerEnBase({ buffer: pdf, mimetype: 'application/pdf', originalname: 'l.pdf' }, { proprietaire: 'TEST-HORS-BASE' });
  l = await ligne(c2);
  assert.ok(l.donnees, 'contenu gardé en base');
  assert.equal(l.url_externe, null);
  assert.deepEqual((await lire(c2)).contenu, pdf);

  // 3. IDrive en panne : le déplacement ne retire rien de la base
  enLignePanne = false;
  idrivePanne = true;
  let bilan = await deplacerFichiersHorsBase({ pause: 0 });
  assert.equal(bilan.deplaces, 0);
  assert.ok((await ligne(c2)).donnees, 'toujours en base tant que la copie de secours manque');

  // 4. Tout est joignable : sorti de la base, contenu identique à la même adresse
  idrivePanne = false;
  const avant = copiesIDrive;
  bilan = await deplacerFichiersHorsBase({ pause: 0 });
  assert.equal(bilan.deplaces, 1);
  assert.equal(copiesIDrive, avant + 1);
  l = await ligne(c2);
  assert.equal(l.donnees, null);
  assert.match(l.url_externe, /^https:\/\/files\.moftal\.com\//);
  assert.deepEqual((await lire(c2)).contenu, pdf);

  // 5. Copie en ligne corrompue : gardé en base
  enLignePanne = true;
  const c3 = await enregistrerEnBase({ buffer: photo, mimetype: 'image/png', originalname: 'x.png' }, { proprietaire: 'TEST-HORS-BASE' });
  enLignePanne = false;
  const uploadReel = enLigne.set.bind(enLigne);
  enLigne.set = (url, b) => uploadReel(url, Buffer.from('abime'));
  bilan = await deplacerFichiersHorsBase({ pause: 0 });
  enLigne.set = uploadReel;
  assert.equal(bilan.deplaces, 0);
  assert.deepEqual((await lire(c3)).contenu, photo, 'la photo d’origine est intacte');

  // 6. Copie en ligne disparue : erreur claire, pas de faux contenu
  enLigne.clear();
  assert.equal((await lire(c1)).status, 502);
});

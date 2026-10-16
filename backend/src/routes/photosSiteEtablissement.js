import { sequelize } from '../config/database.js';
import { photoDepuisFormulaire } from '../services/fichiersBase.js';

/**
 * Photos du site vitrine d'un établissement (école, madrasa) : le responsable
 * les ajoute depuis son application (gestion interne) ; tout le monde les voit
 * sur le site. Les images sont enregistrées en base (table « fichiers »).
 * Une photo peut servir de couverture (grande image en haut du site).
 */

const Q = sequelize.QueryTypes;
const MAX_PHOTOS = 40;
export const CATEGORIES_PHOTOS = ['Nos locaux', 'Vie scolaire', 'Activités', 'Événements', 'Résultats', 'Autre'];

let tablePrete = null;
function preparerTable() {
  if (!tablePrete) {
    tablePrete = sequelize.query(`
      CREATE TABLE IF NOT EXISTS etablissement_photos (
        id             SERIAL PRIMARY KEY,
        tenant_code    VARCHAR(50)  NOT NULL,
        image_url      TEXT         NOT NULL,
        legende        VARCHAR(255),
        categorie      VARCHAR(60),
        est_couverture BOOLEAN      NOT NULL DEFAULT false,
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_etab_photos_tenant ON etablissement_photos (tenant_code, created_at DESC);
    `).catch((e) => { tablePrete = null; throw e; });
  }
  return tablePrete;
}

const texte = (v, max) => String(v || '').trim().slice(0, max) || null;
const categorie = (v) => (CATEGORIES_PHOTOS.includes(v) ? v : 'Autre');

async function listePhotos(code) {
  await preparerTable();
  return sequelize.query(
    `SELECT id, image_url, legende, categorie, est_couverture, created_at FROM etablissement_photos
      WHERE tenant_code = :code ORDER BY est_couverture DESC, created_at DESC`,
    { replacements: { code }, type: Q.SELECT }
  );
}

/** Routes de la gestion (verifyTenant : propriétaire et employés selon leurs droits). */
export function ajouterRoutesPhotosSite(router, authentifier, verifyTenant) {
  const base = '/:tenantCode/photos-site';

  router.get(base, authentifier, verifyTenant, async (req, res) => {
    try { res.json({ success: true, photos: await listePhotos(req.params.tenantCode), categories: CATEGORIES_PHOTOS }); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });

  router.post(base, authentifier, verifyTenant, async (req, res) => {
    try {
      await preparerTable();
      const code = req.params.tenantCode;
      const [{ n }] = await sequelize.query('SELECT COUNT(*)::int AS n FROM etablissement_photos WHERE tenant_code = :code', { replacements: { code }, type: Q.SELECT });
      if (n >= MAX_PHOTOS) return res.status(400).json({ success: false, message: `${MAX_PHOTOS} photos au maximum. Supprimez-en une pour en ajouter une autre.` });
      if (!/^data:image\/(jpeg|png|webp|gif);base64,/.test(String(req.body?.image || ''))) {
        return res.status(400).json({ success: false, message: 'Choisissez une image (JPG, PNG ou WEBP).' });
      }
      const url = await photoDepuisFormulaire(req.body.image, { proprietaire: code, usage: 'photo-site' });
      if (!url) return res.status(400).json({ success: false, message: 'Image illisible. Essayez une autre photo.' });
      const couverture = !!req.body?.couverture;
      if (couverture) await sequelize.query('UPDATE etablissement_photos SET est_couverture = false WHERE tenant_code = :code', { replacements: { code } });
      const [photo] = await sequelize.query(
        `INSERT INTO etablissement_photos (tenant_code, image_url, legende, categorie, est_couverture)
         VALUES (:code, :url, :legende, :cat, :couv) RETURNING *`,
        { replacements: { code, url, legende: texte(req.body?.legende, 255), cat: categorie(req.body?.categorie), couv: couverture }, type: Q.SELECT }
      );
      res.json({ success: true, photo });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });

  router.put(`${base}/:id`, authentifier, verifyTenant, async (req, res) => {
    try {
      await preparerTable();
      const code = req.params.tenantCode;
      if (req.body?.couverture === true) {
        await sequelize.query('UPDATE etablissement_photos SET est_couverture = false WHERE tenant_code = :code', { replacements: { code } });
      }
      const [photo] = await sequelize.query(
        `UPDATE etablissement_photos SET
           legende = COALESCE(:legende, legende),
           categorie = COALESCE(:cat, categorie),
           est_couverture = COALESCE(:couv, est_couverture)
         WHERE id = :id AND tenant_code = :code RETURNING *`,
        { replacements: {
          id: req.params.id, code,
          legende: req.body?.legende === undefined ? null : (texte(req.body.legende, 255) ?? ''),
          cat: req.body?.categorie === undefined ? null : categorie(req.body.categorie),
          couv: typeof req.body?.couverture === 'boolean' ? req.body.couverture : null,
        }, type: Q.SELECT }
      );
      if (!photo) return res.status(404).json({ success: false, message: 'Photo introuvable.' });
      res.json({ success: true, photo });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });

  router.delete(`${base}/:id`, authentifier, verifyTenant, async (req, res) => {
    try {
      await preparerTable();
      const [photo] = await sequelize.query(
        'DELETE FROM etablissement_photos WHERE id = :id AND tenant_code = :code RETURNING id',
        { replacements: { id: req.params.id, code: req.params.tenantCode }, type: Q.SELECT }
      );
      if (!photo) return res.status(404).json({ success: false, message: 'Photo introuvable.' });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });
}

/** Lecture publique, pour le site vitrine (sans connexion). */
export function ajouterRoutesPhotosPubliques(router) {
  router.get('/etablissement/:tenantCode/photos', async (req, res) => {
    try { res.json({ success: true, photos: await listePhotos(req.params.tenantCode) }); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });
}

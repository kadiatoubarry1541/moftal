import express from 'express';
import { sequelize } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { liensDe } from '../utils/liens.js';

/**
 * Pastilles « nouveautés » : ce que les AUTRES ont publié dans une rubrique
 * depuis la dernière visite de la personne.
 *
 *   GET  /api/nouveautes          → { terreAdam, recit, galerie, amitie }  (chaque nombre plafonné à 11 :
 *                                    l'écran affiche « 10+ » au-delà de 10)
 *   POST /api/nouveautes/vu       { rubrique } → la rubrique est vue maintenant
 *
 * La date de visite est gardée en base (jamais seulement dans le téléphone) :
 * la pastille reste juste sur un autre appareil. Pour une rubrique jamais
 * visitée, on part de maintenant (pas de « 10+ » partout le premier jour).
 */
const router = express.Router();
router.use(authenticate);

export const RUBRIQUES = ['terreAdam', 'recit', 'galerie', 'amitie'];
const PLAFOND = 11;
const Q = sequelize.QueryTypes;

let tablePrete = null;
const preparerTable = () => (tablePrete ||= sequelize.query(`
  CREATE TABLE IF NOT EXISTS nouveautes_vues (
    numero_h  VARCHAR(100) NOT NULL,
    rubrique  VARCHAR(30)  NOT NULL,
    vu_le     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    PRIMARY KEY (numero_h, rubrique)
  )`).catch((e) => { tablePrete = null; throw e; }));

/** Une valeur de lieu est réelle si elle est renseignée (pas « non spécifié »). */
const lieuReel = (v) => {
  const t = typeof v === 'string' ? v.trim() : '';
  return t && !['non spécifié', 'non specifie'].includes(t.toLowerCase()) ? t.toLowerCase() : null;
};

/** Ses quartiers (résidences 1, 2, 3), comme la page Terre d'Adam les calcule. */
const quartiersDe = (u) => [...new Set([
  lieuReel(u.lieu1) || lieuReel(u.lieuResidence1),
  lieuReel(u.lieu2) || lieuReel(u.lieuResidence2),
  lieuReel(u.lieu3) || lieuReel(u.lieuResidence3),
].filter(Boolean))];

async function compter(sql, replacements) {
  const [r] = await sequelize.query(`SELECT COUNT(*)::int AS n FROM (${sql} LIMIT ${PLAFOND}) x`, { replacements, type: Q.SELECT });
  return r?.n || 0;
}

router.get('/', async (req, res) => {
  try {
    await preparerTable();
    const u = req.user;
    const nh = u.numeroH;
    // Rubriques jamais visitées : on part de maintenant
    await sequelize.query(
      `INSERT INTO nouveautes_vues (numero_h, rubrique) SELECT :nh, r FROM unnest(ARRAY[:rubriques]::text[]) r
       ON CONFLICT (numero_h, rubrique) DO NOTHING`,
      { replacements: { nh, rubriques: RUBRIQUES } }
    );
    const vues = Object.fromEntries((await sequelize.query(
      `SELECT rubrique, vu_le FROM nouveautes_vues WHERE numero_h = :nh`, { replacements: { nh }, type: Q.SELECT }
    )).map((r) => [r.rubrique, r.vu_le]));

    const quartiers = quartiersDe(u);
    // Amitié : amis acceptés + famille + voisins (les mêmes que le fil d'Amitié)
    const [amis, liens] = await Promise.all([
      sequelize.query(
        `SELECT CASE WHEN user_numero_h = :nh THEN friend_numero_h ELSE user_numero_h END AS autre
           FROM friends WHERE status = 'accepted' AND (user_numero_h = :nh OR friend_numero_h = :nh)`,
        { replacements: { nh }, type: Q.SELECT }
      ).catch(() => []),
      liensDe(u).catch(() => ({ famille: new Set(), voisin: new Set() })),
    ]);
    const proches = [...new Set([...amis.map((a) => a.autre), ...liens.famille, ...liens.voisin])].filter((x) => x && x !== nh);

    const [terreAdam, recit, galerie, amitie] = await Promise.all([
      // Actualités de ses quartiers : publiées là, ou partagées vers là
      quartiers.length ? compter(
        `SELECT a.id FROM dev_actualites a
          WHERE a.scope = 'quartier' AND LOWER(a.location) IN (:q) AND a.created_at > :vu AND a.numero_h <> :nh
         UNION
         SELECT p.actualite_id FROM dev_actualite_partages p JOIN dev_actualites a ON a.id = p.actualite_id
          WHERE p.scope = 'quartier' AND LOWER(p.location) IN (:q) AND p.created_at > :vu AND a.numero_h <> :nh`,
        { q: quartiers, vu: vues.terreAdam, nh }
      ).catch(() => 0) : 0,
      // Récits publiés par les autres
      compter(
        `SELECT id FROM published_stories WHERE is_published = true AND section_id <> 'mes_amours_story'
            AND COALESCE(published_at, created_at) > :vu AND numero_h <> :nh`,
        { vu: vues.recit, nh }
      ).catch(() => 0),
      // Photos et vidéos ajoutées à la galerie de sa famille par les autres
      u.nomFamille ? compter(
        `SELECT id FROM family_gallery WHERE family_name = :fam AND created_at > :vu AND uploader_numero_h <> :nh`,
        { fam: u.nomFamille, vu: vues.galerie, nh }
      ).catch(() => 0) : 0,
      // Amitié : stories des proches (encore visibles, 24 h) + demandes d'amis reçues
      compter(
        `SELECT id::text FROM published_stories
          WHERE section_id = 'mes_amours_story' AND is_published = true
            AND COALESCE(published_at, created_at) > GREATEST(:vu, NOW() - INTERVAL '24 hours')
            AND numero_h IN (:proches)
         UNION ALL
         SELECT id::text FROM friends WHERE friend_numero_h = :nh AND status = 'pending' AND created_at > :vu`,
        { vu: vues.amitie, nh, proches: proches.length ? proches : ['—'] }
      ).catch(() => 0),
    ]);
    res.json({ success: true, terreAdam, recit, galerie, amitie });
  } catch (e) {
    console.error('nouveautes GET:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

router.post('/vu', async (req, res) => {
  try {
    const rubrique = String(req.body?.rubrique || '');
    if (!RUBRIQUES.includes(rubrique)) return res.status(400).json({ success: false, message: 'Rubrique inconnue.' });
    await preparerTable();
    await sequelize.query(
      `INSERT INTO nouveautes_vues (numero_h, rubrique, vu_le) VALUES (:nh, :r, NOW())
       ON CONFLICT (numero_h, rubrique) DO UPDATE SET vu_le = NOW()`,
      { replacements: { nh: req.user.numeroH, r: rubrique } }
    );
    res.json({ success: true });
  } catch (e) {
    console.error('nouveautes vu:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;

import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { sequelize } from '../config/database.js';
import QuartierFund from '../models/QuartierFund.js';
import DevPublisher from '../models/DevPublisher.js';
import User from '../models/User.js';
import { normaliserLieu } from '../utils/responsablesQuartier.js';

/**
 * Responsables d'une localité : chef de quartier, maire, sous-préfet, préfet,
 * gouverneur… Ce sont des activités du profil. La personne demande la
 * validation depuis son espace ; l'administrateur de Moftal vérifie et valide.
 *
 * Une fois validé :
 *  - il peut publier dans les actualités de sa localité (DevPublisher) ;
 *  - un chef de quartier devient l'un des 3 responsables de son quartier
 *    (chef de la Caisse) : il voit la caisse totale et la liste des membres.
 *
 * Personne n'est nommé « provisoirement » : un quartier sans chef validé reste
 * sans responsable (seuls les administrateurs de Moftal y ont ces droits).
 */
const router = express.Router();
router.use(authenticate);

/** Rôle → activité du profil qui y donne droit, et niveau de la localité. */
export const ROLES_RESPONSABLE = {
  chef_quartier: { libelle: 'Chef de quartier', activites: ['Chef de quartier', 'Chef de secteur', 'Chef de village', 'Chef de district'], scope: 'quartier' },
  maire: { libelle: 'Maire', activites: ['Maire'], scope: 'sous-prefecture' },
  sous_prefet: { libelle: 'Sous-préfet', activites: ['Sous-préfet'], scope: 'sous-prefecture' },
  prefet: { libelle: 'Préfet', activites: ['Préfet'], scope: 'prefecture' },
  gouverneur: { libelle: 'Gouverneur', activites: ['Gouverneur'], scope: 'region' },
};

const activitesDe = (u) => [u.activite1, u.activite2, u.activite3].filter(Boolean).map(String);

let tablePrete = null;
const preparerTable = () => (tablePrete ||= sequelize.query(`
  CREATE TABLE IF NOT EXISTS demandes_responsable (
    id            SERIAL PRIMARY KEY,
    numero_h      VARCHAR(100) NOT NULL,
    nom           VARCHAR(255),
    role          VARCHAR(30)  NOT NULL,
    scope         VARCHAR(30)  NOT NULL,
    location      VARCHAR(255) NOT NULL,
    location_name VARCHAR(255),
    statut        VARCHAR(20)  NOT NULL DEFAULT 'en_attente',
    motif_refus   TEXT,
    decide_par    VARCHAR(100),
    decide_le     TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )`).catch((e) => { tablePrete = null; throw e; }));

const Q = () => sequelize.QueryTypes;

// GET /api/responsables/moi — rôles que mon profil permet de demander + mes demandes
router.get('/moi', async (req, res) => {
  try {
    await preparerTable();
    const mesActivites = activitesDe(req.user);
    const rolesPossibles = Object.entries(ROLES_RESPONSABLE)
      .filter(([, r]) => r.activites.some((a) => mesActivites.includes(a)))
      .map(([id, r]) => ({ id, libelle: r.libelle, scope: r.scope }));
    const demandes = await sequelize.query(
      `SELECT id, role, scope, location, location_name AS "locationName", statut, motif_refus AS "motifRefus", created_at AS "createdAt"
         FROM demandes_responsable WHERE numero_h = :nh ORDER BY created_at DESC LIMIT 20`,
      { replacements: { nh: req.user.numeroH }, type: Q().SELECT }
    );
    res.json({ success: true, rolesPossibles, demandes });
  } catch (e) {
    console.error('responsables/moi:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST /api/responsables/demande { role, location, locationName }
router.post('/demande', async (req, res) => {
  try {
    await preparerTable();
    const { role, location, locationName } = req.body || {};
    const def = ROLES_RESPONSABLE[role];
    if (!def) return res.status(400).json({ success: false, message: 'Rôle inconnu.' });
    if (!def.activites.some((a) => activitesDe(req.user).includes(a))) {
      return res.status(403).json({ success: false, message: `Choisissez d'abord « ${def.libelle} » dans les activités de votre profil.` });
    }
    const loc = String(location || '').trim();
    if (!loc) return res.status(400).json({ success: false, message: 'Lieu manquant : complétez votre lieu de résidence.' });

    const [deja] = await sequelize.query(
      `SELECT id, statut FROM demandes_responsable
        WHERE numero_h = :nh AND role = :role AND LOWER(location) = LOWER(:loc) AND statut IN ('en_attente', 'approuve')`,
      { replacements: { nh: req.user.numeroH, role, loc }, type: Q().SELECT }
    );
    if (deja) {
      return res.status(400).json({ success: false, message: deja.statut === 'approuve' ? 'Vous êtes déjà validé pour ce lieu.' : 'Votre demande est déjà envoyée. L\'administrateur va la vérifier.' });
    }
    await sequelize.query(
      `INSERT INTO demandes_responsable (numero_h, nom, role, scope, location, location_name)
       VALUES (:nh, :nom, :role, :scope, :loc, :ln)`,
      {
        replacements: {
          nh: req.user.numeroH,
          nom: `${req.user.prenom || ''} ${req.user.nomFamille || ''}`.trim() || req.user.numeroH,
          role, scope: def.scope, loc, ln: String(locationName || loc).slice(0, 255),
        },
      }
    );
    res.json({ success: true, message: 'Demande envoyée. L\'administrateur va la vérifier.' });
  } catch (e) {
    console.error('responsables/demande:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ── Administration ─────────────────────────────────────────────────────────

// GET /api/responsables/admin?statut=en_attente
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    await preparerTable();
    const statut = ['en_attente', 'approuve', 'refuse'].includes(req.query.statut) ? req.query.statut : 'en_attente';
    const demandes = await sequelize.query(
      `SELECT d.id, d.numero_h AS "numeroH", d.nom, d.role, d.scope, d.location, d.location_name AS "locationName",
              d.statut, d.motif_refus AS "motifRefus", d.created_at AS "createdAt",
              u.photo, u.tel1, u.activite1, u.activite2, u.activite3
         FROM demandes_responsable d LEFT JOIN users u ON u.numero_h = d.numero_h
        WHERE d.statut = :statut ORDER BY d.created_at DESC LIMIT 200`,
      { replacements: { statut }, type: Q().SELECT }
    );
    res.json({ success: true, demandes: demandes.map((d) => ({ ...d, roleLibelle: ROLES_RESPONSABLE[d.role]?.libelle || d.role })) });
  } catch (e) {
    console.error('responsables/admin:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

/** Place la personne parmi les 3 chefs de la caisse de son quartier (crée la caisse au besoin). */
async function placerChefQuartier(user, location, locationName, transaction) {
  const loc = String(location).toLowerCase();
  const fonds = await QuartierFund.findAll({ where: { scope: 'quartier', isActive: true }, transaction, lock: transaction.LOCK.UPDATE });
  let fund = fonds.find((f) => normaliserLieu(f.location) === normaliserLieu(loc));
  const infos = (i) => ({
    [`chef${i}NumeroH`]: user.numeroH,
    [`chef${i}Nom`]: `${user.prenom || ''} ${user.nomFamille || ''}`.trim(),
    [`chef${i}Photo`]: user.photo || null,
  });
  if (!fund) {
    await QuartierFund.create({ scope: 'quartier', location: loc, locationName: locationName || location, ...infos(1) }, { transaction });
    return { ok: true };
  }
  if ([1, 2, 3].some((i) => fund[`chef${i}NumeroH`] === user.numeroH)) return { ok: true };
  const libre = [1, 2, 3].find((i) => !fund[`chef${i}NumeroH`]);
  if (!libre) {
    return { ok: false, message: 'Les 3 places de responsables de ce quartier sont déjà prises. Retirez d\'abord un responsable dans la Caisse du quartier.' };
  }
  await fund.update(infos(libre), { transaction });
  return { ok: true };
}

// POST /api/responsables/admin/:id/approuver
router.post('/admin/:id/approuver', requireAdmin, async (req, res) => {
  try {
    await preparerTable();
    const resultat = await sequelize.transaction(async (transaction) => {
      const [d] = await sequelize.query(
        `SELECT * FROM demandes_responsable WHERE id = :id FOR UPDATE`,
        { replacements: { id: Number(req.params.id) || 0 }, type: Q().SELECT, transaction }
      );
      if (!d) return { statut: 404, message: 'Demande introuvable.' };
      if (d.statut !== 'en_attente') return { statut: 400, message: 'Cette demande a déjà été traitée.' };
      const def = ROLES_RESPONSABLE[d.role];
      const user = await User.findOne({ where: { numeroH: d.numero_h }, transaction });
      if (!def || !user) return { statut: 400, message: 'Personne ou rôle introuvable.' };

      // Chef de quartier : l'un des 3 responsables du quartier
      if (d.role === 'chef_quartier') {
        const r = await placerChefQuartier(user, d.location, d.location_name, transaction);
        if (!r.ok) return { statut: 400, message: r.message };
      }
      // Tous : droit de publier dans les actualités de sa localité
      const loc = String(d.location).toLowerCase();
      const existe = await DevPublisher.findOne({ where: { numeroH: user.numeroH, scope: d.scope, location: loc }, transaction });
      if (!existe) {
        await DevPublisher.create({
          numeroH: user.numeroH,
          name: d.nom,
          role: def.libelle,
          scope: d.scope,
          location: loc,
          addedBy: req.user.numeroH,
        }, { transaction });
      }
      await sequelize.query(
        `UPDATE demandes_responsable SET statut = 'approuve', decide_par = :par, decide_le = NOW() WHERE id = :id`,
        { replacements: { par: req.user.numeroH, id: d.id }, transaction }
      );
      return { statut: 200, message: `${d.nom} est validé(e) : ${def.libelle} — ${d.location_name || d.location}.` };
    });
    res.status(resultat.statut).json({ success: resultat.statut === 200, message: resultat.message });
  } catch (e) {
    console.error('responsables/approuver:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST /api/responsables/admin/:id/refuser { motif }
router.post('/admin/:id/refuser', requireAdmin, async (req, res) => {
  try {
    await preparerTable();
    const [r] = await sequelize.query(
      `UPDATE demandes_responsable SET statut = 'refuse', motif_refus = :motif, decide_par = :par, decide_le = NOW()
        WHERE id = :id AND statut = 'en_attente' RETURNING id`,
      { replacements: { id: Number(req.params.id) || 0, motif: String(req.body?.motif || '').slice(0, 500) || null, par: req.user.numeroH }, type: Q().SELECT }
    );
    if (!r) return res.status(400).json({ success: false, message: 'Demande introuvable ou déjà traitée.' });
    res.json({ success: true, message: 'Demande refusée.' });
  } catch (e) {
    console.error('responsables/refuser:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

export default router;

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import QuartierFund from '../models/QuartierFund.js';
import QuartierFundRequest from '../models/QuartierFundRequest.js';
import User from '../models/User.js';
import { sequelize } from '../config/database.js';
import { RIZ_TENANT_CODE } from './familyFund.js';

// Compte Solidarité — uniquement quartier et sous-préfecture (on ne peut pas
// cibler tous les secteurs). Deux volets seulement : santé (paiement direct
// hôpital) et orphelins (achat direct de riz, jamais de cash). Géré par 2 ou
// 3 chefs ; tout paiement demande 2 confirmations minimum avant exécution.

const SCOPES_VALIDES = ['quartier', 'sous-prefecture'];

const isJournalistOrAdmin = (user) =>
  user.isMasterAdmin ||
  user.role === 'admin' ||
  user.role === 'super-admin' ||
  user.role === 'journalist' ||
  user.isJournalist === true;

async function trouverFund(scope, location) {
  return QuartierFund.findOne({
    where: { scope, location: (location || '').toLowerCase(), isActive: true }
  });
}

function formatFund(fund, numeroH) {
  return {
    id: fund.id,
    scope: fund.scope,
    location: fund.location,
    locationName: fund.locationName,
    soldes: {
      sante:         Number(fund.solde_sante),
      orphelins:     Number(fund.solde_orphelins),
      developpement: Number(fund.solde_developpement),
      disponible:    fund.getSoldeDisponible(),
      total:         fund.getSoldeTotal()
    },
    totalDepose:  Number(fund.total_depose),
    totalDepense: Number(fund.total_depense),
    chefs: [
      fund.chef1NumeroH && { numeroH: fund.chef1NumeroH, nom: fund.chef1Nom, photo: fund.chef1Photo },
      fund.chef2NumeroH && { numeroH: fund.chef2NumeroH, nom: fund.chef2Nom, photo: fund.chef2Photo },
      fund.chef3NumeroH && { numeroH: fund.chef3NumeroH, nom: fund.chef3Nom, photo: fund.chef3Photo },
    ].filter(Boolean),
    seuilConfirmation: fund.getSeuilConfirmation(),
    estChef: fund.estChef(numeroH)
  };
}

const router = express.Router();
router.use(authenticate);

// ─────────────────────────────────────────────
// GET /api/quartier-fund/mon-compte?scope=&location=
// ─────────────────────────────────────────────
router.get('/mon-compte', async (req, res) => {
  try {
    const { scope, location, locationName } = req.query;
    if (!scope || !location) {
      return res.status(400).json({ success: false, message: 'scope et location requis.' });
    }
    if (!SCOPES_VALIDES.includes(scope)) {
      return res.json({ success: true, existe: false, disponible: false });
    }

    const fund = await trouverFund(scope, location);
    if (!fund) {
      return res.json({
        success: true,
        existe: false,
        disponible: true,
        peutCreer: isJournalistOrAdmin(req.user)
      });
    }

    const demandes = await QuartierFundRequest.findAll({
      where: { fundId: fund.id },
      order: [['created_at', 'DESC']],
      limit: 30
    });

    res.json({
      success: true,
      existe: true,
      compte: formatFund(fund, req.user.numeroH),
      demandes: demandes.map(d => ({
        id: d.id,
        type: d.type,
        montant: Number(d.montant),
        nombreSacs: d.nombreSacs,
        beneficiaireNom: d.beneficiaireNom,
        description: d.description,
        demandeurNom: d.demandeurNom,
        confirmations: d.confirmations,
        statut: d.statut,
        date: d.created_at
      }))
    });
  } catch (err) {
    console.error('quartier-fund/mon-compte:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/quartier-fund/creer
// Admin/journaliste — crée le compte pour un quartier ou une sous-préfecture
// ─────────────────────────────────────────────
router.post('/creer', async (req, res) => {
  try {
    if (!isJournalistOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Réservé aux administrateurs/journalistes.' });
    }
    const { scope, location, locationName, chef1NumeroH, chef2NumeroH, chef3NumeroH } = req.body;
    if (!scope || !location) {
      return res.status(400).json({ success: false, message: 'scope et location requis.' });
    }
    if (!SCOPES_VALIDES.includes(scope)) {
      return res.status(400).json({ success: false, message: 'Le Compte Solidarité n\'existe que pour un quartier ou une sous-préfecture.' });
    }
    const loc = location.toLowerCase();
    const existe = await trouverFund(scope, loc);
    if (existe) {
      return res.status(400).json({ success: false, message: 'Ce compte existe déjà.' });
    }
    if (!chef1NumeroH || !chef2NumeroH) {
      return res.status(400).json({ success: false, message: 'Il faut désigner au moins 2 chefs (2 confirmations sont requises pour chaque paiement).' });
    }

    const updates = { scope, location: loc, locationName: locationName || location };
    for (const [i, num] of [[1, chef1NumeroH], [2, chef2NumeroH], [3, chef3NumeroH]]) {
      if (!num) continue;
      const u = await User.findOne({ where: { numeroH: num } });
      if (!u) return res.status(404).json({ success: false, message: `Chef ${i} introuvable avec ce numéro H.` });
      updates[`chef${i}NumeroH`] = num;
      updates[`chef${i}Nom`] = `${u.prenom || ''} ${u.nomFamille || ''}`.trim();
      updates[`chef${i}Photo`] = u.photo || null;
    }

    const fund = await QuartierFund.create(updates);
    res.json({ success: true, message: 'Compte Solidarité créé avec succès.', fundId: fund.id });
  } catch (err) {
    console.error('quartier-fund/creer:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/quartier-fund/chefs
// Change les chefs (admin, ou un chef actuel du compte)
// ─────────────────────────────────────────────
router.put('/chefs', async (req, res) => {
  try {
    const { scope, location, chef1NumeroH, chef2NumeroH, chef3NumeroH } = req.body;
    const fund = await trouverFund(scope, location);
    if (!fund) return res.status(404).json({ success: false, message: 'Compte introuvable.' });

    if (!fund.estChef(req.user.numeroH) && !isJournalistOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Seul un chef actuel ou un administrateur peut changer les chefs.' });
    }

    const updates = {};
    for (const [i, num] of [[1, chef1NumeroH], [2, chef2NumeroH], [3, chef3NumeroH]]) {
      if (num === undefined) continue;
      if (!num) { updates[`chef${i}NumeroH`] = null; updates[`chef${i}Nom`] = null; updates[`chef${i}Photo`] = null; continue; }
      const u = await User.findOne({ where: { numeroH: num } });
      if (!u) return res.status(404).json({ success: false, message: `Chef ${i} introuvable avec ce numéro H.` });
      updates[`chef${i}NumeroH`] = num;
      updates[`chef${i}Nom`] = `${u.prenom || ''} ${u.nomFamille || ''}`.trim();
      updates[`chef${i}Photo`] = u.photo || null;
    }

    await fund.update(updates);
    res.json({ success: true, message: 'Chefs mis à jour avec succès.' });
  } catch (err) {
    console.error('quartier-fund/chefs:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// Exécute réellement le paiement une fois le seuil de confirmations atteint.
// Pour 'orphelins' : achat de riz auprès du fournisseur riz de l'admin (comme
// le compte famille). Pour 'sante' : enregistrement seul, le paiement direct
// à l'hôpital se fait hors-app par les chefs.
async function executerPaiement(fund, demande) {
  const champSolde = demande.type === 'sante' ? 'solde_sante' : 'solde_orphelins';
  const soldeActuel = Number(fund[champSolde]);
  const montant = Number(demande.montant);

  if (soldeActuel < montant) {
    return { ok: false, message: `Solde insuffisant (${soldeActuel.toLocaleString()} GNF disponibles).` };
  }

  if (demande.type === 'orphelins') {
    const sacs = Number(demande.nombreSacs) || 1;
    const [produit] = await sequelize.query(
      `SELECT * FROM supplier_products WHERE tenant_code=:code AND nom ILIKE '%riz%' AND is_active=true ORDER BY id DESC LIMIT 1`,
      { replacements: { code: RIZ_TENANT_CODE }, type: sequelize.QueryTypes.SELECT }
    );
    if (produit) {
      await sequelize.query(
        `UPDATE supplier_products SET stock = GREATEST(stock - :sacs, 0) WHERE tenant_code=:code AND id=:id`,
        { replacements: { sacs, code: RIZ_TENANT_CODE, id: produit.id } }
      ).catch(() => {});
      await sequelize.query(
        `INSERT INTO supplier_orders (tenant_code, client_nom, montant_total, statut, notes)
         VALUES (:code, :clientNom, :montant, 'en_attente', :notes)`,
        {
          replacements: {
            code: RIZ_TENANT_CODE,
            clientNom: `Compte Solidarité — ${fund.locationName || fund.location}`,
            montant,
            notes: `${sacs} sac(s) de riz — ${demande.description || `orphelin ${demande.beneficiaireNom || ''}`}`
          }
        }
      ).catch(() => {});
    }
  }

  await fund.update({
    [champSolde]: soldeActuel - montant,
    total_depense: Number(fund.total_depense) + montant
  });
  await demande.update({ statut: 'approuve', executedAt: new Date() });

  return { ok: true };
}

// ─────────────────────────────────────────────
// POST /api/quartier-fund/demander
// Un chef initie une demande de paiement (compte comme sa confirmation)
// ─────────────────────────────────────────────
router.post('/demander', async (req, res) => {
  try {
    const { scope, location, type, montant, nombreSacs, beneficiaireNom, beneficiaireContact, description } = req.body;
    const fund = await trouverFund(scope, location);
    if (!fund) return res.status(404).json({ success: false, message: 'Compte introuvable.' });

    if (!fund.estChef(req.user.numeroH)) {
      return res.status(403).json({ success: false, message: 'Seuls les chefs de ce compte peuvent demander un paiement.' });
    }
    if (!['sante', 'orphelins'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type de demande invalide.' });
    }

    let m;
    let sacs = null;
    if (type === 'orphelins') {
      // Jamais confiance au montant envoyé par le client : recalculé depuis le
      // prix réel du riz, comme pour le compte famille.
      sacs = parseInt(nombreSacs, 10);
      if (!sacs || sacs < 1) {
        return res.status(400).json({ success: false, message: 'Indiquez un nombre de sacs de riz valide.' });
      }
      const [produit] = await sequelize.query(
        `SELECT * FROM supplier_products WHERE tenant_code=:code AND nom ILIKE '%riz%' AND is_active=true ORDER BY id DESC LIMIT 1`,
        { replacements: { code: RIZ_TENANT_CODE }, type: sequelize.QueryTypes.SELECT }
      );
      if (!produit) {
        return res.status(404).json({ success: false, message: "Le riz n'est pas disponible pour le moment." });
      }
      if (Number(produit.stock) < sacs) {
        return res.status(400).json({ success: false, message: `Stock insuffisant. Disponible : ${produit.stock} sac(s).` });
      }
      m = Number(produit.prix_detail) * sacs;
    } else {
      m = parseInt(montant, 10);
      if (!m || m <= 0) {
        return res.status(400).json({ success: false, message: 'Montant invalide.' });
      }
    }

    const demande = await QuartierFundRequest.create({
      fundId: fund.id,
      type,
      montant: m,
      nombreSacs: sacs,
      beneficiaireNom: beneficiaireNom || null,
      beneficiaireContact: beneficiaireContact || null,
      description: description || null,
      demandeurNumeroH: req.user.numeroH,
      demandeurNom: `${req.user.prenom || ''} ${req.user.nomFamille || ''}`.trim(),
      confirmations: [{ numeroH: req.user.numeroH, nom: `${req.user.prenom || ''} ${req.user.nomFamille || ''}`.trim(), date: new Date() }]
    });

    // Cas rare : un seul chef désigné sur le compte → sa propre demande suffit
    if (demande.confirmations.length >= fund.getSeuilConfirmation()) {
      const resultat = await executerPaiement(fund, demande);
      if (!resultat.ok) {
        return res.status(400).json({ success: false, message: resultat.message });
      }
    }

    res.json({ success: true, message: 'Demande créée. En attente de confirmation par un autre chef.', demandeId: demande.id });
  } catch (err) {
    console.error('quartier-fund/demander:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/quartier-fund/confirmer/:id
// Un autre chef confirme — exécute le paiement dès 2 confirmations
// ─────────────────────────────────────────────
router.post('/confirmer/:id', async (req, res) => {
  try {
    const demande = await QuartierFundRequest.findByPk(req.params.id);
    if (!demande) return res.status(404).json({ success: false, message: 'Demande introuvable.' });
    if (demande.statut !== 'en_attente') {
      return res.status(400).json({ success: false, message: `Cette demande est déjà ${demande.statut}.` });
    }

    const fund = await QuartierFund.findByPk(demande.fundId);
    if (!fund) return res.status(404).json({ success: false, message: 'Compte introuvable.' });
    if (!fund.estChef(req.user.numeroH)) {
      return res.status(403).json({ success: false, message: 'Seuls les chefs de ce compte peuvent confirmer.' });
    }

    const dejaConfirme = demande.confirmations.some(c => c.numeroH === req.user.numeroH);
    if (dejaConfirme) {
      return res.status(400).json({ success: false, message: 'Vous avez déjà confirmé cette demande.' });
    }

    const nouvellesConfirmations = [
      ...demande.confirmations,
      { numeroH: req.user.numeroH, nom: `${req.user.prenom || ''} ${req.user.nomFamille || ''}`.trim(), date: new Date() }
    ];
    await demande.update({ confirmations: nouvellesConfirmations });

    if (nouvellesConfirmations.length >= fund.getSeuilConfirmation()) {
      const resultat = await executerPaiement(fund, demande);
      if (!resultat.ok) {
        return res.status(400).json({ success: false, message: resultat.message });
      }
      return res.json({ success: true, message: 'Paiement exécuté — seuil de confirmations atteint.', execute: true });
    }

    res.json({ success: true, message: 'Confirmation enregistrée. En attente d\'une confirmation supplémentaire.', execute: false });
  } catch (err) {
    console.error('quartier-fund/confirmer:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/quartier-fund/rejeter/:id
// Un chef peut annuler une demande en attente (veto simple, prudence)
// ─────────────────────────────────────────────
router.post('/rejeter/:id', async (req, res) => {
  try {
    const demande = await QuartierFundRequest.findByPk(req.params.id);
    if (!demande) return res.status(404).json({ success: false, message: 'Demande introuvable.' });
    if (demande.statut !== 'en_attente') {
      return res.status(400).json({ success: false, message: `Cette demande est déjà ${demande.statut}.` });
    }

    const fund = await QuartierFund.findByPk(demande.fundId);
    if (!fund || !fund.estChef(req.user.numeroH)) {
      return res.status(403).json({ success: false, message: 'Seuls les chefs de ce compte peuvent rejeter.' });
    }

    await demande.update({ statut: 'rejete', rejetePar: req.user.numeroH });
    res.json({ success: true, message: 'Demande rejetée.' });
  } catch (err) {
    console.error('quartier-fund/rejeter:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/quartier-fund/admin/tous — ADMIN — vue globale
// ─────────────────────────────────────────────
router.get('/admin/tous', async (req, res) => {
  try {
    if (!isJournalistOrAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' });
    }
    const fonds = await QuartierFund.findAll({ where: { isActive: true }, order: [['created_at', 'DESC']] });
    const totalGlobal = fonds.reduce((acc, f) => ({
      sante:         acc.sante         + Number(f.solde_sante),
      orphelins:     acc.orphelins     + Number(f.solde_orphelins),
      developpement: acc.developpement + Number(f.solde_developpement),
      depose:        acc.depose        + Number(f.total_depose),
      depense:       acc.depense       + Number(f.total_depense),
    }), { sante: 0, orphelins: 0, developpement: 0, depose: 0, depense: 0 });

    res.json({
      success: true,
      nbComptes: fonds.length,
      totalGlobal,
      comptes: fonds.map(f => formatFund(f, req.user.numeroH))
    });
  } catch (err) {
    console.error('quartier-fund/admin/tous:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

export default router;

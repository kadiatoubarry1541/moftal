import express from 'express';
import { authenticate } from '../middleware/auth.js';
import FamilyFund from '../models/FamilyFund.js';
import FamilyFundTransaction from '../models/FamilyFundTransaction.js';
import User from '../models/User.js';
import { FamilyTree } from '../models/additional.js';
import { Op } from 'sequelize';

// Vérifie si l'utilisateur est l'un des 3 admins du fonds (gérant1, gérant2 ou conseiller)
function estAdmin(fund, numeroH) {
  return fund.gerant1NumeroH === numeroH
    || fund.gerant2NumeroH === numeroH
    || fund.conseillerNumeroH === numeroH;
}

// Compte les membres actifs d'un arbre par nom de famille
async function compterMembresArbre(nomFamille) {
  try {
    const tree = await FamilyTree.findOne({
      where: { familyName: { [Op.iLike]: nomFamille.trim() } }
    });
    if (!tree) return 0;
    return Array.isArray(tree.members) ? tree.members.length : 0;
  } catch { return 0; }
}

// Détecte le Patriarche = le plus âgé membre vivant de l'arbre (dateNaissance la plus ancienne)
async function detecterPatriarche(nomFamille) {
  try {
    const tree = await FamilyTree.findOne({
      where: { familyName: { [Op.iLike]: nomFamille.trim() } }
    });
    if (!tree || !Array.isArray(tree.members) || tree.members.length === 0) return null;
    const membres = await User.findAll({
      where: {
        numeroH: { [Op.in]: tree.members },
        type: 'vivant',
        isActive: true,
        dateNaissance: { [Op.not]: null }
      },
      order: [['dateNaissance', 'ASC']],
      limit: 1
    });
    return membres[0] || null;
  } catch { return null; }
}

// Remplit les photos manquantes des gérants depuis leur profil User
async function remplirPhotosManquantes(fund) {
  const chefs = [
    { id: 'gerant1NumeroH', nom: 'gerant1Nom', photo: 'gerant1Photo' },
    { id: 'gerant2NumeroH', nom: 'gerant2Nom', photo: 'gerant2Photo' },
  ];
  const mises = {};
  for (const c of chefs) {
    if (fund[c.id] && !fund[c.photo]) {
      const u = await User.findOne({ where: { numeroH: fund[c.id] }, attributes: ['prenom', 'nomFamille', 'photo'] });
      if (u) {
        mises[c.photo] = u.photo || null;
        if (!fund[c.nom]) mises[c.nom] = `${u.prenom || ''} ${u.nomFamille || ''}`.trim();
      }
    }
  }
  if (Object.keys(mises).length > 0) await fund.update(mises);
}

const router = express.Router();
router.use(authenticate);

// ─────────────────────────────────────────────
// GET /api/family-fund/mon-compte
// Récupère le compte famille de l'utilisateur connecté
// ─────────────────────────────────────────────
router.get('/mon-compte', async (req, res) => {
  try {
    const { numeroH, nomFamille } = req.user;

    if (!nomFamille?.trim()) {
      return res.json({ success: true, existe: false, message: 'Aucun nom de famille dans votre profil.' });
    }

    let fund = await FamilyFund.findOne({
      where: { nomFamille: { [Op.iLike]: nomFamille.trim() }, isActive: true }
    });

    if (!fund) {
      const nbMembres = await compterMembresArbre(nomFamille);
      // Auto-création si l'arbre atteint 10 membres
      if (nbMembres >= 3) {
        fund = await FamilyFund.create({
          nomFamille: nomFamille.trim(),
          gerant1NumeroH: req.user.numeroH
        });
        // Ré-continuer sous le bloc fund existant
      } else {
        return res.json({
          success: true,
          existe: false,
          nbMembres,
          message: `Votre arbre a ${nbMembres} membre(s). Le Moftal Pay familial s'active automatiquement à 3 membres.`
        });
      }
    }

    // Auto-détecter le Patriarche = le plus âgé membre vivant
    try {
      const patriarche = await detecterPatriarche(nomFamille);
      if (patriarche && fund.conseillerNumeroH !== patriarche.numeroH) {
        await fund.update({
          conseillerNumeroH: patriarche.numeroH,
          conseillerNom: `${patriarche.prenom || ''} ${patriarche.nomFamille || ''}`.trim(),
          conseillerPhoto: patriarche.photo || null
        });
      }
    } catch { /* non bloquant */ }

    // Remplir les photos manquantes des gérants
    try { await remplirPhotosManquantes(fund); } catch { /* non bloquant */ }

    const transactions = await FamilyFundTransaction.findAll({
      where: { fundId: fund.id },
      order: [['created_at', 'DESC']],
      limit: 20
    });

    const nbMembres = await compterMembresArbre(nomFamille);

    // Récupérer le familyCode et bloodNumber depuis l'arbre
    let familyCode = null;
    let bloodNumber = null;
    try {
      const tree = await FamilyTree.findOne({
        where: { familyName: { [Op.iLike]: nomFamille.trim() } },
        attributes: ['familyCode', 'bloodNumber']
      });
      if (tree && nbMembres >= 3) {
        familyCode = tree.familyCode || null;
        bloodNumber = tree.bloodNumber || null;
      }
    } catch { /* non bloquant */ }

    res.json({
      success: true,
      existe: true,
      nbMembres,
      familyCode,
      bloodNumber,
      compte: {
        id: fund.id,
        nomFamille: fund.nomFamille,
        familyCode,
        bloodNumber,
        soldes: {
          reserve:    Number(fund.solde_reserve),
          sante:      Number(fund.solde_sante),
          nourriture: Number(fund.solde_nourriture),
          urgence:    Number(fund.solde_urgence),
          projet:     Number(fund.solde_projet),
          total:      Number(fund.solde_reserve) + Number(fund.solde_sante) +
                      Number(fund.solde_nourriture) + Number(fund.solde_urgence) +
                      Number(fund.solde_projet)
        },
        totalDepose:   Number(fund.total_depose),
        totalDepense:  Number(fund.total_depense),
        gerant1:        fund.gerant1NumeroH,
        gerant1Nom:     fund.gerant1Nom,
        gerant1Photo:   fund.gerant1Photo,
        gerant2:        fund.gerant2NumeroH,
        gerant2Nom:     fund.gerant2Nom,
        gerant2Photo:   fund.gerant2Photo,
        conseiller:     fund.conseillerNumeroH,
        conseillerNom:  fund.conseillerNom,
        conseillerPhoto: fund.conseillerPhoto,
        estAdmin:       estAdmin(fund, numeroH),
      },
      transactions: transactions.map(t => ({
        id:               t.id,
        type:             t.type,
        montant:          Number(t.montant),
        acteurNom:        t.acteurNom,
        beneficiaireNom:  t.beneficiaireNom,
        description:      t.description,
        repartition:      t.repartition,
        statut:           t.statut,
        date:             t.created_at
      }))
    });
  } catch (err) {
    console.error('family-fund/mon-compte:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/family-fund/creer
// Crée le compte famille (1 seul par famille)
// ─────────────────────────────────────────────
router.post('/creer', async (req, res) => {
  try {
    const { nomFamille } = req.user;

    if (!nomFamille?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Votre profil doit avoir un nom de famille pour créer un Moftal Pay.'
      });
    }

    // Vérification : l'arbre doit avoir au moins 10 membres
    const nbMembres = await compterMembresArbre(nomFamille);
    if (nbMembres < 3) {
      return res.status(403).json({
        success: false,
        message: `Votre arbre familial n'a que ${nbMembres} membre${nbMembres > 1 ? 's' : ''}. Le Moftal Pay familial s'ouvre à partir de 3 membres.`,
        nbMembres,
        requis: 3
      });
    }

    const existe = await FamilyFund.findOne({
      where: { nomFamille: { [Op.iLike]: nomFamille.trim() }, isActive: true }
    });
    if (existe) {
      return res.status(400).json({ success: false, message: 'Votre famille a déjà un compte.' });
    }

    // Le créateur devient gérant 1 par défaut
    const fund = await FamilyFund.create({
      nomFamille: nomFamille.trim(),
      gerant1NumeroH: req.user.numeroH
    });

    res.json({ success: true, message: 'Compte famille créé avec succès.', fundId: fund.id });
  } catch (err) {
    console.error('family-fund/creer:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// Les dépôts passent désormais par Djomy : le frontend (CompteFamille.tsx)
// appelle /api/djomy/initiate ou /api/djomy/gateway avec purpose='wallet_depot_famille'.
// Le crédit du compte est effectué par handlePostPayment (payment.js) une fois
// le paiement confirmé — voir /api/family-fund/mon-compte pour lire le solde à jour.

// ─────────────────────────────────────────────
// POST /api/family-fund/payer
// Effectue un paiement depuis le compte famille
// type: 'paiement_sante' | 'paiement_nourriture' | 'urgence' | 'projet'
// ─────────────────────────────────────────────
router.post('/payer', async (req, res) => {
  try {
    const { type, montant, beneficiaireNom, beneficiaireContact, description } = req.body;
    const { numeroH, nomFamille } = req.user;

    const typesValides = ['paiement_sante', 'paiement_nourriture', 'urgence', 'projet'];
    if (!typesValides.includes(type)) {
      return res.status(400).json({ success: false, message: 'Type de paiement invalide.' });
    }
    if (!montant || montant <= 0) {
      return res.status(400).json({ success: false, message: 'Montant invalide.' });
    }

    const fund = await FamilyFund.findOne({
      where: { nomFamille: { [Op.iLike]: nomFamille?.trim() }, isActive: true }
    });
    if (!fund) {
      return res.status(404).json({ success: false, message: 'Compte famille introuvable.' });
    }

    // Seuls les 3 admins peuvent payer : gérant1, gérant2 ou conseiller
    if (!estAdmin(fund, numeroH)) {
      return res.status(403).json({
        success: false,
        message: 'Seuls les 2 gérants élus ou le Conseiller (doyen de l\'arbre) peuvent effectuer des paiements.'
      });
    }

    // Vérifier le solde du bon compartiment
    const soldeMap = {
      paiement_sante:      'solde_sante',
      paiement_nourriture: 'solde_nourriture',
      urgence:             'solde_urgence',
      projet:              'solde_projet'
    };
    const champSolde = soldeMap[type];
    const soldeActuel = Number(fund[champSolde]);

    if (soldeActuel < montant) {
      return res.status(400).json({
        success: false,
        message: `Solde insuffisant. Disponible : ${soldeActuel.toLocaleString()} GNF`
      });
    }

    // Débiter le bon compartiment
    await fund.update({
      [champSolde]:    soldeActuel - montant,
      total_depense:   Number(fund.total_depense) + montant,
    });

    await FamilyFundTransaction.create({
      fundId:            fund.id,
      acteurNumeroH:     numeroH,
      acteurNom:         req.user.prenom || '',
      type,
      montant,
      beneficiaireNom:   beneficiaireNom || null,
      beneficiaireContact: beneficiaireContact || null,
      description:       description || null,
      statut:            'confirme'
    });

    res.json({
      success: true,
      message: `Paiement de ${montant.toLocaleString()} GNF effectué vers ${beneficiaireNom || 'le bénéficiaire'}.`,
      nouveauSolde: soldeActuel - montant
    });
  } catch (err) {
    console.error('family-fund/payer:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/family-fund/gerants
// Désigne les 2 gérants élus du compte famille (remplaçables par la famille)
// Seul un admin existant (gérant ou conseiller) peut changer les gérants
// ─────────────────────────────────────────────
router.put('/gerants', async (req, res) => {
  try {
    const { gerant1NumeroH, gerant2NumeroH } = req.body;
    const { nomFamille, numeroH } = req.user;

    const fund = await FamilyFund.findOne({
      where: { nomFamille: { [Op.iLike]: nomFamille?.trim() }, isActive: true }
    });
    if (!fund) return res.status(404).json({ success: false, message: 'Compte famille introuvable.' });

    const peutModifier = !fund.gerant1NumeroH || estAdmin(fund, numeroH);
    if (!peutModifier) {
      return res.status(403).json({ success: false, message: 'Seul un admin du compte peut changer les gérants.' });
    }

    const updates = { gerant1NumeroH, gerant2NumeroH };

    if (gerant1NumeroH) {
      const g1 = await User.findOne({ where: { numeroH: gerant1NumeroH } });
      if (!g1) return res.status(404).json({ success: false, message: 'Porte-parole introuvable avec ce numéro H.' });
      updates.gerant1Nom = `${g1.prenom || ''} ${g1.nomFamille || ''}`.trim();
      updates.gerant1Photo = g1.photo || null;
    }

    if (gerant2NumeroH) {
      const g2 = await User.findOne({ where: { numeroH: gerant2NumeroH } });
      if (!g2) return res.status(404).json({ success: false, message: 'Délégué introuvable avec ce numéro H.' });
      updates.gerant2Nom = `${g2.prenom || ''} ${g2.nomFamille || ''}`.trim();
      updates.gerant2Photo = g2.photo || null;
    }

    await fund.update(updates);
    res.json({ success: true, message: 'Gérants mis à jour avec succès.' });
  } catch (err) {
    console.error('family-fund/gerants:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/family-fund/conseiller
// Définit ou met à jour le Conseiller (doyen de l'arbre, admin à vie)
// Appelé automatiquement quand l'arbre atteint 10 membres
// ─────────────────────────────────────────────
router.put('/conseiller', async (req, res) => {
  try {
    const { conseillerNumeroH } = req.body;
    const { nomFamille, numeroH } = req.user;

    const fund = await FamilyFund.findOne({
      where: { nomFamille: { [Op.iLike]: nomFamille?.trim() }, isActive: true }
    });
    if (!fund) return res.status(404).json({ success: false, message: 'Compte famille introuvable.' });

    // Seul un admin existant ou le conseiller actuel peut changer le conseiller
    if (fund.conseillerNumeroH && fund.conseillerNumeroH !== numeroH && !estAdmin(fund, numeroH)) {
      return res.status(403).json({ success: false, message: 'Seul le Conseiller actuel peut passer son rôle.' });
    }

    const nouveauConseiller = await User.findOne({ where: { numeroH: conseillerNumeroH } });
    if (!nouveauConseiller) return res.status(404).json({ success: false, message: 'Membre introuvable.' });

    await fund.update({
      conseillerNumeroH,
      conseillerNom: `${nouveauConseiller.prenom || ''} ${nouveauConseiller.nomFamille || ''}`.trim(),
      conseillerPhoto: nouveauConseiller.photo || null
    });

    res.json({
      success: true,
      message: `${nouveauConseiller.prenom} ${nouveauConseiller.nomFamille} est maintenant le Conseiller de la famille.`
    });
  } catch (err) {
    console.error('family-fund/conseiller:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/family-fund/admin/tous
// ADMIN SEULEMENT — Voir tous les comptes famille sans limite
// ─────────────────────────────────────────────
router.get('/admin/tous', async (req, res) => {
  try {
    const { isMasterAdmin, canViewAll, role, isAdmin } = req.user;
    const estAdmin = isMasterAdmin || canViewAll || isAdmin || role === 'admin' || role === 'super-admin';
    if (!estAdmin) {
      return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' });
    }

    const fonds = await FamilyFund.findAll({
      where: { isActive: true },
      order: [['created_at', 'DESC']]
    });

    const totalGlobal = fonds.reduce((acc, f) => ({
      reserve:    acc.reserve    + Number(f.solde_reserve),
      sante:      acc.sante      + Number(f.solde_sante),
      nourriture: acc.nourriture + Number(f.solde_nourriture),
      urgence:    acc.urgence    + Number(f.solde_urgence),
      projet:     acc.projet     + Number(f.solde_projet),
      depose:     acc.depose     + Number(f.total_depose),
      depense:    acc.depense    + Number(f.total_depense),
    }), { reserve: 0, sante: 0, nourriture: 0, urgence: 0, projet: 0, depose: 0, depense: 0 });

    totalGlobal.total = totalGlobal.reserve + totalGlobal.sante +
                        totalGlobal.nourriture + totalGlobal.urgence + totalGlobal.projet;

    res.json({
      success: true,
      nbFamilles: fonds.length,
      totalGlobal,
      comptes: fonds.map(f => ({
        id:           f.id,
        nomFamille:   f.nomFamille,
        gerant1:      f.gerant1NumeroH,
        gerant2:      f.gerant2NumeroH,
        soldes: {
          reserve:    Number(f.solde_reserve),
          sante:      Number(f.solde_sante),
          nourriture: Number(f.solde_nourriture),
          urgence:    Number(f.solde_urgence),
          projet:     Number(f.solde_projet),
          total:      Number(f.solde_reserve) + Number(f.solde_sante) +
                      Number(f.solde_nourriture) + Number(f.solde_urgence) + Number(f.solde_projet)
        },
        totalDepose:  Number(f.total_depose),
        totalDepense: Number(f.total_depense),
        creeLe:       f.created_at
      }))
    });
  } catch (err) {
    console.error('family-fund/admin/tous:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/family-fund/admin/transactions/:fundId
// ADMIN — Voir toutes les transactions d'un compte famille
// ─────────────────────────────────────────────
router.get('/admin/transactions/:fundId', async (req, res) => {
  try {
    const { isMasterAdmin, canViewAll, role, isAdmin } = req.user;
    const estAdmin = isMasterAdmin || canViewAll || isAdmin || role === 'admin' || role === 'super-admin';
    if (!estAdmin) {
      return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' });
    }

    const transactions = await FamilyFundTransaction.findAll({
      where: { fundId: req.params.fundId },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      transactions: transactions.map(t => ({
        id:               t.id,
        type:             t.type,
        montant:          Number(t.montant),
        acteurNumeroH:    t.acteurNumeroH,
        acteurNom:        t.acteurNom,
        beneficiaireNom:  t.beneficiaireNom,
        beneficiaireContact: t.beneficiaireContact,
        description:      t.description,
        repartition:      t.repartition,
        fedapayRef:       t.fedapayRef,
        statut:           t.statut,
        date:             t.created_at
      }))
    });
  } catch (err) {
    console.error('family-fund/admin/transactions:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/family-fund/admin/depot-test
// Admin G7 : crédite un compte famille directement (test sans FedaPay)
// ─────────────────────────────────────────────
router.post('/admin/depot-test', async (req, res) => {
  try {
    const estAdmin = req.user.isMasterAdmin || req.user.isAdmin || req.user.role === 'admin';
    if (!estAdmin) return res.status(403).json({ success: false, message: 'Accès refusé.' });

    const { fundId, montant } = req.body;
    if (!fundId || !montant || montant < 100) {
      return res.status(400).json({ success: false, message: 'fundId et montant (min 100) requis.' });
    }

    const fund = await FamilyFund.findByPk(fundId);
    if (!fund) return res.status(404).json({ success: false, message: 'Compte famille introuvable.' });

    const repartition = FamilyFund.repartir(montant);
    await fund.update({
      solde_reserve:    Number(fund.solde_reserve)    + repartition.reserve,
      solde_sante:      Number(fund.solde_sante)      + repartition.sante,
      solde_nourriture: Number(fund.solde_nourriture) + repartition.nourriture,
      solde_urgence:    Number(fund.solde_urgence)    + repartition.urgence,
      solde_projet:     Number(fund.solde_projet)     + repartition.projet,
      total_depose:     Number(fund.total_depose)     + montant,
    });

    await FamilyFundTransaction.create({
      fundId: fund.id,
      acteurNumeroH: req.user.numeroH,
      acteurNom: `Admin G7 — ${req.user.prenom || ''} ${req.user.nomFamille || ''}`.trim(),
      type: 'depot',
      montant,
      repartition,
      statut: 'confirme',
      description: `[TEST ADMIN] Dépôt de simulation — ${montant.toLocaleString()} GNF`
    });

    res.json({
      success: true,
      message: `[TEST] ${montant.toLocaleString()} GNF crédités sur le compte famille "${fund.nomFamille}".`,
      repartition
    });
  } catch (err) {
    console.error('family-fund/admin/depot-test:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

export default router;

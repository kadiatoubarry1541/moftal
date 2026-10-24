import express from 'express';
import { authenticate, isProvisionalNumeroH } from '../middleware/auth.js';
import FamilyFund from '../models/FamilyFund.js';
import FamilyFundTransaction from '../models/FamilyFundTransaction.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { fondsDe, nbMembresArbre, estMembreArbre } from '../utils/fondsFamille.js';

// Tenant fournisseur dédié à l'admin pour la vente de riz aux familles
// (géré via /gestion-fournisseur/RIZ-MOFTAL-ADMIN, accessible au master admin)
export const RIZ_TENANT_CODE = 'RIZ-MOFTAL-ADMIN';

// Vérifie si l'utilisateur est l'un des 3 admins du fonds (gérant1, gérant2 ou conseiller)
function estAdmin(fund, numeroH) {
  return fund.gerant1NumeroH === numeroH
    || fund.gerant2NumeroH === numeroH
    || fund.conseillerNumeroH === numeroH;
}

// Détecte le Patriarche = le plus âgé membre vivant de l'arbre (dateNaissance la plus ancienne)
async function detecterPatriarche(arbre) {
  try {
    if (!arbre || !Array.isArray(arbre.members) || arbre.members.length === 0) return null;
    const membres = await User.findAll({
      where: {
        numeroH: { [Op.in]: arbre.members },
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

    if (!nomFamille?.trim() || isProvisionalNumeroH(numeroH)) {
      return res.json({ success: true, existe: false, message: 'Aucun nom de famille dans votre profil.' });
    }

    // Le compte appartient à l'arbre familial de la personne (sa lignée), jamais
    // à tous ceux qui portent le même nom
    let { fund, arbre } = await fondsDe(req.user);

    if (!fund) {
      const nbMembres = nbMembresArbre(arbre);
      // Auto-création dès 3 membres dans l'arbre
      if (arbre && nbMembres >= 3) {
        fund = await FamilyFund.create({
          nomFamille: (arbre.familyName || nomFamille).trim(),
          treeId: arbre.id,
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
      const patriarche = await detecterPatriarche(arbre);
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

    const nbMembres = nbMembresArbre(arbre);
    const familyCode = nbMembres >= 3 ? (arbre.familyCode || null) : null;
    const bloodNumber = nbMembres >= 3 ? (arbre.bloodNumber || null) : null;

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

    // L'arbre familial doit avoir au moins 3 membres
    const { fund: existe, arbre } = await fondsDe(req.user);
    const nbMembres = nbMembresArbre(arbre);
    if (!arbre || nbMembres < 3) {
      return res.status(403).json({
        success: false,
        message: `Votre arbre familial n'a que ${nbMembres} membre${nbMembres > 1 ? 's' : ''}. Le Moftal Pay familial s'ouvre à partir de 3 membres.`,
        nbMembres,
        requis: 3
      });
    }

    if (existe) {
      return res.status(400).json({ success: false, message: 'Votre famille a déjà un compte.' });
    }

    // Le créateur devient gérant 1 par défaut
    const fund = await FamilyFund.create({
      nomFamille: (arbre.familyName || nomFamille).trim(),
      treeId: arbre.id,
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
    const { type, beneficiaireNom, beneficiaireContact, description } = req.body;
    const { numeroH } = req.user;
    // Montant converti en nombre entier : une valeur texte (« 1000 ») était collée
    // au total au lieu d'y être ajoutée
    const montant = Number(req.body?.montant);

    const typesValides = ['paiement_sante', 'paiement_nourriture', 'urgence', 'projet'];
    if (!typesValides.includes(type)) {
      return res.status(400).json({ success: false, message: 'Type de paiement invalide.' });
    }
    if (!Number.isInteger(montant) || montant <= 0) {
      return res.status(400).json({ success: false, message: 'Montant invalide.' });
    }

    const soldeMap = {
      paiement_sante:      'solde_sante',
      paiement_nourriture: 'solde_nourriture',
      urgence:             'solde_urgence',
      projet:              'solde_projet'
    };
    const champSolde = soldeMap[type];

    // Compte verrouillé pendant le débit : deux paiements en même temps ne
    // dépensent jamais deux fois le même argent
    const resultat = await sequelize.transaction(async (transaction) => {
      const { fund } = await fondsDe(req.user, { transaction, lock: true });
      if (!fund) return { statut: 404, message: 'Compte famille introuvable.' };
      // Seuls les 3 admins peuvent payer : gérant1, gérant2 ou conseiller
      if (!estAdmin(fund, numeroH)) {
        return { statut: 403, message: 'Seuls les 2 gérants élus ou le Conseiller (doyen de l\'arbre) peuvent effectuer des paiements.' };
      }
      const soldeActuel = Number(fund[champSolde]);
      if (soldeActuel < montant) {
        return { statut: 400, message: `Solde insuffisant. Disponible : ${soldeActuel.toLocaleString()} GNF` };
      }
      await fund.update({
        [champSolde]:    soldeActuel - montant,
        total_depense:   Number(fund.total_depense) + montant,
      }, { transaction });
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
      }, { transaction });
      return { statut: 200, nouveauSolde: soldeActuel - montant };
    });
    if (resultat.statut !== 200) {
      return res.status(resultat.statut).json({ success: false, message: resultat.message });
    }

    res.json({
      success: true,
      message: `Paiement de ${montant.toLocaleString()} GNF effectué vers ${beneficiaireNom || 'le bénéficiaire'}.`,
      nouveauSolde: resultat.nouveauSolde
    });
  } catch (err) {
    console.error('family-fund/payer:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────
// GET /api/family-fund/riz-info
// Infos publiques (prix, stock) sur le riz vendu par l'admin
// ─────────────────────────────────────────────
router.get('/riz-info', async (req, res) => {
  try {
    const [produit] = await sequelize.query(
      `SELECT * FROM supplier_products WHERE tenant_code=:code AND nom ILIKE '%riz%' AND is_active=true ORDER BY id DESC LIMIT 1`,
      { replacements: { code: RIZ_TENANT_CODE }, type: sequelize.QueryTypes.SELECT }
    );
    if (!produit) {
      return res.json({ success: true, disponible: false });
    }
    res.json({
      success: true,
      disponible: Number(produit.stock) > 0,
      nom: produit.nom,
      prixParSac: Number(produit.prix_detail),
      stock: Number(produit.stock),
      unite: produit.unite
    });
  } catch (err) {
    console.error('family-fund/riz-info:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/family-fund/acheter-riz
// Achat de riz (sacs) auprès de l'admin, payé depuis le budget nourriture
// ─────────────────────────────────────────────
router.post('/acheter-riz', async (req, res) => {
  try {
    const { nombreSacs } = req.body;
    const { numeroH } = req.user;

    const sacs = parseInt(nombreSacs);
    if (!sacs || sacs < 1) {
      return res.status(400).json({ success: false, message: 'Indiquez un nombre de sacs valide.' });
    }

    // Compte famille et stock verrouillés : jamais deux débits ni un stock négatif
    const resultat = await sequelize.transaction(async (transaction) => {
      const { fund } = await fondsDe(req.user, { transaction, lock: true });
      if (!fund) return { statut: 404, message: 'Compte famille introuvable.' };
      if (!estAdmin(fund, numeroH)) {
        return { statut: 403, message: 'Seuls les 2 gérants élus ou le Conseiller (doyen de l\'arbre) peuvent effectuer des paiements.' };
      }

      const [produit] = await sequelize.query(
        `SELECT * FROM supplier_products WHERE tenant_code=:code AND nom ILIKE '%riz%' AND is_active=true ORDER BY id DESC LIMIT 1 FOR UPDATE`,
        { replacements: { code: RIZ_TENANT_CODE }, type: sequelize.QueryTypes.SELECT, transaction }
      );
      if (!produit) return { statut: 404, message: 'Le riz n\'est pas disponible pour le moment.' };
      if (Number(produit.stock) < sacs) {
        return { statut: 400, message: `Stock insuffisant. Disponible : ${produit.stock} sac(s).` };
      }

      const montant = Number(produit.prix_detail) * sacs;
      const soldeActuel = Number(fund.solde_nourriture);
      if (soldeActuel < montant) {
        return { statut: 400, message: `Solde alimentation insuffisant. Disponible : ${soldeActuel.toLocaleString()} GNF, requis : ${montant.toLocaleString()} GNF.` };
      }

      await fund.update({
        solde_nourriture: soldeActuel - montant,
        total_depense: Number(fund.total_depense) + montant,
      }, { transaction });
      await sequelize.query(
        `UPDATE supplier_products SET stock = stock - :sacs WHERE tenant_code=:code AND id=:id`,
        { replacements: { sacs, code: RIZ_TENANT_CODE, id: produit.id }, transaction }
      );
      await sequelize.query(
        `INSERT INTO supplier_orders (tenant_code, client_nom, montant_total, statut, notes)
         VALUES (:code, :clientNom, :montant, 'en_attente', :notes)`,
        {
          replacements: {
            code: RIZ_TENANT_CODE,
            clientNom: `Famille ${fund.nomFamille}`,
            montant,
            notes: `${sacs} sac(s) de riz — commande via Moftal Pay`
          },
          transaction
        }
      );
      await FamilyFundTransaction.create({
        fundId: fund.id,
        acteurNumeroH: numeroH,
        acteurNom: req.user.prenom || '',
        type: 'paiement_nourriture',
        montant,
        beneficiaireNom: 'Riz Moftal (Admin)',
        description: `${sacs} sac(s) de riz`,
        statut: 'confirme'
      }, { transaction });
      return { statut: 200, montant, nouveauSolde: soldeActuel - montant };
    });
    if (resultat.statut !== 200) {
      return res.status(resultat.statut).json({ success: false, message: resultat.message });
    }

    res.json({
      success: true,
      message: `Commande de ${sacs} sac(s) de riz confirmée. L'administrateur vous livrera après réception du paiement.`,
      montant: resultat.montant,
      nouveauSolde: resultat.nouveauSolde
    });
  } catch (err) {
    console.error('family-fund/acheter-riz:', err);
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
    const { numeroH } = req.user;

    const { fund, arbre } = await fondsDe(req.user);
    if (!fund) return res.status(404).json({ success: false, message: 'Compte famille introuvable.' });

    const peutModifier = !fund.gerant1NumeroH || estAdmin(fund, numeroH);
    if (!peutModifier) {
      return res.status(403).json({ success: false, message: 'Seul un admin du compte peut changer les gérants.' });
    }

    // Les gérants sont choisis parmi les membres de l'arbre de la famille
    for (const n of [gerant1NumeroH, gerant2NumeroH]) {
      if (n && !estMembreArbre(arbre, n)) {
        return res.status(400).json({ success: false, message: `${n} n'est pas membre de votre arbre familial.` });
      }
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
    const { numeroH } = req.user;

    const { fund, arbre } = await fondsDe(req.user);
    if (!fund) return res.status(404).json({ success: false, message: 'Compte famille introuvable.' });

    // Seul un admin existant ou le conseiller actuel peut changer le conseiller
    if (fund.conseillerNumeroH && fund.conseillerNumeroH !== numeroH && !estAdmin(fund, numeroH)) {
      return res.status(403).json({ success: false, message: 'Seul le Conseiller actuel peut passer son rôle.' });
    }

    if (!estMembreArbre(arbre, conseillerNumeroH)) {
      return res.status(400).json({ success: false, message: 'Le Conseiller doit être membre de votre arbre familial.' });
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
// Admin G7 : crédite un compte famille directement (test sans passer par Djomy)
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

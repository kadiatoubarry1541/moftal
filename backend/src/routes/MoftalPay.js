import express from 'express';
import { authenticate } from '../middleware/auth.js';
import ProfessionalWallet from '../models/ProfessionalWallet.js';
import ProfessionalAccount from '../models/ProfessionalAccount.js';
import FamilyFund from '../models/FamilyFund.js';
import FamilyFundTransaction from '../models/FamilyFundTransaction.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import { sequelize } from '../../config/database.js';

// Commission prélevée par la plateforme sur chaque dépôt externe (via FedaPay)
// Les transferts internes (famille → pro) sont GRATUITS — pas de commission
const TAUX_COMMISSION_PLATEFORME = 0.01; // 1%

function calculerCommission(montantBrut) {
  const commission = Math.round(montantBrut * TAUX_COMMISSION_PLATEFORME);
  return { commission, montantNet: montantBrut - commission };
}

async function enregistrerCommission(sourceType, sourceRef, montantBrut, commission, payeurNumeroH) {
  await sequelize.query(
    `INSERT INTO platform_commissions (source_type, source_ref, montant_brut, taux, commission, payeur_numero_h)
     VALUES (:sourceType, :sourceRef, :brut, :taux, :commission, :payeur)`,
    { replacements: { sourceType, sourceRef, brut: montantBrut, taux: TAUX_COMMISSION_PLATEFORME * 100, commission, payeur: payeurNumeroH } }
  ).catch(e => console.warn('Commission log:', e.message));
}

const router = express.Router();
// Note : authenticate est appliqué par route, pas globalement,
// car /callback est appelé par FedaPay (serveur externe sans JWT).

const FEDAPAY_SECRET = process.env.FEDAPAY_SECRET_KEY || '';
const FEDAPAY_API    = process.env.FEDAPAY_ENV === 'production'
  ? 'https://api.fedapay.com/v1'
  : 'https://sandbox-api.fedapay.com/v1';
const BACKEND_URL    = process.env.BACKEND_URL || 'http://localhost:5002';
const FRONTEND_URL   = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─────────────────────────────────────────
// UTILITAIRE — appel FedaPay avec timeout 30s
// ─────────────────────────────────────────
async function fedapayRequest(method, endpoint, body = null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const opts = {
      method,
      headers: {
        'Authorization': `Bearer ${FEDAPAY_SECRET}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${FEDAPAY_API}${endpoint}`, opts);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ─────────────────────────────────────────
// GET /api/moftal-pay/mon-moftal-pay-pro
// Récupère le compte Moftal Pay Pro du professionnel connecté
// ─────────────────────────────────────────
// Types autorisés à accéder au Moftal Pay Pro pour l'instant
const MOFTAL_PAY_PRO_TYPES = ['clinic', 'supplier'];

router.get('/mon-moftal-pay-pro', authenticate, async (req, res) => {
  try {
    const { numeroH } = req.user;

    // Chercher le compte pro approuvé de cet utilisateur
    const proAccount = await ProfessionalAccount.findOne({
      where: { ownerNumeroH: numeroH, status: 'approved', isActive: true }
    });
    if (!proAccount) {
      return res.status(404).json({ success: false, message: 'Aucun compte professionnel approuvé trouvé.' });
    }

    // Moftal Pay Pro disponible uniquement pour Santé (clinic) et Alimentation (supplier)
    if (!MOFTAL_PAY_PRO_TYPES.includes(proAccount.type)) {
      return res.status(403).json({
        success: false,
        restricted: true,
        typePro: proAccount.type,
        message: 'Le Moftal Pay Pro est disponible uniquement pour les comptes Santé et Alimentation pour le moment.'
      });
    }

    let comptePro = await ProfessionalWallet.findOne({
      where: { proAccountId: proAccount.id }
    });

    // Créer automatiquement si inexistant
    if (!comptePro) {
      comptePro = await ProfessionalWallet.create({
        proAccountId: proAccount.id,
        ownerNumeroH: numeroH,
        nomPro: proAccount.name,
        typePro: proAccount.type
      });
    }

    res.json({
      success: true,
      comptePro: {
        id:             comptePro.id,
        nomPro:         comptePro.nomPro,
        typePro:        comptePro.typePro,
        solde:          Number(comptePro.solde),
        totalRecu:      Number(comptePro.totalRecu),
        totalRetire:    Number(comptePro.totalRetire),
        orangeMoney:    comptePro.orangeMoneyNumero,
        compteBancaire: comptePro.compteBancaireIban,
      }
    });
  } catch (err) {
    console.error('moftal-pay/mon-wallet:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────
// POST /api/moftal-pay/initier-depot
// Initie un dépôt via FedaPay → retourne un lien de paiement
// ─────────────────────────────────────────
router.post('/initier-depot', authenticate, async (req, res) => {
  try {
    const { montant, type } = req.body;
    // type = 'famille' (dépôt compte famille) ou 'pro' (dépôt wallet pro)
    const { numeroH, email, prenom, nomFamille } = req.user;

    if (!montant || montant < 1000) {
      return res.status(400).json({ success: false, message: 'Montant minimum : 1 000 GNF' });
    }

    if (!FEDAPAY_SECRET) {
      return res.status(503).json({
        success: false,
        message: 'Moftal Pay : clé FedaPay non configurée. Ajoutez FEDAPAY_SECRET_KEY dans config.env',
        demo: true
      });
    }

    // Créer la transaction FedaPay
    const txRef = `MOFTAL-${type?.toUpperCase() || 'DEP'}-${Date.now()}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;

    const fedaRes = await fedapayRequest('POST', '/transactions', {
      description: `Moftal Pay — Dépôt ${type === 'famille' ? 'compte famille' : 'wallet pro'} Moftal`,
      amount: montant,
      currency: { iso: 'GNF' },
      callback_url: `${BACKEND_URL}/api/moftal-pay/callback?ref=${encodeURIComponent(txRef)}&type=${encodeURIComponent(type || 'famille')}&numeroH=${encodeURIComponent(numeroH)}`,
      customer: {
        email: email || `${numeroH}@moftal.app`,
        firstname: prenom || '',
        lastname: nomFamille || '',
      }
    });

    if (!fedaRes?.v1?.transaction) {
      return res.status(500).json({ success: false, message: 'Erreur FedaPay. Réessayez.' });
    }

    const transactionId = fedaRes.v1.transaction.id;

    // Générer le lien de paiement
    const tokenRes = await fedapayRequest('POST', `/transactions/${transactionId}/token`);
    const paymentUrl = tokenRes?.v1?.token?.url;

    if (!paymentUrl) {
      return res.status(500).json({ success: false, message: 'Impossible de générer le lien FedaPay.' });
    }

    res.json({
      success: true,
      paymentUrl,
      transactionId,
      txRef,
      montant,
      message: 'Lien de paiement généré. Redirigez l\'utilisateur vers cette URL.'
    });
  } catch (err) {
    console.error('moftal-pay/initier-depot:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────
// GET /api/moftal-pay/callback
// FedaPay appelle cette URL après paiement
// ─────────────────────────────────────────
router.get('/callback', async (req, res) => {
  try {
    const { ref, type, numeroH, id: transactionId, status } = req.query;

    if (status !== 'approved') {
      return res.redirect(`${FRONTEND_URL}/compte-famille?paiement=echec`);
    }

    // Vérifier la transaction auprès de FedaPay
    const fedaRes = await fedapayRequest('GET', `/transactions/${transactionId}`);
    const transaction = fedaRes?.v1?.transaction;

    if (!transaction || transaction.status !== 'approved') {
      return res.redirect(`${FRONTEND_URL}/compte-famille?paiement=echec`);
    }

    const montant = transaction.amount;
    const user = await User.findOne({ where: { numeroH } });

    if (type === 'famille') {
      // Idempotence : si cette transaction FedaPay a déjà été traitée, ne pas re-créditer
      const dejaTraite = await FamilyFundTransaction.findOne({
        where: { fedapayRef: String(transactionId), statut: 'confirme' }
      });
      if (dejaTraite) {
        return res.redirect(`${FRONTEND_URL}/compte-famille?paiement=succes`);
      }

      // Prélèvement commission plateforme (1%) sur le dépôt externe
      const { commission, montantNet } = calculerCommission(montant);

      // Créditer le compte famille avec le montant net (après commission)
      const fund = await FamilyFund.findOne({
        where: { nomFamille: { [Op.iLike]: user?.nomFamille?.trim() }, isActive: true }
      });
      if (fund) {
        const repartition = FamilyFund.repartir(montantNet);
        await fund.update({
          solde_reserve:    Number(fund.solde_reserve)    + repartition.reserve,
          solde_sante:      Number(fund.solde_sante)      + repartition.sante,
          solde_nourriture: Number(fund.solde_nourriture) + repartition.nourriture,
          solde_urgence:    Number(fund.solde_urgence)    + repartition.urgence,
          solde_projet:     Number(fund.solde_projet)     + repartition.projet,
          total_depose:     Number(fund.total_depose)     + montantNet,
        });
        await FamilyFundTransaction.create({
          fundId: fund.id, acteurNumeroH: numeroH,
          acteurNom: `${user?.prenom || ''} ${user?.nomFamille || ''}`.trim(),
          type: 'depot', montant: montantNet, repartition, fedapayRef: String(transactionId), statut: 'confirme',
          description: `Dépôt via Moftal Pay — ${montantNet.toLocaleString()} GNF (${montant.toLocaleString()} - commission 1% : ${commission.toLocaleString()} GNF) — FedaPay #${transactionId}`
        });
        await enregistrerCommission('depot_famille', String(transactionId), montant, commission, numeroH);
      }
      return res.redirect(`${FRONTEND_URL}/compte-famille?paiement=succes&montant=${montantNet}`);
    }

    if (type === 'pro') {
      // Idempotence : si cette transaction FedaPay a déjà crédité un wallet pro, ne pas re-créditer
      const dejaTraitePro = await Payment.findOne({
        where: { gatewayRef: String(transactionId), purpose: 'wallet_depot_pro', status: 'completed' }
      });
      if (dejaTraitePro) {
        return res.redirect(`${FRONTEND_URL}/moftal-pay-pro?paiement=succes`);
      }

      // Prélèvement commission plateforme (1%) sur le dépôt externe
      const { commission: commPro, montantNet: montantNetPro } = calculerCommission(montant);

      // Créditer le wallet professionnel avec le montant net (après commission)
      const proAccount = await ProfessionalAccount.findOne({ where: { ownerNumeroH: numeroH } });
      if (proAccount) {
        let wallet = await ProfessionalWallet.findOne({ where: { proAccountId: proAccount.id } });
        if (!wallet) {
          wallet = await ProfessionalWallet.create({
            proAccountId: proAccount.id, ownerNumeroH: numeroH,
            nomPro: proAccount.name, typePro: proAccount.type
          });
        }
        await wallet.update({
          solde:      Number(wallet.solde)      + montantNetPro,
          totalRecu:  Number(wallet.totalRecu)  + montantNetPro,
        });

        await enregistrerCommission('depot_pro', String(transactionId), montant, commPro, numeroH);

        // Enregistrer pour l'idempotence future (empêche tout re-crédit)
        await Payment.create({
          txRef:        ref || `MOFTAL-PRO-${transactionId}`,
          payerNumeroH: numeroH,
          amount:       montantNetPro,
          currency:     'GNF',
          purpose:      'wallet_depot_pro',
          status:       'completed',
          gatewayRef:   String(transactionId),
        }).catch(e => console.warn('MoftalPay — log wallet_depot_pro:', e.message));
      }
      return res.redirect(`${FRONTEND_URL}/moftal-pay-pro?paiement=succes&montant=${montantNetPro}`);
    }

    res.redirect(`${FRONTEND_URL}?paiement=succes`);
  } catch (err) {
    console.error('moftal-pay/callback:', err);
    res.redirect(`${FRONTEND_URL}/compte-famille?paiement=erreur`);
  }
});

// ─────────────────────────────────────────
// POST /api/moftal-pay/retrait-pro
// BLOQUÉ — les retraits passent obligatoirement par l'autorisation admin
// Utiliser POST /api/withdrawal-requests à la place
// ─────────────────────────────────────────
router.post('/retrait-pro', authenticate, async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Les retraits nécessitent une autorisation admin. Soumettez une demande via /api/withdrawal-requests',
    redirect: '/api/withdrawal-requests'
  });
});

// ─────────────────────────────────────────
// (ANCIEN CODE RETRAIT — conservé en référence, non utilisé)
// ─────────────────────────────────────────
async function _ancienRetraitPro(req, res) {
  try {
    const { montant, numeroOrangeMoney, description } = req.body;
    const { numeroH } = req.user;

    if (!montant || montant < 5000) {
      return res.status(400).json({ success: false, message: 'Montant minimum de retrait : 5 000 GNF' });
    }

    const proAccount = await ProfessionalAccount.findOne({
      where: { ownerNumeroH: numeroH, status: 'approved' }
    });
    if (!proAccount) {
      return res.status(403).json({ success: false, message: 'Compte professionnel actif requis.' });
    }

    // ── Conditions spécifiques aux cliniques ────────────────────────────────
    if (proAccount.type === 'clinic') {
      const unAnAvant = new Date();
      unAnAvant.setFullYear(unAnAvant.getFullYear() - 1);
      const ancienDunAn = new Date(proAccount.createdAt) <= unAnAvant;

      // Gestion interne = a déjà accepté au moins 1 rendez-vous sur la plateforme
      const [[{ nb_rdv }]] = await sequelize.query(
        `SELECT COUNT(*)::INT AS nb_rdv FROM appointments
         WHERE professional_account_id = :proId AND status = 'accepted'`,
        { replacements: { proId: proAccount.id } }
      );
      const aGestionInterne = Number(nb_rdv) >= 10;

      // 5 employés minimum = abonnements actifs liés à ce compte (approximation)
      const [[{ nb_employes }]] = await sequelize.query(
        `SELECT COUNT(*)::INT AS nb_employes FROM professional_accounts
         WHERE owner_numero_h = :numeroH AND status = 'approved' AND is_active = true`,
        { replacements: { numeroH } }
      ).catch(() => [[{ nb_employes: 0 }]]);
      const aCinqEmployes = Number(nb_employes) >= 5;

      if (!ancienDunAn && !aGestionInterne && !aCinqEmployes) {
        return res.status(403).json({
          success: false,
          message: 'Retrait clinique refusé. Conditions requises (au moins 1) : ' +
            '(1) être sur la plateforme depuis 1 an, ' +
            '(2) avoir une gestion interne active (rendez-vous acceptés), ' +
            '(3) avoir 5 employés minimum.',
          conditions: { ancienDunAn, aGestionInterne, aCinqEmployes }
        });
      }
    }

    const wallet = await ProfessionalWallet.findOne({ where: { proAccountId: proAccount.id } });
    if (!wallet || Number(wallet.solde) < montant) {
      return res.status(400).json({
        success: false,
        message: `Solde insuffisant. Disponible : ${Number(wallet?.solde || 0).toLocaleString()} GNF`
      });
    }

    // Utiliser le numéro enregistré si non fourni
    const numOM = numeroOrangeMoney || wallet.orangeMoneyNumero;
    if (!numOM) {
      return res.status(400).json({ success: false, message: 'Numéro Orange Money requis.' });
    }

    // ── Commission plateforme 1% sur le retrait ─────────────────────────────
    const { commission: commRetrait, montantNet: montantAEnvoyer } = calculerCommission(montant);

    if (!FEDAPAY_SECRET) {
      // Mode démo sans FedaPay configuré
      await wallet.update({
        solde:             Number(wallet.solde)        - montant,
        totalRetire:       Number(wallet.totalRetire)  + montant,
        orangeMoneyNumero: numOM
      });
      await enregistrerCommission('retrait_pro', `DEMO-${Date.now()}`, montant, commRetrait, numeroH);
      return res.json({
        success: true,
        demo: true,
        montantEnvoye:   montantAEnvoyer,
        commission:      commRetrait,
        message: `[DÉMO] Retrait de ${montantAEnvoyer.toLocaleString()} GNF vers ${numOM} (commission plateforme 1% : ${commRetrait.toLocaleString()} GNF déduite).`
      });
    }

    // Envoi réel via FedaPay Payout — seulement le montant net (après commission)
    const payoutRes = await fedapayRequest('POST', '/payouts', {
      amount:   montantAEnvoyer,
      currency: { iso: 'GNF' },
      mode:     'om',
      customer: {
        email:    `${numeroH}@moftal.app`,
        phone_number: { number: numOM, country: 'GN' }
      }
    });

    if (!payoutRes?.v1?.payout) {
      return res.status(500).json({ success: false, message: 'Erreur FedaPay Payout. Réessayez.' });
    }

    await wallet.update({
      solde:             Number(wallet.solde)       - montant,
      totalRetire:       Number(wallet.totalRetire) + montant,
      orangeMoneyNumero: numOM
    });

    await enregistrerCommission('retrait_pro', String(payoutRes.v1.payout.id), montant, commRetrait, numeroH);

    res.json({
      success: true,
      montantEnvoye:   montantAEnvoyer,
      commission:      commRetrait,
      message: `Retrait de ${montantAEnvoyer.toLocaleString()} GNF envoyé vers Orange Money ${numOM}. (Commission plateforme 1% : ${commRetrait.toLocaleString()} GNF)`,
      payoutId: payoutRes.v1.payout.id
    });
  } catch (err) {
    console.error('moftal-pay/retrait-pro:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
}

// ─────────────────────────────────────────
// POST /api/moftal-pay/paiement-interne
// Famille → Professionnel (interne, GRATUIT)
// ─────────────────────────────────────────
router.post('/paiement-interne', authenticate, async (req, res) => {
  try {
    const { montant, proAccountId, categorie, description } = req.body;
    // categorie = 'sante' | 'nourriture' | 'urgence' | 'projet'
    const { numeroH, nomFamille } = req.user;

    if (!montant || montant <= 0) {
      return res.status(400).json({ success: false, message: 'Montant invalide.' });
    }

    const categorieMap = {
      sante:      'paiement_sante',
      nourriture: 'paiement_nourriture',
      urgence:    'urgence',
      projet:     'projet'
    };
    const typeTransaction = categorieMap[categorie] || 'paiement_sante';
    const soldeChamp = {
      sante: 'solde_sante', nourriture: 'solde_nourriture',
      urgence: 'solde_urgence', projet: 'solde_projet'
    }[categorie] || 'solde_sante';

    // Vérifier le compte famille
    const fund = await FamilyFund.findOne({
      where: { nomFamille: { [Op.iLike]: nomFamille?.trim() }, isActive: true }
    });
    if (!fund) return res.status(404).json({ success: false, message: 'Compte famille introuvable.' });

    // Vérifier que c'est un gérant
    if (fund.gerant1NumeroH !== numeroH && fund.gerant2NumeroH !== numeroH) {
      return res.status(403).json({ success: false, message: 'Seuls les gérants peuvent effectuer ce paiement.' });
    }

    const soldeActuel = Number(fund[soldeChamp]);
    if (soldeActuel < montant) {
      return res.status(400).json({
        success: false,
        message: `Solde ${categorie} insuffisant. Disponible : ${soldeActuel.toLocaleString()} GNF`
      });
    }

    // Débiter le compte famille
    await fund.update({
      [soldeChamp]:  soldeActuel - montant,
      total_depense: Number(fund.total_depense) + montant,
    });

    await FamilyFundTransaction.create({
      fundId: fund.id, acteurNumeroH: numeroH,
      type: typeTransaction, montant,
      beneficiaireNom: proAccountId,
      description: description || `Paiement interne Moftal Pay → Pro ${proAccountId}`,
      statut: 'confirme'
    });

    // Créditer le wallet du professionnel (auto-création si premier paiement)
    if (proAccountId) {
      const proAccount = await ProfessionalAccount.findByPk(proAccountId);
      if (!proAccount) {
        // Annuler le débit famille si le compte pro est introuvable
        await fund.update({
          [soldeChamp]:  soldeActuel,
          total_depense: Number(fund.total_depense),
        });
        return res.status(404).json({
          success: false,
          message: 'Compte professionnel introuvable. Paiement annulé — aucun débit effectué.'
        });
      }

      let walletPro = await ProfessionalWallet.findOne({ where: { proAccountId } });
      if (!walletPro) {
        // Première fois que ce pro reçoit un paiement → créer son wallet automatiquement
        walletPro = await ProfessionalWallet.create({
          proAccountId,
          ownerNumeroH: proAccount.ownerNumeroH,
          nomPro:  proAccount.name,
          typePro: proAccount.type,
        });
      }

      await walletPro.update({
        solde:     Number(walletPro.solde)     + montant,
        totalRecu: Number(walletPro.totalRecu) + montant,
      });
    }

    res.json({
      success: true,
      gratuit: true,
      message: `Paiement interne de ${montant.toLocaleString()} GNF effectué. Aucun frais — Moftal Pay interne.`
    });
  } catch (err) {
    console.error('moftal-pay/paiement-interne:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────
// GET /api/moftal-pay/mes-transactions
// Historique des transactions du Moftal Pay Pro
// ─────────────────────────────────────────
router.get('/mes-transactions', authenticate, async (req, res) => {
  try {
    const { numeroH } = req.user;
    const proAccount = await ProfessionalAccount.findOne({ where: { ownerNumeroH: numeroH } });
    if (!proAccount) return res.json({ success: true, transactions: [] });

    const comptePro = await ProfessionalWallet.findOne({ where: { proAccountId: proAccount.id } });
    if (!comptePro) return res.json({ success: true, transactions: [] });

    // Transactions internes : où beneficiaireNom = proAccountId
    const txInternes = await FamilyFundTransaction.findAll({
      where: { beneficiaireNom: proAccount.id, statut: 'confirme' },
      order: [['created_at', 'DESC']],
      limit: 30
    });

    const transactions = txInternes.map(t => ({
      id:        t.id,
      type:      'paiement_interne',
      montant:   Number(t.montant),
      payeurNom: t.acteurNom,
      description: t.description,
      statut:    t.statut,
      fedapayRef: t.fedapayRef,
      createdAt: t.created_at,
    }));

    res.json({ success: true, transactions });
  } catch (err) {
    console.error('moftal-pay/mes-transactions:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────
// ADMIN — GET /api/moftal-pay/admin/comptes-pro
// Voir tous les comptes Moftal Pay Pro
// ─────────────────────────────────────────
router.get('/admin/comptes-pro', authenticate, async (req, res) => {
  try {
    const estAdmin = req.user.isMasterAdmin || req.user.isAdmin || req.user.role === 'admin';
    if (!estAdmin) return res.status(403).json({ success: false, message: 'Accès refusé.' });

    const comptesPro = await ProfessionalWallet.findAll({
      where: { isActive: true },
      order: [['total_recu', 'DESC']]
    });

    const totalSolde  = comptesPro.reduce((s, c) => s + Number(c.solde),      0);
    const totalRecu   = comptesPro.reduce((s, c) => s + Number(c.totalRecu),   0);
    const totalRetire = comptesPro.reduce((s, c) => s + Number(c.totalRetire), 0);

    res.json({
      success: true,
      nbComptes: comptesPro.length,
      totaux: { totalSolde, totalRecu, totalRetire },
      comptes: comptesPro.map(c => ({
        id:           c.id,
        nomPro:       c.nomPro,
        typePro:      c.typePro,
        ownerNumeroH: c.ownerNumeroH,
        solde:        Number(c.solde),
        totalRecu:    Number(c.totalRecu),
        totalRetire:  Number(c.totalRetire),
        orangeMoney:  c.orangeMoneyNumero,
        creeLe:       c.created_at
      }))
    });
  } catch (err) {
    console.error('moftal-pay/admin/comptes-pro:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────
// POST /api/moftal-pay/admin/depot-test
// Admin G7 : crédite un compte Moftal Pay Pro directement (test sans FedaPay)
// ─────────────────────────────────────────
router.post('/admin/depot-test', authenticate, async (req, res) => {
  try {
    const estAdmin = req.user.isMasterAdmin || req.user.isAdmin || req.user.role === 'admin';
    if (!estAdmin) return res.status(403).json({ success: false, message: 'Accès refusé.' });

    const { walletId, montant } = req.body;
    if (!walletId || !montant || montant < 100) {
      return res.status(400).json({ success: false, message: 'ID du compte et montant (min 100) requis.' });
    }

    const comptePro = await ProfessionalWallet.findByPk(walletId);
    if (!comptePro) return res.status(404).json({ success: false, message: 'Compte Moftal Pay Pro introuvable.' });

    const nouveauSolde = Number(comptePro.solde) + montant;
    await comptePro.update({
      solde:     nouveauSolde,
      totalRecu: Number(comptePro.totalRecu) + montant,
    });

    res.json({
      success: true,
      message: `[TEST] ${montant.toLocaleString()} GNF crédités sur le compte Moftal Pay Pro de "${comptePro.nomPro}".`,
      nouveauSolde
    });
  } catch (err) {
    console.error('moftal-pay/admin/depot-test:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────
// GET /api/moftal-pay/admin/ma-balance
// Admin : tableau de bord financier complet de la plateforme
// ─────────────────────────────────────────
router.get('/admin/ma-balance', authenticate, async (req, res) => {
  try {
    const estAdmin = req.user.isMasterAdmin || req.user.isAdmin || req.user.role === 'admin';
    if (!estAdmin) return res.status(403).json({ success: false, message: 'Accès refusé.' });

    // Total des commissions par source
    const [parSource] = await sequelize.query(`
      SELECT
        source_type,
        COALESCE(SUM(commission), 0)::BIGINT   AS total_commission,
        COALESCE(SUM(montant_brut), 0)::BIGINT AS total_transactions,
        COUNT(*)::INT                           AS nb
      FROM platform_commissions
      GROUP BY source_type
      ORDER BY total_commission DESC
    `);

    // Total global
    const commDepots   = parSource.filter(r => r.source_type.startsWith('depot')).reduce((s, r) => s + Number(r.total_commission), 0);
    const commRetraits = parSource.filter(r => r.source_type === 'retrait_pro').reduce((s, r) => s + Number(r.total_commission), 0);
    const totalGagne   = commDepots + commRetraits;

    // Argent total dans les wallets pros (ce que les pros ont encore)
    const [[walletStats]] = await sequelize.query(`
      SELECT
        COALESCE(SUM(solde), 0)::BIGINT        AS solde_total_pros,
        COALESCE(SUM(total_recu), 0)::BIGINT   AS total_recu_pros,
        COALESCE(SUM(total_retire), 0)::BIGINT AS total_retire_pros,
        COUNT(*)::INT                           AS nb_wallets
      FROM professional_wallets WHERE is_active = true
    `);

    // Argent total dans les comptes famille
    const [[familleStats]] = await sequelize.query(`
      SELECT
        COALESCE(SUM(solde_reserve + solde_sante + solde_nourriture + solde_urgence + solde_projet), 0)::BIGINT AS solde_total_familles,
        COALESCE(SUM(total_depose), 0)::BIGINT   AS total_depose_familles,
        COUNT(*)::INT                             AS nb_familles
      FROM family_funds WHERE is_active = true
    `);

    // 10 dernières commissions
    const [dernieres] = await sequelize.query(`
      SELECT source_type, montant_brut, taux, commission, payeur_numero_h, created_at
      FROM platform_commissions
      ORDER BY created_at DESC LIMIT 10
    `);

    res.json({
      success: true,
      tauxActuel: `${TAUX_COMMISSION_PLATEFORME * 100}%`,
      mesRevenus: {
        totalGagne,
        surDepots:   commDepots,
        surRetraits: commRetraits,
        detail: parSource
      },
      argent_en_circulation: {
        dansWalletsPros:    Number(walletStats?.solde_total_pros || 0),
        dansFamilles:       Number(familleStats?.solde_total_familles || 0),
        nbWalletsPros:      Number(walletStats?.nb_wallets || 0),
        nbFamilles:         Number(familleStats?.nb_familles || 0),
      },
      dernieres_commissions: dernieres
    });
  } catch (err) {
    console.error('moftal-pay/admin/ma-balance:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────
// GET /api/moftal-pay/admin/mes-revenus
// Admin : voir le total des commissions perçues par la plateforme
// ─────────────────────────────────────────
router.get('/admin/mes-revenus', authenticate, async (req, res) => {
  try {
    const estAdmin = req.user.isMasterAdmin || req.user.isAdmin || req.user.role === 'admin';
    if (!estAdmin) return res.status(403).json({ success: false, message: 'Accès refusé.' });

    // Total global
    const [global] = await sequelize.query(
      `SELECT
         COALESCE(SUM(commission), 0)::BIGINT   AS total_commission,
         COALESCE(SUM(montant_brut), 0)::BIGINT AS total_brut,
         COUNT(*)::INT                           AS nb_transactions
       FROM platform_commissions`
    );

    // Détail par type
    const [parType] = await sequelize.query(
      `SELECT
         source_type,
         COALESCE(SUM(commission), 0)::BIGINT   AS commission,
         COALESCE(SUM(montant_brut), 0)::BIGINT AS montant_brut,
         COUNT(*)::INT                           AS nb
       FROM platform_commissions
       GROUP BY source_type`
    );

    // Dernières 20 transactions
    const [dernieres] = await sequelize.query(
      `SELECT source_type, source_ref, montant_brut, taux, commission, payeur_numero_h, created_at
       FROM platform_commissions
       ORDER BY created_at DESC
       LIMIT 20`
    );

    res.json({
      success: true,
      tauxActuel: `${TAUX_COMMISSION_PLATEFORME * 100}%`,
      global: global[0],
      parType,
      dernieres
    });
  } catch (err) {
    console.error('moftal-pay/admin/mes-revenus:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

export default router;

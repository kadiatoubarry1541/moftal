import express from 'express';
import { authenticate } from '../middleware/auth.js';
import ProfessionalWallet from '../models/ProfessionalWallet.js';
import ProfessionalAccount from '../models/ProfessionalAccount.js';
import FamilyFund from '../models/FamilyFund.js';
import FamilyFundTransaction from '../models/FamilyFundTransaction.js';
import User from '../models/User.js';
import { Op } from 'sequelize';

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
// GET /api/moftal-pay/mon-wallet
// Récupère le wallet du professionnel connecté
// ─────────────────────────────────────────
// Types autorisés à accéder au Wallet Pro pour l'instant
const WALLET_PRO_TYPES = ['clinic', 'supplier'];

router.get('/mon-wallet', authenticate, async (req, res) => {
  try {
    const { numeroH } = req.user;

    // Chercher le compte pro approuvé de cet utilisateur
    const proAccount = await ProfessionalAccount.findOne({
      where: { ownerNumeroH: numeroH, status: 'approved', isActive: true }
    });
    if (!proAccount) {
      return res.status(404).json({ success: false, message: 'Aucun compte professionnel approuvé trouvé.' });
    }

    // Wallet Pro disponible uniquement pour Santé (clinic) et Alimentation (supplier)
    if (!WALLET_PRO_TYPES.includes(proAccount.type)) {
      return res.status(403).json({
        success: false,
        restricted: true,
        typePro: proAccount.type,
        message: 'Le Wallet Professionnel Moftal Pay est disponible uniquement pour les services de Santé et d\'Alimentation pour le moment.'
      });
    }

    let wallet = await ProfessionalWallet.findOne({
      where: { proAccountId: proAccount.id }
    });

    // Créer automatiquement si inexistant
    if (!wallet) {
      wallet = await ProfessionalWallet.create({
        proAccountId: proAccount.id,
        ownerNumeroH: numeroH,
        nomPro: proAccount.name,
        typePro: proAccount.type
      });
    }

    res.json({
      success: true,
      wallet: {
        id:              wallet.id,
        nomPro:          wallet.nomPro,
        typePro:         wallet.typePro,
        solde:           Number(wallet.solde),
        totalRecu:       Number(wallet.totalRecu),
        totalRetire:     Number(wallet.totalRetire),
        orangeMoney:     wallet.orangeMoneyNumero,
        compteBancaire:  wallet.compteBancaireIban,
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
      // Créditer le compte famille
      const fund = await FamilyFund.findOne({
        where: { nomFamille: { [Op.iLike]: user?.nomFamille?.trim() }, isActive: true }
      });
      if (fund) {
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
          fundId: fund.id, acteurNumeroH: numeroH,
          acteurNom: `${user?.prenom || ''} ${user?.nomFamille || ''}`.trim(),
          type: 'depot', montant, repartition, fedapayRef: String(transactionId), statut: 'confirme',
          description: `Dépôt via Moftal Pay — FedaPay #${transactionId}`
        });
      }
      return res.redirect(`${FRONTEND_URL}/compte-famille?paiement=succes&montant=${montant}`);
    }

    if (type === 'pro') {
      // Créditer le wallet professionnel
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
          solde:      Number(wallet.solde)      + montant,
          totalRecu:  Number(wallet.totalRecu)  + montant,
        });
      }
      return res.redirect(`${FRONTEND_URL}/wallet-pro?paiement=succes&montant=${montant}`);
    }

    res.redirect(`${FRONTEND_URL}?paiement=succes`);
  } catch (err) {
    console.error('moftal-pay/callback:', err);
    res.redirect(`${FRONTEND_URL}/compte-famille?paiement=erreur`);
  }
});

// ─────────────────────────────────────────
// POST /api/moftal-pay/retrait-pro
// Professionnel retire son argent vers Orange Money
// ─────────────────────────────────────────
router.post('/retrait-pro', authenticate, async (req, res) => {
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

    if (!FEDAPAY_SECRET) {
      // Mode démo sans FedaPay configuré
      await wallet.update({
        solde:        Number(wallet.solde)        - montant,
        totalRetire:  Number(wallet.totalRetire)  + montant,
        orangeMoneyNumero: numOM
      });
      return res.json({
        success: true,
        demo: true,
        message: `[DÉMO] Retrait de ${montant.toLocaleString()} GNF vers ${numOM} enregistré. Configurez FEDAPAY_SECRET_KEY pour les vrais envois.`
      });
    }

    // Envoi réel via FedaPay Payout vers Orange Money Guinée
    const payoutRes = await fedapayRequest('POST', '/payouts', {
      amount:   montant,
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

    res.json({
      success: true,
      message: `Retrait de ${montant.toLocaleString()} GNF envoyé vers Orange Money ${numOM}.`,
      payoutId: payoutRes.v1.payout.id
    });
  } catch (err) {
    console.error('moftal-pay/retrait-pro:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

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

    // Créditer le wallet du professionnel
    if (proAccountId) {
      const walletPro = await ProfessionalWallet.findOne({ where: { proAccountId } });
      if (!walletPro) {
        // Annuler le débit famille si le wallet pro est introuvable
        await fund.update({
          [soldeChamp]:  soldeActuel,
          total_depense: Number(fund.total_depense),
        });
        return res.status(404).json({
          success: false,
          message: 'Wallet du professionnel introuvable. Paiement annulé — aucun débit effectué.'
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
// Historique des transactions du wallet pro
// ─────────────────────────────────────────
router.get('/mes-transactions', authenticate, async (req, res) => {
  try {
    const { numeroH } = req.user;
    const proAccount = await ProfessionalAccount.findOne({ where: { ownerNumeroH: numeroH } });
    if (!proAccount) return res.json({ success: true, transactions: [] });

    // Chercher les paiements internes reçus dans FamilyFundTransaction (type paiement_interne)
    // et les dépôts FedaPay (récupérés depuis le wallet lui-même)
    const wallet = await ProfessionalWallet.findOne({ where: { proAccountId: proAccount.id } });
    if (!wallet) return res.json({ success: true, transactions: [] });

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
// ADMIN — GET /api/moftal-pay/admin/wallets
// Voir tous les wallets professionnels
// ─────────────────────────────────────────
router.get('/admin/wallets', authenticate, async (req, res) => {
  try {
    const estAdmin = req.user.isMasterAdmin || req.user.isAdmin || req.user.role === 'admin';
    if (!estAdmin) return res.status(403).json({ success: false, message: 'Accès refusé.' });

    const wallets = await ProfessionalWallet.findAll({
      where: { isActive: true },
      order: [['total_recu', 'DESC']]
    });

    const totalSolde   = wallets.reduce((s, w) => s + Number(w.solde),       0);
    const totalRecu    = wallets.reduce((s, w) => s + Number(w.totalRecu),    0);
    const totalRetire  = wallets.reduce((s, w) => s + Number(w.totalRetire),  0);

    res.json({
      success: true,
      nbWallets: wallets.length,
      totaux: { totalSolde, totalRecu, totalRetire },
      wallets: wallets.map(w => ({
        id:           w.id,
        nomPro:       w.nomPro,
        typePro:      w.typePro,
        ownerNumeroH: w.ownerNumeroH,
        solde:        Number(w.solde),
        totalRecu:    Number(w.totalRecu),
        totalRetire:  Number(w.totalRetire),
        orangeMoney:  w.orangeMoneyNumero,
        creeLe:       w.created_at
      }))
    });
  } catch (err) {
    console.error('moftal-pay/admin/wallets:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────
// POST /api/moftal-pay/admin/depot-test
// Admin G7 : crédite un wallet pro directement (test sans FedaPay)
// ─────────────────────────────────────────
router.post('/admin/depot-test', authenticate, async (req, res) => {
  try {
    const estAdmin = req.user.isMasterAdmin || req.user.isAdmin || req.user.role === 'admin';
    if (!estAdmin) return res.status(403).json({ success: false, message: 'Accès refusé.' });

    const { walletId, montant } = req.body;
    if (!walletId || !montant || montant < 100) {
      return res.status(400).json({ success: false, message: 'walletId et montant (min 100) requis.' });
    }

    const wallet = await ProfessionalWallet.findByPk(walletId);
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet introuvable.' });

    const nouveauSolde = Number(wallet.solde) + montant;
    await wallet.update({
      solde:     nouveauSolde,
      totalRecu: Number(wallet.totalRecu) + montant,
    });

    res.json({
      success: true,
      message: `[TEST] ${montant.toLocaleString()} GNF crédités sur le wallet de "${wallet.nomPro}".`,
      nouveauSolde
    });
  } catch (err) {
    console.error('moftal-pay/admin/depot-test:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

export default router;

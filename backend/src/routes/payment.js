import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Payment from '../models/Payment.js';
import ProfessionalAccount from '../models/ProfessionalAccount.js';
import User from '../models/User.js';
import {
  sendSubscriptionReceipt,
  sendSubscriptionRenewedEmail,
} from '../services/emailService.js';

const router = express.Router();

// Clés Flutterwave depuis les variables d'environnement
const FLW_PUBLIC_KEY = process.env.FLW_PUBLIC_KEY || '';
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || '';
const FLW_ENCRYPTION_KEY = process.env.FLW_ENCRYPTION_KEY || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5002';

// Génère une référence unique
function generateTxRef(purpose) {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ADAM-${purpose.toUpperCase()}-${ts}-${rand}`;
}

/**
 * POST /api/payment/initiate
 * Crée un lien de paiement Flutterwave
 */
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { amount, currency = 'GNF', purpose, relatedId, description } = req.body;
    const user = req.user;

    if (!amount || !purpose) {
      return res.status(400).json({ success: false, message: 'Montant et objet requis' });
    }

    if (!FLW_PUBLIC_KEY) {
      return res.status(503).json({
        success: false,
        message: 'Paiement non configuré. Ajoutez FLW_PUBLIC_KEY dans config.env',
      });
    }

    const txRef = generateTxRef(purpose);

    // Sauvegarder la transaction en attente
    await Payment.create({
      txRef,
      payerNumeroH: user.numeroH,
      amount,
      currency,
      purpose,
      relatedId: relatedId || null,
      status: 'pending',
    });

    // Construire le lien de paiement Flutterwave (Inline Payment)
    const paymentData = {
      tx_ref: txRef,
      amount: Number(amount),
      currency,
      redirect_url: `${BACKEND_URL}/api/payment/callback`,
      customer: {
        email: user.email || `${user.numeroH}@enfants-adam.app`,
        phonenumber: user.telephone || '',
        name: `${user.prenom || ''} ${user.nomFamille || ''}`.trim() || user.numeroH,
      },
      customizations: {
        title: 'Les Enfants d\'Adam',
        description: description || purpose,
        logo: `${FRONTEND_URL}/logo.png`,
      },
      payment_options: 'mobilemoney,card,ussd',
      meta: {
        purpose,
        relatedId: relatedId || '',
        numeroH: user.numeroH,
      },
    };

    // Appel API Flutterwave pour créer le lien de paiement
    const flwResponse = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    const flwData = await flwResponse.json();

    if (flwData.status === 'success') {
      return res.json({
        success: true,
        txRef,
        paymentLink: flwData.data.link,
        publicKey: FLW_PUBLIC_KEY,
        paymentData,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: flwData.message || 'Erreur Flutterwave',
      });
    }
  } catch (err) {
    console.error('Erreur initiation paiement:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * GET /api/payment/callback
 * Flutterwave redirige ici après le paiement
 */
router.get('/callback', async (req, res) => {
  try {
    const { status, tx_ref, transaction_id } = req.query;

    if (status === 'cancelled') {
      await Payment.update({ status: 'cancelled' }, { where: { txRef: tx_ref } });
      return res.redirect(`${FRONTEND_URL}/paiement/resultat?status=cancelled&tx_ref=${tx_ref}`);
    }

    if (status !== 'successful') {
      await Payment.update({ status: 'failed' }, { where: { txRef: tx_ref } });
      return res.redirect(`${FRONTEND_URL}/paiement/resultat?status=failed&tx_ref=${tx_ref}`);
    }

    // Vérifier la transaction avec Flutterwave
    const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
      headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
    });
    const verifyData = await verifyRes.json();

    if (verifyData.status !== 'success' || verifyData.data.status !== 'successful') {
      await Payment.update({ status: 'failed' }, { where: { txRef: tx_ref } });
      return res.redirect(`${FRONTEND_URL}/paiement/resultat?status=failed&tx_ref=${tx_ref}`);
    }

    const txData = verifyData.data;

    // Mettre à jour le paiement
    const payment = await Payment.findOne({ where: { txRef: tx_ref } });
    if (payment) {
      payment.status = 'success';
      payment.flwRef = txData.flw_ref;
      payment.paymentMethod = txData.payment_type;
      await payment.save();

      // Actions post-paiement selon l'objet
      await handlePostPayment(payment);
    }

    return res.redirect(`${FRONTEND_URL}/paiement/resultat?status=success&tx_ref=${tx_ref}`);
  } catch (err) {
    console.error('Erreur callback paiement:', err);
    return res.redirect(`${FRONTEND_URL}/paiement/resultat?status=error`);
  }
});

/**
 * POST /api/payment/webhook
 * Webhook Flutterwave (événements en temps réel)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const secretHash = process.env.FLW_WEBHOOK_HASH || '';
    const signature = req.headers['verif-hash'];

    if (secretHash && signature !== secretHash) {
      return res.status(401).send('Unauthorized');
    }

    const payload = JSON.parse(req.body);

    if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
      const payment = await Payment.findOne({ where: { txRef: payload.data.tx_ref } });
      if (payment && payment.status !== 'success') {
        payment.status = 'success';
        payment.flwRef = payload.data.flw_ref;
        payment.paymentMethod = payload.data.payment_type;
        await payment.save();
        await handlePostPayment(payment);
      }
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('Erreur webhook:', err);
    return res.status(500).send('Error');
  }
});

/**
 * GET /api/payment/verify/:txRef
 * Vérifie le statut d'un paiement
 */
router.get('/verify/:txRef', authenticate, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      where: { txRef: req.params.txRef, payerNumeroH: req.user.numeroH },
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Transaction introuvable' });
    }

    return res.json({ success: true, payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * GET /api/payment/history
 * Historique des paiements de l'utilisateur connecté
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { payerNumeroH: req.user.numeroH },
      order: [['createdAt', 'DESC']],
      limit: 20,
    });
    return res.json({ success: true, payments });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Actions déclenchées automatiquement après un paiement réussi
 */
async function handlePostPayment(payment) {
  try {
    if (payment.purpose === 'subscription_pro' && payment.relatedId) {
      // Activer/renouveler le compte professionnel (abonnement 1 mois)
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const proAccount = await ProfessionalAccount.findByPk(payment.relatedId);
      const wasAlreadyActive = proAccount?.subscriptionStatus === 'active';

      await ProfessionalAccount.update(
        {
          subscriptionStatus: 'active',
          subscriptionValidUntil: expiresAt,
          status: 'approved',
        },
        { where: { id: payment.relatedId } }
      );
      console.log(`✅ Abonnement pro activé pour compte ${payment.relatedId}`);

      // Récupérer l'email du compte pro (sinon celui du propriétaire)
      let proEmail = proAccount?.email || '';
      let proName  = proAccount?.name  || '';

      if (!proEmail && proAccount?.ownerNumeroH) {
        const owner = await User.findOne({ where: { numeroH: proAccount.ownerNumeroH } });
        proEmail = owner?.email || '';
        if (!proName) proName = `${owner?.prenom || ''} ${owner?.nomFamille || ''}`.trim();
      }

      // Envoi email via Brevo (reçu si premier paiement, renouvellement sinon)
      if (proEmail) {
        if (wasAlreadyActive) {
          // Renouvellement
          sendSubscriptionRenewedEmail({
            proEmail,
            proName,
            expiresAt,
            txRef: payment.txRef,
          }).catch(err => console.error('sendSubscriptionRenewedEmail:', err.message));
        } else {
          // Premier paiement — reçu
          sendSubscriptionReceipt({
            proEmail,
            proName,
            amount:    payment.amount,
            currency:  payment.currency || 'GNF',
            txRef:     payment.txRef,
            expiresAt,
          }).catch(err => console.error('sendSubscriptionReceipt:', err.message));
        }
      }
    }
  } catch (err) {
    console.error('Erreur handlePostPayment:', err);
  }
}

export default router;

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

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const FEDAPAY_SECRET_KEY = process.env.FEDAPAY_SECRET_KEY || '';
const FEDAPAY_ENV = process.env.FEDAPAY_ENV || 'sandbox'; // 'sandbox' ou 'live'
const FEDAPAY_BASE = FEDAPAY_ENV === 'live'
  ? 'https://api.fedapay.com/v1'
  : 'https://sandbox.fedapay.com/v1';
const FEDAPAY_CHECKOUT = FEDAPAY_ENV === 'live'
  ? 'https://checkout.fedapay.com'
  : 'https://sandbox-checkout.fedapay.com';

// Génère une référence unique
function generateTxRef(purpose) {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ADAM-${purpose.toUpperCase()}-${ts}-${rand}`;
}

/**
 * POST /api/payment/initiate
 * Initier un paiement via FedaPay
 */
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { amount, currency = 'GNF', purpose, relatedId, description } = req.body;
    const user = req.user;

    if (!amount || !purpose) {
      return res.status(400).json({ success: false, message: 'Montant et objet requis' });
    }

    if (!FEDAPAY_SECRET_KEY) {
      return res.status(503).json({
        success: false,
        message: 'Paiement bientôt disponible. Contactez l\'administrateur.',
      });
    }

    const txRef = generateTxRef(purpose);

    // Créer la transaction FedaPay
    const fedaRes = await fetch(`${FEDAPAY_BASE}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: description || purpose,
        amount,
        currency: { iso: currency },
        customer: {
          firstname: user.prenom || '',
          lastname: user.nomFamille || '',
          email: user.email || '',
        },
        callback_url: `${process.env.BACKEND_URL || ''}/api/payment/fedapay/webhook`,
        return_url: `${FRONTEND_URL}/paiement-resultat?txRef=${txRef}`,
      }),
    });

    if (!fedaRes.ok) {
      const errData = await fedaRes.json().catch(() => ({}));
      console.error('FedaPay erreur création:', errData);
      return res.status(502).json({ success: false, message: 'Erreur FedaPay, réessayez.' });
    }

    const fedaData = await fedaRes.json();
    const transactionId = fedaData?.v1?.transaction?.id;

    if (!transactionId) {
      return res.status(502).json({ success: false, message: 'Réponse FedaPay invalide.' });
    }

    // Obtenir le token de paiement
    const tokenRes = await fetch(`${FEDAPAY_BASE}/transactions/${transactionId}/token`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${FEDAPAY_SECRET_KEY}` },
    });

    const tokenData = await tokenRes.json();
    const token = tokenData?.v1?.token?.token;

    const paymentUrl = `${FEDAPAY_CHECKOUT}/?token=${token}`;

    // Sauvegarder la transaction en base
    await Payment.create({
      txRef,
      payerNumeroH: user.numeroH,
      amount,
      currency,
      purpose,
      relatedId: relatedId || null,
      status: 'pending',
      gatewayRef: String(transactionId),
    });

    return res.json({ success: true, txRef, paymentUrl });
  } catch (err) {
    console.error('Erreur initiation paiement:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * POST /api/payment/fedapay/webhook
 * Notification automatique de FedaPay après paiement
 */
router.post('/fedapay/webhook', async (req, res) => {
  try {
    const event = req.body;
    const transaction = event?.data?.object;

    if (!transaction) return res.sendStatus(200);

    const { reference, approved } = transaction;

    if (approved) {
      const payment = await Payment.findOne({ where: { gatewayRef: String(transaction.id) } });
      if (payment && payment.status !== 'completed') {
        payment.status = 'completed';
        await payment.save();
        await handlePostPayment(payment);
      }
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error('Webhook FedaPay erreur:', err);
    return res.sendStatus(200);
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

      let proEmail = proAccount?.email || '';
      let proName  = proAccount?.name  || '';

      if (!proEmail && proAccount?.ownerNumeroH) {
        const owner = await User.findOne({ where: { numeroH: proAccount.ownerNumeroH } });
        proEmail = owner?.email || '';
        if (!proName) proName = `${owner?.prenom || ''} ${owner?.nomFamille || ''}`.trim();
      }

      if (proEmail) {
        if (wasAlreadyActive) {
          sendSubscriptionRenewedEmail({
            proEmail,
            proName,
            expiresAt,
            txRef: payment.txRef,
          }).catch(err => console.error('sendSubscriptionRenewedEmail:', err.message));
        } else {
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

import express from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import Payment from '../models/Payment.js';
import { computeAmountForPurpose, handlePostPayment } from './payment.js';

const router = express.Router();

const DJOMY_CLIENT_ID     = process.env.DJOMY_CLIENT_ID || '';
const DJOMY_CLIENT_SECRET = process.env.DJOMY_CLIENT_SECRET || '';
const DJOMY_BASE_URL      = process.env.DJOMY_ENV === 'production'
  ? 'https://djomy.africa'
  : 'https://sandbox.djomy.africa';

function generateHmac(data, secret) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

function getApiKey() {
  const sig = generateHmac(DJOMY_CLIENT_ID, DJOMY_CLIENT_SECRET);
  return `${DJOMY_CLIENT_ID}:${sig}`;
}

async function getBearerToken() {
  const res = await fetch(`${DJOMY_BASE_URL}/v1/auth/token`, {
    method: 'POST',
    headers: { 'X-API-KEY': getApiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const data = await res.json();
  return data.access_token || data.token || data.accessToken || '';
}

// Formater le numéro de téléphone guinéen en format international 00224XXXXXXXXX
function formatPhone(phone) {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('00224')) return clean;
  if (clean.startsWith('224'))   return `00${clean}`;
  if (clean.startsWith('0'))     return `00224${clean.slice(1)}`;
  return `00224${clean}`;
}

// Complète le paiement (marque 'completed' + débloque ce qui a été acheté) une seule fois,
// même si le webhook ET le polling de statut arrivent tous les deux — évite de doubler
// l'action (ex: ajouter les points deux fois) pour un même paiement.
async function completeIfNeeded(payment) {
  if (!payment || payment.status === 'completed') return;
  payment.status = 'completed';
  await payment.save();
  await handlePostPayment(payment);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/djomy/initiate
// Paiement direct sans redirection (Orange Money, MTN MoMo)
// Le client reçoit un SMS/notification pour confirmer depuis son téléphone
// ─────────────────────────────────────────────────────────────────────────────
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { paymentMethod, payerPhone, purpose, relatedId, description } = req.body;
    const user = req.user;

    if (!paymentMethod || !payerPhone || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'paymentMethod, payerPhone et purpose sont requis.'
      });
    }

    const allowedDirect = ['OM', 'MOMO', 'KULU', 'SOUTRA_MONEY'];
    if (!allowedDirect.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `Pour ${paymentMethod}, utilisez le paiement par redirection (/api/djomy/gateway).`
      });
    }

    // Ne jamais faire confiance à un montant envoyé par le frontend — recalculé ici.
    const priced = await computeAmountForPurpose(purpose, relatedId, user);
    if (priced.error) {
      return res.status(400).json({ success: false, message: priced.error });
    }
    const amount = priced.amount;

    const token = await getBearerToken();
    const ref = `MF-${purpose}-${Date.now()}`;

    const payload = {
      paymentMethod,
      payerIdentifier: formatPhone(payerPhone),
      amount,
      countryCode: 'GN',
      description: description || 'Paiement Moftal',
      merchantPaymentReference: ref,
      returnUrl:  'https://moftal.com/payment/success',
      cancelUrl:  'https://moftal.com/payment/cancel',
      metadata:   { userId: user.numeroH, ref }
    };

    const djomyRes = await fetch(`${DJOMY_BASE_URL}/v1/payments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-KEY':     getApiKey(),
        'Content-Type':  'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await djomyRes.json();

    if (djomyRes.ok) {
      const transactionId = String(data.transactionId || data.data?.transactionId || data.id || ref);
      await Payment.create({
        txRef: ref,
        payerNumeroH: user.numeroH,
        amount,
        currency: 'GNF',
        purpose,
        relatedId: relatedId || null,
        status: 'pending',
        gatewayRef: transactionId,
        paymentMethod,
      });
      res.json({ success: true, reference: ref, transactionId, ...data });
    } else {
      res.status(djomyRes.status).json({
        success: false,
        message: data.message || 'Erreur Djomy.',
        details: data
      });
    }
  } catch (err) {
    console.error('djomy/initiate:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/djomy/gateway
// Paiement avec redirection vers le portail Djomy (tous moyens dont Visa/MC)
// Retourne une URL vers laquelle rediriger le client
// ─────────────────────────────────────────────────────────────────────────────
router.post('/gateway', authenticate, async (req, res) => {
  try {
    const { payerPhone, allowedPaymentMethods, purpose, relatedId, description } = req.body;
    const user = req.user;

    if (!purpose) {
      return res.status(400).json({ success: false, message: 'purpose est requis.' });
    }

    // Ne jamais faire confiance à un montant envoyé par le frontend — recalculé ici.
    const priced = await computeAmountForPurpose(purpose, relatedId, user);
    if (priced.error) {
      return res.status(400).json({ success: false, message: priced.error });
    }
    const amount = priced.amount;

    const token = await getBearerToken();
    const ref   = `MF-${purpose}-${Date.now()}`;

    const payload = {
      amount,
      countryCode: 'GN',
      payerNumber: formatPhone(payerPhone || '600000000'),
      allowedPaymentMethods: allowedPaymentMethods || ['OM', 'MOMO', 'CARD', 'PAYCARD'],
      description: description || 'Paiement Moftal',
      merchantPaymentReference: ref,
      returnUrl:  'https://moftal.com/payment/success',
      cancelUrl:  'https://moftal.com/payment/cancel',
      metadata:   { userId: user.numeroH, ref }
    };

    const djomyRes = await fetch(`${DJOMY_BASE_URL}/v1/payments/gateway`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-API-KEY':     getApiKey(),
        'Content-Type':  'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await djomyRes.json();

    if (djomyRes.ok) {
      const transactionId = String(data.transactionId || data.data?.transactionId || data.id || ref);
      await Payment.create({
        txRef: ref,
        payerNumeroH: user.numeroH,
        amount,
        currency: 'GNF',
        purpose,
        relatedId: relatedId || null,
        status: 'pending',
        gatewayRef: transactionId,
        paymentMethod: 'CARD',
      });
      const redirectUrl = data.redirectUrl || data.paymentUrl || data.url || data.data?.redirectUrl;
      res.json({ success: true, reference: ref, transactionId, redirectUrl, ...data });
    } else {
      res.status(djomyRes.status).json({
        success: false,
        message: data.message || 'Erreur Djomy.',
        details: data
      });
    }
  } catch (err) {
    console.error('djomy/gateway:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/djomy/status/:transactionId
// Vérifier le statut d'un paiement — complète aussi le paiement si Djomy confirme
// un succès et qu'il n'a pas encore été débloqué (filet de sécurité si le webhook
// n'est pas encore arrivé ou a échoué).
// ─────────────────────────────────────────────────────────────────────────────
router.get('/status/:transactionId', authenticate, async (req, res) => {
  try {
    const token = await getBearerToken();

    const djomyRes = await fetch(
      `${DJOMY_BASE_URL}/v1/payments/${req.params.transactionId}/status`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-KEY':     getApiKey()
        }
      }
    );

    const data = await djomyRes.json();
    const status = data.status || data.data?.status || '';

    if (djomyRes.ok && status === 'SUCCESS') {
      const payment = await Payment.findOne({
        where: { gatewayRef: req.params.transactionId, payerNumeroH: req.user.numeroH }
      });
      await completeIfNeeded(payment);
    }

    res.json({ success: djomyRes.ok, ...data });
  } catch (err) {
    console.error('djomy/status:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/djomy/webhook
// Réception des notifications de paiement Djomy
// ─────────────────────────────────────────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'] || '';
    const bodyStr   = Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body);

    // Vérification de la signature HMAC
    const expectedSig = `v1:${generateHmac(bodyStr, DJOMY_CLIENT_SECRET)}`;
    if (DJOMY_CLIENT_SECRET && signature !== expectedSig) {
      console.warn('djomy/webhook: signature invalide');
      return res.status(400).json({ error: 'Signature invalide' });
    }

    const event = typeof req.body === 'object' && !Buffer.isBuffer(req.body) ? req.body : JSON.parse(bodyStr);
    console.log('📩 Djomy webhook:', event.eventType, '| transaction:', event.data?.transactionId);

    if (event.eventType === 'payment.success') {
      const { transactionId, paidAmount, merchantPaymentReference, paymentMethod, currency } = event.data || {};
      console.log(`✅ Paiement Djomy réussi: ${paidAmount} ${currency} via ${paymentMethod} — réf: ${merchantPaymentReference}`);

      const payment = transactionId
        ? await Payment.findOne({ where: { gatewayRef: String(transactionId) } })
        : (merchantPaymentReference ? await Payment.findOne({ where: { txRef: merchantPaymentReference } }) : null);

      if (!payment) {
        console.warn('djomy/webhook: paiement introuvable pour', transactionId, merchantPaymentReference);
      } else {
        await completeIfNeeded(payment);
      }
    }

    if (event.eventType === 'payment.failed') {
      console.warn('❌ Paiement Djomy échoué:', event.data?.transactionId);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('djomy/webhook:', err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

export default router;

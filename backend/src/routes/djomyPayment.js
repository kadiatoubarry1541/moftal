import express from 'express';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';

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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/djomy/initiate
// Paiement direct sans redirection (Orange Money, MTN MoMo)
// Le client reçoit un SMS/notification pour confirmer depuis son téléphone
// ─────────────────────────────────────────────────────────────────────────────
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { paymentMethod, payerPhone, amount, description, reference } = req.body;

    if (!paymentMethod || !payerPhone || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'paymentMethod, payerPhone et amount sont requis.'
      });
    }

    const allowedDirect = ['OM', 'MOMO', 'KULU', 'SOUTRA_MONEY'];
    if (!allowedDirect.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `Pour ${paymentMethod}, utilisez le paiement par redirection (/api/djomy/gateway).`
      });
    }

    const token = await getBearerToken();
    const ref = reference || `MF-${Date.now()}`;

    const payload = {
      paymentMethod,
      payerIdentifier: formatPhone(payerPhone),
      amount:   Number(amount),
      countryCode: 'GN',
      description: description || 'Paiement Moftal',
      merchantPaymentReference: ref,
      returnUrl:  'https://moftal.com/payment/success',
      cancelUrl:  'https://moftal.com/payment/cancel',
      metadata:   { userId: req.user.numeroH, ref }
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
      res.json({ success: true, reference: ref, ...data });
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
    const { amount, payerPhone, allowedPaymentMethods, description, reference } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'amount est requis.' });
    }

    const token = await getBearerToken();
    const ref   = reference || `MF-${Date.now()}`;

    const payload = {
      amount:   Number(amount),
      countryCode: 'GN',
      payerNumber: formatPhone(payerPhone || '600000000'),
      allowedPaymentMethods: allowedPaymentMethods || ['OM', 'MOMO', 'CARD', 'PAYCARD'],
      description: description || 'Paiement Moftal',
      merchantPaymentReference: ref,
      returnUrl:  'https://moftal.com/payment/success',
      cancelUrl:  'https://moftal.com/payment/cancel',
      metadata:   { userId: req.user.numeroH, ref }
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
      res.json({ success: true, reference: ref, ...data });
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
// Vérifier le statut d'un paiement
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

    const event = typeof req.body === 'object' ? req.body : JSON.parse(bodyStr);
    console.log('📩 Djomy webhook:', event.eventType, '| transaction:', event.data?.transactionId);

    if (event.eventType === 'payment.success') {
      const { transactionId, paidAmount, merchantPaymentReference, paymentMethod, currency } = event.data;
      console.log(`✅ Paiement Djomy réussi: ${paidAmount} ${currency} via ${paymentMethod} — réf: ${merchantPaymentReference}`);
      // La mise à jour de la base de données se fait selon la référence marchande (merchantPaymentReference)
      // qui correspond à l'action déclenchée (abonnement, activation arbre, etc.)
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

import express from 'express';
import webpush from 'web-push';
import { authenticate } from '../middleware/auth.js';
import PushSubscription from '../models/PushSubscription.js';

const router = express.Router();

const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT     || 'mailto:noreply@moftal.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// GET /api/push/vapid-key — retourne la clé publique VAPID
router.get('/vapid-key', (req, res) => {
  if (!VAPID_PUBLIC_KEY) {
    return res.status(503).json({ success: false, message: 'Push non configuré' });
  }
  res.json({ success: true, publicKey: VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe — enregistre un abonnement push
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ success: false, message: 'Abonnement invalide' });
    }
    await PushSubscription.upsert(req.userId, {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur subscribe push:', error);
    res.status(500).json({ success: false });
  }
});

// DELETE /api/push/unsubscribe — désactive un abonnement push
router.delete('/unsubscribe', authenticate, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) await PushSubscription.removeExpired(endpoint);
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

export default router;

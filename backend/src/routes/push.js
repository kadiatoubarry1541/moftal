import express from 'express';
import { authenticate } from '../middleware/auth.js';
import PushSubscription from '../models/PushSubscription.js';
import { preparerClesPush } from '../utils/clesPush.js';

const router = express.Router();

// Clés prêtes dès le démarrage (hébergeur, sinon base — voir utils/clesPush.js)
preparerClesPush();

// GET /api/push/vapid-key — retourne la clé publique VAPID
router.get('/vapid-key', async (req, res) => {
  const publicKey = await preparerClesPush();
  if (!publicKey) {
    return res.status(503).json({ success: false, message: 'Push non configuré' });
  }
  res.json({ success: true, publicKey });
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

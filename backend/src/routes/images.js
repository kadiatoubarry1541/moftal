import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { imageAffichable } from '../utils/images.js';

const router = express.Router();

// POST /api/images/convertir — corps = le fichier image brut (tout format).
// Renvoie une data URL affichable par tous les navigateurs.
router.post('/convertir', authenticate, express.raw({ type: () => true, limit: '40mb' }), async (req, res) => {
  try {
    if (!req.body?.length) return res.status(400).json({ success: false, message: 'Aucune image reçue.' });
    const r = await imageAffichable(req.body, String(req.headers['content-type'] || ''));
    res.json({ success: true, dataUrl: `data:${r.mime};base64,${r.buffer.toString('base64')}` });
  } catch {
    res.status(422).json({ success: false, message: "Cette image est abîmée ou n'est pas une image." });
  }
});

export default router;

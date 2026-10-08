import express from 'express';
import { lireFichier } from '../services/fichiersBase.js';

const router = express.Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/fichiers/:id — photo enregistrée en base (public, comme une photo de profil)
router.get('/:id', async (req, res) => {
  try {
    if (!UUID_RE.test(req.params.id)) return res.status(404).end();
    const f = await lireFichier(req.params.id);
    if (!f) return res.status(404).end();
    res.setHeader('Content-Type', f.mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(f.donnees);
  } catch (e) {
    console.error('Erreur /api/fichiers:', e.message);
    res.status(500).end();
  }
});

export default router;

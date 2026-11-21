import express from 'express';
import { lirePrive, verifierLien } from '../services/mediasPrives.js';

const router = express.Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/fichiers-prives/:id?e=…&s=… — média privé (famille, stories…).
// Le lien signé et temporaire n'est donné que par les routes qui vérifient déjà
// qui a le droit de voir le média ; sans signature valide, rien n'est servi.
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id) || !verifierLien(id, req.query.e, req.query.s)) return res.status(404).end();
    const f = await lirePrive(id.toLowerCase());
    if (!f?.contenu) return res.status(404).end();
    const sur = /^(image\/(jpeg|png|gif|webp|avif)|video\/[\w.+-]+|audio\/[\w.+-]+)$/i.test(String(f.mime || ''));
    const resteSecondes = Math.max(0, Math.floor(Number(req.query.e) - Date.now() / 1000));
    res.setHeader('Content-Type', sur ? f.mime : 'application/octet-stream');
    if (!sur) res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('Content-Security-Policy', 'sandbox');
    // Privé : gardé par le navigateur de la personne seulement, jamais par un relais
    res.setHeader('Cache-Control', `private, max-age=${resteSecondes}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.send(f.contenu);
  } catch (e) {
    console.error('Erreur /api/fichiers-prives:', e.message);
    res.status(500).end();
  }
});

export default router;

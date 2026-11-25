import express from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { adresseVisiteur, validationLimite } from '../utils/cleLimite.js';
import { config } from '../../config.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { enregistrerErreur, listerErreurs, marquerResolue } from '../services/journalErreurs.js';

const router = express.Router();

// Le site signale une erreur (écran « Oups ! », erreur de page). Ouvert à tous
// (une erreur peut survenir avant la connexion), mais limité : 30 envois par
// quart d'heure et par appareil, et jamais de gros contenus.
// Compté par visiteur réel (avant : par l'adresse du relais, la même pour tout
// le monde → 30 erreurs par quart d'heure pour tout le site)
const limite = rateLimit({
  windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => `erreurs:${adresseVisiteur(req)}`, validate: validationLimite,
});

// Protection des pages du site (CSP) en mode observation : le navigateur signale
// ce que la règle bloquerait, sans rien bloquer. Rangé dans ce journal (une ligne
// par cas, avec le nombre de fois) pour régler la règle avant de l'activer.
const limiteCsp = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => `csp:${adresseVisiteur(req)}`, validate: validationLimite,
});
const corpsCsp = express.json({ type: ['application/csp-report', 'application/reports+json', 'application/json'], limit: '10kb' });
router.post('/csp', limiteCsp, corpsCsp, async (req, res) => {
  try {
    const liste = Array.isArray(req.body) ? req.body : [req.body];
    for (const r of liste.slice(0, 5)) {
      const c = r?.['csp-report'] || r?.body || {};
      const directive = String(c['effective-directive'] || c.effectiveDirective || c['violated-directive'] || c.violatedDirective || '?').slice(0, 60);
      const bloque = String(c['blocked-uri'] || c.blockedURL || c.blockedUri || '?').slice(0, 200);
      await enregistrerErreur({
        origine: 'site',
        message: `Protection des pages (observation) : bloquerait ${directive} → ${bloque}`,
        adresse: String(c['document-uri'] || c.documentURL || '').slice(0, 300),
        navigateur: String(req.headers['user-agent'] || '').slice(0, 300),
        alerter: false,
      });
    }
  } catch { /* un rapport mal formé n'est pas une erreur */ }
  res.status(204).end();
});

router.post('/', limite, async (req, res) => {
  const { message, pile, adresse } = req.body || {};
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, message: 'Erreur vide.' });
  }
  // Personne connectée (facultatif) : pour pouvoir l'aider
  let numeroH = null;
  try {
    const auth = String(req.headers.authorization || '');
    if (auth.startsWith('Bearer ')) numeroH = jwt.verify(auth.slice(7).trim(), config.JWT_SECRET, { algorithms: ['HS256'] })?.numeroH || null;
  } catch { /* jeton expiré : l'erreur est quand même enregistrée */ }
  const ligne = await enregistrerErreur({
    origine: 'site',
    message: message.trim(),
    pile: typeof pile === 'string' ? pile : null,
    adresse: typeof adresse === 'string' ? adresse : null,
    navigateur: req.headers['user-agent'] || null,
    numeroH,
  });
  // Réponse honnête : « enregistrée » seulement si elle l'est vraiment
  res.status(ligne ? 201 : 503).json({ success: !!ligne });
});

// Administrateur : erreurs à traiter (ou toutes avec ?toutes=1)
router.get('/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const erreurs = await listerErreurs({ toutes: req.query.toutes === '1' });
    res.json({ success: true, erreurs });
  } catch (e) {
    console.error('erreurs/admin:', e.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

router.patch('/admin/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(404).json({ success: false, message: 'Introuvable.' });
    const ok = await marquerResolue(req.params.id, req.body?.resolue !== false);
    if (!ok) return res.status(404).json({ success: false, message: 'Introuvable.' });
    res.json({ success: true });
  } catch (e) {
    console.error('erreurs/admin PATCH:', e.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;

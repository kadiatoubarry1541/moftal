// Vérification anti-robot (Cloudflare Turnstile, gratuit et sans limite de
// vérifications) pour la création de compte et la demande de code « mot de passe
// oublié » : un robot ne peut plus créer des milliers de comptes ni inonder une
// boîte mail de codes.
// Inactive tant que TURNSTILE_SECRET_KEY n'est pas réglée chez l'hébergeur.
// Une personne déjà connectée (ex. ajout d'un défunt) n'est pas concernée.
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import { adresseVisiteur } from '../utils/cleLimite.js';

const connecte = (req) => {
  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) return false;
  try { return !jwt.verify(auth.slice(7).trim(), config.JWT_SECRET, { algorithms: ['HS256'] })?.purpose; } catch { return false; }
};

export async function verifierAntiRobot(req, res, next) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || connecte(req)) return next();
  const jeton = String(req.headers['x-anti-robot'] || '').trim();
  if (!jeton) {
    return res.status(403).json({ success: false, code: 'ANTI_ROBOT', message: 'Vérification anti-robot impossible. Rechargez la page puis réessayez.' });
  }
  try {
    const corps = new URLSearchParams({ secret, response: jeton, remoteip: adresseVisiteur(req) });
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', body: corps, signal: AbortSignal.timeout(8000),
    });
    const d = await r.json();
    if (d?.success) return next();
    return res.status(403).json({ success: false, code: 'ANTI_ROBOT', message: 'Vérification anti-robot échouée. Rechargez la page puis réessayez.' });
  } catch (e) {
    // Cloudflare injoignable : on laisse passer (les limites de requêtes restent actives)
    console.error('Anti-robot injoignable :', e.message);
    return next();
  }
}

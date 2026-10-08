import jwt from 'jsonwebtoken';
import { config } from '../../config.js';

/**
 * Adresse réelle du visiteur. Sur Render, le serveur est derrière un proxy :
 * sans cela, req.ip est l'adresse du proxy, la même pour TOUT le monde, et la
 * limite de requêtes était partagée par tout le site (compteur de messages,
 * notifications… refusés par « Trop de requêtes »).
 */
export function adresseVisiteur(req) {
  const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return String(req.headers['cf-connecting-ip'] || req.headers['true-client-ip'] || xff || req.ip || 'inconnue');
}

/** Limite par membre connecté (jeton valide), sinon par adresse du visiteur. */
export function cleLimite(req) {
  const auth = String(req.headers.authorization || '');
  if (auth.startsWith('Bearer ')) {
    try {
      const { numeroH } = jwt.verify(auth.slice(7), config.JWT_SECRET);
      if (numeroH) return `membre:${numeroH}`;
    } catch { /* jeton invalide : on limite par adresse */ }
  }
  return `ip:${adresseVisiteur(req)}`;
}

// Les vérifications automatiques d'express-rate-limit sur req.ip ne s'appliquent
// plus : la clé est calculée ci-dessus.
export const validationLimite = { xForwardedForHeader: false, trustProxy: false, ip: false };

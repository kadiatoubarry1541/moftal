import jwt from 'jsonwebtoken';
import { config } from '../../config.js';

import net from 'net';

// Adresses de Cloudflare (https://www.cloudflare.com/ips/) : seul un appel venant
// de l'une d'elles peut nous dire l'adresse du visiteur (en-tête CF-Connecting-IP).
const CLOUDFLARE = new net.BlockList();
for (const r of ['173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
  '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
  '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22']) {
  const [a, n] = r.split('/'); CLOUDFLARE.addSubnet(a, Number(n), 'ipv4');
}
for (const r of ['2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
  '2a06:98c0::/29', '2c0f:f248::/32']) {
  const [a, n] = r.split('/'); CLOUDFLARE.addSubnet(a, Number(n), 'ipv6');
}
// Notre propre relais (Caddy, plateforme d'hébergement) : adresse privée ou locale
const PRIVEES = new net.BlockList();
for (const [a, n] of [['10.0.0.0', 8], ['172.16.0.0', 12], ['192.168.0.0', 16], ['127.0.0.0', 8], ['100.64.0.0', 10]]) PRIVEES.addSubnet(a, n, 'ipv4');
PRIVEES.addSubnet('fc00::', 7, 'ipv6'); PRIVEES.addAddress('::1', 'ipv6');

const propre = (ip) => String(ip || '').trim().replace(/^::ffff:/i, '').replace(/^\[|\]$/g, '');
const type = (ip) => (net.isIPv4(ip) ? 'ipv4' : net.isIPv6(ip) ? 'ipv6' : null);
const dans = (liste, ip) => { const t = type(ip); return !!t && liste.check(ip, t); };

/**
 * Adresse réelle du visiteur, impossible à inventer.
 * Avant, les en-têtes CF-Connecting-IP / True-Client-IP / X-Forwarded-For envoyés
 * par le visiteur lui-même étaient crus : en changeant l'en-tête à chaque requête,
 * on contournait toutes les limites (essais de mot de passe, envois…).
 * Maintenant : l'appelant direct (ou, derrière notre propre relais, la dernière
 * adresse que ce relais a ajoutée) ; et CF-Connecting-IP seulement si cet appelant
 * est réellement Cloudflare.
 */
export function adresseVisiteur(req) {
  let pair = propre(req.socket?.remoteAddress || req.ip);
  if (dans(PRIVEES, pair)) {
    // De droite à gauche, en sautant nos propres relais (adresses privées) : la
    // première adresse publique est celle que notre hébergeur a vue (Render, Caddy)
    const xff = String(req.headers['x-forwarded-for'] || '').split(',').map(propre).filter(Boolean);
    for (let i = xff.length - 1; i >= 0; i--) {
      pair = xff[i];
      if (!dans(PRIVEES, pair)) break;
    }
  }
  if (dans(CLOUDFLARE, pair)) {
    const cf = propre(req.headers['cf-connecting-ip']);
    if (type(cf)) return cf;
  }
  return pair || 'inconnue';
}

/** Limite par membre connecté (jeton valide), sinon par adresse du visiteur. */
export function cleLimite(req) {
  const auth = String(req.headers.authorization || '');
  if (auth.startsWith('Bearer ')) {
    try {
      const { numeroH } = jwt.verify(auth.slice(7), config.JWT_SECRET, { algorithms: ['HS256'] });
      if (numeroH) return `membre:${numeroH}`;
    } catch { /* jeton invalide : on limite par adresse */ }
  }
  return `ip:${adresseVisiteur(req)}`;
}

// Les vérifications automatiques d'express-rate-limit sur req.ip ne s'appliquent
// plus : la clé est calculée ci-dessus.
export const validationLimite = { xForwardedForHeader: false, trustProxy: false, ip: false };

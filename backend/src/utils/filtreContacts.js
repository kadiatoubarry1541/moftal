/**
 * Règle 5 du projet : le public ne voit ni le téléphone ni l'e-mail d'un pro.
 * Un pro ne doit donc pas les écrire dans ses textes publics (description,
 * services, publications, produits…) pour contourner Moftal.
 *
 * Détecte :
 *  - une adresse e-mail ;
 *  - un numéro guinéen (9 chiffres commençant par 6, ou fixe 30…), avec ou sans
 *    +224 / 00224, espaces, points ou tirets ;
 *  - un numéro international (+… ou 00… suivi de 8 à 15 chiffres).
 * Un montant (« 600 000 000 FG ») n'est pas un numéro.
 */

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
// Suite de chiffres pouvant être séparés par un espace, un point, un tiret ou une barre
const SUITE = /(\+|00)?\d(?:[\s.\-/]?\d){7,16}/g;
const DEVISE_APRES = /^\s*(fg|gnf|f\b|francs?|fcfa|cfa|\$|€|usd|eur|xof|dollars?|euros?)/i;

export function trouverContact(texte) {
  const t = String(texte ?? '');
  if (!t) return null;
  if (EMAIL.test(t)) return 'une adresse e-mail';
  for (const m of t.matchAll(SUITE)) {
    const brut = m[0];
    const apres = t.slice(m.index + brut.length);
    if (DEVISE_APRES.test(apres)) continue; // un prix, pas un numéro
    const chiffres = brut.replace(/\D/g, '');
    const international = brut.startsWith('+') || brut.startsWith('00');
    const local = chiffres.replace(/^(00)?224/, '');
    if (/^6\d{8}$/.test(local) || /^30\d{6}$/.test(local)) return 'un numéro de téléphone';
    if (international && chiffres.replace(/^00/, '').length >= 8) return 'un numéro de téléphone';
  }
  return null;
}

/**
 * Vérifie plusieurs champs (textes, listes, objets). Renvoie le message d'erreur
 * à afficher, ou null si tout va bien.
 */
export function refusContact(...valeurs) {
  const textes = [];
  const collecter = (v) => {
    if (v == null) return;
    if (typeof v === 'string' || typeof v === 'number') textes.push(String(v));
    else if (Array.isArray(v)) v.forEach(collecter);
    else if (typeof v === 'object') Object.values(v).forEach(collecter);
  };
  valeurs.forEach(collecter);
  for (const t of textes) {
    const trouve = trouverContact(t);
    if (trouve) {
      return `Votre texte contient ${trouve}. Sur Moftal, vos clients vous contactent par rendez-vous ou commande : ils reçoivent vos coordonnées dès que vous acceptez. Retirez-le, puis réessayez.`;
    }
  }
  return null;
}

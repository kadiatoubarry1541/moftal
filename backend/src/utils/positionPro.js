/**
 * Position de l'établissement d'un professionnel.
 *
 *  - Posée par le pro sur place (« Je suis dans mon établissement ») ou sur la carte,
 *    avec un repère écrit et une photo de la façade : en Guinée, ce sont eux qui
 *    amènent le client à la bonne porte.
 *  - Jamais montrée au public (seulement le quartier, déjà dans l'adresse) : le point
 *    exact est donné au client dont le rendez-vous est accepté (règle 5 du projet).
 *  - Le quartier trouvé par le GPS est comparé au quartier déclaré : s'ils diffèrent,
 *    la position est signalée à l'administrateur.
 */

/** Champs de position : retirés des réponses publiques. */
export const CHAMPS_POSITION = ['latitude', 'longitude', 'repere', 'photoFacade', 'quartierGps', 'positionAVerifier', 'positionLe'];

export function sansPosition(objet) {
  if (!objet) return objet;
  const o = { ...objet };
  for (const c of CHAMPS_POSITION) delete o[c];
  return o;
}

/** Position à donner à un client autorisé (rendez-vous accepté). */
export function positionDe(compte) {
  if (!compte || compte.latitude == null || compte.longitude == null) return null;
  return {
    latitude: Number(compte.latitude),
    longitude: Number(compte.longitude),
    repere: compte.repere || null,
    photoFacade: compte.photoFacade || null,
  };
}

const MOTS_VIDES = new Set(['commune', 'quartier', 'secteur', 'de', 'du', 'des', 'la', 'le', 'les', 'l', 'rue', 'avenue', 'pres', 'face', 'en', 'et', 'a', 'au', 'guinee', 'republique']);

function mots(texte) {
  return String(texte || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().split(/[^a-z0-9]+/)
    .filter((m) => m.length >= 3 && !MOTS_VIDES.has(m));
}

/**
 * Le quartier donné par le GPS correspond-il à l'adresse déclarée ?
 * Vrai si un mot significatif est commun (« Kipé » dans « Kipé, Ratoma »).
 * Sans quartier GPS ou sans adresse déclarée, on ne peut pas conclure : vrai.
 */
export function quartierCorrespond(quartierGps, ...adresseDeclaree) {
  const gps = mots(quartierGps);
  const declare = new Set(mots(adresseDeclaree.join(' ')));
  if (!gps.length || !declare.size) return true;
  return gps.some((m) => declare.has(m));
}

/** Coordonnées valides (nombres dans les bornes de la Terre). */
export function coordonneesValides(lat, lng) {
  const a = Number(lat);
  const o = Number(lng);
  return Number.isFinite(a) && Number.isFinite(o) && a >= -90 && a <= 90 && o >= -180 && o <= 180 && !(a === 0 && o === 0);
}

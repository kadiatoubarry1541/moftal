// Types d'espaces Gestion Interne → chemin de leur site vitrine public
// (doit rester synchronisé avec ADMIN_SERVICES dans GestionInterne.tsx et les
// routes /:vitrinePath/:tenantCode déclarées dans App.tsx).
export const GESTION_VITRINE_PATHS: Record<string, string> = {
  clinic: 'clinique',
  school: 'ecole',
  mosque: 'mosquee',
  reseau: 'reseau-vitrine',
  madrasa: 'madrasa',
  commerce: 'commerce',
  enterprise: 'entreprise',
  ngo: 'ngo',
  journalist: 'journaliste',
  scientist: 'scientifique',
  supplier: 'fournisseur',
  security_agency: 'securite',
  broker: 'immobilier',
  restaurant: 'restaurant',
  transport: 'transport',
  mairie: 'mairie',
  vendor: 'vendeur',
  producer: 'producteur',
  beauty: 'beaute-vitrine',
  artisan: 'artisan',
};

// Chemin de gestion (/gestion-xxx/CODE) → chemin de son site vitrine
// (pour le bouton « Site vitrine » de la barre de chaque gestion interne).
const GESTION_ROUTE_VERS_VITRINE: Record<string, string> = {
  'gestion-clinique': 'clinique',
  'gestion-ecole': 'ecole',
  'gestion-ecole-v1': 'ecole',
  'gestion-madrasa': 'madrasa',
  'gestion-madrasa-v2': 'madrasa',
  'gestion-mosquee': 'mosquee',
  'gestion-imam': 'imam',
  'gestion-imam-pro': 'imam',
  'gestion-reseau': 'reseau-vitrine',
  'gestion-commerce': 'commerce',
  'gestion-entreprise': 'entreprise',
  'gestion-ngo': 'ngo',
  'gestion-journaliste': 'journaliste',
  'gestion-scientifique': 'scientifique',
  'gestion-fournisseur': 'fournisseur',
  'gestion-securite': 'securite',
  'gestion-immobilier': 'immobilier',
  'gestion-restaurant': 'restaurant',
  'gestion-transport': 'transport',
  'gestion-mairie': 'mairie',
  'gestion-vendeur': 'vendeur',
  'gestion-producer': 'producteur',
  'gestion-beauty': 'beaute-vitrine',
  'gestion-artisan': 'artisan',
};

export function cheminVitrineDepuisGestion(pathname: string): string | null {
  const [, route, code] = pathname.split('/');
  const vitrine = GESTION_ROUTE_VERS_VITRINE[route];
  return vitrine && code ? `/${vitrine}/${code}` : null;
}

// Site vitrine ouvert depuis la gestion : on garde (pour l'onglet en cours
// seulement) la page de gestion d'où l'on vient, pour pouvoir y revenir.
const CLE_RETOUR_GESTION = 'moftal_retour_gestion';

export function lireRetourGestion(): { gestion: string; vitrine: string } | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(CLE_RETOUR_GESTION) || 'null');
    return v && typeof v.gestion === 'string' && typeof v.vitrine === 'string' ? v : null;
  } catch { return null; }
}

export function ecrireRetourGestion(v: { gestion: string; vitrine: string } | null) {
  try {
    if (v) sessionStorage.setItem(CLE_RETOUR_GESTION, JSON.stringify(v));
    else sessionStorage.removeItem(CLE_RETOUR_GESTION);
  } catch { /* stockage indisponible : pas de bouton retour, sans erreur */ }
}

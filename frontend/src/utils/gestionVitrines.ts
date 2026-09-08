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

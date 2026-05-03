/**
 * Utilitaire de devises — Moftal
 * Taux de change approximatifs depuis le GNF (Franc Guinéen)
 * 1 GNF = X devise locale
 */

export interface DeviseInfo {
  code: string;
  symbole: string;
  nom: string;
  tauxDepuisGNF: number; // combien de GNF pour 1 unité de cette devise
}

// Taux approximatifs (mise à jour périodique recommandée)
const DEVISES: Record<string, DeviseInfo> = {
  GNF: { code: 'GNF', symbole: 'FG',  nom: 'Franc Guinéen',        tauxDepuisGNF: 1 },
  EUR: { code: 'EUR', symbole: '€',   nom: 'Euro',                  tauxDepuisGNF: 9800 },
  USD: { code: 'USD', symbole: '$',   nom: 'Dollar américain',      tauxDepuisGNF: 8600 },
  GBP: { code: 'GBP', symbole: '£',   nom: 'Livre sterling',        tauxDepuisGNF: 11000 },
  XOF: { code: 'XOF', symbole: 'CFA', nom: 'Franc CFA Ouest',       tauxDepuisGNF: 15 },
  MAD: { code: 'MAD', symbole: 'DH',  nom: 'Dirham marocain',       tauxDepuisGNF: 860 },
  CAD: { code: 'CAD', symbole: 'C$',  nom: 'Dollar canadien',       tauxDepuisGNF: 6300 },
  GHS: { code: 'GHS', symbole: 'GH₵', nom: 'Cedi ghanéen',          tauxDepuisGNF: 570 },
  NGN: { code: 'NGN', symbole: '₦',   nom: 'Naira nigérian',        tauxDepuisGNF: 5 },
  MRU: { code: 'MRU', symbole: 'UM',  nom: 'Ouguiya mauritanien',   tauxDepuisGNF: 215 },
  GMD: { code: 'GMD', symbole: 'D',   nom: 'Dalasi gambien',        tauxDepuisGNF: 130 },
  SLL: { code: 'SLL', symbole: 'Le',  nom: 'Leone sierra-léonais',  tauxDepuisGNF: 1 },
};

// Correspondance pays → devise
const PAYS_DEVISE: Record<string, string> = {
  // Guinée et voisins
  'guinée':           'GNF', 'guinea':           'GNF',
  'sénégal':          'XOF', 'senegal':          'XOF',
  'mali':             'XOF',
  'côte d\'ivoire':   'XOF', 'cote d\'ivoire':   'XOF', 'côte divoire': 'XOF',
  'burkina faso':     'XOF',
  'togo':             'XOF',
  'bénin':            'XOF', 'benin':            'XOF',
  'niger':            'XOF',
  'ghana':            'GHS',
  'nigeria':          'NGN',
  'mauritanie':       'MRU',
  'gambie':           'GMD',
  'sierra leone':     'SLL', 'sierra léone':     'SLL',
  'guinée-bissau':    'XOF', 'guinee-bissau':    'XOF',
  'liberia':          'USD',

  // Europe
  'france':           'EUR',
  'belgique':         'EUR',
  'espagne':          'EUR',
  'italie':           'EUR',
  'allemagne':        'EUR',
  'portugal':         'EUR',
  'pays-bas':         'EUR',
  'suisse':           'EUR',
  'royaume-uni':      'GBP', 'angleterre':       'GBP',

  // Amériques
  'états-unis':       'USD', 'etats-unis':       'USD', 'usa':            'USD',
  'canada':           'CAD',

  // Afrique du Nord
  'maroc':            'MAD',
  'algérie':          'DZD', 'algerie':          'DZD',
  'tunisie':          'TND',

  // Moyen-Orient
  'arabie saoudite':  'SAR',
  'émirats arabes':   'AED', 'emirats arabes':   'AED',
  'koweït':           'KWD', 'koweit':           'KWD',
  'qatar':            'QAR',

  // Afrique Centrale
  'cameroun':         'XAF',
  'congo':            'XAF',
  'gabon':            'XAF',
  'tchad':            'XAF',
  'centrafrique':     'XAF',
  'guinée équatoriale': 'XAF',

  // Asie
  'chine':            'CNY',
  'turquie':          'TRY',

  // Autres
  'afrique du sud':   'ZAR',
  'brésil':           'BRL', 'bresil':           'BRL',
  'russie':           'RUB',
};

// Devises supplémentaires
Object.assign(DEVISES, {
  // Maghreb & Moyen-Orient
  DZD: { code: 'DZD', symbole: 'DA',  nom: 'Dinar algérien',      tauxDepuisGNF: 64 },
  TND: { code: 'TND', symbole: 'DT',  nom: 'Dinar tunisien',      tauxDepuisGNF: 2760 },
  SAR: { code: 'SAR', symbole: 'SR',  nom: 'Riyal saoudien',      tauxDepuisGNF: 2290 },
  AED: { code: 'AED', symbole: 'AED', nom: 'Dirham émirati',      tauxDepuisGNF: 2340 },
  // Afrique Centrale (CFA)
  XAF: { code: 'XAF', symbole: 'CFA', nom: 'Franc CFA Central',   tauxDepuisGNF: 15 },
  // Autres
  CNY: { code: 'CNY', symbole: '¥',   nom: 'Yuan chinois',        tauxDepuisGNF: 1190 },
  TRY: { code: 'TRY', symbole: '₺',   nom: 'Livre turque',        tauxDepuisGNF: 265 },
  ZAR: { code: 'ZAR', symbole: 'R',   nom: 'Rand sud-africain',   tauxDepuisGNF: 470 },
  BRL: { code: 'BRL', symbole: 'R$',  nom: 'Réal brésilien',      tauxDepuisGNF: 1580 },
  RUB: { code: 'RUB', symbole: '₽',   nom: 'Rouble russe',        tauxDepuisGNF: 96 },
  KWD: { code: 'KWD', symbole: 'KD',  nom: 'Dinar koweïtien',     tauxDepuisGNF: 27900 },
  QAR: { code: 'QAR', symbole: 'QR',  nom: 'Riyal qatari',        tauxDepuisGNF: 2360 },
});

/**
 * Retourne la devise correspondant au pays de l'utilisateur
 * Défaut : GNF si pays inconnu
 */
export function getDeviseParPays(pays?: string | null): DeviseInfo {
  if (!pays) return DEVISES.GNF;
  const cle = pays.toLowerCase().trim();
  const code = PAYS_DEVISE[cle] || 'GNF';
  return DEVISES[code] || DEVISES.GNF;
}

/**
 * Convertit un montant GNF vers la devise locale
 * Retourne le montant converti arrondi
 */
export function convertirDepuisGNF(montantGNF: number, devise: DeviseInfo): number {
  if (devise.code === 'GNF') return montantGNF;
  return Math.round((montantGNF / devise.tauxDepuisGNF) * 100) / 100;
}

/**
 * Formate un montant dans la devise donnée
 * Exemple : "1 250 €" ou "8 500 FG"
 */
export function formaterMontant(montantGNF: number, devise: DeviseInfo): string {
  const valeur = convertirDepuisGNF(montantGNF, devise);

  if (devise.code === 'GNF') {
    return `${valeur.toLocaleString('fr-GN')} FG`;
  }

  // Pour les petites valeurs (< 1), afficher avec 2 décimales
  if (valeur < 10) {
    return `${valeur.toFixed(2)} ${devise.symbole}`;
  }

  return `${Math.round(valeur).toLocaleString('fr-FR')} ${devise.symbole}`;
}

/**
 * Retourne la devise de l'utilisateur connecté depuis localStorage
 */
export function getDeviseUtilisateur(): DeviseInfo {
  try {
    const s = localStorage.getItem('session_user');
    if (!s) return DEVISES.GNF;
    const data = JSON.parse(s);
    const user = data.userData || data;
    return getDeviseParPays(user.pays);
  } catch {
    return DEVISES.GNF;
  }
}

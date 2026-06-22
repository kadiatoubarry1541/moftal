// Mapping des codes pays vers leurs drapeaux (emoji)
export const COUNTRY_FLAGS: Record<string, string> = {
  // Afrique
  'P1': '🇬🇳', // Guinée
  'P2': '🇸🇳', // Sénégal
  'P3': '🇲🇱', // Mali
  'P4': '🇨🇮', // Côte d'Ivoire
  'P5': '🇧🇫', // Burkina Faso
  'P6': '🇳🇪', // Niger
  'P7': '🇹🇩', // Tchad
  'P8': '🇨🇲', // Cameroun
  'P9': '🇬🇭', // Ghana
  'P10': '🇳🇬', // Nigeria
  'P11': '🇪🇬', // Égypte
  'P12': '🇿🇦', // Afrique du Sud
  'P13': '🇰🇪', // Kenya
  'P14': '🇪🇹', // Éthiopie
  'P15': '🇹🇿', // Tanzanie
  
  // Asie
  'P16': '🇨🇳', // Chine
  'P17': '🇮🇳', // Inde
  'P18': '🇯🇵', // Japon
  'P19': '🇰🇷', // Corée du Sud
  'P20': '🇸🇦', // Arabie Saoudite
  'P21': '🇦🇪', // Émirats Arabes Unis
  'P22': '🇹🇷', // Turquie
  'P23': '🇮🇷', // Iran
  'P24': '🇵🇰', // Pakistan
  'P25': '🇧🇩', // Bangladesh
  'P26': '🇮🇩', // Indonésie
  'P27': '🇵🇭', // Philippines
  'P28': '🇹🇭', // Thaïlande
  'P29': '🇻🇳', // Vietnam
  'P30': '🇲🇾', // Malaisie
  
  // Europe
  'P31': '🇫🇷', // France
  '🇫🇷': '🇫🇷', // France (par nom aussi)
  'P32': '🇩🇪', // Allemagne
  '🇩🇪': '🇩🇪', // Allemagne
  'P33': '🇬🇧', // Royaume-Uni
  'P34': '🇮🇹', // Italie
  'P35': '🇪🇸', // Espagne
  'P36': '🇵🇹', // Portugal
  'P37': '🇳🇱', // Pays-Bas
  'P38': '🇧🇪', // Belgique
  'P39': '🇨🇭', // Suisse
  'P40': '🇦🇹', // Autriche
  'P41': '🇷🇺', // Russie
  'P42': '🇵🇱', // Pologne
  'P43': '🇬🇷', // Grèce
  'P44': '🇸🇪', // Suède
  'P45': '🇳🇴', // Norvège
  'P46': '🇩🇰', // Danemark
  'P47': '🇫🇮', // Finlande
  
  // Amérique
  'P48': '🇺🇸', // États-Unis
  'P49': '🇨🇦', // Canada
  'P50': '🇲🇽', // Mexique
  'P51': '🇧🇷', // Brésil
  'P52': '🇦🇷', // Argentine
  'P53': '🇨🇱', // Chili
  'P54': '🇨🇴', // Colombie
  'P55': '🇵🇪', // Pérou
  'P56': '🇻🇪', // Venezuela
  
  // Océanie
  'P57': '🇦🇺', // Australie
  'P58': '🇳🇿', // Nouvelle-Zélande
};

// Mapping des noms de pays vers leurs drapeaux
export const COUNTRY_NAME_FLAGS: Record<string, string> = {
  // Afrique
  'Guinée': '🇬🇳',
  'Guinee': '🇬🇳',
  'Sénégal': '🇸🇳',
  'Senegal': '🇸🇳',
  'Mali': '🇲🇱',
  'Côte d\'Ivoire': '🇨🇮',
  'Cote d\'Ivoire': '🇨🇮',
  'Burkina Faso': '🇧🇫',
  'Niger': '🇳🇪',
  'Tchad': '🇹🇩',
  'Cameroun': '🇨🇲',
  'Ghana': '🇬🇭',
  'Nigeria': '🇳🇬',
  'Égypte': '🇪🇬',
  'Egypte': '🇪🇬',
  'Afrique du Sud': '🇿🇦',
  'Kenya': '🇰🇪',
  'Éthiopie': '🇪🇹',
  'Ethiopie': '🇪🇹',
  'Tanzanie': '🇹🇿',
  
  // Asie
  'Chine': '🇨🇳',
  'Inde': '🇮🇳',
  'Japon': '🇯🇵',
  'Corée du Sud': '🇰🇷',
  'Coree du Sud': '🇰🇷',
  'Arabie Saoudite': '🇸🇦',
  'Émirats Arabes Unis': '🇦🇪',
  'Emirats Arabes Unis': '🇦🇪',
  'Turquie': '🇹🇷',
  'Iran': '🇮🇷',
  'Pakistan': '🇵🇰',
  'Bangladesh': '🇧🇩',
  'Indonésie': '🇮🇩',
  'Indonesie': '🇮🇩',
  'Philippines': '🇵🇭',
  'Thaïlande': '🇹🇭',
  'Thailande': '🇹🇭',
  'Vietnam': '🇻🇳',
  'Malaisie': '🇲🇾',
  
  // Europe
  'France': '🇫🇷',
  'Allemagne': '🇩🇪',
  'Royaume-Uni': '🇬🇧',
  'Royaume Uni': '🇬🇧',
  'Italie': '🇮🇹',
  'Espagne': '🇪🇸',
  'Portugal': '🇵🇹',
  'Pays-Bas': '🇳🇱',
  'Pays Bas': '🇳🇱',
  'Belgique': '🇧🇪',
  'Suisse': '🇨🇭',
  'Autriche': '🇦🇹',
  'Russie': '🇷🇺',
  'Pologne': '🇵🇱',
  'Grèce': '🇬🇷',
  'Grece': '🇬🇷',
  'Suède': '🇸🇪',
  'Suede': '🇸🇪',
  'Norvège': '🇳🇴',
  'Norvege': '🇳🇴',
  'Danemark': '🇩🇰',
  'Finlande': '🇫🇮',
  
  // Amérique
  'États-Unis': '🇺🇸',
  'Etats-Unis': '🇺🇸',
  'États Unis': '🇺🇸',
  'Etats Unis': '🇺🇸',
  'Canada': '🇨🇦',
  'Mexique': '🇲🇽',
  'Brésil': '🇧🇷',
  'Bresil': '🇧🇷',
  'Argentine': '🇦🇷',
  'Chili': '🇨🇱',
  'Colombie': '🇨🇴',
  'Pérou': '🇵🇪',
  'Perou': '🇵🇪',
  'Venezuela': '🇻🇪',
  
  // Océanie
  'Australie': '🇦🇺',
  'Nouvelle-Zélande': '🇳🇿',
  'Nouvelle Zelande': '🇳🇿',
};

// Convertit un code ISO 2 lettres en emoji drapeau : "GN" → 🇬🇳, "FR" → 🇫🇷, etc.
function isoToFlagEmoji(code: string): string {
  return code.toUpperCase().split('').map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
}

// Fonction pour obtenir le drapeau d'un pays
export function getCountryFlag(countryCode?: string, countryName?: string): string {
  if (countryCode) {
    // Code interne (P1, P2...)
    if (COUNTRY_FLAGS[countryCode]) {
      return COUNTRY_FLAGS[countryCode];
    }
    // Code ISO 2 lettres (GN, SN, FR, US...) → emoji automatique pour TOUS les pays du monde
    if (/^[A-Za-z]{2}$/.test(countryCode)) {
      return isoToFlagEmoji(countryCode);
    }
  }
  if (countryName) {
    // Essayer avec le nom exact
    if (COUNTRY_NAME_FLAGS[countryName]) {
      return COUNTRY_NAME_FLAGS[countryName];
    }
    // Essayer sans tenir compte de la casse
    const normalizedName = countryName.trim();
    for (const [name, flag] of Object.entries(COUNTRY_NAME_FLAGS)) {
      if (name.toLowerCase() === normalizedName.toLowerCase()) {
        return flag;
      }
    }
  }
  return '🌐'; // Drapeau par défaut
}

// Mapping des continents vers leurs icônes caractéristiques
export const CONTINENT_ICONS: Record<string, string> = {
  'C1': '🐘', // Afrique - Éléphant (animal majestueux et emblématique de l'Afrique, Big Five)
  'C2': '🏯', // Asie - Temple (architecture asiatique emblématique, universellement reconnue et esthétique)
  'C3': '🗼', // Europe - Tour Eiffel (monument emblématique et universellement reconnu de l'Europe)
  'C4': '🗽', // Amérique - Statue de la Liberté (monument emblématique et universellement reconnu de l'Amérique)
  'C5': '🦘', // Océanie - Kangourou (animal emblématique et unique à l'Océanie/Australie)
};

export function getContinentIcon(continentCode?: string, continentName?: string): string {
  if (continentCode && CONTINENT_ICONS[continentCode]) {
    return CONTINENT_ICONS[continentCode];
  }
  if (continentName) {
    const name = continentName.toLowerCase();
    if (name.includes('afrique')) return '🐘'; // Éléphant pour l'Afrique (animal majestueux et emblématique)
    if (name.includes('asie')) return '🏯'; // Temple pour l'Asie (architecture asiatique emblématique et esthétique)
    if (name.includes('europe')) return '🗼'; // Tour Eiffel pour l'Europe (monument emblématique et universellement reconnu)
    if (name.includes('amérique') || name.includes('amerique')) {
      return '🗽'; // Statue de la Liberté pour l'Amérique (monument emblématique et universellement reconnu)
    }
    if (name.includes('océanie') || name.includes('oceanie')) return '🦘'; // Kangourou pour l'Océanie (animal emblématique et unique)
  }
  return '🌐'; // Icône neutre par défaut (globe avec méridiens)
}

// Mapping des régions vers leurs icônes caractéristiques
// Les logos sont choisis selon les caractéristiques géographiques, culturelles ou économiques de chaque région
export const REGION_ICONS: Record<string, string> = {
  // Les 4 régions naturelles de Guinée
  'Basse-Guinée': '🌊', // Région côtière et maritime (Guinée maritime)
  'Fouta-Djallon': '🐄', // Région montagneuse (Moyenne-Guinée) - Élevage de bovins
  'Haute-Guinée': '🥇', // Région des mines d'or (Siguiri) - Or pur
  'Guinée forestière': '🌴', // Région forestière tropicale
  
  // Autres régions (génériques par type)
  // Zones côtières
  'Côte': '🌊',
  'Coast': '🌊',
  'Littoral': '🌊',
  
  // Zones montagneuses
  'Montagne': '⛰️',
  'Mountain': '⛰️',
  'Alpes': '🏔️',
  'Alps': '🏔️',
  
  // Zones forestières
  'Forêt': '🌲',
  'Forest': '🌲',
  'Jungle': '🌴',
  
  // Zones agricoles
  'Plaine': '🌾',
  'Plain': '🌾',
  'Savane': '🌾',
  'Savanna': '🌾',
  
  // Zones désertiques
  'Désert': '🏜️',
  'Desert': '🏜️',
  'Sahara': '🏜️',
  
  // Zones urbaines
  'Ville': '🏙️',
  'City': '🏙️',
  'Métropole': '🏙️',
  'Metropolis': '🏙️',
};

// Fonction pour obtenir l'icône d'une région
export function getRegionIcon(regionCode?: string, regionName?: string): string {
  if (regionName) {
    const name = regionName.trim();
    
    // Chercher une correspondance exacte
    if (REGION_ICONS[name]) {
      return REGION_ICONS[name];
    }
    
    // Chercher une correspondance partielle (insensible à la casse)
    const nameLower = name.toLowerCase();
    for (const [key, icon] of Object.entries(REGION_ICONS)) {
      if (nameLower.includes(key.toLowerCase()) || key.toLowerCase().includes(nameLower)) {
        return icon;
      }
    }
    
    // Détection automatique selon les mots-clés dans le nom (4 RÉGIONS NATURELLES UNIQUEMENT)
    if (nameLower.includes('basse') || nameLower.includes('côte') || nameLower.includes('coast') || nameLower.includes('littoral') || nameLower.includes('maritime')) {
      return '🌊'; // Région côtière (Basse-Guinée / Guinée maritime)
    }
    if (nameLower.includes('fouta') || nameLower.includes('djallon') || nameLower.includes('moyenne')) {
      return '🐄'; // Région montagneuse - Élevage (Fouta-Djallon / Moyenne-Guinée)
    }
    if (nameLower.includes('forestière') || nameLower.includes('forestiere') || nameLower.includes('forêt') || nameLower.includes('forest') || nameLower.includes('jungle')) {
      return '🌴'; // Région forestière (Guinée forestière)
    }
    if (nameLower.includes('haute') || nameLower.includes('plaine') || nameLower.includes('plain') || nameLower.includes('savane') || nameLower.includes('savanna')) {
      return '🌾'; // Région agricole/savane (Haute-Guinée)
    }
  }
  
  // Icône par défaut pour les régions non reconnues
  return '🗺️'; // Carte (neutre pour région)
}


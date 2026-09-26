// Reconnaissance automatique du métier à partir du nom/de la description saisis,
// pour que le générateur de logo choisisse une icône pertinente sans intervention.
// Chaque icône référencée existe dans iconLibrary.ts.
export const LOGO_KEYWORDS: { keywords: string[]; icon: string }[] = [
  { keywords: ["boulanger", "boulangerie", "pain", "patisserie", "pâtisserie"], icon: "bakery_dining" },
  { keywords: ["pharmac"], icon: "local_pharmacy" },
  { keywords: ["garage", "mecanic", "mécanic", "auto ecole", "vidange"], icon: "car_repair" },
  { keywords: ["coiffure", "coiffeur", "coiffeuse", "salon de beaute", "salon de beauté"], icon: "content_cut" },
  { keywords: ["couture", "tailleur", "couturier", "couturiere", "couturière"], icon: "checkroom" },
  { keywords: ["menuisier", "menuiserie", "ebeniste", "ébéniste"], icon: "carpenter" },
  { keywords: ["quincaillerie", "quincailler"], icon: "hardware" },
  { keywords: ["epicerie", "épicerie", "superette", "supérette"], icon: "local_convenience_store" },
  { keywords: ["poisson", "poissonnerie", "peche", "pêche"], icon: "set_meal" },
  { keywords: ["viande", "boucherie", "boucher"], icon: "kebab_dining" },
  { keywords: ["elevage", "élevage", "betail", "bétail", "vache", "ferme"], icon: "agriculture" },
  { keywords: ["moto", "taxi"], icon: "local_taxi" },
  { keywords: ["velo", "vélo"], icon: "pedal_bike" },
  { keywords: ["bus", "car "], icon: "directions_bus" },
  { keywords: ["bateau", "pirogue", "port"], icon: "directions_boat" },
  { keywords: ["telephon", "téléphon", "cyber", "informatique", "ordinateur", "reparation telephone"], icon: "smartphone" },
  { keywords: ["photo", "photographe", "photographie"], icon: "photo_camera" },
  { keywords: ["pressing", "blanchisserie", "lavage", "teinturerie"], icon: "local_laundry_service" },
  { keywords: ["imprimerie", "imprimeur", "imprimerie numerique"], icon: "print" },
  { keywords: ["mosque", "mosquée", "madrasa", "coranique"], icon: "mosque" },
  { keywords: ["eglise", "église", "paroisse"], icon: "church" },
  { keywords: ["hotel", "hôtel", "auberge", "residence"], icon: "hotel" },
  { keywords: ["bijou", "bijouterie", "bijoutier", "orfevre", "orfèvre"], icon: "diamond" },
  { keywords: ["chaussure", "cordonnier", "cordonnerie"], icon: "footprint" },
  { keywords: ["peinture", "peintre", "peinture batiment"], icon: "format_paint" },
  { keywords: ["electricien", "électricien", "electricite", "électricité"], icon: "electrical_services" },
  { keywords: ["plomberie", "plombier"], icon: "plumbing" },
  { keywords: ["fleur", "fleuriste"], icon: "local_florist" },
  { keywords: ["librairie", "papeterie"], icon: "menu_book" },
  { keywords: ["musique", "studio", "orchestre"], icon: "music_note" },
  { keywords: ["sport", "gym", "fitness", "musculation"], icon: "fitness_center" },
  { keywords: ["cafe", "café", "buvette"], icon: "local_cafe" },
  { keywords: ["glace", "glacier"], icon: "icecream" },
  { keywords: ["gateau", "gâteau", "patissier", "pâtissier"], icon: "cake" },
  { keywords: ["oeuf", "œuf", "volaille", "poulet"], icon: "egg" },
  { keywords: ["jardin", "jardinage", "paysagiste"], icon: "grass" },
  { keywords: ["veterinaire", "vétérinaire", "animalerie"], icon: "pets" },
  { keywords: ["bois de chauffe", "foret", "forêt"], icon: "forest" },
  { keywords: ["eau", "forage", "puit"], icon: "water_drop" },
  { keywords: ["solaire", "panneau solaire", "energie", "énergie"], icon: "solar_power" },
  { keywords: ["recyclage", "dechet", "déchet", "ordures"], icon: "recycling" },
  { keywords: ["centre commercial", "mall"], icon: "local_mall" },
  { keywords: ["depot", "dépôt", "grossiste", "entrepot", "entrepôt"], icon: "warehouse" },
  { keywords: ["usine", "fabrique", "manufacture"], icon: "factory" },
  { keywords: ["immeuble", "appartement", "location maison"], icon: "apartment" },
  { keywords: ["reparation", "réparation", "depannage", "dépannage"], icon: "handyman" },
  { keywords: ["nettoyage", "menage", "ménage"], icon: "cleaning_services" },
  { keywords: ["spa", "massage", "bien etre", "bien-être"], icon: "spa" },
  { keywords: ["architecte", "design", "decoration", "décoration"], icon: "design_services" },
  { keywords: ["ingenieur", "ingénieur", "genie civil", "génie civil"], icon: "engineering" },
];

export function guessIconName(text: string): string | null {
  const t = text.toLowerCase();
  for (const entry of LOGO_KEYWORDS) {
    if (entry.keywords.some(k => t.includes(k))) return entry.icon;
  }
  return null;
}

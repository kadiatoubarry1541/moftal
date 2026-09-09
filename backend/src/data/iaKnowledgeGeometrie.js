// Fiches de connaissances Géométrie (collège/lycée) pour le Professeur IA —
// réponses détaillées pour les questions libres, avec schéma à l'appui.
// Les exercices/calculs (Pythagore, trigonométrie) restent gérés par le
// moteur de calcul (exPythagore, tryTrigonometry/formatTrigAnswer) — ces
// fiches répondent aux questions de cours ("explique-moi Pythagore...").
export const GEOMETRIE_KNOWLEDGE = [
  {
    slug: 'geometrie-theoreme-pythagore',
    title: 'Le théorème de Pythagore',
    category: 'geometrie',
    level: 'college',
    triggers: [
      'theoreme de pythagore', 'pythagore', 'c\'est quoi pythagore', 'explique pythagore',
    ],
    answer: [
      'Excellente question ! ✨',
      '',
      '**Le théorème de Pythagore**',
      '',
      '![Triangle rectangle — théorème de Pythagore](/professeur-ia/triangle-pythagore.svg)',
      '',
      'Dans un TRIANGLE RECTANGLE, le carré de la longueur de l\'hypoténuse (le côté opposé à l\'angle droit) est égal à la somme des carrés des longueurs des deux autres côtés :',
      '',
      '**a² + b² = c²**',
      '',
      'où **c** est l\'hypoténuse, et **a**, **b** les deux autres côtés (les "cathètes").',
      '',
      '**Exemple :** un triangle rectangle avec des côtés de 3 cm et 4 cm.',
      '→ c² = 3² + 4² = 9 + 16 = 25 → c = √25 = **5 cm**.',
      '',
      '⚠️ Ce théorème ne s\'applique QUE dans un triangle rectangle, et seulement pour calculer un côté à partir des deux autres.',
      '',
      'Tape **"exercice pythagore"** pour t\'entraîner !',
      '',
      'Continue comme ça ! 💪',
    ].join('\n'),
  },
  {
    slug: 'geometrie-trigonometrie',
    title: 'La trigonométrie (sinus, cosinus, tangente)',
    category: 'geometrie',
    level: 'lycee',
    triggers: [
      'trigonometrie', 'c\'est quoi la trigonometrie', 'sinus cosinus tangente',
      'explique la trigonometrie',
    ],
    answer: [
      'Excellente question ! ✨',
      '',
      '**La trigonométrie dans le triangle rectangle**',
      '',
      '![Triangle rectangle — trigonométrie](/professeur-ia/triangle-trigonometrie.svg)',
      '',
      'Dans un triangle rectangle, pour un angle θ (autre que l\'angle droit), on nomme les côtés par rapport à cet angle : l\'**hypoténuse** (le plus long côté), le côté **opposé** (en face de θ) et le côté **adjacent** (à côté de θ).',
      '',
      '**sin θ = opposé / hypoténuse**',
      '**cos θ = adjacent / hypoténuse**',
      '**tan θ = opposé / adjacent**',
      '',
      '**Exemple :** demande-moi "sin(30°)" ou "cos(60°)" pour voir la valeur calculée directement !',
      '',
      'Continue comme ça ! 💪',
    ].join('\n'),
  },
];

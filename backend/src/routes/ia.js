import express from 'express';
import { Op } from 'sequelize';
import IaKnowledge from '../models/IaKnowledge.js';
import IaConversation from '../models/IaConversation.js';
import Payment from '../models/Payment.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { TERMINALE_KNOWLEDGE } from '../data/iaKnowledgeTerminale.js';
import { BIOLOGIE_KNOWLEDGE } from '../data/iaKnowledgeBiologie.js';
import { FRANCAIS_AVANCE_KNOWLEDGE } from '../data/iaKnowledgeFrancaisAvance.js';

/** Insère (ou met à jour) les fiches Terminale au démarrage — n'écrase jamais une
 *  fiche déjà modifiée manuellement par un admin depuis l'API /knowledge. */
async function seedTerminaleKnowledge() {
  try {
    for (const fiche of TERMINALE_KNOWLEDGE) {
      await IaKnowledge.findOrCreate({ where: { slug: fiche.slug }, defaults: fiche });
    }
    // Correctif ponctuel : mots-clés manquants ajoutés après coup, à synchroniser
    // même si la fiche existait déjà (ne touche que les triggers, jamais la réponse).
    const fonctions = TERMINALE_KNOWLEDGE.find(f => f.slug === 'terminale-fonctions-numeriques');
    if (fonctions) {
      await IaKnowledge.update({ triggers: fonctions.triggers }, { where: { slug: fonctions.slug } });
    }
  } catch (err) {
    console.warn('⚠️ seedTerminaleKnowledge:', err.message);
  }
}
seedTerminaleKnowledge();

/** Insère (ou met à jour) les fiches Biologie au démarrage — mêmes règles
 *  que seedTerminaleKnowledge : n'écrase jamais une fiche déjà modifiée
 *  manuellement par un admin depuis l'API /knowledge. */
async function seedBiologieKnowledge() {
  try {
    for (const fiche of BIOLOGIE_KNOWLEDGE) {
      await IaKnowledge.findOrCreate({ where: { slug: fiche.slug }, defaults: fiche });
    }
  } catch (err) {
    console.warn('⚠️ seedBiologieKnowledge:', err.message);
  }
}
seedBiologieKnowledge();

/** Insère (ou met à jour) les fiches Français avancé au démarrage — mêmes
 *  règles que les autres seeds : n'écrase jamais une fiche déjà modifiée
 *  manuellement par un admin depuis l'API /knowledge. */
async function seedFrancaisAvanceKnowledge() {
  try {
    for (const fiche of FRANCAIS_AVANCE_KNOWLEDGE) {
      await IaKnowledge.findOrCreate({ where: { slug: fiche.slug }, defaults: fiche });
    }
  } catch (err) {
    console.warn('⚠️ seedFrancaisAvanceKnowledge:', err.message);
  }
}
seedFrancaisAvanceKnowledge();

/** Vérifie si l'utilisateur a un abonnement Professeur IA actif */
async function verifierAbonnementIA(numeroH) {
  const maintenant = new Date();
  const unMoisAvant = new Date(maintenant); unMoisAvant.setMonth(unMoisAvant.getMonth() - 1);
  const unAnAvant   = new Date(maintenant); unAnAvant.setFullYear(unAnAvant.getFullYear() - 1);

  const passMois = await Payment.findOne({
    where: { payerNumeroH: numeroH, purpose: 'subscription_ia_mois', status: 'completed', createdAt: { [Op.gte]: unMoisAvant } }
  });
  if (passMois) return true;

  const passAn = await Payment.findOne({
    where: { payerNumeroH: numeroH, purpose: 'subscription_ia_an', status: 'completed', createdAt: { [Op.gte]: unAnAvant } }
  });
  return !!passAn;
}

const router = express.Router();

// =========================================================
// UTILITAIRES
// =========================================================

/** Supprime les accents pour la comparaison (ex: "eleve" -> "eleve") */
function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Normalise une chaine pour la comparaison : minuscules + sans accents + espaces normalises */
function normalize(str) {
  return removeAccents(String(str || '').toLowerCase().trim()).replace(/\s+/g, ' ');
}

/** Detecte si le message est une salutation ou une formule de politesse courte */
function isGreetingOrPoliteness(message) {
  const text = normalize(message);
  if (!text || text.length > 80) return false;
  const greetings = [
    'salut', 'salu', 'bonjour', 'bonsoir', 'hello', 'hi', 'coucou', 'hey',
    'bonne journee', 'bonne soiree', 'bonne nuit', 'ca va', 'comment ca va',
    'comment allez-vous', 'comment vas-tu', 'quoi de neuf', 'yo', 'wesh',
    'salam', 'salam aleykoum', 'aleykoum salam',
  ];
  if (greetings.some(function(g) { return text === g || text.startsWith(g + ' ') || text.endsWith(' ' + g); })) return true;
  if (/^(salut|bonjour|hello|coucou|hey|yo)[\s!.,?]*$/i.test(text)) return true;
  if (/^(ca va|comment (tu vas|allez-vous)|quoi de neuf)[\s!.,?]*$/i.test(removeAccents(text))) return true;
  return false;
}

/** Reponse d'accueil quand l'utilisateur dit bonjour / salut */
const GREETING_RESPONSE = [
  'Bonjour ! Je suis votre **Professeur IA**, spécialisé en **Français**, **Mathématiques** et **Biologie** (du CP à la Terminale). 📚',
  '',
  '━━━━━━━━━━━━━━━━━━━━━━━',
  '📖 **FRANÇAIS**',
  '━━━━━━━━━━━━━━━━━━━━━━━',
  'Grammaire · Conjugaison · Orthographe · Homophones',
  'Vocabulaire (synonymes, antonymes) · Figures de style',
  'Pronoms indéfinis · Pronoms compléments · Auxiliaires',
  'Aspect du verbe · Passé antérieur',
  'Commentaire · Dissertation · Compréhension de texte',
  '',
  '━━━━━━━━━━━━━━━━━━━━━━━',
  '🔢 **MATHÉMATIQUES**',
  '━━━━━━━━━━━━━━━━━━━━━━━',
  'Calculs · Fractions · Décimaux · Équations · PGCD',
  'Puissances · Suites arithmétiques · Probabilités · Moyennes',
  'Géométrie : aires, volumes, Pythagore, Trigonométrie',
  '',
  '**Niveau Terminale :** Nombres complexes · Arithmétique · Fonctions',
  'Logarithme · Exponentielle · Intégration · Suites · Équations différentielles',
  'Probabilité conditionnelle · Applications affines · Similitudes',
  '',
  '━━━━━━━━━━━━━━━━━━━━━━━',
  '🧬 **BIOLOGIE**',
  '━━━━━━━━━━━━━━━━━━━━━━━',
  'La cellule · Digestion · Respiration · Circulation sanguine',
  'Système nerveux · Reproduction · Photosynthèse',
  'Écologie (écosystèmes, chaînes alimentaires) · Génétique · Immunité',
  '',
  '**Exemples de questions à poser :**',
  '— Explique-moi le passé composé',
  '— Résous : 2x² - 5x + 2 = 0',
  '— Aire d\'un cercle de rayon 5 cm',
  '— Valeur de sin(45°)',
  '— Exercice de conjugaison',
  '— Exercice de probabilités',
  '— Explique-moi les nombres complexes',
  '— C\'est quoi une probabilité conditionnelle ?',
  '— Explique-moi la photosynthèse',
  '— Exercice de biologie',
  '',
  'Posez votre question, je suis là ! 💪',
].join('\n');

// =========================================================
// SYSTEME D'EXERCICES INTERACTIFS
// =========================================================

/** PGCD par algorithme d'Euclide */
function pgcd(a, b) {
  var t;
  while (b !== 0) { t = b; b = a % b; a = t; }
  return a;
}

/** Genere un exercice aleatoire selon la categorie demandee */
function generateExercice(type) {
  function exAddition() {
    var a = Math.floor(Math.random() * 900) + 100;
    var b = Math.floor(Math.random() * 900) + 100;
    return { question: 'Calculez : ' + a + ' + ' + b, reponse: a + b, explication: a + ' + ' + b + ' = ' + (a + b) };
  }
  function exSoustraction() {
    var b = Math.floor(Math.random() * 500) + 50;
    var a = b + Math.floor(Math.random() * 500) + 50;
    return { question: 'Calculez : ' + a + ' - ' + b, reponse: a - b, explication: a + ' - ' + b + ' = ' + (a - b) };
  }
  function exMultiplication() {
    var a = Math.floor(Math.random() * 12) + 2;
    var b = Math.floor(Math.random() * 12) + 2;
    return { question: 'Calculez : ' + a + ' x ' + b, reponse: a * b, explication: a + ' x ' + b + ' = ' + (a * b) };
  }
  function exDivision() {
    var b = Math.floor(Math.random() * 9) + 2;
    var q = Math.floor(Math.random() * 12) + 2;
    var a = b * q;
    return { question: 'Calculez : ' + a + ' / ' + b, reponse: q, explication: a + ' / ' + b + ' = ' + q + ' (car ' + b + ' x ' + q + ' = ' + a + ')' };
  }
  function exFraction() {
    var den = [2, 3, 4, 5, 6, 8, 10][Math.floor(Math.random() * 7)];
    var num1 = Math.floor(Math.random() * (den - 1)) + 1;
    var num2 = Math.floor(Math.random() * (den - 1)) + 1;
    var sommeNum = num1 + num2;
    var div = pgcd(sommeNum, den);
    var numSimp = sommeNum / div;
    var denSimp = den / div;
    var repStr = denSimp === 1 ? String(numSimp) : numSimp + '/' + denSimp;
    var explStr = num1 + '/' + den + ' + ' + num2 + '/' + den + ' = ' + sommeNum + '/' + den;
    if (div > 1) { explStr += ' = ' + repStr + ' (simplifie par ' + div + ')'; }
    return { question: 'Calculez : ' + num1 + '/' + den + ' + ' + num2 + '/' + den, reponse: repStr, explication: explStr };
  }
  function exPerimetre() {
    var L = Math.floor(Math.random() * 10) + 3;
    var l = Math.floor(Math.random() * 8) + 2;
    return {
      question: 'Perimetre d\'un rectangle de longueur ' + L + ' cm et largeur ' + l + ' cm ?',
      reponse: 2 * (L + l),
      explication: 'P = 2 x (L + l) = 2 x (' + L + ' + ' + l + ') = 2 x ' + (L + l) + ' = ' + (2 * (L + l)) + ' cm',
    };
  }
  function exPourcentage() {
    var taux = [5, 10, 15, 20, 25, 30, 50][Math.floor(Math.random() * 7)];
    var base = [100, 200, 400, 500, 800, 1000][Math.floor(Math.random() * 6)];
    return {
      question: 'Calculez ' + taux + '% de ' + base,
      reponse: (taux * base) / 100,
      explication: taux + '% de ' + base + ' = (' + taux + ' x ' + base + ') / 100 = ' + ((taux * base) / 100),
    };
  }
  function exPythagore() {
    var triples = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10], [9, 12, 15]];
    var triple = triples[Math.floor(Math.random() * triples.length)];
    var a = triple[0]; var b = triple[1]; var c = triple[2];
    return {
      question: 'Triangle rectangle avec cotes ' + a + ' cm et ' + b + ' cm. Calculez l\'hypotenuse.',
      reponse: c,
      explication: 'c = racine(' + a + '^2 + ' + b + '^2) = racine(' + (a * a) + ' + ' + (b * b) + ') = racine(' + (a * a + b * b) + ') = ' + c + ' cm',
    };
  }

  function exPuissance() {
    var bases = [2, 3, 4, 5, 10];
    var base = bases[Math.floor(Math.random() * bases.length)];
    var exp = Math.floor(Math.random() * 4) + 2;
    var res = Math.pow(base, exp);
    return {
      question: 'Calculez : ' + base + '^' + exp + ' (= ' + base + ' à la puissance ' + exp + ')',
      reponse: res,
      explication: base + '^' + exp + ' = ' + Array(exp).fill(base).join(' × ') + ' = ' + res,
    };
  }
  function exPGCD() {
    var pairs = [[12,8],[15,10],[18,12],[24,16],[30,20],[42,28],[48,36],[60,45]];
    var pair = pairs[Math.floor(Math.random() * pairs.length)];
    var a = pair[0], b = pair[1], g = pgcd(a, b);
    return {
      question: 'Calculez le PGCD de ' + a + ' et ' + b,
      reponse: g,
      explication: 'PGCD(' + a + ', ' + b + ') = ' + g + ' (par l\'algorithme d\'Euclide)',
    };
  }
  function exEquation1() {
    var a = Math.floor(Math.random() * 5) + 2;
    var x = Math.floor(Math.random() * 10) + 1;
    var b = Math.floor(Math.random() * 20) + 1;
    var c = a * x + b;
    return {
      question: 'Résolvez : ' + a + 'x + ' + b + ' = ' + c,
      reponse: x,
      explication: a + 'x = ' + c + ' - ' + b + ' = ' + (c - b) + '  →  x = ' + (c - b) + ' / ' + a + ' = ' + x,
    };
  }
  function exAireTriangle() {
    var base = Math.floor(Math.random() * 10) + 3;
    var hauteur = Math.floor(Math.random() * 8) + 2;
    var aire = (base * hauteur) / 2;
    return {
      question: 'Calculez l\'aire d\'un triangle de base ' + base + ' cm et de hauteur ' + hauteur + ' cm.',
      reponse: aire,
      explication: 'A = (base × hauteur) / 2 = (' + base + ' × ' + hauteur + ') / 2 = ' + aire + ' cm²',
    };
  }
  function exHomophone() {
    var paires = [
      { question: 'Complétez : Le chien ___ sorti. (a / à)', reponse: 'a', explication: '"a" = verbe avoir (il a). "à" = préposition (il va à la mer).' },
      { question: 'Complétez : Il ___ faim. (a / à)', reponse: 'a', explication: '"a" = verbe avoir conjugué. On peut remplacer par "avait" pour vérifier.' },
      { question: 'Complétez : Je vais ___ l\'école. (a / à)', reponse: 'à', explication: '"à" = préposition de lieu. On NE peut PAS remplacer par "avait".' },
      { question: 'Complétez : Ils ___ mangé. (ont / on)', reponse: 'ont', explication: '"ont" = verbe avoir. Vérification : remplacer par "avaient" → ils avaient mangé ✓' },
      { question: 'Complétez : ___ mange une pomme. (on / ont)', reponse: 'on', explication: '"on" = pronom. Vérification : remplacer par "il" → il mange ✓' },
      { question: 'Complétez : C\'est ___ livre. (son / sont)', reponse: 'son', explication: '"son" = déterminant possessif (son livre). "sont" = verbe être (ils sont).' },
      { question: 'Complétez : Ils ___ partis. (son / sont)', reponse: 'sont', explication: '"sont" = verbe être. Vérification : remplacer par "étaient" → ils étaient partis ✓' },
      { question: 'Complétez : Tu veux ___ ce gâteau ? (se / ce)', reponse: 'ce', explication: '"ce" = déterminant démonstratif. "se" = pronom réfléchi (il se lave).' },
    ];
    var p = paires[Math.floor(Math.random() * paires.length)];
    return { question: p.question, reponse: p.reponse, explication: p.explication };
  }
  function exConjugaison() {
    var verbes = [
      { verbe: 'parler', sujet: 'il', temps: 'présent', forme: 'parle', explication: 'Verbe du 1er groupe : je parle, tu parles, il PARLE' },
      { verbe: 'finir', sujet: 'nous', temps: 'présent', forme: 'finissons', explication: 'Verbe du 2ème groupe au présent : nous FINISSONS' },
      { verbe: 'avoir', sujet: 'ils', temps: 'présent', forme: 'ont', explication: 'Verbe irrégulier AVOIR : ils ONT' },
      { verbe: 'être', sujet: 'vous', temps: 'présent', forme: 'êtes', explication: 'Verbe irrégulier ÊTRE : vous ÊTES' },
      { verbe: 'aller', sujet: 'je', temps: 'futur', forme: 'irai', explication: 'ALLER au futur : j\'IRAI (radical irrégulier : ir-)' },
      { verbe: 'manger', sujet: 'nous', temps: 'imparfait', forme: 'mangions', explication: 'MANGER à l\'imparfait : nous MANGIONS (garde le -e- pour la prononciation)' },
      { verbe: 'faire', sujet: 'tu', temps: 'présent', forme: 'fais', explication: 'Verbe irrégulier FAIRE au présent : tu FAIS' },
      { verbe: 'prendre', sujet: 'elle', temps: 'passé composé', forme: 'a pris', explication: 'PRENDRE au passé composé avec AVOIR : elle A PRIS (participe passé : pris)' },
      { verbe: 'venir', sujet: 'il', temps: 'passé composé', forme: 'est venu', explication: 'VENIR se conjugue avec ÊTRE au passé composé : il EST VENU (participe : venu)' },
      { verbe: 'écrire', sujet: 'tu', temps: 'présent', forme: 'écris', explication: 'Verbe ÉCRIRE au présent : j\'écris, tu ÉCRIS, il écrit' },
      { verbe: 'pouvoir', sujet: 'nous', temps: 'présent', forme: 'pouvons', explication: 'Verbe POUVOIR au présent : nous POUVONS' },
      { verbe: 'savoir', sujet: 'je', temps: 'présent', forme: 'sais', explication: 'Verbe SAVOIR au présent : je SAIS, tu sais, il sait' },
      { verbe: 'voir', sujet: 'ils', temps: 'imparfait', forme: 'voyaient', explication: 'VOIR à l\'imparfait : ils VOYAIENT (radical : voy-)' },
      { verbe: 'partir', sujet: 'elle', temps: 'futur', forme: 'partira', explication: 'PARTIR au futur : elle PARTIRA (radical : partir-)' },
    ];
    var v = verbes[Math.floor(Math.random() * verbes.length)];
    return {
      question: 'Conjuguez "' + v.verbe + '" — sujet "' + v.sujet + '" — temps : ' + v.temps + '.',
      reponse: v.forme,
      explication: v.explication,
    };
  }

  // ── Nouveaux exercices ────────────────────────────────────────
  function exVocabulaire() {
    var series = [
      { question: 'Quel est le synonyme de "rapide" ?', reponse: 'vite', explication: 'Synonymes de "rapide" : vite, prompt, agile, alerte, express. Un synonyme = un mot de même sens.' },
      { question: 'Quel est l\'antonyme (contraire) de "grand" ?', reponse: 'petit', explication: '"Grand" et "petit" sont des antonymes (contraires). Autres contraires : minuscule, nain, microscopique.' },
      { question: 'Quel est le synonyme de "beau" ?', reponse: 'joli', explication: 'Synonymes de "beau" : joli, magnifique, splendide, superbe, ravissant.' },
      { question: 'Quel est l\'antonyme de "chaud" ?', reponse: 'froid', explication: '"Chaud" et "froid" sont antonymes. Autres contraires : glacial, frais, frigide.' },
      { question: 'Quel est le synonyme de "triste" ?', reponse: 'malheureux', explication: 'Synonymes de "triste" : malheureux, mélancolique, morose, abattu, affligé.' },
      { question: 'Quel est l\'antonyme de "difficile" ?', reponse: 'facile', explication: '"Difficile" et "facile" sont antonymes. Autres : simple, aisé, accessible.' },
      { question: 'Quel est le synonyme de "commencer" ?', reponse: 'débuter', explication: 'Synonymes de "commencer" : débuter, entamer, initier, démarrer, inaugurer.' },
      { question: 'Quel est l\'antonyme de "silencieux" ?', reponse: 'bruyant', explication: '"Silencieux" et "bruyant" sont antonymes. Autres : tapageur, sonore, tonitruant.' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }

  function exNatureMotsGram() {
    var series = [
      { question: 'Quelle est la nature du mot "courir" dans : "Il aime courir" ?', reponse: 'verbe', explication: '"Courir" est un VERBE à l\'infinitif (groupe 3). Un verbe exprime une action ou un état.' },
      { question: 'Quelle est la nature du mot "beau" dans : "Un beau paysage" ?', reponse: 'adjectif', explication: '"Beau" est un ADJECTIF qualificatif. Il qualifie (décrit) le nom "paysage".' },
      { question: 'Quelle est la nature du mot "rapidement" ?', reponse: 'adverbe', explication: '"Rapidement" est un ADVERBE. Il modifie un verbe, un adjectif ou un autre adverbe. Souvent formé avec le suffixe -ment.' },
      { question: 'Quelle est la nature du mot "maison" dans : "La maison est grande" ?', reponse: 'nom', explication: '"Maison" est un NOM commun. Il désigne une chose. On peut le faire précéder d\'un article (la, une...).' },
      { question: 'Quelle est la nature du mot "il" dans : "Il mange" ?', reponse: 'pronom', explication: '"Il" est un PRONOM personnel sujet (3ème personne du singulier). Il remplace un nom.' },
      { question: 'Quelle est la nature du mot "et" dans : "Pain et beurre" ?', reponse: 'conjonction', explication: '"Et" est une CONJONCTION de coordination. Moyen mnémotechnique : mais, ou, et, donc, or, ni, car.' },
      { question: 'Quelle est la nature du mot "avec" dans : "Il marche avec son ami" ?', reponse: 'préposition', explication: '"Avec" est une PRÉPOSITION. Elle relie des groupes de mots. Autres prépositions : de, à, par, pour, en, dans...' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }

  function exPronomIndefini() {
    var series = [
      { question: 'Dans "Plusieurs élèves sont absents", quelle est la nature du mot souligné "Plusieurs" ?', reponse: 'pronom indefini', explication: '"Plusieurs" est un PRONOM INDÉFINI (toujours au pluriel). Il désigne les êtres et les choses d\'une façon vague, indéfinie.' },
      { question: 'Dans "On joua plusieurs bouteilles", quelle est la nature du mot "On" ?', reponse: 'pronom indefini', explication: '"On" est un PRONOM INDÉFINI, neutre, sujet du verbe "joua". Les pronoms indéfinis neutres (autrui, on, personne, quelque chose, quiconque, rien) ne remplacent pas de nom précis.' },
      { question: 'Parmi ces mots, lequel est un pronom indéfini VARIABLE (s\'accorde en genre/nombre) : "aucun" ou "rien" ?', reponse: 'aucun', explication: '"Aucun" est variable (aucun/aucune). "Rien" est neutre et invariable, comme autrui, on, personne, quelque chose, quiconque.' },
      { question: 'Quel pronom indéfini signifie "chaque personne, une par une" ?', reponse: 'chacun', explication: '"Chacun" (chacune au féminin) est un pronom indéfini variable qui désigne chaque élément d\'un ensemble pris séparément.' },
      { question: 'Complétez avec un pronom indéfini neutre : "___ ne sait ce qui l\'attend." (Personne / Chacun)', reponse: 'personne', explication: '"Personne" est un pronom indéfini NEUTRE (invariable), qui signifie "aucune personne" dans une phrase négative.' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exPronomComplement() {
    var series = [
      { question: 'Dans "Mohamed se blesse", quelle est la fonction du pronom "se" ?', reponse: 'complement d\'objet direct', explication: '"Se" est un pronom personnel réfléchi, mis pour "Mohamed" (3e personne du singulier), COMPLÉMENT D\'OBJET DIRECT du verbe "blesser".' },
      { question: 'Dans "Je te vois", quelle est la nature et la fonction de "te" ?', reponse: 'pronom personnel complement', explication: '"Te" est un PRONOM PERSONNEL, complément d\'objet direct du verbe "voir" (2e personne du singulier).' },
      { question: 'Dans "Il lui parle", quelle est la fonction de "lui" ?', reponse: 'complement d\'objet indirect', explication: '"Lui" est un pronom personnel, COMPLÉMENT D\'OBJET INDIRECT du verbe "parler" (on parle À quelqu\'un).' },
      { question: 'Dans "Nous nous lavons", quelle est la fonction de "nous" (le second) ?', reponse: 'complement d\'objet direct', explication: 'Ce "nous" est un pronom réfléchi, complément d\'objet direct : le sujet fait l\'action sur lui-même (verbe pronominal).' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exAuxiliaire() {
    var series = [
      { question: 'Complétez avec le bon auxiliaire : "Ma tante ___ restée seule." (avait / était)', reponse: 'etait', explication: 'Le verbe "rester" se conjugue avec l\'auxiliaire ÊTRE aux temps composés : "était restée" (plus-que-parfait).' },
      { question: 'Complétez avec le bon auxiliaire : "Il ___ mangé une pomme." (a / est)', reponse: 'a', explication: 'Le verbe "manger" (comme la majorité des verbes) se conjugue avec l\'auxiliaire AVOIR aux temps composés : "a mangé".' },
      { question: 'Quel auxiliaire utilise-t-on pour conjuguer les verbes pronominaux (ex: se laver) aux temps composés ?', reponse: 'etre', explication: 'Les verbes pronominaux se conjuguent toujours avec l\'auxiliaire ÊTRE : "il s\'est lavé".' },
      { question: 'Complétez : "Ils ___ partis tôt ce matin." (ont / sont)', reponse: 'sont', explication: 'Le verbe "partir" fait partie des verbes de déplacement (comme aller, venir, arriver...) qui se conjuguent avec ÊTRE : "sont partis".' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exAspectVerbe() {
    var series = [
      { question: 'Dans "Elle commença à parler", quel est l\'aspect du verbe ?', reponse: 'inchoatif', explication: 'C\'est l\'aspect INCHOATIF : il exprime le DÉBUT de l\'action (souvent avec "commencer à").' },
      { question: 'Dans "Il était en train de parler", quel est l\'aspect du verbe ?', reponse: 'median', explication: 'C\'est l\'aspect MÉDIAN (duratif) : il exprime l\'action saisie en son MILIEU, en train de se dérouler (souvent avec "être en train de").' },
      { question: 'Dans "Il venait d\'arriver", quel est l\'aspect du verbe ?', reponse: 'recent', explication: 'C\'est l\'aspect RÉCENT : il exprime une action qui vient tout juste de se terminer (souvent avec "venir de").' },
      { question: 'Dans "Il finit de parler", quel est l\'aspect du verbe ?', reponse: 'terminatif', explication: 'C\'est l\'aspect TERMINATIF (accompli) : il exprime la FIN de l\'action (souvent avec "finir de").' },
      { question: 'Dans "Le maire s\'apprêtait à parler", quel est l\'aspect du verbe ?', reponse: 'imminent', explication: 'C\'est l\'aspect IMMINENT : il exprime une action sur le point de se produire (souvent avec "être sur le point de", "s\'apprêter à").' },
      { question: 'Quelle est la différence entre le TEMPS et l\'ASPECT d\'un verbe ?', reponse: 'le temps situe l\'action, l\'aspect decrit son deroulement', explication: 'Le TEMPS situe l\'action dans le présent, le passé ou le futur. L\'ASPECT décrit la MANIÈRE dont l\'action se déroule : son début (inchoatif), son milieu (médian), sa fin (terminatif), etc. Les périphrases verbales (commencer à, être en train de, venir de, finir de...) expriment l\'aspect.' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exPasseAnterieur() {
    var series = [
      { question: 'Comment se forme le passé antérieur ?', reponse: 'auxiliaire au passe simple plus participe passe', explication: 'Le passé antérieur se forme avec l\'AUXILIAIRE (avoir/être) au PASSÉ SIMPLE + le PARTICIPE PASSÉ du verbe. Exemple : "il eut mangé", "il fut parti".' },
      { question: 'Dans "Ce soir-là, il mangea tout le plat qu\'il eut préparé", quel temps exprime une action antérieure et achevée par rapport au passé simple ?', reponse: 'passe anterieur', explication: 'Le PASSÉ ANTÉRIEUR ("il eut préparé") indique une action antérieure, achevée, par rapport à une autre action exprimée au passé simple ("il mangea").' },
      { question: 'Conjuguez "arriver" au passé antérieur, 3e personne du singulier.', reponse: 'il fut arrive', explication: '"Arriver" se conjugue avec ÊTRE : passé simple de être (il fut) + participe passé (arrivé) = "il fut arrivé".' },
      { question: 'Conjuguez "finir" au passé antérieur, 3e personne du singulier.', reponse: 'il eut fini', explication: '"Finir" se conjugue avec AVOIR : passé simple de avoir (il eut) + participe passé (fini) = "il eut fini".' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exComprehensionTexte() {
    var series = [
      { question: 'Un texte qui défend une opinion et cherche à convaincre le lecteur est de type... ?', reponse: 'argumentatif', explication: 'Un texte ARGUMENTATIF défend une thèse à l\'aide d\'arguments et d\'exemples, pour convaincre ou persuader le lecteur.' },
      { question: 'Un texte qui raconte une suite d\'événements (une histoire) est de type... ?', reponse: 'narratif', explication: 'Un texte NARRATIF raconte des événements, réels ou imaginaires, généralement organisés dans le temps.' },
      { question: 'Un texte qui décrit un lieu, une personne ou un objet est de type... ?', reponse: 'descriptif', explication: 'Un texte DESCRIPTIF donne à voir : il détaille les caractéristiques d\'un lieu, d\'une personne, d\'un objet...' },
      { question: 'Un texte qui explique un phénomène ou donne des informations objectives est de type... ?', reponse: 'explicatif', explication: 'Un texte EXPLICATIF (ou informatif) présente des faits et des explications de façon claire et objective, sans chercher à convaincre.' },
      { question: 'Dans l\'étude d\'un texte, comment appelle-t-on le message principal que l\'auteur veut transmettre ?', reponse: 'idee generale', explication: 'L\'IDÉE GÉNÉRALE (ou thèse) est le message principal, résumé en une phrase, que l\'auteur cherche à transmettre à travers son texte.' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exVoixPassive() {
    var series = [
      { question: 'Mettez à la voix passive : "Le chat attrape la souris." (présent)', reponse: 'la souris est attrapee par le chat', explication: 'Voix passive : sujet passif + ÊTRE (au même temps que le verbe actif) + participe passé + "par" + agent. "attrape" (présent) → "est attrapée".' },
      { question: 'Quelle est la formation de la voix passive aux temps SIMPLES ?', reponse: 'auxiliaire etre au temps simple plus participe passe', explication: 'Aux temps simples : auxiliaire ÊTRE au même temps simple que le verbe actif + participe passé. Ex : "il attrape" (actif) → "il est attrapé" (passif).' },
      { question: 'Quelle est la formation de la voix passive aux temps COMPOSÉS ?', reponse: 'auxiliaire etre aux temps composes plus participe passe', explication: 'Aux temps composés : l\'auxiliaire ÊTRE se conjugue lui-même aux temps composés (ex : "a été", "avait été") + participe passé du verbe. Ex : "il a attrapé" → "il a été attrapé".' },
      { question: 'Mettez à la voix passive : "Nous écoutons la radio." (présent)', reponse: 'la radio est ecoutee par nous', explication: '"écoutons" (présent, actif) → "est écoutée" (présent passif) : auxiliaire ÊTRE au présent + participe passé "écoutée".' },
      { question: 'Mettez à la voix passive : "Le professeur a corrigé les cahiers." (passé composé)', reponse: 'les cahiers ont ete corriges par le professeur', explication: '"a corrigé" (passé composé actif) → "ont été corrigés" (passé composé passif) : auxiliaire ÊTRE au passé composé ("ont été") + participe passé "corrigés".' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exSubjonctif() {
    var series = [
      { question: 'Complétez au subjonctif : "Il faut que tu ___ ton travail." (fais / fasses)', reponse: 'fasses', explication: 'Après "il faut que", le subjonctif est obligatoire : "que tu fasses" (subjonctif présent de "faire").' },
      { question: 'Complétez au subjonctif : "Je ne pense pas qu\'il ___ triste." (est / soit)', reponse: 'soit', explication: 'Après une opinion négative ("je ne pense pas que"), on emploie le subjonctif : "qu\'il soit" (subjonctif présent d\'"être").' },
      { question: 'Quelle conjonction introduit obligatoirement le subjonctif : "avant que" ou "après que" ?', reponse: 'avant que', explication: '"AVANT QUE" impose le subjonctif (ex : "avant qu\'il fasse nuit"). "Après que" est normalement suivi de l\'indicatif.' },
      { question: 'Complétez : "Elle a peur qu\'il ne ___ à pleuvoir." (se mette / se met)', reponse: 'se mette', explication: 'Après un verbe exprimant un sentiment (avoir peur que), le subjonctif est obligatoire : "qu\'il se mette".' },
      { question: 'Citez 3 conjonctions qui imposent le subjonctif.', reponse: 'pour que afin que avant que bien que pourvu que', explication: 'Le subjonctif est obligatoire après : pour que, afin que, avant que, bien que, pourvu que (entre autres), ainsi qu\'après un verbe de sentiment ou de volonté (souhaiter que, vouloir que, aimer que...).' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exSubordonneeCirconstancielle() {
    var series = [
      { question: 'Dans "Il travaille afin que sa famille vive mieux", quel type de subordonnée introduit "afin que" ?', reponse: 'but', explication: 'La subordonnée de BUT exprime le résultat qu\'on cherche à atteindre. Elle répond à la question "dans quel but ?". Conjonctions : afin que, pour que, de peur que, de crainte que.' },
      { question: 'Dans "Il n\'est pas venu parce qu\'il était malade", quel type de subordonnée introduit "parce que" ?', reponse: 'cause', explication: 'La subordonnée de CAUSE explique la raison d\'un fait. Elle répond à "pourquoi ?". Conjonctions : parce que, puisque, comme, étant donné que, sous prétexte que.' },
      { question: 'Dans "Bien qu\'il soit fatigué, il continue", quel type de subordonnée introduit "bien que" ?', reponse: 'concession', explication: 'La subordonnée de CONCESSION exprime une opposition malgré laquelle l\'action se réalise. Conjonctions : bien que, quoique, malgré que, encore que.' },
      { question: 'Dans "Si tu travailles, tu réussiras", quel type de subordonnée introduit "si" ?', reponse: 'condition', explication: 'La subordonnée de CONDITION pose une condition à la réalisation de l\'action. Conjonctions : si, à condition que, pourvu que, à supposer que, à moins que.' },
      { question: 'Dans "Il agit comme son père agissait", quel type de subordonnée introduit "comme" ?', reponse: 'comparaison', explication: 'La subordonnée de COMPARAISON établit un rapport de comparaison. Conjonctions : comme, ainsi que, de même que, autant que, plus...que.' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exGenreNoms() {
    var series = [
      { question: 'Quel est le féminin de "étudiant" ?', reponse: 'etudiante', explication: 'La plupart des noms forment leur féminin en ajoutant un "e" : étudiant → étudiante.' },
      { question: 'Quel est le féminin de "acteur" ?', reponse: 'actrice', explication: 'Les noms en "-teur" font souvent leur féminin en "-trice" : acteur → actrice.' },
      { question: 'Quel est le féminin de "chanteur" ?', reponse: 'chanteuse', explication: 'Les noms en "-eur" (issus d\'un verbe) font souvent leur féminin en "-euse" : chanteur → chanteuse.' },
      { question: 'Quel est le féminin de "directeur" ?', reponse: 'directrice', explication: 'Les noms en "-teur" font leur féminin en "-trice" : directeur → directrice.' },
      { question: 'Le mot "professeur" a-t-il une forme féminine standard en français ?', reponse: 'professeure', explication: '"Professeur" est traditionnellement épicène (même forme aux 2 genres), mais la forme féminine "professeure" est aujourd\'hui largement admise et utilisée.' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exConjonctionCoordination() {
    var series = [
      { question: 'Citez les 7 conjonctions de coordination (moyen mnémotechnique "Mais où est donc Ornicar ?").', reponse: 'mais ou et donc or ni car', explication: 'Les 7 conjonctions de coordination sont : MAIS, OU, ET, DONC, OR, NI, CAR — retenues par la phrase "Mais où est donc Ornicar ?".' },
      { question: 'Dans "Il pleuvait, mais nous sommes sortis", quelle est la nature de "mais" ?', reponse: 'conjonction de coordination', explication: '"Mais" est une CONJONCTION DE COORDINATION : elle relie deux propositions de même niveau, ici en marquant l\'opposition.' },
      { question: 'Quelle conjonction de coordination exprime la conséquence ?', reponse: 'donc', explication: '"DONC" exprime la conséquence (ex : "il pleut, donc je reste").' },
      { question: 'Quelle conjonction de coordination exprime la cause ?', reponse: 'car', explication: '"CAR" exprime la cause, l\'explication (ex : "il reste, car il pleut").' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exDecimaux() {
    var a = Math.round((Math.floor(Math.random() * 90 + 10) / 10) * 10) / 10;
    var b = Math.round((Math.floor(Math.random() * 50 + 5) / 10) * 10) / 10;
    var types = ['add', 'sub', 'mul'];
    var type = types[Math.floor(Math.random() * types.length)];
    if (type === 'add') {
      var res = Math.round((a + b) * 100) / 100;
      return { question: 'Calculez : ' + a + ' + ' + b, reponse: res, explication: a + ' + ' + b + ' = ' + res + ' (alignez les virgules pour additionner !)' };
    } else if (type === 'sub') {
      var bigger = Math.max(a, b), smaller = Math.min(a, b);
      var res2 = Math.round((bigger - smaller) * 100) / 100;
      return { question: 'Calculez : ' + bigger + ' - ' + smaller, reponse: res2, explication: bigger + ' - ' + smaller + ' = ' + res2 + ' (alignez les virgules pour soustraire !)' };
    } else {
      var n = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
      var res3 = Math.round(a * n * 100) / 100;
      return { question: 'Calculez : ' + a + ' × ' + n, reponse: res3, explication: a + ' × ' + n + ' = ' + res3 + ' (déplacez la virgule selon la puissance de 10)' };
    }
  }

  function exProbabilite() {
    var scenarios = [
      { question: 'On lance un dé à 6 faces. Quelle est la probabilité d\'obtenir un 6 ? (répondre sous forme de fraction)', reponse: '1/6', explication: 'P(6) = 1 issue favorable / 6 issues possibles = 1/6 ≈ 0,167 soit environ 16,7%' },
      { question: 'Un sac contient 3 billes rouges et 7 billes bleues. Probabilité de tirer une bille rouge ?', reponse: '3/10', explication: 'P(rouge) = 3 billes rouges / 10 billes au total = 3/10 = 0,3 soit 30%' },
      { question: 'On lance une pièce de monnaie. Probabilité d\'obtenir pile ?', reponse: '1/2', explication: 'P(pile) = 1 issue favorable / 2 issues possibles = 1/2 = 0,5 soit 50%' },
      { question: 'Dans une urne : 2 rouges, 3 bleues, 5 vertes. Probabilité de tirer une verte ?', reponse: '1/2', explication: 'P(verte) = 5 vertes / 10 boules totales = 5/10 = 1/2 = 0,5 soit 50%' },
      { question: 'On tire une carte au hasard dans un jeu de 52 cartes. Probabilité de tirer un as ?', reponse: '1/13', explication: 'P(as) = 4 as / 52 cartes = 4/52 = 1/13 ≈ 7,7% (4 as dans un jeu : ♠ ♥ ♦ ♣)' },
    ];
    return scenarios[Math.floor(Math.random() * scenarios.length)];
  }

  function exMoyenne() {
    var n = Math.floor(Math.random() * 3) + 3;
    var vals = [];
    for (var ki = 0; ki < n; ki++) vals.push(Math.floor(Math.random() * 14) + 5);
    var sum = vals.reduce(function(a, b) { return a + b; }, 0);
    var moy = Math.round((sum / n) * 100) / 100;
    return {
      question: 'Calculez la moyenne de : ' + vals.join(', ') + ' (notes sur 20)',
      reponse: moy,
      explication: 'Moyenne = (somme des valeurs) / (nombre de valeurs) = (' + vals.join(' + ') + ') / ' + n + ' = ' + sum + ' / ' + n + ' = ' + moy,
    };
  }

  function exSuiteArith() {
    var a0 = Math.floor(Math.random() * 10) + 1;
    var r = Math.floor(Math.random() * 7) + 2;
    var suite = [a0, a0+r, a0+2*r, a0+3*r];
    var next = a0 + 4*r;
    return {
      question: 'Trouvez le terme suivant de la suite : ' + suite.join(', ') + ', ____ ?',
      reponse: next,
      explication: 'C\'est une suite arithmétique de raison r = ' + r + '. Chaque terme = terme précédent + ' + r + '. Donc : ' + suite[suite.length-1] + ' + ' + r + ' = ' + next,
    };
  }

  function exFractionMul() {
    var a1 = Math.floor(Math.random() * 4) + 1;
    var b1 = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
    var a2 = Math.floor(Math.random() * 4) + 1;
    var b2 = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
    var numRes = a1 * a2, denRes = b1 * b2;
    var div = pgcd(numRes, denRes);
    var numSimp = numRes / div, denSimp = denRes / div;
    var repStr = denSimp === 1 ? String(numSimp) : numSimp + '/' + denSimp;
    return {
      question: 'Calculez : (' + a1 + '/' + b1 + ') × (' + a2 + '/' + b2 + ')',
      reponse: repStr,
      explication: 'Multiplier les numérateurs et les dénominateurs : (' + a1 + '×' + a2 + ')/(' + b1 + '×' + b2 + ') = ' + numRes + '/' + denRes + (div > 1 ? ' = ' + repStr + ' (simplifié par ' + div + ')' : ''),
    };
  }

  function exFractionDiv() {
    var a1 = Math.floor(Math.random() * 4) + 1;
    var b1 = [2, 3, 4, 5][Math.floor(Math.random() * 4)];
    var a2 = Math.floor(Math.random() * 3) + 1;
    var b2 = [2, 3, 4][Math.floor(Math.random() * 3)];
    // a1/b1 ÷ a2/b2 = a1*b2 / b1*a2
    var numRes = a1 * b2, denRes = b1 * a2;
    var div = pgcd(numRes, denRes);
    var numSimp = numRes / div, denSimp = denRes / div;
    var repStr = denSimp === 1 ? String(numSimp) : numSimp + '/' + denSimp;
    return {
      question: 'Calculez : (' + a1 + '/' + b1 + ') ÷ (' + a2 + '/' + b2 + ')',
      reponse: repStr,
      explication: 'Diviser = multiplier par l\'inverse : ' + a1 + '/' + b1 + ' × ' + b2 + '/' + a2 + ' = ' + numRes + '/' + denRes + (div > 1 ? ' = ' + repStr : ''),
    };
  }

  // ── Biologie ───────────────────────────────────────────────────
  function exBioCellule() {
    var series = [
      { question: 'Quelle structure entoure et protège la cellule, en contrôlant ce qui entre et sort ?', reponse: 'membrane plasmique', explication: 'La MEMBRANE PLASMIQUE (ou membrane cellulaire) enveloppe la cellule et régule les échanges avec le milieu extérieur.' },
      { question: 'Quel organite est appelé "centrale énergétique" de la cellule ?', reponse: 'mitochondrie', explication: 'La MITOCHONDRIE produit l\'énergie (ATP) de la cellule grâce à la respiration cellulaire.' },
      { question: 'Quel organite contient l\'ADN (matériel génétique) dans une cellule ?', reponse: 'noyau', explication: 'Le NOYAU contient l\'ADN, qui porte l\'information génétique de la cellule.' },
      { question: 'Quel organite, présent chez les végétaux, permet la photosynthèse ?', reponse: 'chloroplaste', explication: 'Le CHLOROPLASTE contient la chlorophylle et capte la lumière pour réaliser la photosynthèse.' },
      { question: 'Quelle est la plus petite unité vivante capable de se reproduire ?', reponse: 'cellule', explication: 'La CELLULE est l\'unité de base du vivant : tout être vivant est constitué d\'une ou plusieurs cellules.' },
      { question: 'Quel gel liquide, à l\'intérieur de la cellule, contient les organites ?', reponse: 'cytoplasme', explication: 'Le CYTOPLASME est le milieu intérieur de la cellule, entre la membrane et le noyau, où baignent les organites.' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exBioDigestion() {
    var series = [
      { question: 'Quel organe produit la salive qui commence la digestion dans la bouche ?', reponse: 'glandes salivaires', explication: 'Les GLANDES SALIVAIRES produisent la salive, qui contient une enzyme (amylase) débutant la digestion des sucres.' },
      { question: 'Quel organe produit le suc gastrique qui digère les aliments dans l\'estomac ?', reponse: 'estomac', explication: 'L\'ESTOMAC sécrète le suc gastrique (acide + enzymes) qui transforme les aliments en bouillie appelée chyme.' },
      { question: 'Dans quel organe se fait l\'absorption des nutriments vers le sang ?', reponse: 'intestin grêle', explication: 'L\'INTESTIN GRÊLE, tapissé de villosités, absorbe les nutriments digérés vers le sang.' },
      { question: 'Quel organe produit la bile qui aide à digérer les graisses ?', reponse: 'foie', explication: 'Le FOIE produit la bile, stockée dans la vésicule biliaire, qui émulsionne les graisses pour faciliter leur digestion.' },
      { question: 'Quel organe absorbe l\'eau et forme les selles en fin de digestion ?', reponse: 'gros intestin', explication: 'Le GROS INTESTIN (côlon) absorbe l\'eau restante et forme les selles avant leur évacuation.' },
      { question: 'Quel organe produit l\'insuline pour réguler le sucre dans le sang ?', reponse: 'pancréas', explication: 'Le PANCRÉAS produit l\'insuline (baisse la glycémie) et le glucagon (l\'augmente), ainsi que des enzymes digestives.' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exBioRespiration() {
    var series = [
      { question: 'Quel gaz respirons-nous et absorbons-nous dans les poumons ?', reponse: 'dioxygene', explication: 'Nous inspirons du DIOXYGÈNE (O2), indispensable à la respiration cellulaire, et rejetons du dioxyde de carbone (CO2).' },
      { question: 'Quel gaz est rejeté lors de l\'expiration ?', reponse: 'dioxyde de carbone', explication: 'Le DIOXYDE DE CARBONE (CO2) est un déchet de la respiration cellulaire, évacué par les poumons lors de l\'expiration.' },
      { question: 'Dans quelles petites structures pulmonaires se font les échanges gazeux ?', reponse: 'alveoles', explication: 'Les ALVÉOLES PULMONAIRES, entourées de capillaires sanguins, sont le lieu des échanges entre l\'air et le sang.' },
      { question: 'Quel muscle, sous les poumons, permet la respiration en se contractant ?', reponse: 'diaphragme', explication: 'Le DIAPHRAGME se contracte et s\'abaisse à l\'inspiration, agrandissant la cage thoracique pour faire entrer l\'air.' },
      { question: 'Quel tuyau relie la gorge aux poumons ?', reponse: 'trachee', explication: 'La TRACHÉE conduit l\'air de la gorge vers les bronches puis les poumons.' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exBioCirculation() {
    var series = [
      { question: 'Quel organe, en se contractant, propulse le sang dans tout le corps ?', reponse: 'coeur', explication: 'Le CŒUR est un muscle qui se contracte pour pomper le sang dans les vaisseaux sanguins.' },
      { question: 'Combien y a-t-il de cavités (chambres) dans le cœur humain ?', reponse: '4', explication: 'Le cœur a 4 CAVITÉS : 2 oreillettes (en haut) et 2 ventricules (en bas).' },
      { question: 'Quels vaisseaux transportent le sang du cœur vers les organes ?', reponse: 'arteres', explication: 'Les ARTÈRES transportent le sang du cœur vers les organes (sauf l\'artère pulmonaire qui va aux poumons).' },
      { question: 'Quels vaisseaux ramènent le sang des organes vers le cœur ?', reponse: 'veines', explication: 'Les VEINES ramènent le sang des organes vers le cœur (sauf la veine pulmonaire qui vient des poumons).' },
      { question: 'Quelles cellules du sang transportent le dioxygène ?', reponse: 'globules rouges', explication: 'Les GLOBULES ROUGES (hématies) contiennent l\'hémoglobine qui fixe et transporte le dioxygène.' },
      { question: 'Quelles cellules du sang défendent l\'organisme contre les microbes ?', reponse: 'globules blancs', explication: 'Les GLOBULES BLANCS (leucocytes) font partie du système immunitaire et combattent les infections.' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exBioNerveux() {
    var series = [
      { question: 'Quel organe commande le système nerveux et est protégé par le crâne ?', reponse: 'cerveau', explication: 'Le CERVEAU est le centre de commande du système nerveux, il analyse les informations et envoie des ordres.' },
      { question: 'Quelle cellule est l\'unité de base du système nerveux, capable de transmettre un message ?', reponse: 'neurone', explication: 'Le NEURONE est une cellule nerveuse qui transmet des messages électriques (influx nerveux).' },
      { question: 'Quel organe des sens permet de voir ?', reponse: 'oeil', explication: 'L\'ŒIL capte la lumière ; la rétine transforme cette information en message nerveux envoyé au cerveau.' },
      { question: 'Quelle structure protège la moelle épinière ?', reponse: 'colonne vertebrale', explication: 'La COLONNE VERTÉBRALE (vertèbres) protège la moelle épinière, qui relie le cerveau au reste du corps.' },
      { question: 'Comment appelle-t-on une réaction rapide et involontaire, comme retirer sa main d\'une plaque chaude ?', reponse: 'reflexe', explication: 'C\'est un RÉFLEXE : une réponse automatique et rapide qui ne passe pas (ou peu) par le cerveau.' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exBioReproduction() {
    var series = [
      { question: 'Comment s\'appelle la cellule reproductrice masculine ?', reponse: 'spermatozoide', explication: 'Le SPERMATOZOÏDE est la cellule reproductrice (gamète) masculine, produite par les testicules.' },
      { question: 'Comment s\'appelle la cellule reproductrice féminine ?', reponse: 'ovule', explication: 'L\'OVULE est la cellule reproductrice (gamète) féminine, produite par les ovaires.' },
      { question: 'Comment s\'appelle la cellule issue de la fusion de l\'ovule et du spermatozoïde ?', reponse: 'cellule oeuf', explication: 'La fécondation forme une CELLULE-ŒUF (zygote), qui se divisera pour donner un embryon.' },
      { question: 'Dans quel organe se développe le fœtus pendant la grossesse ?', reponse: 'uterus', explication: 'L\'UTÉRUS accueille et protège l\'embryon puis le fœtus pendant toute la grossesse.' },
      { question: 'Chez les plantes à fleurs, comment s\'appelle le transport du pollen vers le pistil ?', reponse: 'pollinisation', explication: 'La POLLINISATION est le transport du pollen (souvent par le vent ou les insectes) de l\'étamine vers le pistil, permettant la fécondation.' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exBioPhotosynthese() {
    var series = [
      { question: 'Quel pigment vert des plantes capte la lumière pour la photosynthèse ?', reponse: 'chlorophylle', explication: 'La CHLOROPHYLLE, présente dans les chloroplastes, absorbe la lumière du soleil pour la photosynthèse.' },
      { question: 'Quel gaz les plantes absorbent-elles pour réaliser la photosynthèse ?', reponse: 'dioxyde de carbone', explication: 'Les plantes absorbent le DIOXYDE DE CARBONE (CO2) de l\'air pour fabriquer leur matière organique.' },
      { question: 'Quel gaz les plantes rejettent-elles pendant la photosynthèse ?', reponse: 'dioxygene', explication: 'La photosynthèse produit du DIOXYGÈNE (O2), rejeté dans l\'atmosphère — essentiel à la respiration des êtres vivants.' },
      { question: 'Par quel organe la plante absorbe-t-elle l\'eau et les sels minéraux du sol ?', reponse: 'racines', explication: 'Les RACINES absorbent l\'eau et les sels minéraux du sol, transportés ensuite vers les feuilles.' },
      { question: 'Quel sucre la plante fabrique-t-elle grâce à la photosynthèse ?', reponse: 'glucose', explication: 'La photosynthèse fabrique du GLUCOSE (sucre), la matière organique qui nourrit la plante.' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exBioEcologie() {
    var series = [
      { question: 'Comment appelle-t-on un être vivant qui fabrique sa propre matière organique (ex: une plante) ?', reponse: 'producteur', explication: 'Un PRODUCTEUR (ex: plante verte) fabrique sa matière organique par photosynthèse ; il est à la base des chaînes alimentaires.' },
      { question: 'Comment appelle-t-on un être vivant qui se nourrit d\'autres êtres vivants ?', reponse: 'consommateur', explication: 'Un CONSOMMATEUR se nourrit d\'autres êtres vivants (herbivore = consommateur primaire, carnivore = secondaire...).' },
      { question: 'Comment appelle-t-on les organismes qui décomposent la matière morte (ex: champignons, bactéries) ?', reponse: 'decomposeurs', explication: 'Les DÉCOMPOSEURS transforment la matière organique morte en matière minérale, recyclée dans l\'écosystème.' },
      { question: 'Comment appelle-t-on l\'ensemble formé par un milieu de vie et les êtres vivants qui y vivent ?', reponse: 'ecosysteme', explication: 'Un ÉCOSYSTÈME est l\'ensemble d\'un milieu (biotope) et des êtres vivants (biocénose) qui y interagissent.' },
      { question: 'Comment appelle-t-on la relation où deux espèces vivent ensemble en s\'entraidant mutuellement ?', reponse: 'symbiose', explication: 'La SYMBIOSE est une association durable entre deux espèces différentes, bénéfique pour les deux (ex: abeille et fleur).' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exBioGenetique() {
    var series = [
      { question: 'Quelle molécule, présente dans le noyau, porte l\'information génétique ?', reponse: 'adn', explication: 'L\'ADN (acide désoxyribonucléique) porte l\'information génétique sous forme de gènes, organisés en chromosomes.' },
      { question: 'Comment appelle-t-on un fragment d\'ADN qui code pour un caractère héréditaire ?', reponse: 'gene', explication: 'Un GÈNE est une portion d\'ADN qui contient l\'information pour un caractère (ex: couleur des yeux).' },
      { question: 'Comment appelle-t-on les structures qui portent l\'ADN dans le noyau ?', reponse: 'chromosomes', explication: 'Les CHROMOSOMES sont des structures condensées d\'ADN. L\'être humain en possède 46 (23 paires).' },
      { question: 'Combien de chromosomes possède une cellule humaine normale ?', reponse: '46', explication: 'Une cellule humaine possède 46 chromosomes, soit 23 paires (23 venant du père, 23 de la mère).' },
      { question: 'Comment appelle-t-on la transmission des caractères des parents aux enfants ?', reponse: 'heredite', explication: 'L\'HÉRÉDITÉ est la transmission des caractères génétiques des parents à leur descendance via l\'ADN.' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }
  function exBioImmunite() {
    var series = [
      { question: 'Comment appelle-t-on un micro-organisme capable de provoquer une maladie ?', reponse: 'microbe', explication: 'Un MICROBE (ou agent pathogène : bactérie, virus, champignon...) peut provoquer une infection.' },
      { question: 'Comment appelle-t-on les protéines fabriquées par le corps pour neutraliser un microbe précis ?', reponse: 'anticorps', explication: 'Les ANTICORPS sont des protéines produites par les globules blancs pour reconnaître et neutraliser un microbe spécifique.' },
      { question: 'Comment appelle-t-on l\'injection qui prépare le corps à se défendre contre une maladie sans la provoquer ?', reponse: 'vaccin', explication: 'Un VACCIN entraîne le système immunitaire à reconnaître un microbe, sans provoquer la maladie, pour réagir plus vite en cas d\'infection réelle.' },
      { question: 'Comment appelle-t-on la capacité du corps à se souvenir d\'un microbe déjà rencontré ?', reponse: 'memoire immunitaire', explication: 'La MÉMOIRE IMMUNITAIRE permet une réponse plus rapide et efficace lors d\'un second contact avec le même microbe.' },
    ];
    return series[Math.floor(Math.random() * series.length)];
  }

  var map = {
    addition: exAddition,
    soustraction: exSoustraction,
    multiplication: exMultiplication,
    division: exDivision,
    fraction: exFraction,
    fraction_mul: exFractionMul,
    fraction_div: exFractionDiv,
    perimetre: exPerimetre,
    pourcentage: exPourcentage,
    pythagore: exPythagore,
    puissance: exPuissance,
    pgcd: exPGCD,
    equation: exEquation1,
    aire_triangle: exAireTriangle,
    homophone: exHomophone,
    conjugaison: exConjugaison,
    vocabulaire: exVocabulaire,
    grammaire: exNatureMotsGram,
    decimaux: exDecimaux,
    probabilite: exProbabilite,
    moyenne: exMoyenne,
    suite: exSuiteArith,
    bio_cellule: exBioCellule,
    bio_digestion: exBioDigestion,
    bio_respiration: exBioRespiration,
    bio_circulation: exBioCirculation,
    bio_nerveux: exBioNerveux,
    bio_reproduction: exBioReproduction,
    bio_photosynthese: exBioPhotosynthese,
    bio_ecologie: exBioEcologie,
    bio_genetique: exBioGenetique,
    bio_immunite: exBioImmunite,
    pronom_indefini: exPronomIndefini,
    pronom_complement: exPronomComplement,
    auxiliaire: exAuxiliaire,
    aspect_verbe: exAspectVerbe,
    passe_anterieur: exPasseAnterieur,
    comprehension_texte: exComprehensionTexte,
    voix_passive: exVoixPassive,
    subjonctif: exSubjonctif,
    subordonnee_circonstancielle: exSubordonneeCirconstancielle,
    genre_noms: exGenreNoms,
    conjonction_coordination: exConjonctionCoordination,
  };

  var types = Object.keys(map);
  var choix = (type && map[type]) ? type : types[Math.floor(Math.random() * types.length)];
  var result = map[choix]();
  result.type = choix;
  return result;
}

/** Detecte si l'utilisateur demande un exercice */
function detectExerciceRequest(message) {
  var msgNorm = normalize(message);
  var motsCles = [
    'exercice', 'entraine', 'quiz', 'test', 'devoir',
    'pose moi', 'donne moi', 'fais moi', 'propose', 'pratique',
    'un probleme', 'une question', 'interroge', 'teste moi',
  ];
  if (!motsCles.some(function(m) { return msgNorm.includes(m); })) return null;

  var typeMap = {
    addition:      ['addition', 'additionner', 'ajouter', 'somme'],
    soustraction:  ['soustraction', 'soustraire', 'difference', 'retirer'],
    multiplication:['multiplication', 'multiplier', 'produit', 'fois', 'table de'],
    division:      ['division', 'diviser', 'quotient', 'partager'],
    fraction:      ['fraction', 'numerateur', 'denominateur', 'fractions additions'],
    fraction_mul:  ['fraction multiplier', 'multiplier fractions', 'produit de fractions'],
    fraction_div:  ['fraction diviser', 'diviser fractions', 'division de fractions'],
    perimetre:     ['perimetre', 'contour', 'tour de'],
    pourcentage:   ['pourcentage', 'pourcent', 'taux', 'reduction', 'remise'],
    pythagore:     ['pythagore', 'hypotenuse', 'triangle rectangle cotes'],
    puissance:     ['puissance', 'exposant', 'carre', 'cube', 'puissances'],
    pgcd:          ['pgcd', 'plus grand commun diviseur', 'diviseur commun'],
    equation:      ['equation', 'inconnue', 'resoudre', 'trouver x', 'valeur de x'],
    aire_triangle: ['aire triangle', 'aire du triangle', 'surface triangle'],
    homophone:     ['homophone', 'homophones', 'a ou a', 'on ou ont', 'son ou sont', 'orthographe', 'dictee', 'fautes'],
    pronom_indefini:   ['pronom indefini', 'pronoms indefinis'],
    pronom_complement: ['pronom complement', 'pronom personnel complement', 'complement d\'objet'],
    auxiliaire:        ['auxiliaire', 'auxiliaires', 'avoir ou etre'],
    aspect_verbe:      ['aspect du verbe', 'aspect verbal', 'aspect inchoatif', 'aspect terminatif', 'aspect imminent', 'aspect median', 'periphrase verbale'],
    passe_anterieur:   ['passe anterieur'],
    comprehension_texte: ['comprehension de texte', 'comprehension texte', 'type de texte', 'nature du texte'],
    voix_passive:      ['voix passive', 'voix active', 'forme passive'],
    subjonctif:        ['subjonctif'],
    subordonnee_circonstancielle: ['subordonnee circonstancielle', 'subordonnee de cause', 'subordonnee de but', 'subordonnee de concession', 'subordonnee de condition', 'subordonnee de comparaison', 'proposition subordonnee'],
    genre_noms:        ['genre des noms', 'feminin d\'un nom', 'masculin et feminin'],
    conjonction_coordination: ['conjonction de coordination', 'conjonctions de coordination'],
    conjugaison:   ['conjugaison', 'conjuguer', 'conjugue', 'verbe', 'temps verbal', 'passe compose', 'imparfait', 'futur'],
    vocabulaire:   ['vocabulaire', 'synonyme', 'antonyme', 'contraire', 'sens des mots', 'definition'],
    grammaire:     ['grammaire', 'nature', 'classe grammaticale', 'nom verbe adjectif', 'adverbe', 'pronom', 'analyse grammaticale'],
    decimaux:      ['decimal', 'decimaux', 'virgule', 'nombres decimaux'],
    probabilite:   ['probabilite', 'probabilites', 'chance', 'hasard', 'de a faces', 'tirage'],
    moyenne:       ['moyenne', 'statistiques', 'notes', 'calcul de la moyenne'],
    suite:         ['suite', 'progression', 'suite arithmetique', 'terme suivant', 'prochain terme'],
    bio_cellule:      ['cellule', 'organite', 'membrane plasmique', 'mitochondrie', 'noyau cellulaire', 'cytoplasme'],
    bio_digestion:    ['digestion', 'digestif', 'estomac', 'intestin', 'foie', 'pancreas', 'bile'],
    bio_respiration:  ['respiration', 'respiratoire', 'poumon', 'alveole', 'trachee', 'diaphragme'],
    bio_circulation:  ['circulation', 'circulatoire', 'coeur', 'sang', 'artere', 'veine', 'globule'],
    bio_nerveux:      ['systeme nerveux', 'cerveau', 'neurone', 'reflexe', 'nerf'],
    bio_reproduction: ['reproduction', 'spermatozoide', 'ovule', 'fecondation', 'grossesse', 'pollinisation'],
    bio_photosynthese:['photosynthese', 'chlorophylle', 'chloroplaste'],
    bio_ecologie:     ['ecologie', 'ecosysteme', 'chaine alimentaire', 'producteur consommateur', 'decomposeur', 'symbiose'],
    bio_genetique:    ['genetique', 'adn', 'gene', 'chromosome', 'heredite'],
    bio_immunite:     ['immunite', 'immunitaire', 'microbe', 'anticorps', 'vaccin', 'virus', 'bacterie'],
  };

  var found = null;
  Object.keys(typeMap).forEach(function(t) {
    if (!found && typeMap[t].some(function(m) { return msgNorm.includes(m); })) {
      found = t;
    }
  });
  return found || 'random';
}

/** Labels d'affichage par type d'exercice */
var EXERCICE_LABELS = {
  addition: '➕ Addition', soustraction: '➖ Soustraction',
  multiplication: '✖️ Multiplication', division: '➗ Division',
  fraction: '🔢 Fractions (addition)', fraction_mul: '🔢 Fractions (multiplication)',
  fraction_div: '🔢 Fractions (division)', perimetre: '📐 Périmètre',
  pourcentage: '📊 Pourcentage', pythagore: '📐 Théorème de Pythagore',
  puissance: '🔢 Puissances', pgcd: '🔢 PGCD',
  equation: '📝 Équation du 1er degré', aire_triangle: '📐 Aire (triangle)',
  homophone: '📖 Homophones', conjugaison: '📖 Conjugaison',
  vocabulaire: '📖 Vocabulaire', grammaire: '📖 Grammaire',
  decimaux: '🔢 Nombres décimaux', probabilite: '🎲 Probabilités',
  moyenne: '📊 Statistiques — Moyenne', suite: '🔢 Suites arithmétiques',
  bio_cellule: '🧬 La cellule', bio_digestion: '🧬 La digestion',
  bio_respiration: '🧬 La respiration', bio_circulation: '🧬 La circulation sanguine',
  bio_nerveux: '🧬 Le système nerveux', bio_reproduction: '🧬 La reproduction',
  bio_photosynthese: '🧬 La photosynthèse', bio_ecologie: '🧬 Écologie',
  bio_genetique: '🧬 La génétique', bio_immunite: '🧬 Système immunitaire',
  pronom_indefini: '📖 Pronoms indéfinis', pronom_complement: '📖 Pronoms compléments',
  auxiliaire: '📖 Auxiliaires (avoir/être)', aspect_verbe: '📖 Aspect du verbe',
  passe_anterieur: '📖 Passé antérieur', comprehension_texte: '📖 Compréhension de texte',
  voix_passive: '📖 Voix passive', subjonctif: '📖 Subjonctif',
  subordonnee_circonstancielle: '📖 Subordonnées circonstancielles',
  genre_noms: '📖 Genre des noms', conjonction_coordination: '📖 Conjonctions de coordination',
};

/** Formate un exercice pour l'affichage */
function formatExercice(ex) {
  var label = EXERCICE_LABELS[ex.type] || '📚 Exercice';
  return [
    '━━━━━━━━━━━━━━━━━━━━━━━',
    label,
    '━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    '**' + ex.question + '**',
    '',
    '⏳ Réfléchissez bien et tapez votre réponse.',
    '_Exemples : tapez_ **42** _ou_ **3/4** _ou_ **verbe**',
  ].join('\n');
}

/** Verifie si l'utilisateur tente de repondre a un exercice */
function detectReponseExercice(message) {
  var msg = message.trim();
  var msgN = normalize(msg);

  // Patterns avec préfixe explicite
  var patterns = [
    /^r[eé]ponse\s*[:=]\s*(.+)/i,
    /^ma\s+r[eé]ponse\s*[:=]?\s*(.+)/i,
    /^la\s+r[eé]ponse\s+est\s+(.+)/i,
    /^le\s+r[eé]sultat\s+est\s+(.+)/i,
    /^le\s+r[eé]sultat\s*[:=]\s*(.+)/i,
    /^c['']est\s+(.+)/i,
    /^c est\s+(.+)/i,
    /^je\s+(pense|trouve|crois|dis)\s+(que\s+)?(c['']?est\s+)?(.+)/i,
    /^je\s+r[eé]ponds\s*[:=]?\s*(.+)/i,
    /^=\s*(.+)/i,
    /^mon\s+r[eé]sultat\s*[:=]?\s*(.+)/i,
    /^la\s+solution\s+(est\s+)?(.+)/i,
  ];

  var i, match;
  for (i = 0; i < patterns.length; i++) {
    match = msgN.match(patterns[i]) || msg.match(patterns[i]);
    if (match) {
      // Prendre la dernière capture group non vide
      var captured = match[match.length - 1];
      if (captured) return captured.trim();
    }
  }

  // Nombre pur (entier, décimal, fraction simple)
  if (/^-?\d+([.,]\d+)?\s*(cm²?|m²?|km|kg|g|%|unités²?|°)?\s*$/.test(msg)) return msg.replace(/\s*(cm²?|m²?|km|kg|g|%|unités²?|°)\s*$/, '').trim();
  if (/^-?\d+\/\d+$/.test(msg)) return msg;

  // Mots de réponse courants (verbe/adjectif/nom seul)
  if (/^(verbe|nom|adjectif|adverbe|pronom|conjonction|pr[eé]position|d[eé]terminant)$/i.test(msgN)) return msgN;
  if (/^(vrai|faux|oui|non)$/i.test(msgN)) return msgN;

  return null;
}

// =========================================================
// MOTEUR DE CALCUL MATHEMATIQUE AVANCE
// =========================================================

/**
 * Resout une equation du 1er degre : ax + b = c  =>  x = (c - b) / a
 */
function tryLinearEquation(message) {
  var eq = message.match(/([+-]?\d*\.?\d*)\s*x\s*([+-]\s*\d+\.?\d*)?\s*=\s*([+-]?\d+\.?\d*)/i);
  if (eq) {
    var a = parseFloat(eq[1]) || 1;
    var bStr = eq[2] ? eq[2].replace(/\s/g, '') : '0';
    var b = parseFloat(bStr) || 0;
    var c = parseFloat(eq[3]);
    if (a === 0) return null;
    var x = (c - b) / a;
    if (!Number.isFinite(x)) return null;
    return {
      isSolved: true,
      variable: 'x',
      value: Math.round(x * 10000) / 10000,
      equation: eq[0].trim(),
    };
  }
  return null;
}

/** Calcule sqrt(...) ou racine carree de N */
function trySqrt(message) {
  var sqrtMatch = message.match(/sqrt\s*\(\s*(\d+\.?\d*)\s*\)/i)
    || message.match(/racine\s*(carr[ee]e\s*(de|du)?\s*)(\d+\.?\d*)/i)
    || message.match(/\u221a\s*(\d+\.?\d*)/);

  if (sqrtMatch) {
    var n = parseFloat(sqrtMatch[sqrtMatch.length - 1]);
    if (n < 0) return { isSqrt: true, result: 'pas definie (nombre negatif)', n: n };
    var res = Math.sqrt(n);
    return { isSqrt: true, result: Math.round(res * 10000) / 10000, n: n };
  }
  return null;
}

/** Detecte si le message contient un calcul et retourne le resultat */
function tryMathCalculation(message) {
  if (!message || typeof message !== 'string') return { isCalculation: false };

  var msgLower = message.toLowerCase();

  // Racine carree
  var sqrtRes = trySqrt(message);
  if (sqrtRes) {
    return {
      isCalculation: true,
      result: sqrtRes.result,
      expression: 'racine(' + sqrtRes.n + ')',
      type: 'sqrt',
    };
  }

  // Equation du 2eme degre (priorite sur le 1er degre)
  if (/x\^2|x²/i.test(message) && /=\s*0/.test(message)) {
    var quadRes = tryQuadraticEquation(message);
    if (quadRes) {
      return {
        isCalculation: true,
        quadratic: quadRes,
        type: 'quadratic',
      };
    }
  }

  // Equation du 1er degre avec x
  if (/\bx\b/.test(msgLower) && /=/.test(message)) {
    var eqRes = tryLinearEquation(message);
    if (eqRes) {
      return {
        isCalculation: true,
        result: eqRes.value,
        expression: eqRes.equation,
        variable: eqRes.variable,
        type: 'equation',
      };
    }
  }

  // Calcul numerique
  var cleaned = message
    .replace(/\u00d7/g, '*')
    .replace(/\u00f7/g, '/')
    .replace(/\^/g, '**')
    .replace(/,/g, '.')
    .replace(/(\d)\s*x\s*(\d)/gi, '$1 * $2')
    .replace(/\s+/g, ' ');

  var exprMatch = cleaned.match(/[\d\s+\-*/().**]+/);
  if (!exprMatch) return { isCalculation: false };

  var expr = exprMatch[0].trim();

  if (!/\d/.test(expr)) return { isCalculation: false };
  if (!/[+\-*/]/.test(expr)) return { isCalculation: false };
  if (!/^[\d\s+\-*/.()]+$/.test(expr)) return { isCalculation: false };

  if (/\/\s*0(?!\d)/.test(expr)) {
    return {
      isCalculation: true,
      result: 'impossible (division par zero)',
      expression: expr.trim(),
      type: 'division-zero',
    };
  }

  try {
    // eslint-disable-next-line no-new-func
    var result = Function('"use strict"; return (' + expr + ')')();
    if (typeof result !== 'number' || !Number.isFinite(result)) return { isCalculation: false };
    return {
      isCalculation: true,
      result: Math.round(result * 1000000) / 1000000,
      expression: expr.trim(),
      type: 'arithmetic',
    };
  } catch (e) {
    return { isCalculation: false };
  }
}

/** Formate la reponse d'un calcul mathematique */
function formatMathAnswer(calc) {
  if (calc.type === 'quadratic') {
    return formatQuadraticAnswer(calc.quadratic);
  }

  if (calc.type === 'sqrt') {
    return [
      'Excellente question ! ✨',
      '',
      'Calcul : Racine carree de ' + calc.expression.replace('racine(', '').replace(')', ''),
      '',
      'Resultat : ' + calc.expression + ' = **' + calc.result + '**',
      '',
      'La racine carree d\'un nombre N est le nombre qui, multiplie par lui-meme, donne N.',
      '',
      'Continue comme ca ! 💪',
    ].join('\n');
  }

  if (calc.type === 'equation') {
    return [
      'Excellente question ! ✨',
      '',
      'Equation : ' + calc.expression,
      '',
      'Solution : ' + calc.variable + ' = **' + calc.result + '**',
      '',
      'Pour resoudre une equation du 1er degre, on isole l\'inconnue en faisant passer les termes d\'un cote a l\'autre.',
      '',
      'Continue comme ca ! 💪',
    ].join('\n');
  }

  if (calc.type === 'division-zero') {
    return [
      'Attention ! ⚠️',
      '',
      'Expression : ' + calc.expression,
      '',
      '**La division par zero est impossible** — elle n\'est pas definie en mathematiques.',
      '',
      'On ne peut jamais diviser un nombre par 0. C\'est une regle fondamentale.',
      '',
      'Continue comme ca ! 💪',
    ].join('\n');
  }

  var resultStr = Number.isInteger(calc.result)
    ? String(calc.result)
    : String(calc.result).replace('.', ',');

  return [
    'Excellente question ! ✨',
    '',
    'Calcul : ' + calc.expression,
    '',
    'Resultat : ' + calc.expression + ' = **' + resultStr + '**',
    '',
    'Continue comme ca ! 💪',
  ].join('\n');
}

// =========================================================
// EQUATIONS DU 2EME DEGRE
// =========================================================

/**
 * Tente de résoudre une équation du 2ème degré : ax² + bx + c = 0
 * Détecte les formes : x², x^2, ²
 */
function tryQuadraticEquation(message) {
  var msg = message
    .replace(/²/g, '^2')
    .replace(/\s+/g, ' ')
    .trim();

  if (!/x\^2/i.test(msg) || !/=\s*0/.test(msg)) return null;

  var lhs = msg.replace(/=\s*0\s*$/, '').trim();

  var a = 0, b = 0, c = 0;

  // Coefficient de x^2
  var aMatch = lhs.match(/([+-]?\s*\d*\.?\d*)\s*x\^2/i);
  if (!aMatch) return null;
  var aStr = aMatch[1].replace(/\s/g, '');
  a = (aStr === '' || aStr === '+') ? 1 : aStr === '-' ? -1 : parseFloat(aStr);
  if (!Number.isFinite(a) || a === 0) return null;

  var rest = lhs.replace(aMatch[0], '');

  // Coefficient de x (simple)
  var bMatch = rest.match(/([+-]?\s*\d*\.?\d*)\s*x(?!\^)/i);
  if (bMatch) {
    var bStr = bMatch[1].replace(/\s/g, '');
    b = (bStr === '' || bStr === '+') ? 1 : bStr === '-' ? -1 : parseFloat(bStr);
    if (!Number.isFinite(b)) b = 0;
    rest = rest.replace(bMatch[0], '');
  }

  // Constante
  var cMatch = rest.match(/([+-]?\s*\d+\.?\d*)/);
  if (cMatch) {
    c = parseFloat(cMatch[1].replace(/\s/g, ''));
    if (!Number.isFinite(c)) c = 0;
  }

  return { isQuadratic: true, a: a, b: b, c: c };
}

function formatQuadraticAnswer(q) {
  var a = q.a, b = q.b, c = q.c;
  var D = b * b - 4 * a * c;
  var round = function(n) { return Math.round(n * 10000) / 10000; };
  var eqStr = a + 'x² + ' + b + 'x + ' + c + ' = 0';

  var lines = [
    'Excellente question ! ✨',
    '',
    '**Équation du 2ème degré :** ' + eqStr,
    '',
    '**Étape 1 — Discriminant Δ = b² − 4ac**',
    'Δ = (' + b + ')² − 4 × ' + a + ' × ' + c + ' = ' + (b * b) + ' − ' + (4 * a * c) + ' = **' + D + '**',
    '',
  ];

  if (D > 0) {
    var sq = Math.sqrt(D);
    var x1 = (-b + sq) / (2 * a);
    var x2 = (-b - sq) / (2 * a);
    lines.push('**Δ > 0 → Deux solutions réelles distinctes :**');
    lines.push('x₁ = (−b + √Δ) / 2a = (' + (-b) + ' + √' + D + ') / ' + (2 * a) + ' = **' + round(x1) + '**');
    lines.push('x₂ = (−b − √Δ) / 2a = (' + (-b) + ' − √' + D + ') / ' + (2 * a) + ' = **' + round(x2) + '**');
  } else if (D === 0) {
    var x0 = round(-b / (2 * a));
    lines.push('**Δ = 0 → Une solution double :**');
    lines.push('x = −b / 2a = ' + (-b) + ' / ' + (2 * a) + ' = **' + x0 + '**');
  } else {
    lines.push('**Δ < 0 → Aucune solution réelle.**');
    lines.push('(L\'équation a deux solutions complexes non réelles.)');
  }

  lines.push('', 'Continue comme ça ! 💪');
  return lines.join('\n');
}

// =========================================================
// TRIGONOMETRIE
// =========================================================

var TRIG_EXACT = {
  sin: { 0:'0', 30:'½', 45:'√2/2 ≈ 0,707', 60:'√3/2 ≈ 0,866', 90:'1', 120:'√3/2', 135:'√2/2', 150:'½', 180:'0', 270:'-1', 360:'0' },
  cos: { 0:'1', 30:'√3/2 ≈ 0,866', 45:'√2/2 ≈ 0,707', 60:'½', 90:'0', 120:'-½', 135:'-√2/2', 150:'-√3/2', 180:'-1', 270:'0', 360:'1' },
  tan: { 0:'0', 30:'√3/3 ≈ 0,577', 45:'1', 60:'√3 ≈ 1,732', 90:'indéfinie', 120:'-√3', 135:'-1', 150:'-√3/3', 180:'0', 270:'indéfinie', 360:'0' },
};

function tryTrigonometry(message) {
  var msg = normalize(message);
  var func = null;

  if (/\bsin\b|sinus/.test(msg)) func = 'sin';
  else if (/\bcos\b|cosinus/.test(msg)) func = 'cos';
  else if (/\btan\b|tangente/.test(msg)) func = 'tan';
  if (!func) return null;

  var angleMatch = msg.match(/(\d+)\s*(deg|degr[eé]|°)?/);
  if (!angleMatch) return null;
  var angle = parseInt(angleMatch[1]);
  if (angle < 0 || angle > 720) return null;

  return { isTrig: true, func: func, angle: angle };
}

function formatTrigAnswer(func, angle) {
  var radians = angle * Math.PI / 180;
  var numVal = func === 'sin' ? Math.sin(radians) : func === 'cos' ? Math.cos(radians) : Math.tan(radians);
  var numStr = (!Number.isFinite(numVal) || Math.abs(numVal) > 1e9) ? 'indéfinie' : String(Math.round(numVal * 10000) / 10000);
  var exact = TRIG_EXACT[func] && TRIG_EXACT[func][angle];

  var lines = [
    'Excellente question ! ✨',
    '',
    '**Trigonométrie :** ' + func + '(' + angle + '°)',
    '',
  ];
  if (exact) lines.push('**Valeur exacte :** ' + func + '(' + angle + '°) = **' + exact + '**');
  lines.push('**Valeur décimale :** ' + func + '(' + angle + '°) ≈ **' + numStr + '**');

  if (angle % 90 === 0 || [30, 45, 60, 120, 135, 150].indexOf(angle) !== -1) {
    lines.push('', '**Tableau des valeurs remarquables :**');
    lines.push('| Angle | sin | cos | tan |');
    lines.push('|-------|-----|-----|-----|');
    lines.push('| 0° | 0 | 1 | 0 |');
    lines.push('| 30° | ½ | √3/2 | √3/3 |');
    lines.push('| 45° | √2/2 | √2/2 | 1 |');
    lines.push('| 60° | √3/2 | ½ | √3 |');
    lines.push('| 90° | 1 | 0 | — |');
  }
  lines.push('', 'Continue comme ça ! 💪');
  return lines.join('\n');
}

// =========================================================
// GEOMETRIE CALCULEE
// =========================================================

function tryGeometry(message) {
  var msg = normalize(message);
  var nums = (msg.match(/-?\d+\.?\d*/g) || []).map(parseFloat).filter(function(n) { return Number.isFinite(n) && n > 0; });

  if (msg.includes('aire') || msg.includes('surface')) {
    if ((msg.includes('triangle') || (msg.includes('base') && msg.includes('haut'))) && nums.length >= 2)
      return { isGeo: true, type: 'aire_triangle', v: nums };
    if ((msg.includes('cercle') || msg.includes('disque') || msg.includes('rayon')) && nums.length >= 1)
      return { isGeo: true, type: 'aire_cercle', v: nums };
    if ((msg.includes('rectangle') || msg.includes('longueur') || msg.includes('largeur')) && nums.length >= 2)
      return { isGeo: true, type: 'aire_rectangle', v: nums };
    if ((msg.includes('carre') || msg.includes('côté')) && nums.length >= 1)
      return { isGeo: true, type: 'aire_carre', v: nums };
  }
  if (msg.includes('volume')) {
    if (msg.includes('cylindre') && nums.length >= 2)
      return { isGeo: true, type: 'volume_cylindre', v: nums };
    if ((msg.includes('sphere') || msg.includes('boule')) && nums.length >= 1)
      return { isGeo: true, type: 'volume_sphere', v: nums };
    if ((msg.includes('cube') || msg.includes('arete')) && nums.length >= 1)
      return { isGeo: true, type: 'volume_cube', v: nums };
    if ((msg.includes('cone') || msg.includes('cône')) && nums.length >= 2)
      return { isGeo: true, type: 'volume_cone', v: nums };
  }
  if (msg.includes('circonference') || msg.includes('perimetre.*cercle') || msg.includes('longueur.*cercle')) {
    if (nums.length >= 1) return { isGeo: true, type: 'circonference', v: nums };
  }
  return null;
}

function formatGeoAnswer(geo) {
  var v = geo.v;
  var pi = Math.PI;
  var round = function(n) { return Math.round(n * 100) / 100; };

  var results = {
    aire_triangle:  { titre: 'Aire d\'un triangle', formule: 'A = (base × hauteur) / 2', calc: round((v[0]*v[1])/2), unite: 'unités²', detail: 'A = (' + v[0] + ' × ' + v[1] + ') / 2' },
    aire_cercle:    { titre: 'Aire d\'un cercle', formule: 'A = π × r²', calc: round(pi*v[0]*v[0]), unite: 'unités²', detail: 'A = π × ' + v[0] + '² = π × ' + (v[0]*v[0]) },
    aire_rectangle: { titre: 'Aire d\'un rectangle', formule: 'A = longueur × largeur', calc: round(v[0]*v[1]), unite: 'unités²', detail: 'A = ' + v[0] + ' × ' + v[1] },
    aire_carre:     { titre: 'Aire d\'un carré', formule: 'A = côté²', calc: round(v[0]*v[0]), unite: 'unités²', detail: 'A = ' + v[0] + '² = ' + (v[0]*v[0]) },
    volume_cylindre:{ titre: 'Volume d\'un cylindre', formule: 'V = π × r² × h', calc: round(pi*v[0]*v[0]*v[1]), unite: 'unités³', detail: 'V = π × ' + v[0] + '² × ' + v[1] + ' = π × ' + (v[0]*v[0]) + ' × ' + v[1] },
    volume_sphere:  { titre: 'Volume d\'une sphère', formule: 'V = (4/3) × π × r³', calc: round((4/3)*pi*Math.pow(v[0],3)), unite: 'unités³', detail: 'V = (4/3) × π × ' + v[0] + '³' },
    volume_cube:    { titre: 'Volume d\'un cube', formule: 'V = côté³', calc: round(Math.pow(v[0],3)), unite: 'unités³', detail: 'V = ' + v[0] + '³ = ' + Math.pow(v[0],3) },
    volume_cone:    { titre: 'Volume d\'un cône', formule: 'V = (1/3) × π × r² × h', calc: round((1/3)*pi*v[0]*v[0]*v[1]), unite: 'unités³', detail: 'V = (1/3) × π × ' + v[0] + '² × ' + v[1] },
    circonference:  { titre: 'Circonférence d\'un cercle', formule: 'C = 2 × π × r', calc: round(2*pi*v[0]), unite: 'unités', detail: 'C = 2 × π × ' + v[0] },
  };

  var r = results[geo.type];
  if (!r) return null;

  return [
    'Excellente question ! ✨',
    '',
    '**' + r.titre + '**',
    '',
    '**Formule :** ' + r.formule,
    '',
    r.detail + ' ≈ **' + r.calc + ' ' + r.unite + '**',
    '',
    'Continue comme ça ! 💪',
  ].join('\n');
}

// =========================================================
// ALGORITHME DE RECHERCHE AMELIORE (scoring pondere)
// =========================================================

/**
 * Recherche la meilleure correspondance dans la base de connaissances.
 * Algorithme pondere :
 *  - +3 si le trigger normalise est contenu dans la question normalisee
 *  - +bonus selon la longueur du trigger (triggers longs = plus specifiques)
 *  - +2 si le trigger est un mot entier (word boundary)
 */
var findBestKnowledgeMatch = async function(question) {
  var qNorm = normalize(question);

  var knowledgeItems = await IaKnowledge.findAll({
    where: { isActive: true },
    order: [['created_at', 'ASC']],
  });

  var bestItem = null;
  var bestScore = 0;
  var i, item, triggers, allTriggers, score, j, raw, t, wordBoundary;

  for (i = 0; i < knowledgeItems.length; i++) {
    item = knowledgeItems[i];
    triggers = Array.isArray(item.triggers) ? item.triggers : [];
    allTriggers = triggers.concat([item.slug.replace(/-/g, ' '), item.title || '']);
    score = 0;

    for (j = 0; j < allTriggers.length; j++) {
      raw = allTriggers[j];
      t = normalize(raw);
      if (!t || t.length < 2) continue;

      if (qNorm.includes(t)) {
        score += 3;
        score += Math.min(t.length / 5, 4);
        wordBoundary = new RegExp('(^|\\s)' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\s|$)');
        if (wordBoundary.test(qNorm)) score += 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }

  return bestScore >= 3 ? bestItem : null;
};

// =========================================================
// ROUTES
// =========================================================

// POST /api/ia/search
router.post('/search', async function(req, res) {
  try {
    var question = (req.body || {}).question;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ success: false, message: 'Le champ "question" est obligatoire.' });
    }
    var bestItem = await findBestKnowledgeMatch(question);
    return res.json({
      success: true,
      match: bestItem ? { id: bestItem.id, slug: bestItem.slug, title: bestItem.title, category: bestItem.category, level: bestItem.level } : null,
      answer: bestItem ? bestItem.answer : null,
    });
  } catch (error) {
    console.error('[IA] Erreur /search:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de la recherche.' });
  }
});

// POST /api/ia/chat  — endpoint principal
// GET /api/ia/history — historique des conversations de l'utilisateur connecté
router.get('/history', authenticate, async function(req, res) {
  try {
    const numeroH = req.user.numeroH;

    // Supprimer automatiquement les conversations de plus de 3 mois
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    await IaConversation.destroy({
      where: {
        numeroH,
        created_at: { [Op.lt]: threeMonthsAgo }
      }
    });

    const conversations = await IaConversation.findAll({
      where: { numeroH },
      order: [['created_at', 'DESC']],
      limit: 200
    });
    res.json({ success: true, conversations });
  } catch (error) {
    console.error('[IA] Erreur /history:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

router.post('/chat', authenticate, async function(req, res) {
  try {
    const numeroH = req.user.numeroH;
    const role = (req.user.role || '').toLowerCase();
    const isAdmin = role === 'admin'
      || role === 'super-admin'
      || req.user.isMasterAdmin === true
      || req.user.bypassRestrictions === true;

    if (!isAdmin) {
      let aAbonnement = false;
      try { aAbonnement = await verifierAbonnementIA(numeroH); } catch (_) { aAbonnement = false; }

      if (!aAbonnement) {
        // Quota gratuit : 3 questions/jour, 700 caractères max
        const msg = (req.body || {}).message || '';

        if (msg.length > 700) {
          return res.status(403).json({
            success: false,
            code: 'MESSAGE_TROP_LONG',
            message: 'Sans abonnement, vos questions sont limitées à 700 caractères. Abonnez-vous pour un accès illimité.',
            lienPaiement: '/ia-education'
          });
        }

        const debutJour = new Date();
        debutJour.setHours(0, 0, 0, 0);
        const questionsAujourdhui = await IaConversation.count({
          where: { numeroH, created_at: { [Op.gte]: debutJour } }
        });

        if (questionsAujourdhui >= 3) {
          return res.status(403).json({
            success: false,
            code: 'QUOTA_GRATUIT_ATTEINT',
            message: 'Vous avez utilisé vos 3 questions gratuites aujourd\'hui. Revenez demain ou abonnez-vous pour un accès illimité.',
            lienPaiement: '/ia-education'
          });
        }
      }
    }

    var body = req.body || {};
    var message = body.message;
    var lastExercice = body.lastExercice || null;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'Le champ "message" est obligatoire.' });
    }

    var answer;

    // 1. Verification de reponse a un exercice precedent
    if (lastExercice) {
      // Si un exercice est en cours, TOUTE réponse doit être évaluée.
      // detectReponseExercice peut retourner null pour les réponses texte (conjugaison, etc.)
      // → on utilise le message brut comme fallback.
      var reponseEleve = detectReponseExercice(message);
      if (reponseEleve === null) reponseEleve = message.trim();
      if (reponseEleve !== null && reponseEleve !== '') {
        var rep = String(lastExercice.reponse).replace(',', '.').trim().toLowerCase();
        var eleveNorm = String(reponseEleve).replace(',', '.').trim().toLowerCase();
        // Comparison : exacte ou numerique
        var correct = eleveNorm === rep
          || (parseFloat(eleveNorm) === parseFloat(rep) && !isNaN(parseFloat(rep)))
          || normalize(eleveNorm) === normalize(rep);

        // Messages de félicitations variés
        var felicitations = [
          'BRAVO ! Excellente réponse ! 🎉',
          'PARFAIT ! C\'est exactement ça ! 🌟',
          'TRÈS BIEN ! Tu as trouvé ! 🏆',
          'CORRECT ! Super travail ! 💪',
        ];
        var encouragements = [
          'Pas encore... mais tu vas y arriver !',
          'Presque ! Regardons ensemble.',
          'Ce n\'est pas ça, mais on apprend de ses erreurs !',
          'Encore un effort ! Voici la correction :',
        ];
        var rndIdx = Math.floor(Math.random() * 4);

        if (correct) {
          // Générer un nouvel exercice automatiquement
          var nextEx = generateExercice(lastExercice.type || null);
          var nextLabel = EXERCICE_LABELS[nextEx.type] || '📚 Exercice';
          answer = [
            felicitations[rndIdx],
            '',
            '**Question :** ' + lastExercice.question,
            '**Réponse :** ✅ ' + lastExercice.reponse,
            '',
            '📌 **Explication :** ' + lastExercice.explication,
            '',
            '━━━━━━━━━━━━━━━━━━━━━━━',
            '🔁 Prochain exercice — ' + nextLabel,
            '━━━━━━━━━━━━━━━━━━━━━━━',
            '',
            '**' + nextEx.question + '**',
            '',
            '⏳ Réfléchissez et tapez votre réponse !',
          ].join('\n');
          try {
            await IaConversation.create({ sessionId: null, numeroH, userMessage: message, botResponse: answer, source: 'professeur_ia_correction' });
          } catch (e) { /* silencieux */ }
          return res.json({ success: true, response: answer, exercice: nextEx });
        } else {
          answer = [
            encouragements[rndIdx],
            '',
            '**Question :** ' + lastExercice.question,
            '**Votre réponse :** ❌ ' + reponseEleve,
            '**Bonne réponse :** ✅ **' + lastExercice.reponse + '**',
            '',
            '📌 **Explication détaillée :**',
            lastExercice.explication,
            '',
            'La pratique régulière est la clé du succès ! 💡',
            'Tapez **"exercice"** pour un nouvel entraînement.',
          ].join('\n');
          try {
            await IaConversation.create({ sessionId: null, numeroH, userMessage: message, botResponse: answer, source: 'professeur_ia_correction' });
          } catch (e) { /* silencieux */ }
          return res.json({ success: true, response: answer, lastExercice: null });
        }
      }
    }

    // 2. Demande d'exercice ?
    var typeExercice = detectExerciceRequest(message);
    if (typeExercice) {
      var ex = generateExercice(typeExercice === 'random' ? null : typeExercice);
      answer = formatExercice(ex);
      try {
        await IaConversation.create({ sessionId: null, numeroH, userMessage: message, botResponse: answer, source: 'professeur_ia_exercice' });
      } catch (e) { /* silencieux */ }
      return res.json({ success: true, response: answer, exercice: ex });
    }

    // 3. Trigonometrie ?
    var trigRes = tryTrigonometry(message);
    if (trigRes) {
      answer = formatTrigAnswer(trigRes.func, trigRes.angle);
    }

    // 4. Geometrie (aire/volume) ?
    if (!answer) {
      var geoRes = tryGeometry(message);
      if (geoRes) {
        var geoAnswer = formatGeoAnswer(geoRes);
        if (geoAnswer) answer = geoAnswer;
      }
    }

    // 5. Calcul mathematique (arithmetique, equation 1er/2eme degre) ?
    if (!answer) {
      var calc = tryMathCalculation(message);
      if (calc.isCalculation) {
        answer = formatMathAnswer(calc);
      }
    }

    if (answer) {
      // déjà calculé — on continue vers la sauvegarde
    } else if (isGreetingOrPoliteness(message)) {
      // 6. Salutation
      answer = GREETING_RESPONSE;
    } else {
      // 7. Recherche dans la base de connaissances
      var bestItem = await findBestKnowledgeMatch(message);
      if (bestItem) {
        answer = bestItem.answer;
        var categoriesExercices = ['mathematiques', 'geometrie', 'probabilites', 'statistiques', 'biologie', 'francais'];
        if (categoriesExercices.includes(bestItem.category)) {
          answer += '\n\n---\nEnvie de pratiquer ? Tapez **"exercice"** pour tester vos connaissances sur ce sujet !';
        }
      } else {
        // 6. Message par defaut
        answer = [
          'Je suis votre Professeur IA, specialise en **Francais**, **Mathematiques** et **Biologie** (du CP a la Terminale).',
          '',
          'Je n\'ai pas trouve de reponse precise. Essayez de reformuler avec des mots-cles :',
          '',
          '**Francais :** conjugaison passe compose, figures de style, accord participe passe...',
          '**Maths :** equation second degre, theoreme Pythagore, fractions, probabilites...',
          '**Geometrie :** aire triangle, volume cylindre, theoreme Thales...',
          '**Biologie :** la cellule, digestion, respiration, photosynthese, systeme nerveux...',
          '',
          'Ou tapez **"exercice"** pour vous entrainer sur une question aleatoire !',
        ].join('\n');
      }
    }

    // Sauvegarde de la conversation
    try {
      const userNumeroH = req.user ? req.user.numeroH : null;
      await IaConversation.create({
        sessionId: null,
        userMessage: message,
        botResponse: answer,
        source: 'professeur_ia_backend',
        numeroH: userNumeroH,
      });
      // Auto-nettoyage : garder les 100 derniers messages par utilisateur
      if (userNumeroH) {
        const count = await IaConversation.count({ where: { numeroH: userNumeroH } });
        if (count > 100) {
          const oldest = await IaConversation.findAll({
            where: { numeroH: userNumeroH },
            order: [['created_at', 'ASC']],
            limit: count - 100
          });
          const idsToDelete = oldest.map(r => r.id);
          await IaConversation.destroy({ where: { id: idsToDelete } });
        }
      }
    } catch (e) {
      console.error('[IA] Erreur sauvegarde conversation:', e);
    }

    return res.json({ success: true, response: answer });
  } catch (error) {
    console.error('[IA] Erreur /chat:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors du traitement de la question.' });
  }
});

// POST /api/ia/log
router.post('/log', async function(req, res) {
  try {
    var body = req.body || {};
    var sessionId = body.sessionId;
    var question = body.question;
    var response = body.response;
    var source = body.source;
    if (!question || !response) {
      return res.status(400).json({ success: false, message: 'Les champs "question" et "response" sont obligatoires.' });
    }
    await IaConversation.create({
      sessionId: sessionId || null,
      userMessage: question,
      botResponse: response,
      source: source || 'professeur_ia',
    });
    return res.json({ success: true, message: 'Conversation IA enregistree.' });
  } catch (error) {
    console.error('[IA] Erreur /log:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors de l\'enregistrement.' });
  }
});

// GET /api/ia/knowledge (admin)
router.get('/knowledge', authenticate, requireAdmin, async function(_req, res) {
  try {
    var items = await IaKnowledge.findAll({ order: [['created_at', 'DESC']] });
    res.json({ success: true, items: items });
  } catch (error) {
    console.error('[IA] Erreur /knowledge GET:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST /api/ia/knowledge (admin)
router.post('/knowledge', authenticate, requireAdmin, async function(req, res) {
  try {
    var body = req.body || {};
    var slug = body.slug;
    var title = body.title;
    var category = body.category;
    var level = body.level;
    var triggers = body.triggers;
    var answer = body.answer;
    var isActive = body.isActive;
    if (!slug || !title || !answer) {
      return res.status(400).json({ success: false, message: 'Les champs "slug", "title" et "answer" sont obligatoires.' });
    }
    var normalizedTriggers = Array.isArray(triggers)
      ? triggers.map(function(t) { return String(t || '').trim(); }).filter(Boolean)
      : [];
    var findResult = await IaKnowledge.findOrCreate({
      where: { slug: slug },
      defaults: {
        title: title,
        category: category || null,
        level: level || null,
        triggers: normalizedTriggers,
        answer: answer,
        isActive: typeof isActive === 'boolean' ? isActive : true,
      },
    });
    var item = findResult[0];
    var created = findResult[1];
    if (!created) {
      item.title = title;
      item.category = category || null;
      item.level = level || null;
      item.triggers = normalizedTriggers;
      item.answer = answer;
      if (typeof isActive === 'boolean') item.isActive = isActive;
      await item.save();
    }
    res.json({ success: true, created: created, item: item });
  } catch (error) {
    console.error('[IA] Erreur /knowledge POST:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

export default router;

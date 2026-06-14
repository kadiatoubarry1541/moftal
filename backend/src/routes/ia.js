import express from 'express';
import { Op } from 'sequelize';
import IaKnowledge from '../models/IaKnowledge.js';
import IaConversation from '../models/IaConversation.js';
import Payment from '../models/Payment.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

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
  'Bonjour ! Je suis votre **Professeur IA**, spécialisé en **Français** et en **Mathématiques** (du CP à la Terminale). 📚',
  '',
  '━━━━━━━━━━━━━━━━━━━━━━━',
  '📖 **FRANÇAIS**',
  '━━━━━━━━━━━━━━━━━━━━━━━',
  'Grammaire · Conjugaison · Orthographe · Homophones',
  'Vocabulaire (synonymes, antonymes) · Figures de style',
  'Commentaire · Dissertation · Analyse de texte',
  '',
  '━━━━━━━━━━━━━━━━━━━━━━━',
  '🔢 **MATHÉMATIQUES**',
  '━━━━━━━━━━━━━━━━━━━━━━━',
  'Calculs · Fractions · Décimaux · Équations · PGCD',
  'Puissances · Suites arithmétiques · Probabilités · Moyennes',
  'Géométrie : aires, volumes, Pythagore, Trigonométrie',
  '',
  '**Exemples de questions à poser :**',
  '— Explique-moi le passé composé',
  '— Résous : 2x² - 5x + 2 = 0',
  '— Aire d\'un cercle de rayon 5 cm',
  '— Valeur de sin(45°)',
  '— Exercice de conjugaison',
  '— Exercice de probabilités',
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
    conjugaison:   ['conjugaison', 'conjuguer', 'conjugue', 'verbe', 'temps verbal', 'passe compose', 'imparfait', 'futur'],
    vocabulaire:   ['vocabulaire', 'synonyme', 'antonyme', 'contraire', 'sens des mots', 'definition'],
    grammaire:     ['grammaire', 'nature', 'classe grammaticale', 'nom verbe adjectif', 'adverbe', 'pronom', 'analyse grammaticale'],
    decimaux:      ['decimal', 'decimaux', 'virgule', 'nombres decimaux'],
    probabilite:   ['probabilite', 'probabilites', 'chance', 'hasard', 'de a faces', 'tirage'],
    moyenne:       ['moyenne', 'statistiques', 'notes', 'calcul de la moyenne'],
    suite:         ['suite', 'progression', 'suite arithmetique', 'terme suivant', 'prochain terme'],
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
    // Vérifier l'abonnement Professeur IA avant de répondre
    const aAbonnement = await verifierAbonnementIA(req.user.numeroH);
    if (!aAbonnement) {
      return res.status(403).json({
        success: false,
        code: 'ABONNEMENT_REQUIS',
        message: 'L\'accès au Professeur IA nécessite un abonnement actif.',
        prix: { afrique: { mois: 5000, an: 50000 }, horsAfrique: { mois: 10000, an: 100000 } },
        lienPaiement: '/ia-education'
      });
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
            await IaConversation.create({ sessionId: null, userMessage: message, botResponse: answer, source: 'professeur_ia_correction' });
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
            await IaConversation.create({ sessionId: null, userMessage: message, botResponse: answer, source: 'professeur_ia_correction' });
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
        await IaConversation.create({ sessionId: null, userMessage: message, botResponse: answer, source: 'professeur_ia_exercice' });
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
        var categoriesExercices = ['mathematiques', 'geometrie', 'probabilites', 'statistiques'];
        if (categoriesExercices.includes(bestItem.category)) {
          answer += '\n\n---\nEnvie de pratiquer ? Tapez **"exercice"** pour tester vos connaissances sur ce sujet !';
        }
      } else {
        // 6. Message par defaut
        answer = [
          'Je suis votre Professeur IA, specialise en **Francais** et **Mathematiques** (du CP a la Terminale).',
          '',
          'Je n\'ai pas trouve de reponse precise. Essayez de reformuler avec des mots-cles :',
          '',
          '**Francais :** conjugaison passe compose, figures de style, accord participe passe...',
          '**Maths :** equation second degre, theoreme Pythagore, fractions, probabilites...',
          '**Geometrie :** aire triangle, volume cylindre, theoreme Thales...',
          '',
          'Ou tapez **"exercice"** pour vous entrainer sur un calcul aleatoire !',
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

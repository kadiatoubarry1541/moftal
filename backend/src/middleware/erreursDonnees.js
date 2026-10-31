/**
 * Donnée refusée par la base (champ obligatoire vide, doublon, valeur
 * invalide…) : c'est un refus (400), pas une panne du serveur (500).
 * Les routes renvoient souvent `res.status(500).json({ message: e.message })` ;
 * ce middleware corrige le code pour ces erreurs-là, afin que le téléphone
 * (mode hors ligne) range l'opération parmi les refusées au lieu de la
 * renvoyer sans fin en bloquant les suivantes.
 */
const ERREURS_DE_DONNEES = [
  /violates not-null constraint/i,
  /violates unique constraint/i,
  /violates foreign key constraint/i,
  /violates check constraint/i,
  /invalid input syntax/i,
  /invalid input value for enum/i,
  /value too long for type/i,
  /out of range/i,
  /notNull Violation/i,
  /Validation error/i,
];

const MESSAGES = [
  [/violates not-null constraint/i, 'Un champ obligatoire est vide.'],
  [/violates unique constraint/i, 'Cet élément existe déjà.'],
  [/violates foreign key constraint/i, 'Élément lié introuvable (peut-être supprimé).'],
];

// Message brut d'une panne (base de données, code) : jamais montré à l'utilisateur.
// Les messages écrits en français pour lui (« Solde insuffisant »…) restent tels quels.
const MESSAGE_TECHNIQUE = [
  /relation "|column "|table "|syntax error|does not exist|operator does not|duplicate key/i,
  /\bSequelize|\bSQL\b|ECONN|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|socket hang up/i,
  /Cannot (read|set) propert|is not (a function|defined|iterable)|undefined|\bnull\b|Unexpected token/i,
  /\b(the|is|of|not|cannot|failed|could|must|does|invalid|timeout|error)\b/i,
];
const ACCENTS = /[àâäçéèêëîïôöùûüÿœæ]/i;

export function estMessageTechnique(message) {
  if (typeof message !== 'string' || !message.trim()) return true;
  return MESSAGE_TECHNIQUE.some((r) => r.test(message)) && !ACCENTS.test(message);
}

export function erreursDonnees(req, res, next) {
  const json = res.json.bind(res);
  res.json = (corps) => {
    if (res.statusCode === 500 && corps && typeof corps.message === 'string'
        && ERREURS_DE_DONNEES.some((r) => r.test(corps.message))) {
      res.status(400);
      const clair = MESSAGES.find(([r]) => r.test(corps.message));
      if (clair) corps = { ...corps, message: clair[1], detail: corps.message };
    }
    // Panne du serveur : le détail va dans le journal, l'utilisateur lit « Erreur serveur »
    if (res.statusCode >= 500 && corps && typeof corps === 'object' && 'message' in corps
        && estMessageTechnique(corps.message)) {
      console.error(`❌ ${req.method} ${req.originalUrl} → ${res.statusCode} :`, corps.message);
      const { error: _e, details: _d, ...reste } = corps;
      corps = { ...reste, message: 'Erreur serveur' };
    }
    return json(corps);
  };
  next();
}

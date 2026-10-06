/** Normalise un NuméroH saisi à la main : espaces, et lettre O confondue avec
 *  le chiffre 0 (erreur de frappe fréquente). Utilisé partout où un NuméroH
 *  entré par un utilisateur (le sien, ou celui d'un parent) doit être comparé
 *  de façon fiable à ce qui est stocké en base. */
export function normalizeNumeroH(numeroH) {
  if (!numeroH || typeof numeroH !== 'string') return '';
  return numeroH
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/O/g, '0')
    .replace(/o/g, '0');
}

/** Un NuméroH = préfixe (génération + continent + pays + région + ethnie + famille),
 *  un espace, puis le numéro d'ordre. Les renseignements peuvent se ressembler :
 *  seul le numéro d'ordre rend le NuméroH unique. */
export function prefixeNumeroH(numeroH) {
  const s = String(numeroH || '').trim().replace(/\s+/g, ' ');
  const i = s.lastIndexOf(' ');
  return i > 0 && /^\d+$/.test(s.slice(i + 1)) ? s.slice(0, i) : s;
}

/** Prochain NuméroH libre pour ce préfixe : le plus grand numéro d'ordre déjà
 *  attribué + 1 (les défunts ont leur propre numérotation DM…). Calculé par le serveur, jamais par le téléphone. */
export async function prochainNumeroH(sequelize, prefixe, transaction) {
  const like = `${prefixe.replace(/[\\%_]/g, '\\$&')} %`;
  const [row] = await sequelize.query(
    `SELECT COALESCE(MAX(CAST(substring(numero_h from ' ([0-9]+)$') AS NUMERIC)), 0) AS dernier
     FROM users WHERE numero_h LIKE :like AND numero_h ~ ' [0-9]+$'`,
    { replacements: { like }, type: 'SELECT', transaction }
  );
  return `${prefixe} ${(BigInt(String(row?.dernier ?? 0).split('.')[0]) + 1n).toString()}`;
}

export function estConflitNumeroH(error) {
  if (!(error?.name === 'SequelizeUniqueConstraintError' || error?.parent?.code === '23505')) return false;
  const champs = (error.errors || []).map((e) => e.path).join(' ') + ' ' + (error.parent?.constraint || '') + ' ' + (error.parent?.detail || '');
  return /numero_?h(?!_?d)|numeroH(?!D)|users_pkey/i.test(champs);
}

/** Crée le compte avec le prochain NuméroH libre ; si quelqu'un a pris ce numéro
 *  au même instant, on recommence avec le suivant (jamais « NuméroH existe déjà »). */
export async function avecNumeroHLibre(sequelize, prefixe, creer) {
  for (let essai = 1; ; essai++) {
    const numeroH = await prochainNumeroH(sequelize, prefixe);
    try {
      return await creer(numeroH);
    } catch (error) {
      if (!estConflitNumeroH(error) || essai >= 25) throw error;
    }
  }
}

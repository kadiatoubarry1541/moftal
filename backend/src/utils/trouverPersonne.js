import { sequelize } from '../config/database.js';

/**
 * Retrouve un compte Moftal à partir de son NuméroH OU de son numéro de
 * téléphone (formats tolérés : +224 6.., 00224.., 6.., espaces, tirets).
 * Renvoie { personne } ou { erreur, statut }.
 */
export async function trouverPersonne(identifiant) {
  const brut = String(identifiant || '').trim();
  if (!brut) return { erreur: 'NuméroH ou numéro de téléphone requis.', statut: 400 };

  const chiffres = brut.replace(/[^0-9]/g, '');
  const estTelephone = !/[a-z]/i.test(brut) && chiffres.length >= 8;

  if (!estTelephone) {
    const [p] = await sequelize.query(
      `SELECT numero_h, prenom, nom_famille AS nom, tel1 FROM users
       WHERE LOWER(TRIM(numero_h)) = LOWER(:nh) LIMIT 1`,
      { replacements: { nh: brut }, type: sequelize.QueryTypes.SELECT }
    );
    return p ? { personne: p } : { erreur: `Aucun compte avec le NuméroH : ${brut}`, statut: 404 };
  }

  // Comparaison sur les 9 derniers chiffres (numéro guinéen sans l'indicatif)
  const fin = chiffres.slice(-9);
  const comptes = await sequelize.query(
    `SELECT numero_h, prenom, nom_famille AS nom, tel1 FROM users
     WHERE tel1 IS NOT NULL AND RIGHT(REGEXP_REPLACE(tel1, '[^0-9]', '', 'g'), 9) = :fin
     ORDER BY numero_h LIMIT 2`,
    { replacements: { fin }, type: sequelize.QueryTypes.SELECT }
  );
  if (!comptes.length) return { erreur: `Aucun compte avec le numéro de téléphone : ${brut}`, statut: 404 };
  if (comptes.length > 1) return { erreur: 'Plusieurs comptes ont ce numéro de téléphone : utilisez le NuméroH.', statut: 409 };
  return { personne: comptes[0] };
}

/** Même comparaison, pour savoir si un numéro de téléphone correspond à tel compte. */
export function memeTelephone(a, b) {
  const x = String(a || '').replace(/[^0-9]/g, '').slice(-9);
  const y = String(b || '').replace(/[^0-9]/g, '').slice(-9);
  return x.length >= 8 && x === y;
}

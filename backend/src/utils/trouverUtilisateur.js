import { sequelize } from '../config/database.js';

// Retrouve une personne inscrite par son TÉLÉPHONE ou son NuméroH : les deux sont
// de bons identifiants, et on ne connaît pas toujours le NuméroH des parents.
// Le téléphone est comparé sur ses 9 derniers chiffres (indicatif et espaces tolérés).
// Renvoie { numeroH, prenom, nom } ou null.
export async function trouverUtilisateur(identifiant) {
  const brut = String(identifiant || '').trim();
  if (!brut) return null;
  const chiffres = brut.replace(/\D/g, '');
  const rows = await sequelize.query(
    `SELECT numero_h AS "numeroH", prenom, nom_famille AS nom FROM users
     WHERE LOWER(numero_h) = LOWER(:brut)
        OR (LENGTH(:chiffres) >= 8 AND tel1 IS NOT NULL
            AND RIGHT(REGEXP_REPLACE(tel1, '[^0-9]', '', 'g'), 9) = RIGHT(:chiffres, 9))
     ORDER BY (LOWER(numero_h) = LOWER(:brut)) DESC
     LIMIT 1`,
    { replacements: { brut, chiffres }, type: sequelize.QueryTypes.SELECT }
  );
  return rows[0] || null;
}

export const MESSAGE_INTROUVABLE = (id) =>
  `Aucune personne inscrite sur Moftal avec « ${id} ». Vérifiez le téléphone ou le NuméroH.`;

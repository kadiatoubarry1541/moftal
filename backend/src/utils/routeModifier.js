// Ajoute la route « Modifier » (PUT /:tenantCode/<ressource>/:id) aux gestions
// internes qui ne permettaient que d'ajouter ou de supprimer. Seules les
// colonnes listées peuvent être modifiées, et uniquement pour l'établissement
// (tenant_code) de l'utilisateur. Un champ laissé vide devient NULL (évite les
// erreurs sur les dates et les nombres).
import { sequelize } from '../config/database.js';

export function ajouterRoutesModifier(router, middlewares, ressources) {
  for (const [chemin, { table, colonnes }] of Object.entries(ressources)) {
    router.put(`/:tenantCode/${chemin}/:id`, ...middlewares, async (req, res) => {
      try {
        const body = req.body || {};
        const cols = colonnes.filter(c => Object.prototype.hasOwnProperty.call(body, c));
        if (!cols.length) return res.status(400).json({ success: false, message: 'Aucune modification envoyée.' });
        const replacements = { id: req.params.id, code: req.params.tenantCode };
        for (const c of cols) replacements[c] = body[c] === '' || body[c] === undefined ? null : body[c];
        const set = cols.map(c => `"${c}"=:${c}`).join(', ');
        const [rows] = await sequelize.query(
          `UPDATE "${table}" SET ${set} WHERE id=:id AND tenant_code=:code RETURNING *`,
          { replacements }
        );
        if (!rows.length) return res.status(404).json({ success: false, message: 'Élément introuvable.' });
        res.json({ success: true, item: rows[0] });
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    });
  }
}

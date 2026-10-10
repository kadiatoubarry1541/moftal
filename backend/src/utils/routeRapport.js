// Rapport du mois des gestions internes : GET /:tenantCode/rapport?mois=AAAA-MM
// Additionne, pour le mois choisi et le mois précédent, les recettes et les
// dépenses de l'établissement, source par source (ventes, loyers, frais…).
import { sequelize } from '../config/database.js';

function bornes(mois) {
  const m = /^(\d{4})-(\d{2})$/.exec(mois || '');
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, 1)) : new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1));
  const fin = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  const prec = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  return { debut: d, fin, prec, mois: d.toISOString().slice(0, 7) };
}

async function somme(src, code, debut, fin) {
  const [r] = await sequelize.query(
    `SELECT COALESCE(SUM(${src.montant}),0)::float AS total, COUNT(*)::int AS n
       FROM ${src.table}
      WHERE ${src.alias ? `${src.alias}.` : ''}tenant_code=:code
        AND ${src.date} >= :debut AND ${src.date} < :fin
        ${src.where ? `AND (${src.where})` : ''}`,
    { replacements: { code, debut, fin }, type: sequelize.QueryTypes.SELECT }
  ).catch(e => {
    // Table pas encore créée (module jamais ouvert) : rien n'a été enregistré
    if ((e?.original?.code || e?.parent?.code) === '42P01') return [{ total: 0, n: 0 }];
    // Jamais de total 0 inventé : l'erreur remonte (500) pour être vue.
    console.error('rapport:', src.table, e.message);
    throw new Error(`Impossible de calculer « ${src.label} » pour le rapport : ${e.message}`);
  });
  return { label: src.label, total: Math.round(r?.total || 0), n: r?.n || 0 };
}

export function ajouterRouteRapport(router, middlewares, { recettes = [], depenses = [] }) {
  router.get('/:tenantCode/rapport', ...middlewares, async (req, res) => {
    try {
      const code = req.params.tenantCode;
      const { debut, fin, prec, mois } = bornes(String(req.query.mois || ''));
      const calc = async (a, b) => {
        const rec = await Promise.all(recettes.map(s => somme(s, code, a, b)));
        const dep = await Promise.all(depenses.map(s => somme(s, code, a, b)));
        const totalRecettes = rec.reduce((t, x) => t + x.total, 0);
        const totalDepenses = dep.reduce((t, x) => t + x.total, 0);
        return { recettes: rec, depenses: dep, totalRecettes, totalDepenses, benefice: totalRecettes - totalDepenses };
      };
      const actuel = await calc(debut, fin);
      const precedent = await calc(prec, debut);
      res.json({ success: true, mois, ...actuel, precedent: { mois: prec.toISOString().slice(0, 7), totalRecettes: precedent.totalRecettes, totalDepenses: precedent.totalDepenses, benefice: precedent.benefice } });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message || 'Impossible de calculer le rapport du mois.' });
    }
  });
}

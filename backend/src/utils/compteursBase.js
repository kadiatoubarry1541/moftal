// Compteurs d'essais gardés dans la base (et plus seulement en mémoire) :
// un redémarrage ou une mise en veille de l'hébergeur (Render gratuit dort après
// 15 minutes) ne remet plus les compteurs à zéro, et plusieurs serveurs
// partagent les mêmes compteurs.
// Sert aux limites de connexion, aux codes « mot de passe oublié » et aux codes
// de première connexion. En cas de panne de la base, on retombe sur la mémoire.
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

let tablePrete = null;
function preparer() {
  if (!tablePrete) {
    tablePrete = sequelize.query(`
      CREATE TABLE IF NOT EXISTS compteurs_limites (
        cle VARCHAR(300) PRIMARY KEY,
        compte INTEGER NOT NULL DEFAULT 0,
        fin TIMESTAMPTZ NOT NULL
      )`).catch((e) => { tablePrete = null; throw e; });
  }
  return tablePrete;
}

// Secours en mémoire si la base ne répond pas
const memoire = new Map(); // cle → { compte, fin (ms) }
function memoireAjouter(cle, fenetreMs, pas) {
  const maintenant = Date.now();
  let e = memoire.get(cle);
  if (!e || e.fin <= maintenant) e = { compte: 0, fin: maintenant + fenetreMs };
  e.compte = Math.max(0, e.compte + pas);
  memoire.set(cle, e);
  return { compte: e.compte, fin: new Date(e.fin) };
}

/**
 * Ajoute `pas` (1 par défaut) au compteur `cle`. Une fenêtre commence au premier
 * essai et dure `fenetreMs` ; à la fin, le compteur repart de zéro.
 * @returns {{ compte: number, fin: Date }}
 */
export async function ajouter(cle, fenetreMs, pas = 1) {
  try {
    await preparer();
    const [ligne] = await sequelize.query(`
      INSERT INTO compteurs_limites (cle, compte, fin)
      VALUES (:cle, GREATEST(:pas, 0), NOW() + make_interval(secs => :secs))
      ON CONFLICT (cle) DO UPDATE SET
        compte = CASE WHEN compteurs_limites.fin <= NOW() THEN GREATEST(:pas, 0)
                      ELSE GREATEST(compteurs_limites.compte + :pas, 0) END,
        fin = CASE WHEN compteurs_limites.fin <= NOW() THEN EXCLUDED.fin ELSE compteurs_limites.fin END
      RETURNING compte, fin`,
    { replacements: { cle: String(cle).slice(0, 300), pas, secs: fenetreMs / 1000 }, type: QueryTypes.SELECT });
    return { compte: Number(ligne.compte), fin: new Date(ligne.fin) };
  } catch (e) {
    console.error('Compteurs (base indisponible, mémoire utilisée) :', e.message);
    return memoireAjouter(cle, fenetreMs, pas);
  }
}

/** Valeur actuelle (0 si la fenêtre est finie ou si le compteur n'existe pas). */
export async function lire(cle) {
  try {
    await preparer();
    const [ligne] = await sequelize.query(
      'SELECT compte FROM compteurs_limites WHERE cle = :cle AND fin > NOW()',
      { replacements: { cle: String(cle).slice(0, 300) }, type: QueryTypes.SELECT });
    return ligne ? Number(ligne.compte) : 0;
  } catch {
    const e = memoire.get(cle);
    return e && e.fin > Date.now() ? e.compte : 0;
  }
}

/** Remet le compteur à zéro. */
export async function effacer(cle) {
  memoire.delete(cle);
  try {
    await preparer();
    await sequelize.query('DELETE FROM compteurs_limites WHERE cle = :cle', { replacements: { cle: String(cle).slice(0, 300) } });
  } catch { /* rien à effacer */ }
}

/** Range les compteurs finis (appelé de temps en temps). */
export async function nettoyer() {
  for (const [k, e] of memoire) if (e.fin <= Date.now()) memoire.delete(k);
  try {
    await preparer();
    await sequelize.query("DELETE FROM compteurs_limites WHERE fin < NOW() - INTERVAL '1 hour'");
  } catch { /* plus tard */ }
}

/**
 * Magasin pour express-rate-limit (même interface que son magasin en mémoire),
 * pour les limites sensibles seulement : connexion, journal des erreurs.
 */
export class MagasinBase {
  constructor(prefixe) { this.prefixe = prefixe; this.fenetreMs = 60 * 1000; }
  init(options) { this.fenetreMs = options.windowMs; }
  async increment(cle) {
    const { compte, fin } = await ajouter(`${this.prefixe}:${cle}`, this.fenetreMs, 1);
    return { totalHits: compte, resetTime: fin };
  }
  async decrement(cle) { await ajouter(`${this.prefixe}:${cle}`, this.fenetreMs, -1); }
  async resetKey(cle) { await effacer(`${this.prefixe}:${cle}`); }
}

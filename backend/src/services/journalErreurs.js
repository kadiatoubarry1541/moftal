import { createHash } from 'crypto';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { notifier } from '../utils/notifier.js';
import { MASTER_ADMIN_NUMEROS } from '../middleware/auth.js';

/**
 * Journal des erreurs, enregistré en base (table « erreurs_signalees ») :
 * pannes du serveur (réponses 5xx, promesses oubliées) et erreurs du site
 * (écran « Oups ! »). Les erreurs identiques sont regroupées (compteur), et
 * l'administrateur principal est prévenu à la première apparition de chacune.
 * Ne bloque et ne fait jamais échouer l'action en cours.
 */

let tablePrete = null;
export function ensureTableErreurs() {
  if (!tablePrete) {
    tablePrete = sequelize.query(`
      CREATE TABLE IF NOT EXISTS erreurs_signalees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        empreinte VARCHAR(40) NOT NULL UNIQUE,
        origine VARCHAR(10) NOT NULL,
        message TEXT NOT NULL,
        pile TEXT,
        adresse TEXT,
        navigateur TEXT,
        numero_h VARCHAR(80),
        occurrences INTEGER NOT NULL DEFAULT 1,
        premiere_fois TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        derniere_fois TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolue BOOLEAN NOT NULL DEFAULT false
      )`).catch((e) => { tablePrete = null; throw e; });
  }
  return tablePrete;
}

const couper = (v, n) => (v == null ? null : String(v).slice(0, n));
// Une même erreur sur /api/x/123 et /api/x/456 = une seule ligne
const generaliser = (texte) => String(texte || '')
  .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
  .replace(/\d+/g, 'N')
  .replace(/\?.*$/, '');

// Alerte à la première apparition, 10 par heure au plus (jamais un déluge)
let alertes = { heure: 0, nombre: 0 };
function peutAlerter() {
  const heure = Math.floor(Date.now() / 3600000);
  if (alertes.heure !== heure) alertes = { heure, nombre: 0 };
  return alertes.nombre++ < 10;
}

export async function enregistrerErreur({ origine, message, pile, adresse, navigateur, numeroH }) {
  try {
    if (!message) return null;
    const premiereLignePile = String(pile || '').split('\n').find((l) => /at |@/.test(l)) || '';
    const empreinte = createHash('sha1')
      .update([origine, generaliser(message), generaliser(adresse), generaliser(premiereLignePile)].join('|'))
      .digest('hex');
    await ensureTableErreurs();
    const [ligne] = await sequelize.query(
      `INSERT INTO erreurs_signalees (empreinte, origine, message, pile, adresse, navigateur, numero_h)
       VALUES (:empreinte, :origine, :message, :pile, :adresse, :navigateur, :numeroH)
       ON CONFLICT (empreinte) DO UPDATE SET
         occurrences = erreurs_signalees.occurrences + 1,
         derniere_fois = NOW(),
         resolue = false,
         numero_h = COALESCE(EXCLUDED.numero_h, erreurs_signalees.numero_h)
       RETURNING id, occurrences`,
      {
        replacements: {
          empreinte, origine,
          message: couper(message, 2000), pile: couper(pile, 6000), adresse: couper(adresse, 500),
          navigateur: couper(navigateur, 400), numeroH: couper(numeroH, 80),
        },
        type: QueryTypes.SELECT,
      }
    );
    if (ligne?.occurrences === 1 && peutAlerter()) {
      const texte = `${origine === 'site' ? 'Site' : 'Serveur'} : ${couper(message, 160)}${adresse ? ` (${couper(adresse, 80)})` : ''}`;
      for (const admin of MASTER_ADMIN_NUMEROS) notifier(admin, 'erreur', texte, '🚨 Nouvelle erreur');
    }
    return ligne || null;
  } catch (e) {
    console.warn('journalErreurs:', e.message);
    return null;
  }
}

export async function listerErreurs({ toutes = false } = {}) {
  await ensureTableErreurs();
  return sequelize.query(
    `SELECT id, origine, message, pile, adresse, navigateur, numero_h, occurrences, premiere_fois, derniere_fois, resolue
     FROM erreurs_signalees ${toutes ? '' : 'WHERE resolue = false'}
     ORDER BY resolue ASC, derniere_fois DESC LIMIT 200`,
    { type: QueryTypes.SELECT }
  );
}

export async function marquerResolue(id, resolue = true) {
  await ensureTableErreurs();
  const [ligne] = await sequelize.query(
    'UPDATE erreurs_signalees SET resolue = :resolue WHERE id = :id RETURNING id',
    { replacements: { id, resolue }, type: QueryTypes.SELECT }
  );
  return !!ligne;
}

import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { config } from '../../config.js';

/**
 * Appareils connectés : chaque connexion (téléphone, tablette, ordinateur,
 * application installée) est une session enregistrée en base, liée au jeton par
 * son identifiant « sid ». La personne voit la liste de ses appareils et peut en
 * déconnecter un, ou tous les autres, à distance : la session est alors refusée
 * dès la requête suivante de cet appareil.
 */

let tablePrete = null;
export function ensureTableSessions() {
  if (!tablePrete) {
    tablePrete = (async () => {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS sessions_appareils (
          id UUID PRIMARY KEY,
          numero_h VARCHAR(80) NOT NULL,
          appareil VARCHAR(120) NOT NULL,
          agent TEXT,
          cree_le TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          derniere_activite TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          revoquee_le TIMESTAMPTZ
        )`);
      await sequelize.query(
        'CREATE INDEX IF NOT EXISTS sessions_appareils_numero_h ON sessions_appareils (numero_h) WHERE revoquee_le IS NULL');
    })().catch((e) => { tablePrete = null; throw e; });
  }
  return tablePrete;
}

/** Nom lisible de l'appareil, d'après ce que le navigateur annonce. */
export function nomAppareil(agent = '') {
  const ua = String(agent);
  if (/iPad/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))) return 'Tablette iPad';
  if (/iPhone|iPod/i.test(ua)) return 'iPhone';
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'Téléphone Android' : 'Tablette Android';
  if (/Windows/i.test(ua)) return 'Ordinateur Windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Ordinateur Mac';
  if (/CrOS/i.test(ua)) return 'Ordinateur Chromebook';
  if (/Linux/i.test(ua)) return 'Ordinateur Linux';
  return 'Appareil inconnu';
}

/** Jeton de session (le même format qu'avant, plus l'identifiant de session). */
export function signerJeton(numeroH, sid) {
  return jwt.sign({ userId: numeroH, numeroH, sid }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRE });
}

/** Nouvelle connexion depuis cet appareil → session enregistrée + jeton. */
export async function ouvrirSession(req, numeroH) {
  await ensureTableSessions();
  const sid = randomUUID();
  const agent = String(req?.headers?.['user-agent'] || '').slice(0, 400);
  await sequelize.query(
    'INSERT INTO sessions_appareils (id, numero_h, appareil, agent) VALUES (:sid, :numeroH, :appareil, :agent)',
    { replacements: { sid, numeroH, appareil: nomAppareil(agent), agent } }
  );
  return signerJeton(numeroH, sid);
}

// Petite mémoire pour ne pas interroger la base à chaque requête : une session
// déconnectée est refusée au plus tard après CACHE_MS (et tout de suite sur ce serveur).
const CACHE_MS = 15 * 1000;
const ACTIVITE_MS = 5 * 60 * 1000;
const cache = new Map(); // sid → { valide, lu, activite }

/** La session « sid » est-elle toujours ouverte ? (met à jour la dernière activité) */
export async function sessionOuverte(sid) {
  const maintenant = Date.now();
  let entree = cache.get(sid);
  if (!entree || maintenant - entree.lu > CACHE_MS) {
    await ensureTableSessions();
    const [ligne] = await sequelize.query(
      'SELECT revoquee_le, derniere_activite FROM sessions_appareils WHERE id = :sid',
      { replacements: { sid }, type: QueryTypes.SELECT }
    );
    entree = {
      valide: !!ligne && !ligne.revoquee_le,
      lu: maintenant,
      activite: ligne ? new Date(ligne.derniere_activite).getTime() : 0,
    };
    if (cache.size > 50000) cache.clear();
    cache.set(sid, entree);
  }
  if (entree.valide && maintenant - entree.activite > ACTIVITE_MS) {
    entree.activite = maintenant;
    sequelize.query('UPDATE sessions_appareils SET derniere_activite = NOW() WHERE id = :sid', { replacements: { sid } })
      .catch(() => {});
  }
  return entree.valide;
}

const oublier = (sids) => sids.forEach((s) => cache.delete(s));

/** Appareils encore connectés de cette personne (le plus récent d'abord). */
export async function listerSessions(numeroH) {
  await ensureTableSessions();
  return sequelize.query(
    `SELECT id, appareil, cree_le, derniere_activite FROM sessions_appareils
     WHERE numero_h = :numeroH AND revoquee_le IS NULL
     ORDER BY derniere_activite DESC`,
    { replacements: { numeroH }, type: QueryTypes.SELECT }
  );
}

/** Déconnecte une session de cette personne. Renvoie true si elle existait. */
export async function fermerSession(numeroH, sid) {
  await ensureTableSessions();
  const [lignes] = await sequelize.query(
    `UPDATE sessions_appareils SET revoquee_le = NOW()
     WHERE id = :sid AND numero_h = :numeroH AND revoquee_le IS NULL RETURNING id`,
    { replacements: { sid, numeroH } }
  );
  oublier([sid]);
  return lignes.length > 0;
}

/** Déconnecte toutes les sessions de cette personne, sauf « sauf » (si donné). */
export async function fermerAutresSessions(numeroH, sauf = null) {
  await ensureTableSessions();
  const [lignes] = await sequelize.query(
    `UPDATE sessions_appareils SET revoquee_le = NOW()
     WHERE numero_h = :numeroH AND revoquee_le IS NULL AND (CAST(:sauf AS UUID) IS NULL OR id <> CAST(:sauf AS UUID))
     RETURNING id`,
    { replacements: { numeroH, sauf } }
  );
  oublier(lignes.map((l) => l.id));
  return lignes.length;
}

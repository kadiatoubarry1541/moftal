import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '../../config.js';
import { sequelize } from '../config/database.js';
import { PROVISIONAL_PREFIX } from '../middleware/auth.js';
import User from '../models/User.js';
import { trouverPersonne } from '../utils/trouverPersonne.js';

/**
 * Une personne ajoutée par son téléphone ou son e-mail (propriétaire créé par
 * l'admin, employé, professeur, parent ajouté par le pro) sans avoir encore de
 * compte Moftal : un compte est préparé (NuméroH provisoire TMP-…). Il n'a pas
 * de mot de passe utilisable : à sa première connexion avec ce téléphone ou cet
 * e-mail, la personne choisit le sien (POST /api/auth/premiere-connexion).
 */
let colonnePrete = null;
export function preparerColonne() {
  if (!colonnePrete) {
    colonnePrete = sequelize.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS mot_de_passe_a_choisir BOOLEAN NOT NULL DEFAULT false;
       ALTER TABLE users ADD COLUMN IF NOT EXISTS code_premiere_connexion VARCHAR(64);`
    ).catch((e) => { colonnePrete = null; throw e; });
  }
  return colonnePrete;
}

// ── Code de première connexion ───────────────────────────────────────────────
// Sans code, la première personne qui tapait ce téléphone choisissait le mot
// de passe et prenait le compte. L'établissement qui ajoute la personne reçoit
// un code à 6 chiffres qu'il lui transmet ; seule son empreinte est gardée.
export function empreinteCodePremiereConnexion(numeroH, code) {
  return crypto.createHmac('sha256', config.JWT_SECRET).update(`premiere|${numeroH}|${String(code).trim()}`).digest('hex');
}

/** Nouveau code pour un compte qui n'a pas encore choisi son mot de passe (sinon null). */
export async function donnerCodePremiereConnexion(numeroH) {
  if (!numeroH) return null;
  await preparerColonne();
  const code = String(crypto.randomInt(100000, 1000000));
  const [lignes] = await sequelize.query(
    `UPDATE users SET code_premiere_connexion = :h WHERE numero_h = :nh AND mot_de_passe_a_choisir = true RETURNING numero_h`,
    { replacements: { h: empreinteCodePremiereConnexion(numeroH, code), nh: numeroH } }
  );
  return lignes.length ? code : null;
}

export function analyserIdentifiant(identifiant) {
  const brut = String(identifiant || '').trim();
  const estEmail = brut.includes('@');
  const valide = estEmail
    ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(brut)
    : !/[a-z]/i.test(brut) && brut.replace(/[^0-9]/g, '').length >= 8;
  return { brut, estEmail, valide };
}

async function creerCompteProvisoire(identifiant) {
  const { brut, estEmail } = analyserIdentifiant(identifiant);
  await preparerColonne();
  const numeroH = `${PROVISIONAL_PREFIX}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  await User.create({
    numeroH,
    // Mot de passe inutilisable : la personne choisira le sien à sa première connexion
    password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), config.BCRYPT_ROUNDS),
    prenom: 'Nouveau', nomFamille: 'membre',
    tel1: estEmail ? null : brut,
    email: estEmail ? brut.toLowerCase() : null,
    genre: 'AUTRE', generation: 'G1', type: 'vivant', isActive: true, isVerified: false, role: 'user'
  });
  await sequelize.query(`UPDATE users SET mot_de_passe_a_choisir = true WHERE numero_h = :nh`, { replacements: { nh: numeroH } });
  return { numero_h: numeroH, prenom: null, nom: null, tel1: estEmail ? null : brut };
}

/**
 * Retrouve la personne (téléphone, e-mail ou NuméroH) ; sans compte et avec un
 * téléphone ou un e-mail valable, son compte est préparé.
 * Renvoie { personne, cree } ou { erreur, statut }.
 */
export async function trouverOuPreparerPersonne(identifiant) {
  const trouve = await trouverPersonne(identifiant);
  // Personne ajoutée (ou ajoutée à nouveau) sans mot de passe encore : un code
  // de première connexion neuf est remis à l'établissement
  if (trouve.personne) {
    return { personne: trouve.personne, cree: false, codePremiereConnexion: await donnerCodePremiereConnexion(trouve.personne.numero_h) };
  }
  const { valide } = analyserIdentifiant(identifiant);
  if (trouve.statut !== 404 || !valide) return { erreur: trouve.erreur || 'Téléphone ou e-mail invalide.', statut: trouve.statut || 400 };
  const personne = await creerCompteProvisoire(identifiant);
  return { personne, cree: true, codePremiereConnexion: await donnerCodePremiereConnexion(personne.numero_h) };
}

/** La personne a-t-elle été ajoutée quelque part (propriétaire, employé, parent…) ? */
export async function aEteAjoutee(numeroH) {
  const requetes = [
    `SELECT 1 FROM professional_accounts WHERE owner_numero_h = :nh LIMIT 1`,
    `SELECT 1 FROM management_staff_access WHERE LOWER(numero_h) = LOWER(:nh) AND is_active = true LIMIT 1`,
    `SELECT 1 FROM school_members WHERE LOWER(numero_h) = LOWER(:nh) AND is_active = true LIMIT 1`,
    `SELECT 1 FROM madrasa_members WHERE LOWER(numero_h) = LOWER(:nh) LIMIT 1`,
    // Enseignants ajoutés par l'école / la madrasa avec leur téléphone ou e-mail
    `SELECT 1 FROM school_staff WHERE LOWER(TRIM(numero_h)) = LOWER(:nh) AND is_active = true LIMIT 1`,
    `SELECT 1 FROM madrasa_staff WHERE LOWER(TRIM(numero_h)) = LOWER(:nh) LIMIT 1`,
  ];
  for (const q of requetes) {
    const r = await sequelize.query(q, { replacements: { nh: numeroH }, type: sequelize.QueryTypes.SELECT }).catch(() => []);
    if (r.length) return true;
  }
  return false;
}

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '../../config.js';
import { sequelize } from '../config/database.js';
import { PROVISIONAL_PREFIX } from '../middleware/auth.js';
import User from '../models/User.js';

/**
 * Invitations (pro créé par l'admin, employé ajouté par le pro) : un lien à
 * usage unique, valable 30 jours ; seule l'empreinte sha256 du lien est en base.
 */
export const empreinte = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
export const nouveauJeton = () => crypto.randomBytes(24).toString('base64url');

export function analyserIdentifiant(identifiant) {
  const brut = String(identifiant || '').trim();
  const estEmail = brut.includes('@');
  const valide = estEmail
    ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(brut)
    : !/[a-z]/i.test(brut) && brut.replace(/[^0-9]/g, '').length >= 8;
  return { brut, estEmail, valide };
}

/** Compte provisoire (TMP-…) au mot de passe inutilisable : seule l'invitation le donnera. */
export async function creerCompteProvisoire(identifiant) {
  const { brut, estEmail } = analyserIdentifiant(identifiant);
  const numeroH = `${PROVISIONAL_PREFIX}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  await User.create({
    numeroH,
    password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), config.BCRYPT_ROUNDS),
    prenom: 'Nouveau', nomFamille: 'membre',
    tel1: estEmail ? null : brut,
    email: estEmail ? brut.toLowerCase() : null,
    genre: 'AUTRE', generation: 'G1', type: 'vivant', isActive: true, isVerified: false, role: 'user'
  });
  return numeroH;
}

export async function definirMotDePasse(numeroH, password) {
  await User.update({ password: await bcrypt.hash(password, config.BCRYPT_ROUNDS) }, { where: { numeroH } });
}

// ── Tables ───────────────────────────────────────────────────────────────────
let tablesPretes = null;
export function preparerTablesInvitations() {
  if (!tablesPretes) {
    tablesPretes = sequelize.query(`
      CREATE TABLE IF NOT EXISTS pro_invitations (
        id SERIAL PRIMARY KEY,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        account_id VARCHAR(64) NOT NULL,
        numero_h VARCHAR(100) NOT NULL,
        user_cree BOOLEAN NOT NULL DEFAULT false,
        cree_par VARCHAR(100),
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        accepte_le TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS equipe_invitations (
        id SERIAL PRIMARY KEY,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        tenant_code VARCHAR(50) NOT NULL,
        numero_h VARCHAR(100) NOT NULL,
        user_cree BOOLEAN NOT NULL DEFAULT false,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        accepte_le TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`).catch((e) => { tablesPretes = null; throw e; });
  }
  return tablesPretes;
}

/**
 * Mot de passe encore à choisir : compte provisoire (TMP-…) créé par une
 * invitation et jamais repris (aucune invitation acceptée pour lui).
 */
export async function motDePasseAChoisir(numeroH) {
  if (!String(numeroH || '').startsWith(PROVISIONAL_PREFIX)) return false;
  await preparerTablesInvitations();
  const [r] = await sequelize.query(
    `SELECT
       (SELECT COUNT(*) FROM equipe_invitations WHERE LOWER(numero_h) = LOWER(:nh) AND accepte_le IS NOT NULL) +
       (SELECT COUNT(*) FROM pro_invitations    WHERE LOWER(numero_h) = LOWER(:nh) AND accepte_le IS NOT NULL) AS acceptees,
       (SELECT COUNT(*) FROM equipe_invitations WHERE LOWER(numero_h) = LOWER(:nh) AND user_cree) +
       (SELECT COUNT(*) FROM pro_invitations    WHERE LOWER(numero_h) = LOWER(:nh) AND user_cree) AS creees`,
    { replacements: { nh: numeroH }, type: sequelize.QueryTypes.SELECT }
  );
  return +r.creees > 0 && +r.acceptees === 0;
}

/** Nouveau lien d'équipe pour cet employé (les anciens de cet établissement ne marchent plus). */
export async function creerInvitationEquipe(tenantCode, numeroH, userCree) {
  await preparerTablesInvitations();
  await sequelize.query(
    `UPDATE equipe_invitations SET used_at = NOW()
      WHERE tenant_code = :code AND LOWER(numero_h) = LOWER(:nh) AND used_at IS NULL`,
    { replacements: { code: tenantCode, nh: numeroH } }
  );
  const token = nouveauJeton();
  await sequelize.query(
    `INSERT INTO equipe_invitations (token_hash, tenant_code, numero_h, user_cree, expires_at)
     VALUES (:h, :code, :nh, :uc, NOW() + INTERVAL '30 days')`,
    { replacements: { h: empreinte(token), code: tenantCode, nh: numeroH, uc: !!userCree } }
  );
  return token;
}

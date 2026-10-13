import express from 'express';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { config } from '../../config.js';
import { sequelize } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import ProfessionalAccount from '../models/ProfessionalAccount.js';
import User from '../models/User.js';
import { trouverPersonne } from '../utils/trouverPersonne.js';
import { finalizeApproval } from './professionals.js';
import { empreinte, nouveauJeton, analyserIdentifiant, creerCompteProvisoire, definirMotDePasse, preparerTablesInvitations, motDePasseAChoisir } from '../services/invitations.js';

/**
 * L'admin crée un compte pro avec seulement le téléphone ou l'e-mail de
 * l'établissement, puis envoie un lien d'invitation. Le pro l'ouvre, choisit
 * son mot de passe (ou se connecte s'il a déjà un compte), ajoute son logo,
 * puis installe sa gestion. Le lien est à usage unique et expire après 30 jours ;
 * seul son empreinte (sha256) est gardée en base.
 */
const router = express.Router();
const DUREE_JOURS = 30;
const TYPES = [
  'clinic', 'health_worker', 'security_agency', 'journalist', 'enterprise', 'school',
  'supplier', 'scientist', 'ngo', 'vendor', 'producer', 'broker', 'restaurant',
  'transport', 'beauty', 'artisan', 'mairie', 'mosque', 'madrasa', 'commerce', 'reseau'
];
const TYPES_ECHANGES = ['vendor', 'supplier', 'producer'];

const preparerTable = preparerTablesInvitations;
const signer = (numeroH) => jwt.sign({ userId: numeroH, numeroH }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRE });

async function nouvelleInvitation(account, numeroH, userCree, creePar) {
  await preparerTable();
  // Un seul lien valable à la fois par compte : les anciens ne marchent plus
  await sequelize.query(
    `UPDATE pro_invitations SET used_at = NOW() WHERE account_id = :id AND used_at IS NULL`,
    { replacements: { id: String(account.id) } }
  );
  const token = nouveauJeton();
  await sequelize.query(
    `INSERT INTO pro_invitations (token_hash, account_id, numero_h, user_cree, cree_par, expires_at)
     VALUES (:h, :id, :nh, :uc, :par, NOW() + INTERVAL '${DUREE_JOURS} days')`,
    { replacements: { h: empreinte(token), id: String(account.id), nh: numeroH, uc: userCree, par: creePar || null } }
  );
  return token;
}

async function lireInvitation(token) {
  await preparerTable();
  const [inv] = await sequelize.query(
    `SELECT * FROM pro_invitations WHERE token_hash = :h LIMIT 1`,
    { replacements: { h: empreinte(token) }, type: sequelize.QueryTypes.SELECT }
  );
  if (!inv) return { erreur: 'Lien d\'invitation introuvable.', statut: 404 };
  if (inv.used_at) return { erreur: 'Ce lien a déjà été utilisé. Connectez-vous avec votre téléphone ou votre e-mail.', statut: 410 };
  if (new Date(inv.expires_at) < new Date()) return { erreur: 'Ce lien a expiré. Demandez-en un nouveau à Moftal.', statut: 410 };
  const account = await ProfessionalAccount.findByPk(inv.account_id);
  if (!account) return { erreur: 'Établissement introuvable.', statut: 404 };
  return { inv, account };
}

// Logo choisi par le pro en acceptant : compte pro + gestion interne
async function mettreLogo(account, logo) {
  if (!logo) return;
  await account.update({ photo: logo });
  if (account.tenant_code) {
    await sequelize.query(`UPDATE management_tenants SET logo_url = :logo WHERE tenant_code = :code`,
      { replacements: { logo, code: account.tenant_code } });
  }
}

// POST /api/invitations-pro/admin/creer — l'admin crée le compte pro
router.post('/admin/creer', authenticate, requireAdmin, async (req, res) => {
  try {
    const identifiant = String(req.body?.identifiant || '').trim();
    const name = String(req.body?.name || '').trim();
    const type = String(req.body?.type || '');
    const subSector = req.body?.subSector;
    const planType = req.body?.planType === 'visibility' ? 'visibility' : 'full';
    const logo = typeof req.body?.photo === 'string' ? req.body.photo.trim() : '';
    if (!name) return res.status(400).json({ success: false, message: 'Nom de l\'établissement obligatoire.' });
    if (!TYPES.includes(type)) return res.status(400).json({ success: false, message: 'Choisissez le secteur.' });
    if (TYPES_ECHANGES.includes(type) && !['primaire', 'secondaire', 'tertiaire'].includes(subSector)) {
      return res.status(400).json({ success: false, message: 'Choisissez le niveau d\'échanges (primaire, secondaire ou tertiaire).' });
    }
    if (logo && !/^data:image\//.test(logo) && !/^https?:\/\//.test(logo)) {
      return res.status(400).json({ success: false, message: 'Logo invalide : choisissez une image.' });
    }
    const { estEmail, valide } = analyserIdentifiant(identifiant);
    if (!valide) {
      return res.status(400).json({ success: false, message: 'Indiquez le téléphone ou l\'e-mail de l\'établissement.' });
    }
    const pris = await ProfessionalAccount.findOne({
      where: { name: { [Op.iLike]: name }, status: { [Op.ne]: 'rejected' }, isActive: true }
    });
    if (pris) return res.status(409).json({ success: false, message: `Le nom "${name}" est déjà utilisé par un autre établissement.` });

    // Le propriétaire : compte existant avec ce téléphone / e-mail, sinon un
    // compte provisoire (TMP-…) qui recevra son mot de passe par l'invitation
    const trouve = await trouverPersonne(identifiant);
    if (trouve.statut === 409) return res.status(409).json({ success: false, message: trouve.erreur });
    let numeroH = trouve.personne?.numero_h || null;
    let userCree = false;
    if (!numeroH) {
      numeroH = await creerCompteProvisoire(identifiant);
      userCree = true;
    }

    const account = await ProfessionalAccount.create({
      type, name,
      subSector: TYPES_ECHANGES.includes(type) ? subSector : (type === 'broker' ? 'tertiaire' : null),
      phone: estEmail ? '' : identifiant,
      email: estEmail ? identifiant.toLowerCase() : '',
      photo: logo || null,
      planType,
      ownerNumeroH: numeroH,
      status: 'pending'
    });
    // Créé par l'admin : publié tout de suite (essai gratuit, gestion si formule complète)
    await finalizeApproval(account, req.userId);
    const token = await nouvelleInvitation(account, numeroH, userCree, req.userId);
    res.status(201).json({ success: true, token, account: { id: account.id, name: account.name, type: account.type, phone: account.phone, email: account.email }, compteExistant: !userCree });
  } catch (e) {
    console.error('invitation pro (créer):', e);
    res.status(500).json({ success: false, message: 'Erreur serveur : le compte n\'a pas été créé.' });
  }
});

// POST /api/invitations-pro/admin/:accountId/lien — nouveau lien (perdu, expiré…)
router.post('/admin/:accountId/lien', authenticate, requireAdmin, async (req, res) => {
  try {
    const account = await ProfessionalAccount.findByPk(req.params.accountId);
    if (!account) return res.status(404).json({ success: false, message: 'Compte introuvable.' });
    const userCree = await motDePasseAChoisir(account.ownerNumeroH);
    const token = await nouvelleInvitation(account, account.ownerNumeroH, userCree, req.userId);
    res.json({ success: true, token, account: { id: account.id, name: account.name, type: account.type, phone: account.phone, email: account.email } });
  } catch (e) {
    console.error('invitation pro (lien):', e);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// GET /api/invitations-pro/:token — ce que voit le pro en ouvrant le lien
router.get('/:token', async (req, res) => {
  try {
    const r = await lireInvitation(req.params.token);
    if (r.erreur) return res.status(r.statut).json({ success: false, message: r.erreur });
    const { inv, account } = r;
    res.json({
      success: true,
      choisirMotDePasse: !!inv.user_cree,
      account: { id: account.id, name: account.name, type: account.type, photo: account.photo || null, planType: account.planType || 'full', phone: account.phone || '', email: account.email || '' },
    });
  } catch (e) {
    console.error('invitation pro (lire):', e);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST /api/invitations-pro/:token/accepter — mot de passe (nouveau compte) ou
// connexion déjà faite (compte existant), logo si absent ; le lien est alors épuisé
router.post('/:token/accepter', async (req, res) => {
  try {
    const r = await lireInvitation(req.params.token);
    if (r.erreur) return res.status(r.statut).json({ success: false, message: r.erreur });
    const { inv, account } = r;
    const logo = typeof req.body?.photo === 'string' ? req.body.photo.trim() : '';
    if (logo && !/^data:image\//.test(logo) && !/^https?:\/\//.test(logo)) {
      return res.status(400).json({ success: false, message: 'Logo invalide : choisissez une image.' });
    }
    if (!account.photo && !logo) {
      return res.status(400).json({ success: false, message: 'Le logo de votre établissement est obligatoire.', champ: 'photo' });
    }

    let numeroH = inv.numero_h;
    if (inv.user_cree) {
      const password = String(req.body?.password || '');
      if (password.length < 6) return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 6 caractères.' });
      await definirMotDePasse(numeroH, password);
    } else {
      // Compte qui existait déjà : il faut être connecté avec ce compte-là
      const entete = String(req.headers.authorization || '');
      let connecte = null;
      try { connecte = jwt.verify(entete.replace(/^Bearer\s+/i, ''), config.JWT_SECRET); } catch { /* pas connecté */ }
      const qui = connecte?.numeroH || connecte?.userId;
      if (!qui) return res.status(401).json({ success: false, doitSeConnecter: true, message: 'Connectez-vous avec votre téléphone ou votre e-mail pour accepter l\'invitation.' });
      if (String(qui).toLowerCase() !== String(numeroH).toLowerCase()) {
        return res.status(403).json({ success: false, message: 'Cette invitation est pour un autre compte. Connectez-vous avec le téléphone ou l\'e-mail de l\'établissement.' });
      }
    }

    await mettreLogo(account, logo);
    await sequelize.query(`UPDATE pro_invitations SET used_at = NOW(), accepte_le = NOW() WHERE id = :id`, { replacements: { id: inv.id } });

    const user = await User.findByPk(numeroH);
    const donnees = user ? { ...user.dataValues } : { numeroH };
    delete donnees.password;
    res.json({ success: true, token: signer(numeroH), user: donnees, accountId: account.id, planType: account.planType || 'full' });
  } catch (e) {
    console.error('invitation pro (accepter):', e);
    res.status(500).json({ success: false, message: 'Erreur serveur : réessayez.' });
  }
});

// ── Invitations d'équipe (employé ajouté par le pro) ─────────────────────────
async function lireInvitationEquipe(token) {
  await preparerTablesInvitations();
  const [inv] = await sequelize.query(
    `SELECT i.*, t.name, t.type, t.logo_url, a.poste, a.niveau, a.is_active AS acces_actif
       FROM equipe_invitations i
       JOIN management_tenants t ON t.tenant_code = i.tenant_code
       LEFT JOIN management_staff_access a ON a.tenant_code = i.tenant_code AND LOWER(a.numero_h) = LOWER(i.numero_h)
      WHERE i.token_hash = :h LIMIT 1`,
    { replacements: { h: empreinte(token) }, type: sequelize.QueryTypes.SELECT }
  );
  if (!inv) return { erreur: 'Lien d\'invitation introuvable.', statut: 404 };
  if (inv.used_at) return { erreur: 'Ce lien a déjà été utilisé. Connectez-vous avec votre téléphone ou votre e-mail.', statut: 410 };
  if (new Date(inv.expires_at) < new Date()) return { erreur: 'Ce lien a expiré. Demandez-en un nouveau à votre responsable.', statut: 410 };
  if (!inv.acces_actif) return { erreur: 'Votre accès à cet établissement a été retiré. Voyez avec votre responsable.', statut: 410 };
  return { inv };
}

// GET /api/invitations-pro/equipe/:token
router.get('/equipe/:token', async (req, res) => {
  try {
    const r = await lireInvitationEquipe(req.params.token);
    if (r.erreur) return res.status(r.statut).json({ success: false, message: r.erreur });
    const { inv } = r;
    const [u] = await sequelize.query(`SELECT tel1, email FROM users WHERE LOWER(numero_h) = LOWER(:nh) LIMIT 1`,
      { replacements: { nh: inv.numero_h }, type: sequelize.QueryTypes.SELECT });
    res.json({
      success: true,
      choisirMotDePasse: !!inv.user_cree,
      identifiant: u?.tel1 || u?.email || '',
      etablissement: { tenantCode: inv.tenant_code, name: inv.name, type: inv.type, logo: inv.logo_url || null },
      poste: inv.poste || null,
      niveau: inv.niveau || 'limite',
    });
  } catch (e) {
    console.error('invitation équipe (lire):', e);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// POST /api/invitations-pro/equipe/:token/accepter
router.post('/equipe/:token/accepter', async (req, res) => {
  try {
    const r = await lireInvitationEquipe(req.params.token);
    if (r.erreur) return res.status(r.statut).json({ success: false, message: r.erreur });
    const { inv } = r;
    const numeroH = inv.numero_h;
    if (inv.user_cree) {
      const password = String(req.body?.password || '');
      if (password.length < 6) return res.status(400).json({ success: false, message: 'Le mot de passe doit contenir au moins 6 caractères.' });
      await definirMotDePasse(numeroH, password);
    } else {
      // Compte qui existait déjà : il faut être connecté avec ce compte-là
      let connecte = null;
      try { connecte = jwt.verify(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''), config.JWT_SECRET); } catch { /* pas connecté */ }
      const qui = connecte?.numeroH || connecte?.userId;
      if (!qui) return res.status(401).json({ success: false, doitSeConnecter: true, message: 'Connectez-vous avec votre téléphone ou votre e-mail pour rejoindre l\'équipe.' });
      if (String(qui).toLowerCase() !== String(numeroH).toLowerCase()) {
        return res.status(403).json({ success: false, message: 'Cette invitation est pour un autre compte. Connectez-vous avec le téléphone ou l\'e-mail donné à votre responsable.' });
      }
    }
    await sequelize.query(`UPDATE equipe_invitations SET used_at = NOW(), accepte_le = NOW() WHERE id = :id`, { replacements: { id: inv.id } });
    const user = await User.findByPk(numeroH);
    const donnees = user ? { ...user.dataValues } : { numeroH };
    delete donnees.password;
    res.json({ success: true, token: signer(numeroH), user: donnees, etablissement: { tenantCode: inv.tenant_code, type: inv.type } });
  } catch (e) {
    console.error('invitation équipe (accepter):', e);
    res.status(500).json({ success: false, message: 'Erreur serveur : réessayez.' });
  }
});

export default router;

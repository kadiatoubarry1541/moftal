import express from 'express';
import { Op } from 'sequelize';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import ProfessionalAccount from '../models/ProfessionalAccount.js';
import { finalizeApproval } from './professionals.js';
import { analyserIdentifiant, trouverOuPreparerPersonne } from '../services/comptesProvisoires.js';

/**
 * L'admin crée le compte pro d'un établissement avec seulement son téléphone
 * ou son e-mail. Il copie ensuite le lien de l'application et l'envoie au
 * propriétaire : celui-ci se connecte avec ce téléphone / cet e-mail (la
 * première fois il choisit son mot de passe), installe et a tous les droits.
 */
const router = express.Router();
const TYPES = [
  'clinic', 'health_worker', 'security_agency', 'journalist', 'enterprise', 'school',
  'supplier', 'scientist', 'ngo', 'vendor', 'producer', 'broker', 'restaurant',
  'transport', 'beauty', 'artisan', 'mairie', 'mosque', 'madrasa', 'commerce', 'reseau', 'lawyer', 'legal_advisor'
];
const TYPES_ECHANGES = ['vendor', 'supplier', 'producer'];

// POST /api/invitations-pro/admin/creer
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
    if (!valide) return res.status(400).json({ success: false, message: 'Indiquez le téléphone ou l\'e-mail de l\'établissement.' });
    const pris = await ProfessionalAccount.findOne({
      where: { name: { [Op.iLike]: name }, status: { [Op.ne]: 'rejected' }, isActive: true }
    });
    if (pris) return res.status(409).json({ success: false, message: `Le nom "${name}" est déjà utilisé par un autre établissement.` });

    // Propriétaire : le compte qui a ce téléphone / cet e-mail, sinon un compte préparé
    const trouve = await trouverOuPreparerPersonne(identifiant);
    if (trouve.erreur) return res.status(trouve.statut).json({ success: false, message: trouve.erreur });

    const account = await ProfessionalAccount.create({
      type, name,
      subSector: TYPES_ECHANGES.includes(type) ? subSector : (type === 'broker' ? 'tertiaire' : null),
      phone: estEmail ? '' : identifiant,
      email: estEmail ? identifiant.toLowerCase() : '',
      photo: logo || null,
      planType,
      ownerNumeroH: trouve.personne.numero_h,
      status: 'pending'
    });
    // Créé par l'admin : publié tout de suite (essai gratuit, gestion si formule complète)
    await finalizeApproval(account, req.userId);
    res.status(201).json({
      success: true,
      compteExistant: !trouve.cree,
      account: { id: account.id, name: account.name, type: account.type, planType, tenant_code: account.tenant_code || null, phone: account.phone, email: account.email },
    });
  } catch (e) {
    console.error('admin crée un compte pro:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur : le compte n\'a pas été créé.' });
  }
});

export default router;

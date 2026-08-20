import express from 'express';
import { Op } from 'sequelize';
import User from '../models/User.js';
import ProfessionalAccount from '../models/ProfessionalAccount.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Ancienneté minimum du compte avant de pouvoir prétendre au badge (jours)
const ANCIENNETE_MIN_JOURS = 60;

/** Évalue si un compte remplit les critères automatiques du badge "Compte vérifié".
 *  L'approbation finale reste toujours un geste manuel de l'admin. */
async function evaluateEligibility(user) {
  const raisons = [];

  const nbEnfants = await User.count({
    where: { [Op.or]: [{ numeroHPere: user.numeroH }, { numeroHMere: user.numeroH }] }
  });
  if (nbEnfants < 1) raisons.push('Aucun enfant enregistré dans l\'arbre familial.');

  const activite = await ProfessionalAccount.findOne({
    where: { ownerNumeroH: user.numeroH, status: 'approved' }
  });
  if (!activite) raisons.push('Aucune activité professionnelle approuvée.');

  if (!user.photo) raisons.push('Aucune photo de profil.');
  if (!user.tel1) raisons.push('Aucun numéro de téléphone renseigné.');

  const ancienneteJours = (Date.now() - new Date(user.createdAt).getTime()) / 86400000;
  if (ancienneteJours < ANCIENNETE_MIN_JOURS) {
    raisons.push(`Compte trop récent (minimum ${ANCIENNETE_MIN_JOURS} jours).`);
  }

  return { eligible: raisons.length === 0, raisons, nbEnfants, aUneActivite: !!activite };
}

// GET /api/verification/status — l'utilisateur connecté consulte sa propre éligibilité
router.get('/status', authenticate, async (req, res) => {
  try {
    const evaluation = await evaluateEligibility(req.user);
    res.json({ success: true, isVerified: !!req.user.isVerified, ...evaluation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/verification/candidats — comptes remplissant les critères automatiques,
// pas encore vérifiés, en attente d'approbation manuelle
router.get('/admin/candidats', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await User.findAll({ where: { isVerified: false, isActive: true } });
    const candidats = [];
    for (const user of users) {
      const evaluation = await evaluateEligibility(user);
      if (evaluation.eligible) {
        candidats.push({
          numeroH: user.numeroH,
          prenom: user.prenom,
          nomFamille: user.nomFamille,
          photo: user.photo,
          nbEnfants: evaluation.nbEnfants,
        });
      }
    }
    res.json({ success: true, candidats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/verification/:numeroH/approuver
router.post('/admin/:numeroH/approuver', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ where: { numeroH: req.params.numeroH } });
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    user.isVerified = true;
    await user.save();
    res.json({ success: true, message: 'Compte vérifié.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/verification/:numeroH/retirer
router.post('/admin/:numeroH/retirer', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ where: { numeroH: req.params.numeroH } });
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    user.isVerified = false;
    await user.save();
    res.json({ success: true, message: 'Badge retiré.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

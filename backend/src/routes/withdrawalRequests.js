import express from 'express';
import { authenticate } from '../middleware/auth.js';
import ProWithdrawalRequest from '../models/ProWithdrawalRequest.js';
import ProfessionalAccount from '../models/ProfessionalAccount.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
router.use(authenticate);

// ─────────────────────────────────────────────────────────
// POST /api/withdrawal-requests
// Le professionnel soumet une demande de retrait
// ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { proAccountId, montant, motif, coordonneesPaiement } = req.body;
    const { numeroH, prenom, nomFamille } = req.user;

    if (!proAccountId || !montant || montant < 1000) {
      return res.status(400).json({ success: false, message: 'proAccountId et montant (min 1 000 GNF) requis.' });
    }

    const pro = await ProfessionalAccount.findOne({
      where: { id: proAccountId, ownerNumeroH: numeroH }
    });
    if (!pro) {
      return res.status(403).json({ success: false, message: 'Compte professionnel introuvable ou accès refusé.' });
    }

    // Vérifier qu'il n'y a pas déjà une demande en attente pour ce compte
    const demandeExistante = await ProWithdrawalRequest.findOne({
      where: { proAccountId, statut: 'en_attente' }
    });
    if (demandeExistante) {
      return res.status(400).json({
        success: false,
        message: 'Une demande de retrait est déjà en attente pour ce compte. Attendez la validation de l\'administrateur.'
      });
    }

    const receiptRef = `MF-RET-${uuidv4().slice(0, 8).toUpperCase()}`;

    const demande = await ProWithdrawalRequest.create({
      proAccountId,
      proAccountName: pro.name,
      proAccountType: pro.type,
      proLogoUrl: pro.photo || null,
      ownerNumeroH: numeroH,
      ownerNom: `${prenom || ''} ${nomFamille || ''}`.trim(),
      montant,
      motif: motif || null,
      coordonneesPaiement: coordonneesPaiement || null,
      receiptRef
    });

    res.json({
      success: true,
      message: 'Votre demande de retrait a été envoyée. L\'administrateur la traitera dans les plus brefs délais.',
      demandeId: demande.id,
      receiptRef
    });
  } catch (err) {
    console.error('withdrawal-requests/create:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/withdrawal-requests/mes-demandes
// Le professionnel voit ses propres demandes
// ─────────────────────────────────────────────────────────
router.get('/mes-demandes', async (req, res) => {
  try {
    const { numeroH } = req.user;
    const demandes = await ProWithdrawalRequest.findAll({
      where: { ownerNumeroH: numeroH },
      order: [['created_at', 'DESC']],
      limit: 20
    });

    res.json({
      success: true,
      demandes: demandes.map(d => ({
        id:                  d.id,
        proAccountId:        d.proAccountId,
        proAccountName:      d.proAccountName,
        proAccountType:      d.proAccountType,
        proLogoUrl:          d.proLogoUrl,
        montant:             Number(d.montant),
        motif:               d.motif,
        coordonneesPaiement: d.coordonneesPaiement,
        statut:              d.statut,
        raisonRejet:         d.raisonRejet,
        receiptRef:          d.receiptRef,
        valideParNom:        d.valideParNom,
        valideAt:            d.valideAt,
        creeLe:              d.created_at
      }))
    });
  } catch (err) {
    console.error('withdrawal-requests/mes-demandes:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/withdrawal-requests/admin/toutes
// ADMIN SEULEMENT — Voir toutes les demandes en attente
// ─────────────────────────────────────────────────────────
router.get('/admin/toutes', async (req, res) => {
  try {
    const { isMasterAdmin, isAdmin, role } = req.user;
    if (!isMasterAdmin && !isAdmin && role !== 'admin' && role !== 'super-admin') {
      return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' });
    }

    const demandes = await ProWithdrawalRequest.findAll({
      order: [['created_at', 'DESC']],
      limit: 100
    });

    res.json({
      success: true,
      demandes: demandes.map(d => ({
        id:                  d.id,
        proAccountId:        d.proAccountId,
        proAccountName:      d.proAccountName,
        proAccountType:      d.proAccountType,
        proLogoUrl:          d.proLogoUrl,
        ownerNumeroH:        d.ownerNumeroH,
        ownerNom:            d.ownerNom,
        montant:             Number(d.montant),
        motif:               d.motif,
        coordonneesPaiement: d.coordonneesPaiement,
        statut:              d.statut,
        raisonRejet:         d.raisonRejet,
        receiptRef:          d.receiptRef,
        valideParNom:        d.valideParNom,
        valideAt:            d.valideAt,
        creeLe:              d.created_at
      }))
    });
  } catch (err) {
    console.error('withdrawal-requests/admin/toutes:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────────────────
// PUT /api/withdrawal-requests/admin/:id/valider
// ADMIN — Valider une demande de retrait + générer reçu
// ─────────────────────────────────────────────────────────
router.put('/admin/:id/valider', async (req, res) => {
  try {
    const { isMasterAdmin, isAdmin, role, prenom, nomFamille, numeroH } = req.user;
    if (!isMasterAdmin && !isAdmin && role !== 'admin' && role !== 'super-admin') {
      return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' });
    }

    const demande = await ProWithdrawalRequest.findByPk(req.params.id);
    if (!demande) return res.status(404).json({ success: false, message: 'Demande introuvable.' });
    if (demande.statut !== 'en_attente') {
      return res.status(400).json({ success: false, message: 'Cette demande a déjà été traitée.' });
    }

    await demande.update({
      statut: 'valide',
      validePar: numeroH,
      valideParNom: `${prenom || ''} ${nomFamille || ''}`.trim(),
      valideAt: new Date()
    });

    // Données du reçu pour le professionnel
    const reçuData = {
      id:             demande.receiptRef,
      type:           'retrait_pro',
      montant:        Number(demande.montant),
      date:           new Date().toISOString(),
      acteurNom:      demande.ownerNom,
      beneficiaireNom: demande.proAccountName,
      beneficiaireContact: demande.coordonneesPaiement,
      description:    demande.motif || 'Retrait professionnel validé',
      proNom:         demande.proAccountName,
      logoUrl:        demande.proLogoUrl,
    };

    res.json({
      success: true,
      message: `Retrait de ${Number(demande.montant).toLocaleString()} GNF validé pour ${demande.proAccountName}.`,
      reçu: reçuData
    });
  } catch (err) {
    console.error('withdrawal-requests/admin/valider:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────────────────
// PUT /api/withdrawal-requests/admin/:id/rejeter
// ADMIN — Rejeter une demande de retrait
// ─────────────────────────────────────────────────────────
router.put('/admin/:id/rejeter', async (req, res) => {
  try {
    const { isMasterAdmin, isAdmin, role, prenom, nomFamille, numeroH } = req.user;
    if (!isMasterAdmin && !isAdmin && role !== 'admin' && role !== 'super-admin') {
      return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' });
    }

    const { raisonRejet } = req.body;
    const demande = await ProWithdrawalRequest.findByPk(req.params.id);
    if (!demande) return res.status(404).json({ success: false, message: 'Demande introuvable.' });
    if (demande.statut !== 'en_attente') {
      return res.status(400).json({ success: false, message: 'Cette demande a déjà été traitée.' });
    }

    await demande.update({
      statut: 'rejete',
      validePar: numeroH,
      valideParNom: `${prenom || ''} ${nomFamille || ''}`.trim(),
      valideAt: new Date(),
      raisonRejet: raisonRejet || null
    });

    res.json({
      success: true,
      message: `Demande de retrait de ${demande.proAccountName} rejetée.`
    });
  } catch (err) {
    console.error('withdrawal-requests/admin/rejeter:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

export default router;

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import ProWithdrawalRequest from '../models/ProWithdrawalRequest.js';
import ProfessionalAccount from '../models/ProfessionalAccount.js';
import ProfessionalWallet from '../models/ProfessionalWallet.js';
import { v4 as uuidv4 } from 'uuid';

const FEDAPAY_SECRET = process.env.FEDAPAY_SECRET_KEY || '';
const FEDAPAY_API    = process.env.FEDAPAY_ENV === 'production'
  ? 'https://api.fedapay.com/v1'
  : 'https://sandbox-api.fedapay.com/v1';

async function fedapayRequest(method, endpoint, body = null) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const opts = {
      method,
      headers: { 'Authorization': `Bearer ${FEDAPAY_SECRET}`, 'Content-Type': 'application/json' },
      signal: controller.signal
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${FEDAPAY_API}${endpoint}`, opts);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

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

    if (!proAccountId || !montant || montant < 1_000_000) {
      return res.status(400).json({ success: false, message: 'Le montant minimum de retrait est de 1 000 000 GNF.' });
    }

    const pro = await ProfessionalAccount.findOne({
      where: { id: proAccountId, ownerNumeroH: numeroH, status: 'approved' }
    });
    if (!pro) {
      return res.status(403).json({ success: false, message: 'Compte professionnel introuvable ou accès refusé.' });
    }

    // ── RÈGLE 1 : Seules les cliniques peuvent faire des retraits ──────────────
    if (pro.type !== 'clinic') {
      return res.status(403).json({
        success: false,
        message: 'Les retraits sont réservés aux cliniques et hôpitaux uniquement.'
      });
    }

    // ── RÈGLE 2 : La clinique doit avoir 1 an d'ancienneté sur la plateforme ──
    const unAnAvant = new Date();
    unAnAvant.setFullYear(unAnAvant.getFullYear() - 1);
    if (new Date(pro.createdAt) > unAnAvant) {
      const dateEligible = new Date(pro.createdAt);
      dateEligible.setFullYear(dateEligible.getFullYear() + 1);
      return res.status(403).json({
        success: false,
        message: `Retrait impossible. Votre clinique doit être active depuis au moins 1 an sur la plateforme. Vous serez éligible le ${dateEligible.toLocaleDateString('fr-FR')}.`
      });
    }

    // ── RÈGLE 3 : Maximum 10 000 000 GNF par retrait ───────────────────────────
    const MAX_RETRAIT = 10_000_000;
    if (montant > MAX_RETRAIT) {
      return res.status(400).json({
        success: false,
        message: `Le montant maximum par retrait est de ${MAX_RETRAIT.toLocaleString()} GNF.`
      });
    }

    // ── RÈGLE 4 : 1 seul retrait validé par mois ──────────────────────────────
    const debutMois = new Date();
    debutMois.setDate(1);
    debutMois.setHours(0, 0, 0, 0);
    const { Op } = await import('sequelize');
    const retraitCeMois = await ProWithdrawalRequest.findOne({
      where: {
        proAccountId,
        statut: 'valide',
        valide_at: { [Op.gte]: debutMois }
      }
    });
    if (retraitCeMois) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà effectué un retrait ce mois-ci. Un seul retrait par mois est autorisé.'
      });
    }

    // ── RÈGLE 5 : Solde suffisant ──────────────────────────────────────────────
    const wallet = await ProfessionalWallet.findOne({ where: { proAccountId: pro.id } });
    if (!wallet || Number(wallet.solde) < montant) {
      return res.status(400).json({
        success: false,
        message: `Solde insuffisant. Disponible : ${Number(wallet?.solde || 0).toLocaleString()} GNF`
      });
    }

    // ── RÈGLE 6 : Pas de demande déjà en attente ──────────────────────────────
    const demandeExistante = await ProWithdrawalRequest.findOne({
      where: { proAccountId, statut: 'en_attente' }
    });
    if (demandeExistante) {
      return res.status(400).json({
        success: false,
        message: 'Une demande de retrait est déjà en attente. Attendez la décision de l\'administrateur.'
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

    const montant = Number(demande.montant);
    const commission = Math.round(montant * 0.01);
    const montantNet = montant - commission;
    const numOM = demande.coordonneesPaiement;

    // Déclencher le payout FedaPay vers Orange Money
    let payoutId = null;
    if (FEDAPAY_SECRET && numOM) {
      const payoutRes = await fedapayRequest('POST', '/payouts', {
        amount:   montantNet,
        currency: { iso: 'GNF' },
        mode:     'om',
        customer: {
          email:        `${demande.ownerNumeroH}@moftal.app`,
          phone_number: { number: numOM, country: 'GN' }
        }
      });
      payoutId = payoutRes?.v1?.payout?.id || null;
    }

    // Débiter le wallet du professionnel
    const wallet = await ProfessionalWallet.findOne({ where: { proAccountId: demande.proAccountId } });
    if (wallet) {
      await wallet.update({
        solde:       Number(wallet.solde) - montant,
        totalRetire: Number(wallet.totalRetire) + montant
      });
    }

    await demande.update({
      statut:       'valide',
      validePar:    numeroH,
      valideParNom: `${prenom || ''} ${nomFamille || ''}`.trim(),
      valideAt:     new Date()
    });

    const reçuData = {
      id:                  demande.receiptRef,
      type:                'retrait_pro',
      montant,
      montantNet,
      commission,
      date:                new Date().toISOString(),
      acteurNom:           demande.ownerNom,
      beneficiaireNom:     demande.proAccountName,
      beneficiaireContact: numOM,
      description:         demande.motif || 'Retrait professionnel validé',
      proNom:              demande.proAccountName,
      logoUrl:             demande.proLogoUrl,
      payoutId
    };

    res.json({
      success: true,
      message: `Retrait de ${montantNet.toLocaleString()} GNF envoyé vers Orange Money ${numOM} pour ${demande.proAccountName}. (Commission 1% : ${commission.toLocaleString()} GNF)`,
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

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Payment from '../models/Payment.js';
import ProfessionalAccount from '../models/ProfessionalAccount.js';
import User from '../models/User.js';
import { FamilyTree } from '../models/additional.js';
import FamilyFund from '../models/FamilyFund.js';
import FamilyFundTransaction from '../models/FamilyFundTransaction.js';
import ProfessionalWallet from '../models/ProfessionalWallet.js';
import { sequelize } from '../../config/database.js';
import { Op } from 'sequelize';
import {
  sendSubscriptionReceipt,
  sendSubscriptionRenewedEmail,
} from '../services/emailService.js';
import { getGestionInterneAccess } from '../middleware/gestionAccessGuard.js';

// ─── RÈGLE GÉNÉRALE : hors Afrique = toujours le DOUBLE du tarif Afrique ──────

// ─── Activation arbre familial ────────────────────────────────────────────────
export const PRIX_ACTIVATION_AFRIQUE      = 100000; // GNF
export const PRIX_ACTIVATION_HORS_AFRIQUE = 200000; // GNF (double)

// ─── Accès Reci (annuel) ──────────────────────────────────────────────────────
export const PRIX_RECI_AFRIQUE      = 10000;  // GNF/an
export const PRIX_RECI_HORS_AFRIQUE = 20000;  // GNF/an (double)

// ─── Pass Info Moftal — Activité ─────────────────────────────────────────────
export const PRIX_INFO_MOFTAL_AFRIQUE_MOIS      =  5000; // GNF/mois
export const PRIX_INFO_MOFTAL_AFRIQUE_AN        = 50000; // GNF/an
export const PRIX_INFO_MOFTAL_HORS_AFRIQUE_MOIS = 10000; // GNF/mois (double)
export const PRIX_INFO_MOFTAL_HORS_AFRIQUE_AN   = 100000; // GNF/an  (double)

// ─── Abonnement Professeur IA (Éducation) ────────────────────────────────────
export const PRIX_IA_AFRIQUE_MOIS      =  5000; // GNF/mois
export const PRIX_IA_AFRIQUE_AN        = 50000; // GNF/an
export const PRIX_IA_HORS_AFRIQUE_MOIS = 10000; // GNF/mois (double)
export const PRIX_IA_HORS_AFRIQUE_AN   = 100000; // GNF/an  (double)

// ─── Publication d'annonce de formation (Éducation) ──────────────────────────
// Le prof paie pour publier son appel de formation (1 semaine à 1 mois)
// Les apprenants contactent le prof directement — aucun paiement sur la plateforme
export const PRIX_PUBLICATION_FORMATION_AFRIQUE      = 10000; // GNF
export const PRIX_PUBLICATION_FORMATION_HORS_AFRIQUE = 20000; // GNF (double)

// ─── Pass Galerie Familiale ───────────────────────────────────────────────────
export const PRIX_GALERIE_AFRIQUE_MOIS      =  5000; // GNF/mois
export const PRIX_GALERIE_AFRIQUE_AN        = 50000; // GNF/an
export const PRIX_GALERIE_HORS_AFRIQUE_MOIS = 10000; // GNF/mois (double)
export const PRIX_GALERIE_HORS_AFRIQUE_AN   = 100000; // GNF/an  (double)

// Anciens alias (compatibilité)
export const PRIX_OUTILS_AFRIQUE      = PRIX_INFO_MOFTAL_AFRIQUE_AN;
export const PRIX_OUTILS_HORS_AFRIQUE = PRIX_INFO_MOFTAL_HORS_AFRIQUE_AN;

// ─── Types du GRAND secteur (prix plus élevés) ───────────────────────────────
export const GRAND_SECTEUR = ['clinic', 'school', 'supplier', 'enterprise'];
// Tout ce qui n'est pas dans GRAND_SECTEUR = PETIT SECTEUR

// ─── ONG — tarif humanitaire spécial (10 000 GNF/an) ─────────────────────────
export const PRIX_NGO = { mois: 1000, an: 10000, cinqAns: 40000 };

// ─── Visibilité seulement (profil public sur la plateforme) ──────────────────
//                          Petit       Grand
export const PRIX_VISIBILITE = {
  petit: { mois:   15000, an:  240000, cinqAns:  990000 },
  grand: { mois:   40000, an:  490000, cinqAns: 1990000 },
};

// ─── Gestion Interne (inclut visibilité automatiquement) ─────────────────────
//                          Petit       Grand
export const PRIX_GESTION_INTERNE = {
  petit: { mois:   40000, an:  490000, cinqAns: 1990000 },
  grand: { mois:   70000, an:  740000, cinqAns: 2990000 },
};

// ─── Abonnement Bibliothèque (lire les livres publiés sur Inspir) ─────────────
export const PRIX_LIVRES_AFRIQUE_AN      = 5000;  // GNF/an
export const PRIX_LIVRES_HORS_AFRIQUE_AN = 10000; // GNF/an (double)

// Anciens prix abonnement (compatibilité — remplacés par le nouveau système)
export const PRIX_ABONNEMENT_PRO_AFRIQUE      = 50000;
export const PRIX_ABONNEMENT_PRO_HORS_AFRIQUE = 100000;

// ─── Packs de points Galerie Familiale ───────────────────────────────────────
// Clé = nombre de points. Prix Afrique / prix hors Afrique (double).
// Les points sont valables 1 MOIS à partir de l'achat.
export const PACKS_POINTS_GALERIE = {
  10:  { points: 10,  afrique: 5000,   horsAfrique: 10000  },
  20:  { points: 20,  afrique: 10000,  horsAfrique: 20000  },
  100: { points: 100, afrique: 50000,  horsAfrique: 100000 },
  210: { points: 210, afrique: 100000, horsAfrique: 200000 },
};

function getPrixReci(pays) {
  return estAfricain(pays) ? PRIX_RECI_AFRIQUE : PRIX_RECI_HORS_AFRIQUE;
}

function getPrixInfoMoftal(pays, periode) {
  // periode = 'mois' ou 'an'
  if (periode === 'mois') {
    return estAfricain(pays) ? PRIX_INFO_MOFTAL_AFRIQUE_MOIS : PRIX_INFO_MOFTAL_HORS_AFRIQUE_MOIS;
  }
  return estAfricain(pays) ? PRIX_INFO_MOFTAL_AFRIQUE_AN : PRIX_INFO_MOFTAL_HORS_AFRIQUE_AN;
}

function getPrixGalerie(pays, periode) {
  if (periode === 'mois') {
    return estAfricain(pays) ? PRIX_GALERIE_AFRIQUE_MOIS : PRIX_GALERIE_HORS_AFRIQUE_MOIS;
  }
  return estAfricain(pays) ? PRIX_GALERIE_AFRIQUE_AN : PRIX_GALERIE_HORS_AFRIQUE_AN;
}

function getPrixOutils(pays) {
  return getPrixInfoMoftal(pays, 'an');
}

function getPrixIA(pays, periode) {
  if (periode === 'mois') {
    return estAfricain(pays) ? PRIX_IA_AFRIQUE_MOIS : PRIX_IA_HORS_AFRIQUE_MOIS;
  }
  return estAfricain(pays) ? PRIX_IA_AFRIQUE_AN : PRIX_IA_HORS_AFRIQUE_AN;
}

function getPrixAbonnementPro(pays) {
  return estAfricain(pays) ? PRIX_ABONNEMENT_PRO_AFRIQUE : PRIX_ABONNEMENT_PRO_HORS_AFRIQUE;
}

function getSecteur(type) {
  return GRAND_SECTEUR.includes(type) ? 'grand' : 'petit';
}

function getPrixVisibilite(type, periode, pays) {
  // Tarif humanitaire spécial pour les ONG
  if (type === 'ngo') {
    const base = PRIX_NGO[periode] || PRIX_NGO.an;
    return estAfricain(pays) ? base : base * 2;
  }
  const secteur = getSecteur(type);
  const base = PRIX_VISIBILITE[secteur][periode]; // mois | an | cinqAns
  return estAfricain(pays) ? base : base * 2;
}

function getPrixGestionInterne(type, periode, pays) {
  // Tarif humanitaire spécial pour les ONG
  if (type === 'ngo') {
    const base = PRIX_NGO[periode] || PRIX_NGO.an;
    return estAfricain(pays) ? base : base * 2;
  }
  const secteur = getSecteur(type);
  const base = PRIX_GESTION_INTERNE[secteur][periode];
  return estAfricain(pays) ? base : base * 2;
}

function getPrixLivres(pays) {
  return estAfricain(pays) ? PRIX_LIVRES_AFRIQUE_AN : PRIX_LIVRES_HORS_AFRIQUE_AN;
}

// Calcule la date d'expiration selon la période payée
function calculerExpiration(periode) {
  const d = new Date();
  if (periode === 'mois')    { d.setMonth(d.getMonth() + 1); }
  if (periode === 'an')      { d.setFullYear(d.getFullYear() + 1); }
  if (periode === 'cinqAns') { d.setFullYear(d.getFullYear() + 5); }
  return d;
}

// Tous les pays africains (nom complet et codes ISO courants)
const PAYS_AFRICAINS = new Set([
  // Afrique de l'Ouest
  'guinée','guinea','guinee','GN','SN','sénégal','senegal','mali','ML','burkina faso','BF',
  'côte d\'ivoire','cote d\'ivoire','ivory coast','CI','ghana','GH','nigeria','NG',
  'niger','NE','togo','TG','bénin','benin','BJ','liberia','LR','sierra leone','SL',
  'gambie','gambia','GM','guinée-bissau','guinea-bissau','GW','cap-vert','cape verde','CV',
  'mauritanie','mauritania','MR',
  // Afrique Centrale
  'cameroun','cameroon','CM','congo','CG','rdc','rd congo','congo-kinshasa',
  'république démocratique du congo','democratic republic of the congo','CD',
  'gabon','GA','guinée équatoriale','equatorial guinea','GQ','centrafrique',
  'central african republic','CF','tchad','chad','TD','sao tome','ST',
  // Afrique de l'Est
  'éthiopie','ethiopia','ET','kenya','KE','tanzanie','tanzania','TZ',
  'ouganda','uganda','UG','rwanda','RW','burundi','BI','somalie','somalia','SO',
  'djibouti','DJ','érythrée','eritrea','ER','soudan','sudan','SD','soudan du sud',
  'south sudan','SS','madagascar','MG','comores','comoros','KM',
  'seychelles','SC','maurice','mauritius','MU','mozambique','MZ','malawi','MW',
  'zambie','zambia','ZM','zimbabwe','ZW',
  // Afrique du Nord
  'algérie','algeria','DZ','maroc','morocco','MA','tunisie','tunisia','TN',
  'libye','libya','LY','égypte','egypt','EG','soudan','sudan',
  // Afrique Australe
  'afrique du sud','south africa','ZA','namibie','namibia','NA','botswana','BW',
  'lesotho','LS','eswatini','swaziland','SZ','angola','AO',
]);

function estAfricain(pays) {
  if (!pays) return true; // si pas de pays renseigné → prix africain par défaut
  const p = pays.toLowerCase().trim();
  // Vérifie si le pays ou un sous-string correspond
  for (const a of PAYS_AFRICAINS) {
    if (p === a.toLowerCase() || p.includes(a.toLowerCase()) || a.toLowerCase().includes(p)) {
      return true;
    }
  }
  return false;
}

function getPrixActivation(pays) {
  return estAfricain(pays) ? PRIX_ACTIVATION_AFRIQUE : PRIX_ACTIVATION_HORS_AFRIQUE;
}

const router = express.Router();

/**
 * GET /api/payment/acces-outils
 * Vérifie si l'utilisateur a un pass Info Moftal actif (mensuel ou annuel)
 */
router.get('/acces-outils', authenticate, async (req, res) => {
  try {
    const maintenant = new Date();
    const unMoisAvant = new Date(maintenant); unMoisAvant.setMonth(unMoisAvant.getMonth() - 1);
    const unAnAvant   = new Date(maintenant); unAnAvant.setFullYear(unAnAvant.getFullYear() - 1);

    // Vérifier pass mensuel
    const passMois = await Payment.findOne({
      where: { payerNumeroH: req.user.numeroH, purpose: 'publication_outil_mois', status: 'completed', createdAt: { [Op.gte]: unMoisAvant } },
      order: [['createdAt', 'DESC']]
    });
    // Vérifier pass annuel (nouveau nom + ancien nom pour compatibilité)
    const passAn = await Payment.findOne({
      where: { payerNumeroH: req.user.numeroH, purpose: { [Op.in]: ['publication_outil_an', 'publication_outil_pass'] }, status: 'completed', createdAt: { [Op.gte]: unAnAvant } },
      order: [['createdAt', 'DESC']]
    });

    const paiement = passMois || passAn;
    let expireAt = null;
    if (passMois) {
      expireAt = new Date(new Date(passMois.createdAt).setMonth(new Date(passMois.createdAt).getMonth() + 1));
    } else if (passAn) {
      expireAt = new Date(new Date(passAn.createdAt).setFullYear(new Date(passAn.createdAt).getFullYear() + 1));
    }

    res.json({ success: true, aAcces: !!paiement, expireAt, type: passMois ? 'mensuel' : passAn ? 'annuel' : null });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/**
 * GET /api/payment/prix-compte-pro?proId=...
 * Retourne tous les prix (visibilité + gestion interne) pour un compte pro donné
 */
router.get('/prix-compte-pro', authenticate, async (req, res) => {
  try {
    const { proId } = req.query;
    if (!proId) return res.status(400).json({ success: false, message: 'proId requis.' });

    const proAcc = await ProfessionalAccount.findByPk(proId);
    if (!proAcc) return res.status(404).json({ success: false, message: 'Compte introuvable.' });

    const pays = req.user?.pays || '';
    const secteur = getSecteur(proAcc.type);
    const afrique = estAfricain(pays);
    const multiply = afrique ? 1 : 2;
    const isNgo = proAcc.type === 'ngo';

    res.json({
      success: true,
      secteur: isNgo ? 'humanitaire' : secteur,
      zone: afrique ? 'afrique' : 'hors_afrique',
      type: proAcc.type,
      tarif_humanitaire: isNgo,
      visibilite: {
        mois:    getPrixVisibilite(proAcc.type, 'mois', pays),
        an:      getPrixVisibilite(proAcc.type, 'an', pays),
        cinqAns: getPrixVisibilite(proAcc.type, 'cinqAns', pays),
      },
      gestionInterne: {
        mois:    getPrixGestionInterne(proAcc.type, 'mois', pays),
        an:      getPrixGestionInterne(proAcc.type, 'an', pays),
        cinqAns: getPrixGestionInterne(proAcc.type, 'cinqAns', pays),
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /api/payment/acces-gestion-interne
 * Vérifie si l'utilisateur a accès à la Gestion Interne :
 * - soit dans la période d'essai gratuite (1 mois après approbation du compte)
 * - soit a payé à vie (gestion_interne_vie)
 */
router.get('/acces-gestion-interne', authenticate, async (req, res) => {
  try {
    const access = await getGestionInterneAccess(req.user.numeroH);
    const proAccount = access.proAccount;

    if (!proAccount) {
      return res.json({ success: true, aAcces: false, mode: 'aucun_compte', message: 'Aucun compte professionnel approuvé.' });
    }

    const maintenant = new Date();
    const joursRestants = access.aAcces && access.validUntil
      ? Math.max(0, Math.ceil((access.validUntil.getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24)))
      : access.aAcces && access.giValidUntil
      ? Math.max(0, Math.ceil((access.giValidUntil.getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const secteur = getSecteur(proAccount.type);
    const prixGI = PRIX_GESTION_INTERNE[secteur];

    res.json({
      success: true,
      aAcces: access.aAcces,
      mode: access.mode,
      joursRestants,
      finEssai: proAccount.isTrial ? access.validUntil : null,
      finGestionInterne: access.giValidUntil,
      prixVie: 3000000,
      prixMois: prixGI.mois,
      prixAn: prixGI.an,
      prixCinqAns: prixGI.cinqAns,
      proId: proAccount.id,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /api/payment/acces-galerie
 * Vérifie si l'utilisateur a un pass Galerie Familiale actif (mensuel ou annuel)
 */
router.get('/acces-galerie', authenticate, async (req, res) => {
  try {
    const maintenant = new Date();
    const unMoisAvant = new Date(maintenant); unMoisAvant.setMonth(unMoisAvant.getMonth() - 1);
    const unAnAvant   = new Date(maintenant); unAnAvant.setFullYear(unAnAvant.getFullYear() - 1);

    const passMois = await Payment.findOne({
      where: { payerNumeroH: req.user.numeroH, purpose: 'galerie_pass_mois', status: 'completed', createdAt: { [Op.gte]: unMoisAvant } },
      order: [['createdAt', 'DESC']]
    });
    const passAn = await Payment.findOne({
      where: { payerNumeroH: req.user.numeroH, purpose: 'galerie_pass_an', status: 'completed', createdAt: { [Op.gte]: unAnAvant } },
      order: [['createdAt', 'DESC']]
    });

    const paiement = passMois || passAn;
    let expireAt = null;
    if (passMois) {
      expireAt = new Date(new Date(passMois.createdAt).setMonth(new Date(passMois.createdAt).getMonth() + 1));
    } else if (passAn) {
      expireAt = new Date(new Date(passAn.createdAt).setFullYear(new Date(passAn.createdAt).getFullYear() + 1));
    }

    res.json({ success: true, aAcces: !!paiement, expireAt, type: passMois ? 'mensuel' : passAn ? 'annuel' : null });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/**
 * GET /api/payment/prix-reci
 * Retourne le prix d'accès annuel à Reci selon le pays de l'utilisateur
 */
router.get('/prix-reci', authenticate, (req, res) => {
  const pays = req.user?.pays || '';
  const prix = getPrixReci(pays);
  const estAf = estAfricain(pays);
  res.json({
    success: true,
    prix,
    zone: estAf ? 'afrique' : 'hors_afrique',
    label: estAf ? 'Tarif Afrique' : 'Tarif international',
  });
});

/**
 * GET /api/payment/acces-reci
 * Vérifie si l'utilisateur a un accès Reci actif (paiement < 1 an)
 */
router.get('/acces-reci', authenticate, async (req, res) => {
  try {
    const unAnAvant = new Date();
    unAnAvant.setFullYear(unAnAvant.getFullYear() - 1);

    const paiement = await Payment.findOne({
      where: {
        payerNumeroH: req.user.numeroH,
        purpose: 'acces_reci',
        status: 'completed',
        createdAt: { [Op.gte]: unAnAvant }
      },
      order: [['createdAt', 'DESC']]
    });

    const aAcces = !!paiement;
    const expireAt = paiement
      ? new Date(new Date(paiement.createdAt).setFullYear(new Date(paiement.createdAt).getFullYear() + 1))
      : null;

    res.json({ success: true, aAcces, expireAt });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /api/payment/prix-abonnement
 * Retourne le prix mensuel d'abonnement pro selon le pays de l'utilisateur
 */
router.get('/prix-abonnement', authenticate, (req, res) => {
  const pays = req.user?.pays || '';
  const prix = getPrixAbonnementPro(pays);
  const estAf = estAfricain(pays);
  res.json({
    success: true,
    prix,
    zone: estAf ? 'afrique' : 'hors_afrique',
    label: estAf ? 'Tarif Afrique' : 'Tarif international',
  });
});

/**
 * GET /api/payment/prix-outils
 * Retourne les prix du pass Info Moftal (mensuel + annuel) selon le pays
 */
router.get('/prix-outils', authenticate, (req, res) => {
  const pays = req.user?.pays || '';
  const estAf = estAfricain(pays);
  res.json({
    success: true,
    mois: getPrixInfoMoftal(pays, 'mois'),
    an:   getPrixInfoMoftal(pays, 'an'),
    zone:  estAf ? 'afrique' : 'hors_afrique',
    label: estAf ? 'Tarif Afrique' : 'Tarif international',
  });
});

/**
 * GET /api/payment/acces-ia
 * Vérifie si l'utilisateur a un abonnement Professeur IA actif
 */
router.get('/acces-ia', authenticate, async (req, res) => {
  try {
    const maintenant = new Date();
    const unMoisAvant = new Date(maintenant); unMoisAvant.setMonth(unMoisAvant.getMonth() - 1);
    const unAnAvant   = new Date(maintenant); unAnAvant.setFullYear(unAnAvant.getFullYear() - 1);

    const passMois = await Payment.findOne({
      where: { payerNumeroH: req.user.numeroH, purpose: 'subscription_ia_mois', status: 'completed', createdAt: { [Op.gte]: unMoisAvant } },
      order: [['createdAt', 'DESC']]
    });
    const passAn = await Payment.findOne({
      where: { payerNumeroH: req.user.numeroH, purpose: 'subscription_ia_an', status: 'completed', createdAt: { [Op.gte]: unAnAvant } },
      order: [['createdAt', 'DESC']]
    });

    const paiement = passMois || passAn;
    let expireAt = null;
    if (passMois) {
      expireAt = new Date(passMois.createdAt); expireAt.setMonth(expireAt.getMonth() + 1);
    } else if (passAn) {
      expireAt = new Date(passAn.createdAt); expireAt.setFullYear(expireAt.getFullYear() + 1);
    }

    res.json({ success: true, aAcces: !!paiement, expireAt, type: passMois ? 'mensuel' : passAn ? 'annuel' : null });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

/**
 * GET /api/payment/prix-ia
 * Retourne les prix de l'abonnement Professeur IA selon le pays
 */
router.get('/prix-ia', authenticate, (req, res) => {
  const pays = req.user?.pays || '';
  const estAf = estAfricain(pays);
  res.json({
    success: true,
    mois: getPrixIA(pays, 'mois'),
    an:   getPrixIA(pays, 'an'),
    zone:  estAf ? 'afrique' : 'hors_afrique',
    label: estAf ? 'Tarif Afrique' : 'Tarif international',
  });
});

/**
 * GET /api/payment/prix-galerie-points
 * Retourne tous les packs de points galerie avec le prix selon le pays
 */
router.get('/prix-galerie-points', authenticate, (req, res) => {
  const pays = req.user?.pays || '';
  const estAf = estAfricain(pays);
  const packs = Object.values(PACKS_POINTS_GALERIE).map(p => ({
    points: p.points,
    prix:   estAf ? p.afrique : p.horsAfrique,
  }));
  res.json({
    success: true,
    packs,
    zone:  estAf ? 'afrique' : 'hors_afrique',
    label: estAf ? 'Tarif Afrique' : 'Tarif international',
    duree: '1 mois à partir de l\'achat',
  });
});

/**
 * GET /api/payment/prix-activation
 * Retourne le prix d'activation de l'arbre selon le pays de l'utilisateur
 */
router.get('/prix-activation', authenticate, (req, res) => {
  const pays = req.user?.pays || '';
  const prix = getPrixActivation(pays);
  const estAf = estAfricain(pays);
  res.json({
    success: true,
    prix,
    zone: estAf ? 'afrique' : 'hors_afrique',
    label: estAf ? 'Tarif Afrique' : 'Tarif international',
  });
});

/**
 * Calcule le montant réel côté serveur pour un objet de paiement donné —
 * ne JAMAIS faire confiance au montant envoyé par le frontend.
 * Retourne { amount } ou { error: message }.
 */
export async function computeAmountForPurpose(purpose, relatedId, user) {
  const pays = user?.pays || '';
  let amount = null;

  if (purpose === 'activation_famille') amount = getPrixActivation(pays);
  if (purpose === 'acces_reci') amount = getPrixReci(pays);
  // Pass Info Moftal mensuel ou annuel
  if (purpose === 'publication_outil_mois') amount = getPrixInfoMoftal(pays, 'mois');
  if (purpose === 'publication_outil_an' || purpose === 'publication_outil_pass') amount = getPrixInfoMoftal(pays, 'an');
  if (purpose === 'subscription_ia_mois') amount = getPrixIA(pays, 'mois');
  if (purpose === 'subscription_ia_an') amount = getPrixIA(pays, 'an');
  // Abonnement Bibliothèque Inspir (lire les livres)
  if (purpose === 'subscription_livres_an') amount = getPrixLivres(pays);
  // Achat de points Galerie Familiale (relatedId = nombre de points ex: '10', '20', '100', '210')
  if (purpose === 'galerie_points') {
    const nbPoints = parseInt(relatedId);
    const pack = PACKS_POINTS_GALERIE[nbPoints];
    if (!pack) return { error: 'Pack de points invalide. Choisir : 10, 20, 100 ou 210 points.' };
    amount = estAfricain(pays) ? pack.afrique : pack.horsAfrique;
  }
  // Ancien abonnement mensuel simple (compatibilité)
  if (purpose === 'subscription_pro') amount = getPrixAbonnementPro(pays);

  // ── Visibilité seulement (profil public) — relatedId = ID du compte pro ──
  if (['visibilite_mois', 'visibilite_an', 'visibilite_5ans'].includes(purpose)) {
    const proAcc = relatedId ? await ProfessionalAccount.findByPk(relatedId) : null;
    if (!proAcc) return { error: 'Compte professionnel requis.' };
    const periode = purpose === 'visibilite_mois' ? 'mois' : purpose === 'visibilite_an' ? 'an' : 'cinqAns';
    amount = getPrixVisibilite(proAcc.type, periode, pays);
  }

  // ── Gestion Interne (inclut visibilité) ───────────────────────────────────
  if (['gestion_mois', 'gestion_an', 'gestion_5ans'].includes(purpose)) {
    const proAcc = relatedId ? await ProfessionalAccount.findByPk(relatedId) : null;
    if (!proAcc) return { error: 'Compte professionnel requis.' };
    const periode = purpose === 'gestion_mois' ? 'mois' : purpose === 'gestion_an' ? 'an' : 'cinqAns';
    amount = getPrixGestionInterne(proAcc.type, periode, pays);
  }

  // Gestion Interne à vie (ancienne formule — compatibilité)
  if (purpose === 'gestion_interne_vie') amount = 3000000;

  // Publication d'annonce de formation — relatedId = durée choisie en jours
  if (purpose === 'publication_formation') {
    amount = estAfricain(pays) ? PRIX_PUBLICATION_FORMATION_AFRIQUE : PRIX_PUBLICATION_FORMATION_HORS_AFRIQUE;
  }

  // Dépôt Moftal Pay (compte famille ou wallet pro) — montant choisi par l'utilisateur
  // lui-même pour recharger son propre compte. relatedId = montant demandé (en GNF).
  if (purpose === 'wallet_depot_famille' || purpose === 'wallet_depot_pro') {
    const montantDepot = parseInt(relatedId, 10);
    if (!montantDepot || montantDepot < 1000) {
      return { error: 'Montant minimum de dépôt : 1 000 GNF.' };
    }
    amount = montantDepot;
  }

  if (!amount || !purpose) return { error: 'Montant et objet requis' };
  return { amount };
}

/**
 * GET /api/payment/verify/:txRef
 * Vérifie le statut d'un paiement
 */
router.get('/verify/:txRef', authenticate, async (req, res) => {
  try {
    const payment = await Payment.findOne({
      where: { txRef: req.params.txRef, payerNumeroH: req.user.numeroH },
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Transaction introuvable' });
    }

    return res.json({ success: true, payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * GET /api/payment/history
 * Historique des paiements de l'utilisateur connecté
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { payerNumeroH: req.user.numeroH },
      order: [['createdAt', 'DESC']],
      limit: 20,
    });
    return res.json({ success: true, payments });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Actions déclenchées automatiquement après un paiement réussi
 */
const TENANT_PREFIX = {
  clinic: 'CLIN', school: 'ECO', enterprise: 'ENT', mosque: 'MSQ',
  madrasa: 'MDS', commerce: 'COM', ngo: 'NGO', journalist: 'JOUR',
  scientist: 'SCIEN', supplier: 'FOUR', security_agency: 'SECU',
  vendor: 'VENT', producer: 'PROD', broker: 'BROK',
  restaurant: 'REST', transport: 'TRANS', beauty: 'BEAU',
  artisan: 'ARTI', mairie: 'MAIR',
};

// Commission plateforme (1%) prélevée sur chaque dépôt externe Moftal Pay
const TAUX_COMMISSION_PLATEFORME = 0.01;

function calculerCommissionPlateforme(montantBrut) {
  const commission = Math.round(montantBrut * TAUX_COMMISSION_PLATEFORME);
  return { commission, montantNet: montantBrut - commission };
}

async function enregistrerCommissionPlateforme(sourceType, sourceRef, montantBrut, commission, payeurNumeroH) {
  await sequelize.query(
    `INSERT INTO platform_commissions (source_type, source_ref, montant_brut, taux, commission, payeur_numero_h)
     VALUES (:sourceType, :sourceRef, :brut, :taux, :commission, :payeur)`,
    { replacements: { sourceType, sourceRef, brut: montantBrut, taux: TAUX_COMMISSION_PLATEFORME * 100, commission, payeur: payeurNumeroH } }
  ).catch(e => console.warn('Commission log:', e.message));
}

export async function handlePostPayment(payment) {
  try {
    if (payment.purpose === 'subscription_pro' && payment.relatedId) {
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const proAccount = await ProfessionalAccount.findByPk(payment.relatedId);
      if (!proAccount) return;
      const wasAlreadyActive = proAccount.subscriptionStatus === 'active';

      // Générer tenant_code s'il manque
      let tenantCode = proAccount.tenant_code;
      if (!tenantCode) {
        const prefix = TENANT_PREFIX[proAccount.type] || 'PRO';
        tenantCode = `${prefix}-GN-${String(proAccount.id).padStart(5, '0')}`;
        // Créer l'entrée dans management_tenants
        await sequelize.query(
          `INSERT INTO management_tenants (tenant_code, type, name, owner_numero_h)
           VALUES (:code, :type, :name, :owner)
           ON CONFLICT (tenant_code) DO NOTHING`,
          { replacements: { code: tenantCode, type: proAccount.type, name: proAccount.name, owner: proAccount.ownerNumeroH } }
        ).catch(e => console.warn('management_tenants insert:', e.message));
      }

      await ProfessionalAccount.update(
        {
          subscriptionStatus: 'active',
          subscriptionValidUntil: expiresAt,
          status: 'approved',
          tenant_code: tenantCode,
        },
        { where: { id: payment.relatedId } }
      );
      console.log(`✅ Abonnement pro activé — ${proAccount.name} | tenant: ${tenantCode}`);

      let proEmail = proAccount?.email || '';
      let proName  = proAccount?.name  || '';

      if (!proEmail && proAccount?.ownerNumeroH) {
        const owner = await User.findOne({ where: { numeroH: proAccount.ownerNumeroH } });
        proEmail = owner?.email || '';
        if (!proName) proName = `${owner?.prenom || ''} ${owner?.nomFamille || ''}`.trim();
      }

      if (proEmail) {
        if (wasAlreadyActive) {
          sendSubscriptionRenewedEmail({
            proEmail,
            proName,
            expiresAt,
            txRef: payment.txRef,
          }).catch(err => console.error('sendSubscriptionRenewedEmail:', err.message));
        } else {
          sendSubscriptionReceipt({
            proEmail,
            proName,
            amount:    payment.amount,
            currency:  payment.currency || 'GNF',
            txRef:     payment.txRef,
            expiresAt,
          }).catch(err => console.error('sendSubscriptionReceipt:', err.message));
        }
      }
    }
    // ── Visibilité seulement ──────────────────────────────────────────
    if (['visibilite_mois','visibilite_an','visibilite_5ans'].includes(payment.purpose) && payment.relatedId) {
      const periode = payment.purpose === 'visibilite_mois' ? 'mois' : payment.purpose === 'visibilite_an' ? 'an' : 'cinqAns';
      const expiration = calculerExpiration(periode);
      await ProfessionalAccount.update(
        { subscriptionStatus: 'active', subscriptionValidUntil: expiration },
        { where: { id: payment.relatedId } }
      );
      console.log(`✅ Visibilité activée (${periode}) — compte ${payment.relatedId} | expire: ${expiration.toLocaleDateString()}`);
    }

    // ── Gestion Interne (inclut visibilité) ──────────────────────────
    if (['gestion_mois','gestion_an','gestion_5ans'].includes(payment.purpose) && payment.relatedId) {
      const periode = payment.purpose === 'gestion_mois' ? 'mois' : payment.purpose === 'gestion_an' ? 'an' : 'cinqAns';
      const expiration = calculerExpiration(periode);
      // Active le compte pro ET la Gestion Interne jusqu'à la même date
      await ProfessionalAccount.update(
        {
          subscriptionStatus: 'active',
          subscriptionValidUntil: expiration,
          gestionInterneValidUntil: expiration,
        },
        { where: { id: payment.relatedId } }
      );
      console.log(`✅ Gestion Interne activée (${periode}) — compte ${payment.relatedId} | expire: ${expiration.toLocaleDateString()}`);
    }

    // ── Publication formation — activer l'annonce après paiement ─────
    if (payment.purpose === 'publication_formation' && payment.relatedId) {
      // relatedId = id de la formation_annonce (créée en statut 'en_attente')
      await sequelize.query(
        `UPDATE formation_annonces SET is_active = true, fedapay_ref = :ref WHERE id = :id`,
        { replacements: { ref: payment.txRef, id: payment.relatedId } }
      ).catch(() => {});
      console.log(`✅ Annonce formation activée — id: ${payment.relatedId} | txRef: ${payment.txRef}`);
    }

    // ── Pass Info Moftal (mensuel ou annuel) ─────────────────────────
    if (['publication_outil_pass','publication_outil_mois','publication_outil_an'].includes(payment.purpose)) {
      const periode = payment.purpose === 'publication_outil_mois' ? 'mensuel' : 'annuel';
      console.log(`✅ Pass Info Moftal ${periode} activé — ${payment.payerNumeroH} | txRef: ${payment.txRef}`);
    }

    // ── Abonnement Professeur IA ──────────────────────────────────────
    if (['subscription_ia_mois', 'subscription_ia_an'].includes(payment.purpose)) {
      const periode = payment.purpose === 'subscription_ia_mois' ? 'mensuel' : 'annuel';
      console.log(`✅ Abonnement Professeur IA ${periode} activé — ${payment.payerNumeroH} | txRef: ${payment.txRef}`);
    }

    // ── Abonnement Bibliothèque Inspir (livres) ───────────────────────
    if (payment.purpose === 'subscription_livres_an') {
      console.log(`✅ Abonnement Bibliothèque Inspir (1 an) activé — ${payment.payerNumeroH} | txRef: ${payment.txRef}`);
    }

    // ── Gestion Interne à vie ────────────────────────────────────────
    if (payment.purpose === 'gestion_interne_vie') {
      console.log(`✅ Gestion Interne à vie activée — ${payment.payerNumeroH} | txRef: ${payment.txRef} | 3 000 000 GNF payés une seule fois`);
    }

    // ── Achat de points Galerie Familiale ────────────────────────────
    if (payment.purpose === 'galerie_points') {
      const nbPoints = parseInt(payment.relatedId);
      if (nbPoints > 0) {
        // UPSERT : ajouter les points avec expiration 1 mois
        await sequelize.query(`
          INSERT INTO gallery_points (id, numero_h, points_disponibles, total_achete, expires_at, created_at, updated_at)
          VALUES (gen_random_uuid(), :numeroH, :pts, :pts, NOW() + INTERVAL '1 month', NOW(), NOW())
          ON CONFLICT (numero_h) DO UPDATE
            SET points_disponibles =
                  CASE
                    WHEN gallery_points.expires_at IS NOT NULL AND gallery_points.expires_at < NOW()
                    THEN :pts
                    ELSE gallery_points.points_disponibles + :pts
                  END,
                total_achete = gallery_points.total_achete + :pts,
                expires_at   = NOW() + INTERVAL '1 month',
                updated_at   = NOW()
        `, { replacements: { numeroH: payment.payerNumeroH, pts: nbPoints } });
        console.log(`✅ ${nbPoints} points galerie achetés — ${payment.payerNumeroH} | expire dans 1 mois | txRef: ${payment.txRef}`);
      }
    }

    // ── Accès Reci ────────────────────────────────────────────────────
    if (payment.purpose === 'acces_reci') {
      console.log(`✅ Accès Reci activé — ${payment.payerNumeroH} | txRef: ${payment.txRef}`);
    }

    // ── Activation arbre familial ──────────────────────────────────────
    if (payment.purpose === 'activation_famille' && payment.relatedId) {
      const tree = await FamilyTree.findByPk(payment.relatedId);
      if (tree && !tree.arbreActive) {
        await tree.update({
          arbreActive: true,
          activationPaiementRef: payment.txRef,
        });
        console.log(`✅ Arbre familial activé — famille "${tree.familyName}" | txRef: ${payment.txRef}`);
      }
    }

    // ── Dépôt Moftal Pay — compte famille (commission plateforme 1%) ────
    if (payment.purpose === 'wallet_depot_famille') {
      const { commission, montantNet } = calculerCommissionPlateforme(payment.amount);
      const user = await User.findOne({ where: { numeroH: payment.payerNumeroH } });
      const fund = user?.nomFamille
        ? await FamilyFund.findOne({ where: { nomFamille: { [Op.iLike]: user.nomFamille.trim() }, isActive: true } })
        : null;
      if (fund) {
        const repartition = FamilyFund.repartir(montantNet);
        await fund.update({
          solde_reserve:    Number(fund.solde_reserve)    + repartition.reserve,
          solde_sante:      Number(fund.solde_sante)      + repartition.sante,
          solde_nourriture: Number(fund.solde_nourriture) + repartition.nourriture,
          solde_urgence:    Number(fund.solde_urgence)    + repartition.urgence,
          solde_projet:     Number(fund.solde_projet)     + repartition.projet,
          total_depose:     Number(fund.total_depose)     + montantNet,
        });
        await FamilyFundTransaction.create({
          fundId: fund.id, acteurNumeroH: payment.payerNumeroH,
          acteurNom: `${user?.prenom || ''} ${user?.nomFamille || ''}`.trim(),
          type: 'depot', montant: montantNet, repartition, fedapayRef: payment.txRef, statut: 'confirme',
          description: `Dépôt Moftal Pay — ${montantNet.toLocaleString()} GNF (${Number(payment.amount).toLocaleString()} - commission 1% : ${commission.toLocaleString()} GNF) — réf: ${payment.txRef}`
        });
        await enregistrerCommissionPlateforme('depot_famille', payment.txRef, payment.amount, commission, payment.payerNumeroH);
        console.log(`✅ Dépôt compte famille — ${montantNet.toLocaleString()} GNF crédités | ${payment.payerNumeroH} | txRef: ${payment.txRef}`);
      } else {
        console.warn(`⚠️ Dépôt wallet_depot_famille sans compte famille trouvé pour ${payment.payerNumeroH}`);
      }
    }

    // ── Dépôt Moftal Pay — wallet professionnel (commission plateforme 1%) ──
    if (payment.purpose === 'wallet_depot_pro') {
      const { commission, montantNet } = calculerCommissionPlateforme(payment.amount);
      const proAccount = await ProfessionalAccount.findOne({ where: { ownerNumeroH: payment.payerNumeroH, status: 'approved' } });
      if (proAccount) {
        let wallet = await ProfessionalWallet.findOne({ where: { proAccountId: proAccount.id } });
        if (!wallet) {
          wallet = await ProfessionalWallet.create({
            proAccountId: proAccount.id, ownerNumeroH: payment.payerNumeroH,
            nomPro: proAccount.name, typePro: proAccount.type,
          });
        }
        await wallet.update({
          solde:     Number(wallet.solde)     + montantNet,
          totalRecu: Number(wallet.totalRecu) + montantNet,
        });
        await enregistrerCommissionPlateforme('depot_pro', payment.txRef, payment.amount, commission, payment.payerNumeroH);
        console.log(`✅ Dépôt wallet pro — ${montantNet.toLocaleString()} GNF crédités | ${payment.payerNumeroH} | txRef: ${payment.txRef}`);
      } else {
        console.warn(`⚠️ Dépôt wallet_depot_pro sans compte professionnel approuvé pour ${payment.payerNumeroH}`);
      }
    }
  } catch (err) {
    console.error('Erreur handlePostPayment:', err);
  }
}

/**
 * GET /api/payment/acces-livres
 * Vérifie si l'utilisateur a un abonnement Bibliothèque Inspir actif (annuel)
 */
router.get('/acces-livres', authenticate, async (req, res) => {
  try {
    const maintenant = new Date();
    const unAnAvant = new Date(maintenant);
    unAnAvant.setFullYear(unAnAvant.getFullYear() - 1);

    const passAn = await Payment.findOne({
      where: {
        payerNumeroH: req.user.numeroH,
        purpose: 'subscription_livres_an',
        status: 'completed',
        createdAt: { [Op.gte]: unAnAvant },
      },
      order: [['createdAt', 'DESC']],
    });

    let expireAt = null;
    if (passAn) {
      expireAt = new Date(new Date(passAn.createdAt).setFullYear(new Date(passAn.createdAt).getFullYear() + 1));
    }

    res.json({ success: true, aAcces: !!passAn, expireAt });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * GET /api/payment/prix-livres
 * Retourne le prix de l'abonnement Bibliothèque selon le pays
 */
router.get('/prix-livres', authenticate, (req, res) => {
  const pays = req.user?.pays || '';
  const estAf = estAfricain(pays);
  res.json({
    success: true,
    an: getPrixLivres(pays),
    zone: estAf ? 'afrique' : 'hors_afrique',
    label: estAf ? 'Tarif Afrique' : 'Tarif international',
  });
});

export default router;

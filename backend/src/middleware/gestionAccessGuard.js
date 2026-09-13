// Verrouille l'accès aux routes de gestion interne (CRUD clinique, école, commerce, etc.)
// quand l'abonnement du propriétaire du tenant n'est pas payé / plus en essai gratuit.
// Ne supprime ni ne modifie jamais aucune donnée — bloque uniquement l'accès en attendant le paiement.
import ProfessionalAccount from '../models/ProfessionalAccount.js';
import Payment from '../models/Payment.js';

export const ADMIN_OWNER_MARKER = 'ADMIN-G7';

// Délai de grâce (Visibilité / Gestion Interne uniquement) : une fois la date de
// validité dépassée (fin d'essai gratuit OU fin d'une période payée), le compte reste
// accessible jusqu'à 3 mois supplémentaires. Ce n'est qu'après ces 3 mois sans paiement
// que le compte peut être bloqué (voir subscriptionChecker.js, qui pose alors
// subscriptionStatus='blocked'). Les autres systèmes du site (vendeurs Échange, etc.)
// n'ont AUCUN délai de grâce — ils sont bloqués immédiatement en cas d'impayé.
export const GRACE_MOIS_VISIBILITE = 3;

function finDeGrace(validUntil) {
  if (!validUntil) return null;
  const fin = new Date(validUntil);
  fin.setMonth(fin.getMonth() + GRACE_MOIS_VISIBILITE);
  return fin;
}

// Source de vérité : subscriptionStatus + subscriptionValidUntil, tenus à jour par
// l'approbation du compte (essai gratuit de 3 mois, voir professionals.js) et par les
// paiements (admin/subscription, webhook de paiement). Ne PAS recalculer un essai à part
// à partir de approvedAt : ça désynchronise l'accès réel du statut affiché à l'utilisateur.
export async function getGestionInterneAccess(ownerNumeroH) {
  if (!ownerNumeroH || ownerNumeroH === ADMIN_OWNER_MARKER) {
    return { aAcces: true, mode: 'admin', proAccount: null, validUntil: null, giValidUntil: null };
  }

  const proAccount = await ProfessionalAccount.findOne({
    where: { ownerNumeroH, status: 'approved', isActive: true },
    order: [['approvedAt', 'DESC']],
  });
  if (!proAccount) return { aAcces: false, mode: 'aucun_compte', proAccount: null, validUntil: null, giValidUntil: null };

  const maintenant = new Date();

  const validUntil = proAccount.subscriptionValidUntil ? new Date(proAccount.subscriptionValidUntil) : null;
  // Bloqué explicitement (par le vérificateur automatique après 3 mois d'impayé) → coupé.
  // Sinon, tant que la date de fin de grâce n'est pas dépassée, l'accès reste ouvert
  // même si la période payée (ou l'essai) est déjà expirée — c'est là le délai de grâce.
  const nonBloque = proAccount.subscriptionStatus !== 'blocked';
  const finGrace = finDeGrace(validUntil);
  const subscriptionOk = nonBloque && (!validUntil || maintenant < finGrace);
  const enRetard = subscriptionOk && !!validUntil && maintenant > validUntil;

  const giValidUntil = proAccount.gestionInterneValidUntil ? new Date(proAccount.gestionInterneValidUntil) : null;
  const giPayee = giValidUntil && giValidUntil > maintenant;

  const paiementVie = await Payment.findOne({
    where: { payerNumeroH: ownerNumeroH, purpose: 'gestion_interne_vie', status: 'completed' },
  });

  const aAcces = subscriptionOk || giPayee || !!paiementVie;
  const mode = paiementVie
    ? 'vie'
    : giPayee
    ? 'paye'
    : subscriptionOk
    ? (enRetard ? 'grace' : (proAccount.isTrial ? 'essai' : 'actif'))
    : 'bloque';

  return { aAcces, mode, proAccount, validUntil, giValidUntil };
}

const PAYMENT_REQUIRED_RESPONSE = {
  success: false,
  blocked: true,
  code: 'PAYMENT_REQUIRED',
  message: "Abonnement Gestion Interne expiré ou non payé. Réglez votre abonnement pour continuer — vos données sont conservées et redeviennent accessibles dès le paiement.",
};

// À appeler une fois req.tenant résolu (propriétaire ou membre) par le middleware verifyTenant/verifyMember de chaque module.
export async function enforceGestionAccess(req, res, next) {
  try {
    const access = await getGestionInterneAccess(req.tenant?.owner_numero_h);
    if (!access.aAcces) {
      return res.status(402).json(PAYMENT_REQUIRED_RESPONSE);
    }
    next();
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

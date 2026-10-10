// Verrouille l'accès aux routes de gestion interne (CRUD clinique, école, commerce, etc.)
// quand l'abonnement du propriétaire du tenant n'est pas payé / plus en essai gratuit.
// Ne supprime ni ne modifie jamais aucune donnée — bloque uniquement l'accès en attendant le paiement.
import { Op } from 'sequelize';
import ProfessionalAccount from '../models/ProfessionalAccount.js';
import Payment from '../models/Payment.js';
import { sequelize } from '../config/database.js';

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

// La formule de CE compte inclut-elle la Gestion Interne (app installable, lien de
// partage, vitrine…) ? 'visibility' = Visibilité + Rendez-vous : non, sauf si la
// Gestion Interne a été payée à part (période en cours ou paiement à vie).
// planType NULL = compte créé avant cette colonne → traité comme 'full'.
export async function compteAGestionInterne(proAccount) {
  if (!proAccount) return false;
  if (proAccount.planType !== 'visibility') return true;
  const gi = proAccount.gestionInterneValidUntil ? new Date(proAccount.gestionInterneValidUntil) : null;
  if (gi && gi > new Date()) return true;
  return !!(await trouverPaiementVie(proAccount.ownerNumeroH, proAccount.id));
}

// Paiement « Gestion Interne à vie » de CE compte : relatedId = id du compte pro
// (AbonnementGestion / GestionInterne envoient proId). Les anciens paiements sans
// relatedId restent valables pour le propriétaire (compatibilité).
async function trouverPaiementVie(ownerNumeroH, proAccountId) {
  const where = { payerNumeroH: ownerNumeroH, purpose: 'gestion_interne_vie', status: 'completed' };
  if (proAccountId) {
    where[Op.or] = [
      { relatedId: String(proAccountId) },
      { relatedId: null },
      { relatedId: '' },
    ];
  }
  return Payment.findOne({ where });
}

// Compte pro approuvé de CET établissement : lié par professional_accounts.tenant_code
// ou par management_tenants.professional_account_id.
async function compteDeLEtablissement(ownerNumeroH, tenantCode) {
  if (!tenantCode) return null;
  const parCode = await ProfessionalAccount.findOne({
    where: { tenant_code: tenantCode, ownerNumeroH, status: 'approved', isActive: true },
  });
  if (parCode) return parCode;
  const [lien] = await sequelize.query(
    'SELECT professional_account_id FROM management_tenants WHERE tenant_code = :code LIMIT 1',
    { replacements: { code: tenantCode }, type: sequelize.QueryTypes.SELECT }
  );
  if (!lien?.professional_account_id) return null;
  // Colonne INTEGER côté établissement, UUID côté compte pro : comparaison en texte
  const [compte] = await sequelize.query(
    `SELECT id FROM professional_accounts
      WHERE id::text = :id AND owner_numero_h = :owner AND status = 'approved' AND is_active = true LIMIT 1`,
    { replacements: { id: String(lien.professional_account_id), owner: ownerNumeroH }, type: sequelize.QueryTypes.SELECT }
  );
  return compte ? ProfessionalAccount.findByPk(compte.id) : null;
}

// Source de vérité : subscriptionStatus + subscriptionValidUntil, tenus à jour par
// l'approbation du compte (essai gratuit de 3 mois, voir professionals.js) et par les
// paiements (admin/subscription, webhook de paiement). Ne PAS recalculer un essai à part
// à partir de approvedAt : ça désynchronise l'accès réel du statut affiché à l'utilisateur.
// tenantCode (optionnel) : l'établissement concerné. Un propriétaire peut avoir
// plusieurs établissements, chacun avec sa formule et son abonnement : on lit alors
// le compte de CET établissement. Sans tenantCode (ou sans compte lié), on garde
// l'ancien comportement : le compte approuvé le plus récent du propriétaire.
export async function getGestionInterneAccess(ownerNumeroH, tenantCode = null) {
  if (!ownerNumeroH || ownerNumeroH === ADMIN_OWNER_MARKER) {
    return { aAcces: true, mode: 'admin', proAccount: null, validUntil: null, giValidUntil: null };
  }

  const proAccount = (await compteDeLEtablissement(ownerNumeroH, tenantCode))
    || await ProfessionalAccount.findOne({
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

  const paiementVie = await trouverPaiementVie(ownerNumeroH, proAccount.id);

  // Formule « Visibilité + Rendez-vous » : pas de Gestion Interne tant qu'elle
  // n'est pas payée (le paiement Gestion Interne ou à vie la débloque).
  if (proAccount.planType === 'visibility' && !giPayee && !paiementVie) {
    return { aAcces: false, mode: 'visibilite', proAccount, validUntil, giValidUntil };
  }

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
    const access = await getGestionInterneAccess(req.tenant?.owner_numero_h, req.tenant?.tenant_code);
    if (!access.aAcces) {
      if (access.mode === 'visibilite') {
        return res.status(402).json({
          ...PAYMENT_REQUIRED_RESPONSE,
          message: "Votre formule Visibilité + Rendez-vous n'inclut pas la Gestion Interne. Passez à la Gestion Interne pour y accéder.",
        });
      }
      return res.status(402).json(PAYMENT_REQUIRED_RESPONSE);
    }
    next();
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}

/**
 * subscriptionChecker.js
 *
 * Vérifie chaque jour les abonnements professionnels et envoie des emails
 * automatiques via Brevo (secours : Gmail SMTP).
 *
 * Cas traités :
 *   J-3  → Email "Votre abonnement expire dans 3 jours"
 *   J+0  → Email "Coupure dans 24h" + passage du compte en 'overdue'
 *   J+1  → Passage du compte en 'blocked' (compte désactivé)
 */

import { Op } from 'sequelize';
import ProfessionalAccount from '../models/ProfessionalAccount.js';
import User from '../models/User.js';
import {
  sendSubscriptionExpiringSoonEmail,
  sendSubscriptionCutoffWarningEmail,
  sendSubscriptionExpiredEmail,
} from './emailService.js';

// ─── Utilitaire : début et fin d'une journée ─────────────────────────────────

function dayRange(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const start = new Date(d); start.setHours(0, 0, 0, 0);
  const end   = new Date(d); end.setHours(23, 59, 59, 999);
  return { start, end };
}

// ─── Récupère l'email du compte pro (ou celui du propriétaire) ───────────────

async function resolveProEmail(account) {
  if (account.email) return { proEmail: account.email, proName: account.name };
  const owner = await User.findOne({ where: { numeroH: account.ownerNumeroH } });
  if (!owner?.email) return { proEmail: null, proName: account.name };
  const fullName = `${owner.prenom || ''} ${owner.nomFamille || ''}`.trim() || account.name;
  return { proEmail: owner.email, proName: fullName || account.name };
}

// ─── Vérification principale ──────────────────────────────────────────────────

async function runSubscriptionCheck() {
  console.log(`\n📧 [SubscriptionChecker] Vérification quotidienne — ${new Date().toLocaleDateString('fr-FR')}`);

  try {
    // ── 1. Comptes expirant dans 3 jours → alerte préventive ─────────────────
    const { start: in3Start, end: in3End } = dayRange(3);
    const expiringSoon = await ProfessionalAccount.findAll({
      where: {
        subscriptionStatus: 'active',
        subscriptionValidUntil: { [Op.between]: [in3Start, in3End] },
      },
    });

    for (const account of expiringSoon) {
      const { proEmail, proName } = await resolveProEmail(account);
      if (!proEmail) continue;
      sendSubscriptionExpiringSoonEmail({
        proEmail,
        proName,
        expiresAt: account.subscriptionValidUntil,
      }).catch(err => console.error(`[J-3] ${account.name}:`, err.message));
      console.log(`  ⏰ J-3 → ${account.name} (${proEmail})`);
    }

    // ── 2. Comptes expirés hier → email "coupure dans 24h" + overdue ─────────
    const { start: yStart, end: yEnd } = dayRange(-1);
    const expiredYesterday = await ProfessionalAccount.findAll({
      where: {
        subscriptionStatus: 'active',
        subscriptionValidUntil: { [Op.between]: [yStart, yEnd] },
      },
    });

    for (const account of expiredYesterday) {
      const { proEmail, proName } = await resolveProEmail(account);

      // Marquer comme 'overdue'
      await account.update({ subscriptionStatus: 'overdue' });

      if (!proEmail) continue;
      sendSubscriptionCutoffWarningEmail({
        proEmail,
        proName,
        expiredAt: account.subscriptionValidUntil,
      }).catch(err => console.error(`[J+0 overdue] ${account.name}:`, err.message));
      console.log(`  🚨 Coupure 24h → ${account.name} (${proEmail})`);
    }

    // ── 3. Comptes en 'overdue' depuis hier → bloquer définitivement ──────────
    const { start: twoDaysAgoStart, end: twoDaysAgoEnd } = dayRange(-2);
    const toBlock = await ProfessionalAccount.findAll({
      where: {
        subscriptionStatus: 'overdue',
        subscriptionValidUntil: { [Op.lt]: twoDaysAgoEnd },
      },
    });

    for (const account of toBlock) {
      await account.update({ subscriptionStatus: 'blocked', status: 'rejected' });

      const { proEmail, proName } = await resolveProEmail(account);
      if (!proEmail) continue;
      sendSubscriptionExpiredEmail({
        proEmail,
        proName,
        expiredAt: account.subscriptionValidUntil,
      }).catch(err => console.error(`[blocked] ${account.name}:`, err.message));
      console.log(`  ❌ Bloqué → ${account.name} (${proEmail})`);
    }

    const total = expiringSoon.length + expiredYesterday.length + toBlock.length;
    console.log(`  ✅ Vérification terminée — ${total} compte(s) traité(s)\n`);
  } catch (err) {
    console.error('❌ [SubscriptionChecker] Erreur :', err.message);
  }
}

// ─── Démarrage du timer quotidien ─────────────────────────────────────────────

export function startSubscriptionChecker() {
  // Lancer immédiatement au démarrage du serveur
  runSubscriptionCheck();

  // Puis toutes les 24 heures
  const INTERVAL_MS = 24 * 60 * 60 * 1000;
  setInterval(runSubscriptionCheck, INTERVAL_MS);

  console.log('✅ [SubscriptionChecker] Démarré — vérification toutes les 24h');
}

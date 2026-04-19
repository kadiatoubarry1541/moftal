/**
 * emailService.js — Service d'envoi d'emails
 *
 * CHAÎNE DE PRIORITÉ (identique pour tous les types d'emails) :
 *   1. Brevo     — 9 000 emails/mois gratuits (priorité)
 *   2. Gmail SMTP — via nodemailer (secours illimité*)
 *      * limité à ~500 emails/jour par Google sur compte normal
 *
 * Aucun domaine requis : fonctionne avec une adresse Gmail vérifiée.
 */

import nodemailer from 'nodemailer';

// ─── Variables d'environnement ────────────────────────────────────────────────
const BREVO_API_KEY  = process.env.BREVO_API_KEY  || '';
const GMAIL_USER     = process.env.GMAIL_USER     || '';   // ex: kadiatou1541.kb@gmail.com
const GMAIL_APP_PASS = process.env.GMAIL_APP_PASS || '';   // Mot de passe d'application Google (16 car.)

const FROM_EMAIL   = process.env.FROM_EMAIL   || GMAIL_USER || 'noreply@enfants-adam.app';
const FROM_NAME    = process.env.FROM_NAME    || "Les Enfants d'Adam";
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function maskEmail(email) {
  if (!email || !email.includes('@')) return null;
  const [local, domain] = email.split('@');
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

// ─── Fournisseur 1 : Brevo (API REST) ─────────────────────────────────────────

async function sendBrevo({ to, toName = '', subject, htmlContent }) {
  if (!BREVO_API_KEY) return false;
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: to, name: toName }],
        subject,
        htmlContent,
      }),
    });
    if (res.ok) {
      console.log(`✅ [Brevo] Email envoyé → ${to}`);
      return true;
    }
    const err = await res.json().catch(() => ({}));
    console.error('❌ [Brevo] Erreur:', res.status, err?.message || '');
    return false;
  } catch (e) {
    console.error('❌ [Brevo] Exception:', e.message);
    return false;
  }
}

// ─── Fournisseur 2 : Gmail SMTP via nodemailer (secours) ─────────────────────
// Prérequis : activer la validation en 2 étapes sur le compte Google,
// puis créer un "Mot de passe d'application" (16 caractères) dans :
//   Compte Google → Sécurité → Connexion à Google → Mots de passe des applications

let gmailTransporter = null;

function getGmailTransporter() {
  if (!GMAIL_USER || !GMAIL_APP_PASS) return null;
  if (!gmailTransporter) {
    gmailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASS,   // Mot de passe d'application (PAS le mot de passe habituel)
      },
    });
  }
  return gmailTransporter;
}

async function sendGmail({ to, toName = '', subject, htmlContent }) {
  const transporter = getGmailTransporter();
  if (!transporter) {
    console.warn('⚠️  Gmail SMTP non configuré (GMAIL_USER ou GMAIL_APP_PASS manquant)');
    return false;
  }
  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${GMAIL_USER}>`,
      to: toName ? `"${toName}" <${to}>` : to,
      subject,
      html: htmlContent,
    });
    console.log(`✅ [Gmail SMTP] Email envoyé → ${to}`);
    return true;
  } catch (e) {
    console.error('❌ [Gmail SMTP] Erreur:', e.message);
    return false;
  }
}

// ─── Envoi avec bascule automatique Brevo → Gmail ────────────────────────────

async function sendEmail({ to, toName, subject, htmlContent }) {
  if (!to) return;
  const sent = await sendBrevo({ to, toName, subject, htmlContent });
  if (!sent) {
    console.warn('⚠️  Brevo indisponible — bascule sur Gmail SMTP');
    await sendGmail({ to, toName, subject, htmlContent });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// EMAILS PUBLICS
// ═════════════════════════════════════════════════════════════════════════════

// ─── Code OTP de réinitialisation de mot de passe ────────────────────────────

export async function sendPasswordOtpEmail({ to, toName = '', code }) {
  const subject = "Votre code de réinitialisation — Les Enfants d'Adam";
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#1e40af;margin:0;">Code de réinitialisation</h2>
      </div>
      <p style="color:#374151;">Bonjour <strong>${toName || ''}</strong>,</p>
      <p style="color:#374151;">
        Voici votre code de réinitialisation de mot de passe sur <strong>Les Enfants d'Adam</strong>.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <div style="display:inline-block;background:#f0f4ff;border:2px solid #1e40af;border-radius:12px;padding:20px 40px;">
          <p style="margin:0;font-size:12px;color:#6b7280;letter-spacing:1px;">VOTRE CODE</p>
          <p style="margin:8px 0 0;font-size:42px;font-weight:900;color:#1e40af;letter-spacing:8px;">${code}</p>
        </div>
      </div>
      <p style="color:#6b7280;font-size:13px;text-align:center;">
        Ce code est valable <strong>10 minutes</strong>. Si vous n'avez pas fait cette demande, ignorez simplement cet e-mail.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:11px;text-align:center;">
        © Les Enfants d'Adam — ${new Date().getFullYear()}
      </p>
    </div>`;
  await sendEmail({ to, toName, subject, htmlContent });
}

// ─── Lien de réinitialisation de mot de passe ────────────────────────────────

export async function sendPasswordResetEmail({ to, toName = '', resetToken }) {
  const resetLink = `${FRONTEND_URL}/mot-de-passe-oublie?token=${resetToken}`;
  const subject = "Réinitialisation de votre mot de passe — Les Enfants d'Adam";
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#1e40af;margin:0;">Réinitialisation du mot de passe</h2>
      </div>
      <p style="color:#374151;">Bonjour <strong>${toName || ''}</strong>,</p>
      <p style="color:#374151;">
        Vous avez demandé la réinitialisation de votre mot de passe sur
        <strong>Les Enfants d'Adam</strong>.
      </p>
      <p style="color:#374151;">Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${resetLink}"
           style="background:#1e40af;color:#ffffff;padding:14px 36px;border-radius:6px;
                  text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">
          Réinitialiser mon mot de passe
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;">
        Ce lien est valable <strong>15 minutes</strong>. Si vous n'avez pas fait cette
        demande, ignorez simplement cet e-mail.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:11px;text-align:center;">
        © Les Enfants d'Adam — ${new Date().getFullYear()}
      </p>
    </div>`;
  await sendEmail({ to, toName, subject, htmlContent });
}

// ─── Reçu de paiement (compte pro) ───────────────────────────────────────────

export async function sendSubscriptionReceipt({ proEmail, proName = '', amount, currency = 'GNF', txRef, expiresAt }) {
  if (!proEmail) return;
  const subject = "✅ Reçu de paiement — Abonnement Professionnel";
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #d1fae5;border-radius:8px;">
      <div style="background:#059669;border-radius:6px 6px 0 0;padding:16px 24px;margin:-24px -24px 24px;">
        <h2 style="color:#ffffff;margin:0;">Paiement confirmé</h2>
      </div>
      <p style="color:#374151;">Bonjour <strong>${proName}</strong>,</p>
      <p style="color:#374151;">
        Votre paiement d'abonnement a bien été reçu et votre compte professionnel
        est maintenant <strong>actif</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        <tr style="background:#f3f4f6;">
          <td style="padding:10px 16px;font-weight:bold;color:#374151;">Référence transaction</td>
          <td style="padding:10px 16px;color:#374151;">${txRef}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-weight:bold;color:#374151;">Montant payé</td>
          <td style="padding:10px 16px;color:#374151;">${Number(amount).toLocaleString('fr-FR')} ${currency}</td>
        </tr>
        <tr style="background:#f3f4f6;">
          <td style="padding:10px 16px;font-weight:bold;color:#374151;">Date du paiement</td>
          <td style="padding:10px 16px;color:#374151;">${formatDate(new Date())}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;font-weight:bold;color:#374151;">Abonnement valide jusqu'au</td>
          <td style="padding:10px 16px;color:#059669;font-weight:bold;">${formatDate(expiresAt)}</td>
        </tr>
      </table>
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;padding:14px 18px;margin-bottom:20px;">
        <p style="color:#065f46;margin:0;font-weight:bold;">
          Votre compte est désormais visible par les utilisateurs de la plateforme.
        </p>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:11px;text-align:center;">
        © Les Enfants d'Adam — ${new Date().getFullYear()} · Conservez cet e-mail comme justificatif.
      </p>
    </div>`;
  await sendEmail({ to: proEmail, toName: proName, subject, htmlContent });
}

// ─── Renouvellement réussi (compte pro) ──────────────────────────────────────

export async function sendSubscriptionRenewedEmail({ proEmail, proName = '', expiresAt, txRef }) {
  if (!proEmail) return;
  const subject = "🎉 Abonnement renouvelé avec succès";
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #bfdbfe;border-radius:8px;">
      <div style="background:#1e40af;border-radius:6px 6px 0 0;padding:16px 24px;margin:-24px -24px 24px;">
        <h2 style="color:#ffffff;margin:0;">Abonnement renouvelé</h2>
      </div>
      <p style="color:#374151;">Bonjour <strong>${proName}</strong>,</p>
      <p style="color:#374151;">
        Votre abonnement professionnel a été <strong>renouvelé avec succès</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
        ${txRef ? `
        <tr style="background:#f3f4f6;">
          <td style="padding:10px 16px;font-weight:bold;color:#374151;">Référence</td>
          <td style="padding:10px 16px;color:#374151;">${txRef}</td>
        </tr>` : ''}
        <tr>
          <td style="padding:10px 16px;font-weight:bold;color:#374151;">Date de renouvellement</td>
          <td style="padding:10px 16px;color:#374151;">${formatDate(new Date())}</td>
        </tr>
        <tr style="background:#f3f4f6;">
          <td style="padding:10px 16px;font-weight:bold;color:#374151;">Nouveau terme — valide jusqu'au</td>
          <td style="padding:10px 16px;color:#1e40af;font-weight:bold;">${formatDate(expiresAt)}</td>
        </tr>
      </table>
      <p style="color:#374151;">Votre compte est actif et visible par tous les utilisateurs de la plateforme.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:11px;text-align:center;">
        © Les Enfants d'Adam — ${new Date().getFullYear()}
      </p>
    </div>`;
  await sendEmail({ to: proEmail, toName: proName, subject, htmlContent });
}

// ─── Alerte 3 jours avant expiration (compte pro) ────────────────────────────

export async function sendSubscriptionExpiringSoonEmail({ proEmail, proName = '', expiresAt }) {
  if (!proEmail) return;
  const subject = "⏰ Action requise : votre abonnement expire dans 3 jours";
  const renewLink = `${FRONTEND_URL}/mes-comptes-pro`;
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #fde68a;border-radius:8px;">
      <div style="background:#d97706;border-radius:6px 6px 0 0;padding:16px 24px;margin:-24px -24px 24px;">
        <h2 style="color:#ffffff;margin:0;">⏰ Votre abonnement expire bientôt</h2>
      </div>
      <p style="color:#374151;">Bonjour <strong>${proName}</strong>,</p>
      <p style="color:#374151;">
        Votre abonnement professionnel expire le <strong>${formatDate(expiresAt)}</strong>,
        soit dans <strong>3 jours</strong>.
      </p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:14px 18px;margin:20px 0;">
        <p style="color:#92400e;margin:0;font-weight:bold;">
          Sans renouvellement, votre compte ne sera plus visible par les utilisateurs à partir de cette date.
        </p>
      </div>
      <p style="color:#374151;">Renouvelez maintenant pour éviter toute interruption de service :</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${renewLink}"
           style="background:#d97706;color:#ffffff;padding:14px 36px;border-radius:6px;
                  text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">
          Renouveler mon abonnement
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:11px;text-align:center;">
        © Les Enfants d'Adam — ${new Date().getFullYear()}
      </p>
    </div>`;
  await sendEmail({ to: proEmail, toName: proName, subject, htmlContent });
}

// ─── Dernier avertissement : coupure dans 24h ────────────────────────────────

export async function sendSubscriptionCutoffWarningEmail({ proEmail, proName = '', expiredAt }) {
  if (!proEmail) return;
  const subject = "🚨 Dernier avertissement : coupure de votre compte dans 24h";
  const renewLink = `${FRONTEND_URL}/mes-comptes-pro`;
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:2px solid #dc2626;border-radius:8px;">
      <div style="background:#991b1b;border-radius:6px 6px 0 0;padding:16px 24px;margin:-24px -24px 24px;">
        <h2 style="color:#ffffff;margin:0;">🚨 Coupure dans 24 heures</h2>
      </div>
      <p style="color:#374151;">Bonjour <strong>${proName}</strong>,</p>
      <p style="color:#374151;">
        Votre abonnement professionnel a expiré le <strong>${formatDate(expiredAt)}</strong>.
      </p>
      <div style="background:#fef2f2;border:2px solid #dc2626;border-radius:6px;padding:16px 18px;margin:20px 0;">
        <p style="color:#991b1b;margin:0;font-size:16px;font-weight:bold;text-align:center;">
          Sans action de votre part, votre compte sera désactivé dans 24 heures.
        </p>
      </div>
      <p style="color:#374151;">Renouvelez immédiatement pour éviter la coupure :</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${renewLink}"
           style="background:#dc2626;color:#ffffff;padding:16px 40px;border-radius:6px;
                  text-decoration:none;font-size:18px;font-weight:bold;display:inline-block;">
          Renouveler maintenant
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;text-align:center;">
        En cas de problème, contactez-nous directement sur la plateforme.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:11px;text-align:center;">
        © Les Enfants d'Adam — ${new Date().getFullYear()}
      </p>
    </div>`;
  await sendEmail({ to: proEmail, toName: proName, subject, htmlContent });
}

// ─── Abonnement expiré (compte pro) ──────────────────────────────────────────

export async function sendSubscriptionExpiredEmail({ proEmail, proName = '', expiredAt }) {
  if (!proEmail) return;
  const subject = "⚠️ Votre abonnement professionnel a expiré";
  const renewLink = `${FRONTEND_URL}/mes-comptes-pro`;
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #fca5a5;border-radius:8px;">
      <div style="background:#dc2626;border-radius:6px 6px 0 0;padding:16px 24px;margin:-24px -24px 24px;">
        <h2 style="color:#ffffff;margin:0;">Abonnement expiré</h2>
      </div>
      <p style="color:#374151;">Bonjour <strong>${proName}</strong>,</p>
      <p style="color:#374151;">
        Votre abonnement professionnel a expiré le <strong>${formatDate(expiredAt)}</strong>.
      </p>
      <p style="color:#374151;">
        Votre compte n'est plus visible pour les utilisateurs de la plateforme.
        Renouvelez votre abonnement pour retrouver un accès complet.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${renewLink}"
           style="background:#dc2626;color:#ffffff;padding:14px 36px;border-radius:6px;
                  text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">
          Renouveler mon abonnement
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;">
        En cas de problème, contactez-nous sur la plateforme.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:11px;text-align:center;">
        © Les Enfants d'Adam — ${new Date().getFullYear()}
      </p>
    </div>`;
  await sendEmail({ to: proEmail, toName: proName, subject, htmlContent });
}

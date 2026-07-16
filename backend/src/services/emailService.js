/**
 * emailService.js — Service d'envoi d'emails Moftal
 *
 * CHAÎNE DE PRIORITÉ :
 *   OTP mot de passe  → Gmail SMTP (1er) → Brevo (secours)
 *   Tous autres emails → Brevo (1er) → MailerSend (secours automatique)
 *
 * Si tous les fournisseurs échouent → notification dans l'espace admin.
 */

import nodemailer from 'nodemailer';

// ─── Variables d'environnement ────────────────────────────────────────────────
const GMAIL_USER         = process.env.GMAIL_USER         || '';
const GMAIL_APP_PASS     = process.env.GMAIL_APP_PASS     || '';
const BREVO_SMTP_USER    = process.env.BREVO_SMTP_USER    || '';
const BREVO_SMTP_PASS    = process.env.BREVO_SMTP_PASS    || '';
const MAILERSEND_API_KEY = process.env.MAILERSEND_API_KEY || '';

const FROM_EMAIL   = process.env.FROM_EMAIL   || 'noreply@moftal.com';
const FROM_NAME    = process.env.FROM_NAME    || 'Moftal';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const ADMIN_H      = process.env.ADMIN_NUMERO_H || 'G0C0P0R0E0F0 0';

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

// ─── Notification admin en cas d'échec total ──────────────────────────────────

async function notifyAdminEmailFailure({ to, subject }) {
  try {
    const { default: Notification } = await import('../models/Notification.js');
    await Notification.createNotification({
      recipientNumeroH: ADMIN_H,
      type: 'email_error',
      title: '⚠️ Échec envoi email',
      message: `Impossible d'envoyer l'email à ${to} (sujet : "${subject}"). Tous les fournisseurs ont échoué.`,
    });
  } catch (e) {
    console.error('❌ [Admin notif] Impossible de créer la notification:', e.message);
  }
}

// ─── Fournisseur 1 : Gmail SMTP (OTP mot de passe oublié uniquement) ─────────

let gmailTransporter = null;

function getGmailTransporter() {
  if (!GMAIL_USER || !GMAIL_APP_PASS) return null;
  if (!gmailTransporter) {
    gmailTransporter = nodemailer.createTransport({
      service: 'gmail',
      connectionTimeout: 8000,
      greetingTimeout: 5000,
      socketTimeout: 15000,
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASS },
    });
  }
  return gmailTransporter;
}

const SMTP_TIMEOUT_MS = 18000;

async function sendGmail({ to, toName = '', subject, htmlContent }) {
  const transporter = getGmailTransporter();
  if (!transporter) {
    console.warn('⚠️  Gmail SMTP non configuré');
    return false;
  }
  try {
    await Promise.race([
      transporter.sendMail({
        from: `"${FROM_NAME}" <${GMAIL_USER}>`,
        to: toName ? `"${toName}" <${to}>` : to,
        subject,
        html: htmlContent,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Gmail SMTP timeout 18s')), SMTP_TIMEOUT_MS)
      ),
    ]);
    console.log(`✅ [Gmail SMTP] → ${to}`);
    return true;
  } catch (e) {
    console.error('❌ [Gmail SMTP]', e.message);
    return false;
  }
}

// ─── Fournisseur 2 : Brevo SMTP (abonnements + paiements) ────────────────────

let brevoTransporter = null;

function getBrevoTransporter() {
  if (!BREVO_SMTP_USER || !BREVO_SMTP_PASS) return null;
  if (!brevoTransporter) {
    brevoTransporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      connectionTimeout: 8000,
      greetingTimeout: 5000,
      socketTimeout: 15000,
      auth: { user: BREVO_SMTP_USER, pass: BREVO_SMTP_PASS },
    });
  }
  return brevoTransporter;
}

async function sendBrevo({ to, toName = '', subject, htmlContent }) {
  const transporter = getBrevoTransporter();
  if (!transporter) {
    console.warn('⚠️  Brevo SMTP non configuré');
    return false;
  }
  try {
    await Promise.race([
      transporter.sendMail({
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: toName ? `"${toName}" <${to}>` : to,
        subject,
        html: htmlContent,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Brevo SMTP timeout 18s')), SMTP_TIMEOUT_MS)
      ),
    ]);
    console.log(`✅ [Brevo SMTP] → ${to}`);
    return true;
  } catch (e) {
    console.error('❌ [Brevo SMTP]', e.message);
    return false;
  }
}

// ─── Fournisseur 3 : MailerSend REST API (secours automatique) ───────────────

async function sendMailerSend({ to, toName = '', subject, htmlContent }) {
  if (!MAILERSEND_API_KEY) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${MAILERSEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { email: FROM_EMAIL, name: FROM_NAME },
        to: [{ email: to, name: toName }],
        subject,
        html: htmlContent,
      }),
    });
    clearTimeout(timer);
    if (res.ok || res.status === 202) {
      console.log(`✅ [MailerSend] → ${to}`);
      return true;
    }
    const err = await res.json().catch(() => ({}));
    console.error('❌ [MailerSend]', res.status, err?.message || '');
    return false;
  } catch (e) {
    console.error('❌ [MailerSend]', e.message);
    return false;
  }
}

// ─── OTP : Gmail → MailerSend (REST, rapide) → Brevo (ultime secours) ───────

async function sendOtp({ to, toName, subject, htmlContent }) {
  if (!to) return;
  const sent = await sendGmail({ to, toName, subject, htmlContent });
  if (!sent) {
    console.warn('⚠️  Gmail indisponible — bascule MailerSend pour OTP');
    const sentMailerSend = await sendMailerSend({ to, toName, subject, htmlContent });
    if (!sentMailerSend) {
      console.warn('⚠️  MailerSend indisponible — bascule Brevo pour OTP');
      const sentBrevo = await sendBrevo({ to, toName, subject, htmlContent });
      if (!sentBrevo) await notifyAdminEmailFailure({ to, subject });
    }
  }
}

// ─── Bienvenue : MailerSend → Brevo (secours) ────────────────────────────────

async function sendWelcome({ to, toName, subject, htmlContent }) {
  if (!to) return;
  const sent = await sendMailerSend({ to, toName, subject, htmlContent });
  if (!sent) {
    console.warn('⚠️  MailerSend indisponible — bascule Brevo pour bienvenue');
    const sentBrevo = await sendBrevo({ to, toName, subject, htmlContent });
    if (!sentBrevo) await notifyAdminEmailFailure({ to, subject });
  }
}

// ─── Abonnements/paiements : Brevo → MailerSend (secours) ────────────────────

async function sendAutomatic({ to, toName, subject, htmlContent }) {
  if (!to) return;
  const sent = await sendBrevo({ to, toName, subject, htmlContent });
  if (!sent) {
    console.warn('⚠️  Brevo indisponible — bascule MailerSend');
    const sentMailerSend = await sendMailerSend({ to, toName, subject, htmlContent });
    if (!sentMailerSend) await notifyAdminEmailFailure({ to, subject });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// EMAILS PUBLICS
// ═════════════════════════════════════════════════════════════════════════════

// ─── OTP — mot de passe oublié (Gmail → Brevo secours) ───────────────────────

export async function sendPasswordOtpEmail({ to, toName = '', code }) {
  const subject = 'Votre code de réinitialisation — Moftal';
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h2 style="color:#1e40af;margin:0;">Code de réinitialisation</h2>
      </div>
      <p style="color:#374151;">Bonjour <strong>${toName || ''}</strong>,</p>
      <p style="color:#374151;">Voici votre code de réinitialisation de mot de passe sur <strong>Moftal</strong>.</p>
      <div style="text-align:center;margin:32px 0;">
        <div style="display:inline-block;background:#f0f4ff;border:2px solid #1e40af;border-radius:12px;padding:20px 40px;">
          <p style="margin:0;font-size:12px;color:#6b7280;letter-spacing:1px;">VOTRE CODE</p>
          <p style="margin:8px 0 0;font-size:42px;font-weight:900;color:#1e40af;letter-spacing:8px;">${code}</p>
        </div>
      </div>
      <p style="color:#6b7280;font-size:13px;text-align:center;">
        Ce code est valable <strong>10 minutes</strong>. Si vous n'avez pas fait cette demande, ignorez cet e-mail.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:11px;text-align:center;">© Moftal — ${new Date().getFullYear()}</p>
    </div>`;
  await sendOtp({ to, toName, subject, htmlContent });
}

// ─── Lien de réinitialisation (Gmail → Brevo secours) ────────────────────────

export async function sendPasswordResetEmail({ to, toName = '', resetToken }) {
  const resetLink = `${FRONTEND_URL}/mot-de-passe-oublie?token=${resetToken}`;
  const subject = 'Réinitialisation de votre mot de passe — Moftal';
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
      <h2 style="color:#1e40af;text-align:center;">Réinitialisation du mot de passe</h2>
      <p style="color:#374151;">Bonjour <strong>${toName || ''}</strong>,</p>
      <p style="color:#374151;">Vous avez demandé la réinitialisation de votre mot de passe sur <strong>Moftal</strong>.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${resetLink}"
           style="background:#1e40af;color:#ffffff;padding:14px 36px;border-radius:6px;
                  text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">
          Réinitialiser mon mot de passe
        </a>
      </div>
      <p style="color:#6b7280;font-size:13px;">Ce lien est valable <strong>15 minutes</strong>.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:11px;text-align:center;">© Moftal — ${new Date().getFullYear()}</p>
    </div>`;
  await sendOtp({ to, toName, subject, htmlContent });
}

// ─── Bienvenue à l'inscription (Brevo → MailerSend secours) ──────────────────

export async function sendWelcomeEmail({ to, toName = '', numeroH }) {
  const subject = 'Bienvenue sur Moftal !';
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #d1fae5;border-radius:8px;">
      <div style="background:#065f46;border-radius:6px 6px 0 0;padding:16px 24px;margin:-24px -24px 24px;">
        <h2 style="color:#ffffff;margin:0;">Bienvenue dans la famille Moftal !</h2>
      </div>
      <p style="color:#374151;">Bonjour <strong>${toName}</strong>,</p>
      <p style="color:#374151;">Votre compte a été créé avec succès. Vous faites maintenant partie de la communauté Moftal.</p>
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;padding:16px;margin:20px 0;text-align:center;">
        <p style="color:#065f46;margin:0;font-size:13px;">Votre numéro de famille</p>
        <p style="color:#065f46;margin:8px 0 0;font-size:24px;font-weight:900;letter-spacing:4px;">${numeroH}</p>
        <p style="color:#6b7280;margin:8px 0 0;font-size:12px;">Conservez ce numéro — il vous identifie sur la plateforme.</p>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${FRONTEND_URL}"
           style="background:#065f46;color:#ffffff;padding:14px 36px;border-radius:6px;
                  text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">
          Accéder à Moftal
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:11px;text-align:center;">© Moftal — ${new Date().getFullYear()}</p>
    </div>`;
  await sendWelcome({ to, toName, subject, htmlContent });
}

// ─── Reçu de paiement (Brevo → MailerSend secours) ───────────────────────────

export async function sendSubscriptionReceipt({ proEmail, proName = '', amount, currency = 'GNF', txRef, expiresAt }) {
  if (!proEmail) return;
  const subject = '✅ Reçu de paiement — Abonnement Professionnel';
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #d1fae5;border-radius:8px;">
      <div style="background:#059669;border-radius:6px 6px 0 0;padding:16px 24px;margin:-24px -24px 24px;">
        <h2 style="color:#ffffff;margin:0;">Paiement confirmé</h2>
      </div>
      <p style="color:#374151;">Bonjour <strong>${proName}</strong>,</p>
      <p style="color:#374151;">Votre paiement d'abonnement a bien été reçu et votre compte professionnel est maintenant <strong>actif</strong>.</p>
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
        <p style="color:#065f46;margin:0;font-weight:bold;">Votre compte est désormais visible par les utilisateurs de la plateforme.</p>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:11px;text-align:center;">© Moftal — ${new Date().getFullYear()} · Conservez cet e-mail comme justificatif.</p>
    </div>`;
  await sendAutomatic({ to: proEmail, toName: proName, subject, htmlContent });
}

// ─── Renouvellement réussi (Brevo → MailerSend secours) ──────────────────────

export async function sendSubscriptionRenewedEmail({ proEmail, proName = '', expiresAt, txRef }) {
  if (!proEmail) return;
  const subject = '🎉 Abonnement renouvelé avec succès';
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #bfdbfe;border-radius:8px;">
      <div style="background:#1e40af;border-radius:6px 6px 0 0;padding:16px 24px;margin:-24px -24px 24px;">
        <h2 style="color:#ffffff;margin:0;">Abonnement renouvelé</h2>
      </div>
      <p style="color:#374151;">Bonjour <strong>${proName}</strong>,</p>
      <p style="color:#374151;">Votre abonnement professionnel a été <strong>renouvelé avec succès</strong>.</p>
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
          <td style="padding:10px 16px;font-weight:bold;color:#374151;">Valide jusqu'au</td>
          <td style="padding:10px 16px;color:#1e40af;font-weight:bold;">${formatDate(expiresAt)}</td>
        </tr>
      </table>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:11px;text-align:center;">© Moftal — ${new Date().getFullYear()}</p>
    </div>`;
  await sendAutomatic({ to: proEmail, toName: proName, subject, htmlContent });
}

// ─── Alerte 3 jours avant expiration (Brevo → MailerSend secours) ────────────

export async function sendSubscriptionExpiringSoonEmail({ proEmail, proName = '', expiresAt }) {
  if (!proEmail) return;
  const subject = '⏰ Action requise : votre abonnement expire dans 3 jours';
  const renewLink = `${FRONTEND_URL}/mes-comptes-pro`;
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #fde68a;border-radius:8px;">
      <div style="background:#d97706;border-radius:6px 6px 0 0;padding:16px 24px;margin:-24px -24px 24px;">
        <h2 style="color:#ffffff;margin:0;">⏰ Votre abonnement expire bientôt</h2>
      </div>
      <p style="color:#374151;">Bonjour <strong>${proName}</strong>,</p>
      <p style="color:#374151;">Votre abonnement expire le <strong>${formatDate(expiresAt)}</strong>, soit dans <strong>3 jours</strong>.</p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:14px 18px;margin:20px 0;">
        <p style="color:#92400e;margin:0;font-weight:bold;">Sans renouvellement, votre compte ne sera plus visible par les utilisateurs.</p>
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="${renewLink}"
           style="background:#d97706;color:#ffffff;padding:14px 36px;border-radius:6px;
                  text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">
          Renouveler mon abonnement
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:11px;text-align:center;">© Moftal — ${new Date().getFullYear()}</p>
    </div>`;
  await sendAutomatic({ to: proEmail, toName: proName, subject, htmlContent });
}

// ─── Dernier avertissement 24h (Brevo → MailerSend secours) ──────────────────

export async function sendSubscriptionCutoffWarningEmail({ proEmail, proName = '', expiredAt }) {
  if (!proEmail) return;
  const subject = '🚨 Dernier avertissement : coupure de votre compte dans 24h';
  const renewLink = `${FRONTEND_URL}/mes-comptes-pro`;
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:2px solid #dc2626;border-radius:8px;">
      <div style="background:#991b1b;border-radius:6px 6px 0 0;padding:16px 24px;margin:-24px -24px 24px;">
        <h2 style="color:#ffffff;margin:0;">🚨 Coupure dans 24 heures</h2>
      </div>
      <p style="color:#374151;">Bonjour <strong>${proName}</strong>,</p>
      <p style="color:#374151;">Votre abonnement a expiré le <strong>${formatDate(expiredAt)}</strong>.</p>
      <div style="background:#fef2f2;border:2px solid #dc2626;border-radius:6px;padding:16px 18px;margin:20px 0;">
        <p style="color:#991b1b;margin:0;font-size:16px;font-weight:bold;text-align:center;">
          Sans action, votre compte sera désactivé dans 24 heures.
        </p>
      </div>
      <div style="text-align:center;margin:32px 0;">
        <a href="${renewLink}"
           style="background:#dc2626;color:#ffffff;padding:16px 40px;border-radius:6px;
                  text-decoration:none;font-size:18px;font-weight:bold;display:inline-block;">
          Renouveler maintenant
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:11px;text-align:center;">© Moftal — ${new Date().getFullYear()}</p>
    </div>`;
  await sendAutomatic({ to: proEmail, toName: proName, subject, htmlContent });
}

// ─── Rendez-vous accepté (Brevo → MailerSend secours) ────────────────────────

export async function sendAppointmentAcceptedEmail({ to, toName = '', proName, appointmentDate, appointmentTime, service, responseMessage }) {
  if (!to) return;
  const dateInfo = appointmentDate && appointmentTime
    ? `<p style="color:#374151;">📅 <strong>Date :</strong> ${appointmentDate} à ${appointmentTime}</p>`
    : '';
  const serviceInfo = service
    ? `<p style="color:#374151;">🩺 <strong>Service :</strong> ${service}</p>`
    : '';
  const responseInfo = responseMessage
    ? `<div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:6px;padding:14px 18px;margin:16px 0;">
        <p style="color:#065f46;margin:0;font-weight:bold;">Message du professionnel :</p>
        <p style="color:#374151;margin:8px 0 0;">${responseMessage}</p>
       </div>`
    : '';
  const subject = `✅ Votre rendez-vous avec ${proName} a été accepté !`;
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #a7f3d0;border-radius:8px;">
      <div style="background:#065f46;border-radius:6px 6px 0 0;padding:16px 24px;margin:-24px -24px 24px;">
        <h2 style="color:#ffffff;margin:0;">✅ Rendez-vous accepté</h2>
      </div>
      <p style="color:#374151;">Bonjour <strong>${toName}</strong>,</p>
      <p style="color:#374151;">Votre demande de rendez-vous auprès de <strong>${proName}</strong> a été <strong style="color:#065f46;">acceptée</strong>.</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:16px 18px;margin:16px 0;">
        ${dateInfo}
        ${serviceInfo}
      </div>
      ${responseInfo}
      <div style="text-align:center;margin:28px 0;">
        <a href="${FRONTEND_URL}/mes-rendez-vous"
           style="background:#065f46;color:#ffffff;padding:14px 36px;border-radius:6px;
                  text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">
          Voir mes rendez-vous
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:11px;text-align:center;">© Moftal — ${new Date().getFullYear()}</p>
    </div>`;
  await sendAutomatic({ to, toName, subject, htmlContent });
}

// ─── Rendez-vous refusé (Brevo → MailerSend secours) ─────────────────────────

export async function sendAppointmentRejectedEmail({ to, toName = '', proName, responseMessage }) {
  if (!to) return;
  const responseInfo = responseMessage
    ? `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:14px 18px;margin:16px 0;">
        <p style="color:#9a3412;margin:0;font-weight:bold;">Message du professionnel :</p>
        <p style="color:#374151;margin:8px 0 0;">${responseMessage}</p>
       </div>`
    : '';
  const subject = `Votre rendez-vous avec ${proName} — mise à jour`;
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #fca5a5;border-radius:8px;">
      <div style="background:#991b1b;border-radius:6px 6px 0 0;padding:16px 24px;margin:-24px -24px 24px;">
        <h2 style="color:#ffffff;margin:0;">Rendez-vous non disponible</h2>
      </div>
      <p style="color:#374151;">Bonjour <strong>${toName}</strong>,</p>
      <p style="color:#374151;">Nous vous informons que <strong>${proName}</strong> n'est pas en mesure d'honorer votre demande de rendez-vous pour le moment.</p>
      ${responseInfo}
      <p style="color:#374151;">Vous pouvez soumettre une nouvelle demande à une autre date ou consulter d'autres professionnels sur la plateforme.</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${FRONTEND_URL}/mes-rendez-vous"
           style="background:#1e40af;color:#ffffff;padding:14px 36px;border-radius:6px;
                  text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">
          Voir mes rendez-vous
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:11px;text-align:center;">© Moftal — ${new Date().getFullYear()}</p>
    </div>`;
  await sendAutomatic({ to, toName, subject, htmlContent });
}

// ─── Abonnement expiré (Brevo → MailerSend secours) ──────────────────────────

export async function sendSubscriptionExpiredEmail({ proEmail, proName = '', expiredAt }) {
  if (!proEmail) return;
  const subject = '⚠️ Votre abonnement professionnel a expiré';
  const renewLink = `${FRONTEND_URL}/mes-comptes-pro`;
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #fca5a5;border-radius:8px;">
      <div style="background:#dc2626;border-radius:6px 6px 0 0;padding:16px 24px;margin:-24px -24px 24px;">
        <h2 style="color:#ffffff;margin:0;">Abonnement expiré</h2>
      </div>
      <p style="color:#374151;">Bonjour <strong>${proName}</strong>,</p>
      <p style="color:#374151;">Votre abonnement a expiré le <strong>${formatDate(expiredAt)}</strong>.</p>
      <p style="color:#374151;">Votre compte n'est plus visible pour les utilisateurs. Renouvelez pour retrouver un accès complet.</p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${renewLink}"
           style="background:#dc2626;color:#ffffff;padding:14px 36px;border-radius:6px;
                  text-decoration:none;font-size:16px;font-weight:bold;display:inline-block;">
          Renouveler mon abonnement
        </a>
      </div>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:11px;text-align:center;">© Moftal — ${new Date().getFullYear()}</p>
    </div>`;
  await sendAutomatic({ to: proEmail, toName: proName, subject, htmlContent });
}

/** Brevo HTTP API — replaces nodemailer (incompatible with Workers) */

const BREVO_API = 'https://api.brevo.com/v3/smtp/email';

export async function sendEmail({ apiKey, to, subject, html, from, fromName }) {
  const payload = {
    sender: { email: from ?? 'noreply@enfants-adam.app', name: fromName ?? 'Les Enfants d\'Adam' },
    to: Array.isArray(to) ? to : [{ email: to }],
    subject,
    htmlContent: html,
  };
  const res = await fetch(BREVO_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo error ${res.status}: ${err}`);
  }
  return res.json();
}

export async function sendPasswordResetEmail({ apiKey, toEmail, resetLink, prenom }) {
  return sendEmail({
    apiKey,
    to: toEmail,
    subject: 'Réinitialisation de votre mot de passe — Les Enfants d\'Adam',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#065f46">Réinitialisation du mot de passe</h2>
        <p>Bonjour ${prenom ?? ''},</p>
        <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :</p>
        <p><a href="${resetLink}" style="background:#065f46;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none">
          Réinitialiser mon mot de passe
        </a></p>
        <p style="color:#666;font-size:13px">Ce lien expire dans 1 heure.</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail({ apiKey, toEmail, prenom, numeroH }) {
  return sendEmail({
    apiKey,
    to: toEmail,
    subject: 'Bienvenue dans la famille — Les Enfants d\'Adam',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto">
        <h2 style="color:#065f46">Bienvenue, ${prenom} !</h2>
        <p>Votre compte a été créé avec succès.</p>
        <p>Votre numéro de famille : <strong>${numeroH}</strong></p>
        <p>Conservez ce numéro précieusement — il vous identifie au sein de la plateforme.</p>
      </div>
    `,
  });
}

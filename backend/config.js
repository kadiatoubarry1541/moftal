
const config = {
  PORT: process.env.PORT || 5002,
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 5432,
  DB_NAME: process.env.DB_NAME || 'enfants_adam_eve',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  // En production, le secret doit venir de l'environnement (la valeur de secours
  // est connue de tous ceux qui lisent le code : n'importe qui fabriquerait un jeton).
  JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
    ? (console.error('🚨 JWT_SECRET absent en production : définissez-le sur Render !'), 'enfants-adam-dev-only-change-in-production')
    : 'enfants-adam-dev-only-change-in-production'),
  JWT_EXPIRE: process.env.JWT_EXPIRE || '365d',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 10,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // ── Emails ────────────────────────────────────────────────────────────────
  // Expéditeur commun à tous les fournisseurs
  FROM_EMAIL:  process.env.FROM_EMAIL  || 'noreply@moftal.com',
  FROM_NAME:   process.env.FROM_NAME   || 'Moftal',

  // Brevo — comptes professionnels (reçu paiement, expiration, renouvellement)
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',

  // MailerSend — reset mdp (illimité)
  MAILERSEND_API_KEY: process.env.MAILERSEND_API_KEY || '',

  // Mailjet — reset mdp (200 emails/jour)
  MAILJET_API_KEY:    process.env.MAILJET_API_KEY    || '',
  MAILJET_SECRET_KEY: process.env.MAILJET_SECRET_KEY || '',

  // Resend — secours final (3 000 emails/mois)
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',

  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5002',
};

export { config };
export default config;
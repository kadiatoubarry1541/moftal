if (!process.env.JWT_SECRET) {
  console.warn('⚠️  ATTENTION : JWT_SECRET non défini dans config.env — utilisez une clé secrète forte en production !');
}

const config = {
  PORT: process.env.PORT || 5002,
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 5432,
  DB_NAME: process.env.DB_NAME || 'enfants_adam_eve',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  JWT_SECRET: process.env.JWT_SECRET || 'enfants-adam-dev-only-change-in-production',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // ── Emails ────────────────────────────────────────────────────────────────
  // Expéditeur commun à tous les fournisseurs
  FROM_EMAIL:  process.env.FROM_EMAIL  || 'noreply@enfants-adam.app',
  FROM_NAME:   process.env.FROM_NAME   || "Les Enfants d'Adam",

  // Brevo — comptes professionnels (reçu paiement, expiration, renouvellement)
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',

  // MailerSend — reset mdp (illimité)
  MAILERSEND_API_KEY: process.env.MAILERSEND_API_KEY || '',

  // Mailjet — reset mdp (200 emails/jour)
  MAILJET_API_KEY:    process.env.MAILJET_API_KEY    || '',
  MAILJET_SECRET_KEY: process.env.MAILJET_SECRET_KEY || '',

  // Resend — secours final (3 000 emails/mois)
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',

  // ── FedaPay ───────────────────────────────────────────────────────────────
  FEDAPAY_SECRET_KEY: process.env.FEDAPAY_SECRET_KEY || '',
  FEDAPAY_ENV: process.env.FEDAPAY_ENV || 'sandbox', // 'sandbox' pour tests, 'live' pour production
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5002',
};

export { config };
export default config;
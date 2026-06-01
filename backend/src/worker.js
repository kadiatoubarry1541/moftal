import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// ─── Routes migrées vers Hono + D1 ───────────────────────────────────────────
import authRoutes from './routes/auth.js';
import familyRoutes from './routes/family.js';
import friendsRoutes from './routes/friends.js';
import appointmentsRoutes from './routes/appointments.js';
import professionalsRoutes from './routes/professionals.js';
import notificationsRoutes from './routes/notifications.js';
import paymentRoutes from './routes/payment.js';
import adminRoutes from './routes/admin.js';

const app = new Hono();

// ─── Middleware global ────────────────────────────────────────────────────────
app.use('*', logger());

app.use('*', async (c, next) => {
  const corsOrigin = c.env?.CORS_ORIGIN ?? '*';
  return cors({
    origin: corsOrigin,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })(c, next);
});

// ─── Routes API ───────────────────────────────────────────────────────────────
app.route('/api/auth', authRoutes);
app.route('/api/family', familyRoutes);
app.route('/api/friends', friendsRoutes);
app.route('/api/appointments', appointmentsRoutes);
app.route('/api/professionals', professionalsRoutes);
app.route('/api/notifications', notificationsRoutes);
app.route('/api/payment', paymentRoutes);
app.route('/api/admin', adminRoutes);

// ─── Santé ────────────────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('/', (c) => c.json({
  name: "Moftal — API",
  version: '2.0.0',
  runtime: 'Cloudflare Workers + Hono + D1',
}));

app.notFound((c) => c.json({ success: false, message: 'Route non trouvée' }, 404));

app.onError((err, c) => {
  console.error('Worker error:', err);
  return c.json({ success: false, message: 'Erreur interne' }, 500);
});

// ─── Cron : vérification abonnements expirés ──────────────────────────────────
export default {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    // vérifier abonnements expirés chaque nuit à 2h
    const { dbAll, dbRun, now } = await import('./helpers/db.js');
    const expired = await dbAll(env.DB,
      `SELECT id FROM users WHERE subscription_expires_at < ? AND subscription_status = 'active'`,
      [now()]
    );
    for (const u of expired) {
      await dbRun(env.DB,
        `UPDATE users SET subscription_status = 'expired' WHERE id = ?`,
        [u.id]
      );
    }
    console.log(`Cron: ${expired.length} abonnements expirés traités.`);
  },
};

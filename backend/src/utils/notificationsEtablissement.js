import { sequelize } from '../config/database.js';
import Notification from '../models/Notification.js';

/**
 * Notifications envoyées par un établissement (école, madrasa…) à ses membres.
 *
 * Chaque notification va dans la cloche de la personne (table « notifications »,
 * avec l'alerte sur son téléphone) ET dans le journal de l'établissement
 * (« etablissement_notifications »). Dans l'application de l'établissement :
 *   - le responsable (propriétaire, co-responsable « tous les droits », admin
 *     Moftal) voit tout le journal ;
 *   - chaque autre personne (parent, enseignant, employé) ne voit que les siennes.
 *
 * Avant, ces notifications étaient écrites avec des colonnes qui n'existent pas
 * (user_id) et l'erreur était ignorée : elles n'arrivaient jamais.
 */

const Q = sequelize.QueryTypes;
let tablePrete = null;
function preparerTable() {
  if (!tablePrete) {
    tablePrete = sequelize.query(`
      CREATE TABLE IF NOT EXISTS etablissement_notifications (
        id          SERIAL PRIMARY KEY,
        tenant_code VARCHAR(50)  NOT NULL,
        numero_h    VARCHAR(100) NOT NULL,
        type        VARCHAR(50)  NOT NULL DEFAULT 'general',
        titre       VARCHAR(255),
        message     TEXT         NOT NULL,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_etab_notif_tenant ON etablissement_notifications (tenant_code, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_etab_notif_personne ON etablissement_notifications (tenant_code, numero_h);
    `).catch((e) => { tablePrete = null; throw e; });
  }
  return tablePrete;
}

const TITRES = {
  bulletin: '📊 Bulletin disponible',
  school_member: '🏫 Votre établissement',
  pro_connection: '🤝 Réseau professionnel',
  pro_announcement: '📢 Annonce',
  community_join: '👤 Nouveau membre',
  imam_connection: '🕌 Réseau des imams',
  friday_khutba: '🕌 Khutba du vendredi',
  coordinator_msg: '📢 Message du coordinateur',
  inscription: '📝 Nouvelle demande d\'inscription',
  commande: '🛒 Nouvelle commande',
  demande_site: '📩 Nouveau message du site',
};

/** Notification à une personne (cloche + téléphone). Ne bloque jamais l'action en cours. */
export async function notifierUtilisateur(numeroH, type, message, { titre, url } = {}) {
  if (!numeroH || !message) return false;
  try {
    await Notification.createNotification({ recipientNumeroH: String(numeroH), type, title: titre || TITRES[type] || 'Notification', message, url });
    return true;
  } catch (e) {
    console.error('Notification non enregistrée :', e.message);
    return false;
  }
}

/** Notification d'un établissement à un de ses membres (gardée aussi dans son journal). */
export async function notifierMembreEtablissement(tenantCode, numeroH, type, message, { titre, url } = {}) {
  if (!tenantCode || !numeroH || !message) return false;
  const t = titre || TITRES[type] || 'Notification';
  try {
    await preparerTable();
    await sequelize.query(
      `INSERT INTO etablissement_notifications (tenant_code, numero_h, type, titre, message) VALUES (:code, :nh, :type, :titre, :msg)`,
      { replacements: { code: tenantCode, nh: String(numeroH), type, titre: t, msg: message } }
    );
  } catch (e) { console.error('Journal des notifications :', e.message); }
  return notifierUtilisateur(numeroH, type, message, { titre: t, url });
}

/** Le compte connecté est-il responsable de l'établissement (voit tout le journal) ? */
async function estResponsable(tenant, req) {
  const nh = String(req.userId || '').toLowerCase();
  const role = req.user?.role || '';
  if (req.user?.isMasterAdmin || role === 'admin' || role === 'super-admin') return true;
  if (String(tenant.owner_numero_h || '').toLowerCase() === nh) return true;
  const [acces] = await sequelize.query(
    `SELECT 1 AS ok FROM management_staff_access WHERE tenant_code = :code AND LOWER(numero_h) = :nh AND is_active = true AND niveau = 'total' LIMIT 1`,
    { replacements: { code: tenant.tenant_code, nh }, type: Q.SELECT }
  ).catch(() => []);
  return !!acces;
}

/**
 * GET /:tenantCode/notifications-app — avec seulement « authenticate » devant :
 * req.userId est alors la vraie personne connectée (jamais remplacée par le
 * propriétaire comme pour un employé dans la gestion).
 */
export function ajouterRouteNotificationsApp(router, authentifier) {
  router.get('/:tenantCode/notifications-app', authentifier, async (req, res) => {
    try {
      await preparerTable();
      const [tenant] = await sequelize.query(
        'SELECT tenant_code, owner_numero_h FROM management_tenants WHERE tenant_code = :code LIMIT 1',
        { replacements: { code: req.params.tenantCode }, type: Q.SELECT }
      );
      if (!tenant) return res.status(404).json({ success: false, message: 'Établissement introuvable.' });
      const tout = await estResponsable(tenant, req);
      const notifications = await sequelize.query(
        `SELECT n.id, n.numero_h, n.type, n.titre, n.message, n.created_at,
                NULLIF(TRIM(CONCAT(u.prenom, ' ', u.nom_famille)), '') AS destinataire
           FROM etablissement_notifications n
           LEFT JOIN users u ON LOWER(u.numero_h) = LOWER(n.numero_h)
          WHERE n.tenant_code = :code ${tout ? '' : 'AND LOWER(n.numero_h) = LOWER(:nh)'}
          ORDER BY n.created_at DESC LIMIT 200`,
        { replacements: { code: tenant.tenant_code, nh: String(req.userId || '') }, type: Q.SELECT }
      );
      res.json({ success: true, tout, notifications });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  });
}

import { sequelize } from '../config/database.js';

/**
 * Envois rejoués sans doublon (mode hors ligne des gestions internes).
 *
 * Le téléphone garde un enregistrement fait sans internet et le renvoie dès que
 * la connexion revient — parfois deux fois si la connexion coupe pendant
 * l'envoi. Chaque envoi porte un identifiant unique (en-tête
 * « X-Idempotency-Key ») : le serveur ne l'exécute qu'une seule fois et, aux
 * envois suivants, renvoie la même réponse sans rien refaire.
 */
const METHODES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CLE_RE = /^[A-Za-z0-9_-]{8,100}$/;

let tablePrete = null;
function preparerTable() {
  if (!tablePrete) {
    tablePrete = sequelize.query(`
      CREATE TABLE IF NOT EXISTS envois_idempotents (
        cle         VARCHAR(100) PRIMARY KEY,
        etat        VARCHAR(12)  NOT NULL DEFAULT 'en_cours',
        statut_http INTEGER,
        reponse     TEXT,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )`).catch((e) => { tablePrete = null; throw e; });
  }
  return tablePrete;
}

let dernierNettoyage = 0;
function nettoyer() {
  if (Date.now() - dernierNettoyage < 6 * 3600 * 1000) return;
  dernierNettoyage = Date.now();
  sequelize.query(`DELETE FROM envois_idempotents WHERE created_at < NOW() - INTERVAL '14 days'`).catch(() => {});
}

export async function idempotence(req, res, next) {
  const cle = String(req.headers['x-idempotency-key'] || '');
  if (!cle || !METHODES.has(req.method) || !CLE_RE.test(cle)) return next();
  try {
    await preparerTable();
    nettoyer();
    const prendre = () => sequelize.query(
      `INSERT INTO envois_idempotents (cle) VALUES (:cle) ON CONFLICT (cle) DO NOTHING RETURNING cle`,
      { replacements: { cle } }
    ).then(([[r]]) => r);
    let pris = await prendre();
    if (!pris) {
      // Envoi resté « en cours » trop longtemps (serveur redémarré pendant le
      // traitement) : la clé est libérée pour ne pas bloquer l'opération à vie
      await sequelize.query(
        `DELETE FROM envois_idempotents WHERE cle = :cle AND etat = 'en_cours' AND created_at < NOW() - INTERVAL '3 minutes'`,
        { replacements: { cle } }
      );
      pris = await prendre();
    }
    if (!pris) {
      const [[deja]] = await sequelize.query(`SELECT etat, statut_http, reponse FROM envois_idempotents WHERE cle = :cle`, { replacements: { cle } });
      if (deja?.etat === 'fini') {
        res.setHeader('X-Idempotency-Replay', '1');
        res.status(deja.statut_http || 200);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.send(deja.reponse || '{"success":true}');
      }
      return res.status(409).json({ success: false, enCours: true, message: 'Cet enregistrement est déjà en cours d\'envoi.' });
    }
    // Seule une réussite (2xx) est mémorisée : l'opération est faite, elle ne
    // sera jamais refaite. Un refus (session expirée, abonnement, erreur…)
    // libère la clé : après reconnexion ou correction, l'envoi peut réussir.
    // Pas de libération si la connexion du téléphone coupe pendant le
    // traitement : le serveur finit l'opération et mémorise sa réponse.
    const envoyer = res.send.bind(res);
    let note = false;
    res.send = (corps) => {
      if (!note) {
        note = true;
        const statut = res.statusCode;
        const texte = typeof corps === 'string' ? corps : Buffer.isBuffer(corps) ? corps.toString('utf8') : JSON.stringify(corps);
        const requete = statut >= 200 && statut < 300
          ? sequelize.query(`UPDATE envois_idempotents SET etat = 'fini', statut_http = :s, reponse = :r WHERE cle = :cle`,
              { replacements: { cle, s: statut, r: texte } })
          : sequelize.query(`DELETE FROM envois_idempotents WHERE cle = :cle`, { replacements: { cle } });
        requete.catch(() => {});
      }
      return envoyer(corps);
    };
    next();
  } catch (e) {
    console.warn('⚠️ idempotence:', e.message);
    next(); // sans la protection plutôt que bloquer l'enregistrement
  }
}

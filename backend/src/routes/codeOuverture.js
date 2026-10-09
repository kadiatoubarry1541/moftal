import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { sequelize } from '../config/database.js';
import { config } from '../../config.js';

/**
 * Ouverture d'une gestion (gestions.moftal.com) depuis Moftal sans mettre la
 * session dans l'adresse : Moftal demande un code à usage unique, valable
 * quelques minutes, et la gestion l'échange contre la session. Une adresse
 * copiée, partagée ou gardée dans l'historique ne donne donc accès à rien.
 */
const router = express.Router();
const VALIDITE_MIN = 10;

let tablePrete = null;
function preparerTable() {
  if (!tablePrete) {
    tablePrete = sequelize.query(`
      CREATE TABLE IF NOT EXISTS codes_ouverture (
        code       VARCHAR(64) PRIMARY KEY,
        jeton      TEXT NOT NULL,
        session    TEXT,
        expire_at  TIMESTAMPTZ NOT NULL
      )`).catch((e) => { tablePrete = null; throw e; });
  }
  return tablePrete;
}

// Créer un code pour la personne connectée (jeton vérifié, rien d'autre)
router.post('/', async (req, res) => {
  try {
    const auth = String(req.headers.authorization || '');
    const jeton = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    try { jwt.verify(jeton, config.JWT_SECRET); }
    catch { return res.status(401).json({ success: false, message: 'Session expirée. Reconnectez-vous.' }); }
    await preparerTable();
    await sequelize.query(`DELETE FROM codes_ouverture WHERE expire_at < NOW()`);
    const code = crypto.randomBytes(24).toString('hex');
    const session = typeof req.body?.session === 'string' ? req.body.session.slice(0, 20000) : null;
    await sequelize.query(
      `INSERT INTO codes_ouverture (code, jeton, session, expire_at) VALUES (:code, :jeton, :session, NOW() + (:min || ' minutes')::interval)`,
      { replacements: { code, jeton, session, min: String(VALIDITE_MIN) } }
    );
    res.json({ success: true, code });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Échanger le code (une seule fois) contre la session
router.post('/echanger', async (req, res) => {
  try {
    const code = String(req.body?.code || '');
    if (!/^[a-f0-9]{48}$/.test(code)) return res.status(400).json({ success: false, message: 'Code invalide.' });
    await preparerTable();
    const [[ligne]] = await sequelize.query(
      `DELETE FROM codes_ouverture WHERE code = :code AND expire_at >= NOW() RETURNING jeton, session`,
      { replacements: { code } }
    );
    if (!ligne) return res.status(404).json({ success: false, message: 'Lien expiré. Rouvrez la gestion depuis Moftal.' });
    res.json({ success: true, token: ligne.jeton, session: ligne.session });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;

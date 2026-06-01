import express from 'express';
import { sequelize } from '../config/database.js';

const router = express.Router();

// GET /api/mairie-public/:code — infos publiques de la mairie
router.get('/:code', async (req, res) => {
  try {
    const [tenant] = await sequelize.query(
      `SELECT * FROM management_tenants WHERE tenant_code = :code AND is_active = true LIMIT 1`,
      { replacements: { code: req.params.code }, type: sequelize.QueryTypes.SELECT }
    );
    if (!tenant) return res.status(404).json({ success: false, message: 'Mairie introuvable.' });
    res.json({ success: true, mairie: tenant });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/mairie-public/:code/agents — agents publics (actifs uniquement)
router.get('/:code/agents', async (req, res) => {
  try {
    const agents = await sequelize.query(
      `SELECT id, nom, prenom, role FROM mairie_agents WHERE tenant_code = :code AND is_active = true ORDER BY nom`,
      { replacements: { code: req.params.code }, type: sequelize.QueryTypes.SELECT }
    );
    res.json({ success: true, agents });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/mairie-public/:code/stats — statistiques publiques du mois
router.get('/:code/stats', async (req, res) => {
  try {
    const code = req.params.code;
    const q = (sql) => sequelize.query(sql, { replacements: { code }, type: sequelize.QueryTypes.SELECT })
      .then(r => r[0]).catch(() => ({ c: 0 }));
    const [mariages, naissances, deces, residences, agents] = await Promise.all([
      q(`SELECT COUNT(*) as c FROM mairie_mariages WHERE tenant_code=:code AND statut='valide' AND DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW())`),
      q(`SELECT COUNT(*) as c FROM mairie_naissances WHERE tenant_code=:code AND statut='valide' AND DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW())`),
      q(`SELECT COUNT(*) as c FROM mairie_deces WHERE tenant_code=:code AND statut='valide' AND DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW())`),
      q(`SELECT COUNT(*) as c FROM mairie_residences WHERE tenant_code=:code AND statut='valide' AND DATE_TRUNC('month',created_at)=DATE_TRUNC('month',NOW())`),
      q(`SELECT COUNT(*) as c FROM mairie_agents WHERE tenant_code=:code AND is_active=true`),
    ]);
    res.json({
      success: true,
      stats: {
        mariages: +(mariages.c || 0),
        naissances: +(naissances.c || 0),
        deces: +(deces.c || 0),
        residences: +(residences.c || 0),
        agents: +(agents.c || 0),
      }
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

export default router;

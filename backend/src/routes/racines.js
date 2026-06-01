import express from 'express';
import { Op } from 'sequelize';
import { authenticate } from '../middleware/auth.js';
import User from '../models/User.js';
import { sequelize } from '../config/database.js';

const router = express.Router();

// GET /api/racines/ma-communaute
// Retourne tous les membres ayant la même ethnie que l'utilisateur connecté
router.get('/ma-communaute', authenticate, async (req, res) => {
  try {
    const ethnie = req.user.ethnie;

    if (!ethnie) {
      return res.json({ success: true, ethnie: null, members: [], total: 0 });
    }

    const members = await User.findAll({
      where: {
        ethnie,
        isActive: { [Op.ne]: false }
      },
      attributes: ['numeroH', 'prenom', 'nomFamille', 'photo', 'pays', 'generation', 'ville', 'regionOrigine'],
      order: [['prenom', 'ASC']],
      limit: 500
    });

    res.json({
      success: true,
      ethnie,
      total: members.length,
      members: members.map(m => ({
        numeroH: m.numeroH,
        prenom: m.prenom || '',
        nomFamille: m.nomFamille || '',
        photo: m.photo || null,
        pays: m.pays || '',
        ville: m.ville || '',
        generation: m.generation || '',
        regionOrigine: m.regionOrigine || ''
      }))
    });
  } catch (err) {
    console.error('[Racines] Erreur ma-communaute:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/racines/stats
// Retourne toutes les ethnies avec leur nombre de membres
router.get('/stats', authenticate, async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT ethnie, COUNT(*) as total FROM users WHERE ethnie IS NOT NULL AND ethnie != '' GROUP BY ethnie ORDER BY total DESC`
    );
    res.json({ success: true, stats: rows });
  } catch (err) {
    console.error('[Racines] Erreur stats:', err);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

export default router;

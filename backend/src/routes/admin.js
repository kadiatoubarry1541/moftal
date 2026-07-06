import express from 'express';
import { Op } from 'sequelize';
import User from '../models/User.js';
import { sequelize } from '../config/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification et les privilèges admin
router.use(authenticate);
router.use(requireAdmin);

// @route   GET /api/admin/users
// @desc    Récupérer tous les utilisateurs (avec filtres optionnels)
// @access  Admin
router.get('/users', async (req, res) => {
  try {
    const { search, role, type, isActive, limit = 10000, offset = 0 } = req.query;

    // Construire les conditions de recherche
    const where = {};

    if (search) {
      where[Op.or] = [
        { prenom:      { [Op.iLike]: `%${search}%` } },
        { nomFamille:  { [Op.iLike]: `%${search}%` } },
        { numeroH:     { [Op.iLike]: `%${search}%` } },
        { email:       { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (role) where.role = role;
    if (type) where.type = type;
    // isActive : seulement si explicitement demandé — par défaut on voit TOUS les utilisateurs
    if (isActive === 'true')  where.isActive = true;
    if (isActive === 'false') where.isActive = false;

    // Récupérer les utilisateurs — tous, sans filtre caché
    const users = await User.findAndCountAll({
      where,
      limit:  Math.min(parseInt(limit) || 10000, 50000),
      offset: parseInt(offset) || 0,
      order:  [['created_at', 'DESC']],
      attributes: { exclude: ['password'] }
    });
    
    res.json({
      success: true,
      total: users.count,
      users: users.rows,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(users.count / limit)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des utilisateurs'
    });
  }
});

// @route   GET /api/admin/users/:numeroH
// @desc    Récupérer un utilisateur spécifique
// @access  Admin
router.get('/users/:numeroH', async (req, res) => {
  try {
    const { numeroH } = req.params;
    
    const user = await User.findByNumeroH(numeroH);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    const userWithoutPassword = user.toJSON();
    delete userWithoutPassword.password;
    
    res.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération de l\'utilisateur'
    });
  }
});

// @route   PUT /api/admin/users/:numeroH
// @desc    Mettre à jour un utilisateur
// @access  Admin
router.put('/users/:numeroH', async (req, res) => {
  try {
    const { numeroH } = req.params;
    const updates = req.body;
    
    // Ne pas permettre la modification du mot de passe via cette route
    delete updates.password;
    
    const user = await User.findByNumeroH(numeroH);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Mettre à jour l'utilisateur
    await user.update(updates);
    
    const userWithoutPassword = user.toJSON();
    delete userWithoutPassword.password;
    
    res.json({
      success: true,
      message: 'Utilisateur mis à jour avec succès',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour de l\'utilisateur'
    });
  }
});

// @route   PATCH /api/admin/users/:numeroH/toggle-status
// @desc    Activer/Désactiver un utilisateur
// @access  Admin
router.patch('/users/:numeroH/toggle-status', async (req, res) => {
  try {
    const { numeroH } = req.params;
    
    const user = await User.findByNumeroH(numeroH);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Ne pas permettre de désactiver son propre compte
    if (user.numeroH === req.user.numeroH) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas désactiver votre propre compte'
      });
    }
    
    // Basculer le statut
    user.isActive = !user.isActive;
    await user.save();
    
    const userWithoutPassword = user.toJSON();
    delete userWithoutPassword.password;
    
    res.json({
      success: true,
      message: `Utilisateur ${user.isActive ? 'activé' : 'désactivé'} avec succès`,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erreur lors du changement de statut:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du changement de statut'
    });
  }
});

// @route   PATCH /api/admin/users/:numeroH/role
// @desc    Changer le rôle d'un utilisateur
// @access  Admin
router.patch('/users/:numeroH/role', async (req, res) => {
  try {
    const { numeroH } = req.params;
    const { role } = req.body;
    
    if (!['user', 'admin', 'super-admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rôle invalide'
      });
    }
    
    const user = await User.findByNumeroH(numeroH);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Ne pas permettre de changer son propre rôle
    if (user.numeroH === req.user.numeroH) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas modifier votre propre rôle'
      });
    }
    
    user.role = role;
    await user.save();
    
    const userWithoutPassword = user.toJSON();
    delete userWithoutPassword.password;
    
    res.json({
      success: true,
      message: `Rôle mis à jour en ${role} avec succès`,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erreur lors du changement de rôle:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du changement de rôle'
    });
  }
});

// @route   DELETE /api/admin/users/:numeroH
// @desc    Supprimer un utilisateur
// @access  Admin
router.delete('/users/:numeroH', async (req, res) => {
  try {
    const { numeroH } = req.params;
    
    const user = await User.findByNumeroH(numeroH);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    // Ne pas permettre de supprimer son propre compte
    if (user.numeroH === req.user.numeroH) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }
    
    // Supprimer l'utilisateur
    await user.destroy();
    
    res.json({
      success: true,
      message: 'Utilisateur supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression de l\'utilisateur'
    });
  }
});

// @route   GET /api/admin/stats
// @desc    Récupérer les statistiques de la plateforme
// @access  Admin
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalVivants,
      totalDefunts,
      totalAdmins,
      recentUsers
    ] = await Promise.all([
      User.count(),
      User.count({ where: { isActive: true } }),
      User.count({ where: { isActive: false } }),
      User.count({ where: { type: 'vivant' } }),
      User.count({ where: { type: 'defunt' } }),
      User.count({ where: { role: { [Op.in]: ['admin', 'super-admin'] } } }),
      User.findAll({
        limit: 10,
        order: [['created_at', 'DESC']],
        attributes: ['numeroH', 'prenom', 'nomFamille', 'created_at']
      })
    ]);
    
    // Compter les familles uniques
    const families = await User.findAll({
      attributes: ['nomFamille'],
      group: ['nomFamille']
    });
    
    res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalVivants,
        totalDefunts,
        totalAdmins,
        totalFamilies: families.length,
        recentUsers
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des statistiques'
    });
  }
});

// @route   GET /api/admin/families
// @desc    Récupérer toutes les familles avec leurs membres
// @access  Admin
router.get('/families', async (req, res) => {
  try {
    // Grouper par famille
    const families = await User.findAll({
      attributes: ['nomFamille'],
      group: ['nomFamille'],
      order: [['nomFamille', 'ASC']]
    });
    
    const familyData = await Promise.all(
      families.map(async (family) => {
        const members = await User.findAll({
          where: { nomFamille: family.nomFamille },
          attributes: { exclude: ['password'] },
          order: [['prenom', 'ASC']]
        });
        
        return {
          nomFamille: family.nomFamille,
          memberCount: members.length,
          members
        };
      })
    );
    
    res.json({
      success: true,
      totalFamilies: familyData.length,
      families: familyData
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des familles:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des familles'
    });
  }
});

// @route   GET /api/admin/search
// @desc    Recherche avancée d'utilisateurs
// @access  Admin
router.get('/search', async (req, res) => {
  try {
    const { q, type, role, generation, pays, ethnie } = req.query;
    
    const where = {};
    
    if (q) {
      where[Op.or] = [
        { prenom: { [Op.iLike]: `%${q}%` } },
        { nomFamille: { [Op.iLike]: `%${q}%` } },
        { numeroH: { [Op.iLike]: `%${q}%` } }
      ];
    }
    
    if (type) where.type = type;
    if (role) where.role = role;
    if (generation) where.generation = generation;
    if (pays) where.pays = pays;
    if (ethnie) where.ethnie = ethnie;
    
    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      limit: 50,
      order: [['prenom', 'ASC']]
    });
    
    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la recherche'
    });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/admin/narrateurs-reci
// Liste tous les narrateurs ayant publié au moins un récit,
// avec leur numéro de contact pour paiement
// ─────────────────────────────────────────────────────────────────
router.get('/narrateurs-reci', async (req, res) => {
  try {
    // Tous les auteurs uniques ayant publié
    const stories = await sequelize.query(
      `SELECT DISTINCT ON (ps.numero_h)
         ps.numero_h, ps.author_name, COUNT(*) OVER (PARTITION BY ps.numero_h) as nb_recits,
         MAX(ps.published_at) OVER (PARTITION BY ps.numero_h) as derniere_publication,
         u.narrateur_contact, u.pays
       FROM published_stories ps
       LEFT JOIN users u ON u.numero_h = ps.numero_h
       WHERE ps.is_published = true
       ORDER BY ps.numero_h, ps.published_at DESC`,
      { type: sequelize.QueryTypes.SELECT }
    ).catch(() => []);

    res.json({
      success: true,
      total: stories.length,
      narrateurs: stories.map(s => ({
        numeroH: s.numero_h,
        nom: s.author_name,
        nbRecits: Number(s.nb_recits),
        dernierRecit: s.derniere_publication,
        contact: s.narrateur_contact || null,
        pays: s.pays || null,
      }))
    });
  } catch (e) {
    console.error('narrateurs-reci:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/admin/arbres-activation
// Liste tous les arbres avec statut d'activation (payé ou non)
// ─────────────────────────────────────────────────────────────────
import { FamilyTree } from '../models/additional.js';

router.get('/arbres-activation', async (req, res) => {
  try {
    const trees = await FamilyTree.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']]
    });

    const result = trees.map(t => {
      const nb = Array.isArray(t.members) ? t.members.length : 0;
      return {
        id: t.id,
        familyName: t.familyName || '—',
        memberCount: nb,
        arbreActive: !!t.arbreActive,
        familyCode: t.familyCode || null,
        bloodNumber: t.bloodNumber || null,
        activationRef: t.activationPaiementRef || null,
        createdAt: t.createdAt,
      };
    });

    const actives   = result.filter(t => t.arbreActive);
    const inactives = result.filter(t => !t.arbreActive && t.memberCount >= 3);
    const enAttente = result.filter(t => !t.arbreActive && t.memberCount < 3);

    res.json({
      success: true,
      total: result.length,
      nbActives: actives.length,
      nbInactives: inactives.length,
      nbEnAttente: enAttente.length,
      arbres: result,
    });
  } catch (e) {
    console.error('arbres-activation:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/admin/activer-arbre/:treeId
// Activation manuelle d'un arbre par l'admin (après réception du paiement)
// ─────────────────────────────────────────────────────────────────
router.post('/activer-arbre/:treeId', async (req, res) => {
  try {
    const tree = await FamilyTree.findByPk(req.params.treeId);
    if (!tree) return res.status(404).json({ success: false, message: 'Arbre introuvable.' });

    await tree.update({
      arbreActive: true,
      activationPaiementRef: `ADMIN-MANUEL-${req.user.numeroH}-${Date.now()}`,
    });

    res.json({
      success: true,
      message: `✅ Arbre de la famille "${tree.familyName}" activé manuellement.`,
    });
  } catch (e) {
    console.error('activer-arbre:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/admin/desactiver-arbre/:treeId
// Désactivation manuelle (en cas d'erreur ou de remboursement)
// ─────────────────────────────────────────────────────────────────
router.post('/desactiver-arbre/:treeId', async (req, res) => {
  try {
    const tree = await FamilyTree.findByPk(req.params.treeId);
    if (!tree) return res.status(404).json({ success: false, message: 'Arbre introuvable.' });
    await tree.update({ arbreActive: false, activationPaiementRef: null });
    res.json({ success: true, message: `Arbre "${tree.familyName}" désactivé.` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;


































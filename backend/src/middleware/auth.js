import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../../config.js';

// NumeroH des comptes administrateurs spéciaux
const MASTER_ADMIN_NUMEROS = ['G7C7P7R7E7F7 7', 'G0C0P0R0E0F0 0'];

// Alias pour authenticateToken (compatibilité)
export const authenticateToken = async (req, res, next) => {
  return authenticate(req, res, next);
};

// Middleware pour vérifier l'authentification
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise - Token manquant'
      });
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token invalide ou vide'
      });
    }

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);

      const user = await User.findByNumeroH(decoded.numeroH);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Compte désactivé'
        });
      }

      req.user = user;
      req.userId = user.numeroH;

      // Donner les droits master admin aux comptes admins reconnus (via JWT uniquement)
      if (MASTER_ADMIN_NUMEROS.includes(user.numeroH)) {
        req.user.isMasterAdmin = true;
        req.user.bypassRestrictions = true;
        req.user.canViewAll = true;
        req.user.canEditAll = true;
        req.user.canDeleteAll = true;
      }

      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expiré - veuillez vous reconnecter',
          expired: true
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Token invalide - veuillez vous reconnecter'
      });
    }
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'authentification'
    });
  }
};

/** Zakat / page Zaka : uniquement profil religion Islam ou administrateur */
export const requireMuslimOrAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }
    const role = (req.user.role || '').toLowerCase();
    const isAdminUser =
      role === 'admin' ||
      role === 'super-admin' ||
      req.user.isAdmin === true ||
      MASTER_ADMIN_NUMEROS.includes(req.user.numeroH);
    if (isAdminUser) {
      next();
      return;
    }
    if (req.user.religion === 'Islam') {
      next();
      return;
    }
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux comptes enregistrés comme musulmans'
    });
  } catch (e) {
    console.error('requireMuslimOrAdmin:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Middleware pour vérifier que l'utilisateur est admin
export const requireAdmin = async (req, res, next) => {
  try {
    // S'assurer que l'utilisateur est authentifié
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }
    
    // Super admin (G7) et petit admin (G0) bypass les vérifications de rôle
    if (req.user.numeroH === 'G7C7P7R7E7F7 7' || req.user.numeroH === 'G0C0P0R0E0F0 0') {
      next();
      return;
    }

    // Vérifier le rôle
    if (req.user.role !== 'admin' && req.user.role !== 'super-admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Privilèges administrateur requis'
      });
    }
    
    next();
  } catch (error) {
    console.error('Erreur de vérification admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vérification des privilèges'
    });
  }
};

// Middleware pour vérifier que l'utilisateur est super-admin
export const requireSuperAdmin = async (req, res, next) => {
  try {
    // S'assurer que l'utilisateur est authentifié
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }
    
    // Vérifier le rôle
    if (req.user.role !== 'super-admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès refusé - Privilèges super-administrateur requis'
      });
    }
    
    next();
  } catch (error) {
    console.error('Erreur de vérification super-admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vérification des privilèges'
    });
  }
};

// Middleware spécial pour l'administrateur principal - Accès complet sans restriction
export const requireMasterAdmin = async (req, res, next) => {
  try {
    // S'assurer que l'utilisateur est authentifié
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise'
      });
    }
    
    // Vérifier si c'est le compte administrateur principal
    const masterAdminNumeroH = 'G7C7P7R7E7F7 7';

    if (req.user.numeroH === masterAdminNumeroH) {
      // Accès complet sans restriction
      req.user.isMasterAdmin = true;
      req.user.canViewAll = true;
      req.user.canEditAll = true;
      req.user.canDeleteAll = true;
      req.user.canManageUsers = true;
      req.user.canManageContent = true;
      req.user.canManageSystem = true;
      req.user.bypassRestrictions = true;
      next();
      return;
    }
    
    return res.status(403).json({
      success: false,
      message: 'Accès refusé - Privilèges administrateur principal requis'
    });
  } catch (error) {
    console.error('Erreur de vérification master-admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vérification des privilèges'
    });
  }
};

// Middleware pour bypasser toutes les restrictions pour l'admin principal
export const bypassAllRestrictions = async (req, res, next) => {
  try {
    if (req.user && req.user.numeroH === 'G7C7P7R7E7F7 7') {
      // L'administrateur principal peut tout faire
      req.user.isMasterAdmin = true;
      req.user.canViewAll = true;
      req.user.canEditAll = true;
      req.user.canDeleteAll = true;
      req.user.canManageUsers = true;
      req.user.canManageContent = true;
      req.user.canManageSystem = true;
      req.user.bypassRestrictions = true;
    }
    next();
  } catch (error) {
    console.error('Erreur bypass restrictions:', error);
    next(); // Continuer même en cas d'erreur
  }
};












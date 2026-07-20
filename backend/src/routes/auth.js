import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { Router } from 'express';
import { Op } from 'sequelize';
import User from '../models/User.js';
import DeceasedMember from '../models/DeceasedMember.js';
import FamilyTreeConfirmation from '../models/FamilyTreeConfirmation.js';
import { FamilyTree } from '../models/additional.js';
import ActivityGroup from '../models/ActivityGroup.js';
import { config } from '../../config.js';
import upload from '../middleware/upload.js';
import { authenticate, MASTER_ADMIN_NUMEROS } from '../middleware/auth.js';
import { sendPasswordResetEmail, sendPasswordOtpEmail, sendWelcomeEmail, maskEmail } from '../services/emailService.js';

const router = Router();

// G0–G90 sont des générations réservées à l'admin uniquement
function isReservedGeneration(generation) {
  if (!generation) return false;
  const match = String(generation).match(/^G(\d+)$/i);
  if (!match) return false;
  const num = parseInt(match[1], 10);
  return num >= 0 && num <= 90;
}

// Toutes les données utilisateur proviennent uniquement de la base de données PostgreSQL.

// Fonction pour créer un utilisateur de test en base (optionnel, au démarrage)
const loadTestUsers = async () => {
  try {
    // Vérifier s'il y a déjà un utilisateur de test
    const existingTestUser = await User.findByNumeroH('G96C1P2R3E2F1 4');
    if (existingTestUser) {
      return;
    }
    
    // Créer un utilisateur de test par défaut
    const testUser = await User.create({
      numeroH: 'G96C1P2R3E2F1 4',
      prenom: 'Test',
      nomFamille: 'User',
      email: 'test@example.com',
      password: '$2a$12$LmABvyZWgvyU8dVt0.Lzueh6bNWJXW7J1oXM5qqYSrTNzJHbNj9jO', // bcrypt hash of 'test123'
      genre: 'AUTRE',
      dateNaissance: '1990-01-01',
      generation: 'G96',
      isActive: true,
      isVerified: true,
      role: 'user'
    });
    
  } catch (error) {
    console.error('Erreur chargement utilisateurs de test:', error);
  }
};

// Charger l'utilisateur de test en base au démarrage (si pas déjà présent)
loadTestUsers();

// Fonction pour gérer les confirmations par les parents vivants
async function handleParentConfirmations(user) {
  const confirmations = [];

  // Si le père est fourni, vérifier s'il est vivant
  if (user.numeroHPere) {
    const pere = await User.findOne({ 
      where: { 
        numeroH: user.numeroHPere, 
        type: 'vivant',
        isActive: true 
      } 
    });
    
    if (pere) {
      // Père vivant : créer une confirmation
      const confirmation = await FamilyTreeConfirmation.create({
        childNumeroH: user.numeroH,
        parentNumeroH: user.numeroHPere,
        parentType: 'pere',
        status: 'pending'
      });
      confirmations.push(confirmation);
    } else {
      // Père décédé ou n'existe pas : accès direct
      // L'utilisateur sera ajouté directement à l'arbre
    }
  }

  // Si la mère est fournie, vérifier si elle est vivante
  if (user.numeroHMere) {
    const mere = await User.findOne({ 
      where: { 
        numeroH: user.numeroHMere, 
        type: 'vivant',
        isActive: true 
      } 
    });
    
    if (mere) {
      // Mère vivante : créer une confirmation
      const confirmation = await FamilyTreeConfirmation.create({
        childNumeroH: user.numeroH,
        parentNumeroH: user.numeroHMere,
        parentType: 'mere',
        status: 'pending'
      });
      confirmations.push(confirmation);
    } else {
      // Mère décédée ou n'existe pas : accès direct
    }
  }

  // Si les deux parents sont décédés ou n'existent pas, ajouter directement à l'arbre
  const pereVivant = user.numeroHPere ? await User.findOne({ 
    where: { 
      numeroH: user.numeroHPere, 
      type: 'vivant', 
      isActive: true 
    } 
  }) : null;
  
  const mereVivante = user.numeroHMere ? await User.findOne({ 
    where: { 
      numeroH: user.numeroHMere, 
      type: 'vivant', 
      isActive: true 
    } 
  }) : null;

  if (!pereVivant && !mereVivante) {
    // Les deux parents sont décédés ou n'existent pas, accès direct
    await addUserToFamilyTree(user.numeroH, user.numeroHPere, user.numeroHMere);
  }

  return confirmations;
}

// Fonction pour ajouter un utilisateur à l'arbre familial
async function addUserToFamilyTree(numeroH, numeroHPere, numeroHMere) {
  
  // Trouver ou créer l'arbre
  let tree = await FamilyTree.findOne({
    where: {
      [Op.or]: [
        { numeroHPere, numeroHMere },
        { members: { [Op.contains]: [numeroH] } }
      ],
      isActive: true
    }
  });

  if (!tree && (numeroHPere || numeroHMere)) {
    // Chercher un arbre existant avec les mêmes parents
    tree = await FamilyTree.findOne({
      where: {
        [Op.or]: [
          { numeroHPere, numeroHMere },
          { numeroHPere, numeroHMere: null },
          { numeroHPere: null, numeroHMere }
        ],
        isActive: true
      }
    });
  }

  if (tree) {
    // Ajouter l'utilisateur à l'arbre existant
    const members = tree.members || [];
    if (!members.includes(numeroH)) {
      members.push(numeroH);
      await tree.update({ members });
    }
  } else {
    // Créer un nouvel arbre
    const user = await User.findOne({ where: { numeroH } });
    tree = await FamilyTree.create({
      rootMember: numeroH,
      numeroHPere: numeroHPere || user?.numeroHPere || null,
      numeroHMere: numeroHMere || user?.numeroHMere || null,
      members: [numeroH],
      deceasedMembers: []
    });
  }

  return tree;
}

// Fonction pour créer automatiquement les groupes d'activités et ajouter l'utilisateur
async function createActivityGroupsForUser(user) {
  try {
    const activities = [
      { type: 'Activité1', value: user.activite1 },
      { type: 'Activité2', value: user.activite2 },
      { type: 'Activité3', value: user.activite3 }
    ];

    for (const activity of activities) {
      if (activity.value) {
        // Chercher ou créer un groupe pour cette activité
        let group = await ActivityGroup.findOne({
          where: {
            activity: activity.type,
            name: activity.value,
            isActive: true
          }
        });

        if (!group) {
          // Créer un nouveau groupe pour cette activité
          group = await ActivityGroup.create({
            name: activity.value,
            description: `Organisation pour ${activity.type}: ${activity.value}`,
            activity: activity.type,
            members: [user.numeroH],
            posts: [],
            createdBy: user.numeroH
          });
        } else {
          // Ajouter l'utilisateur au groupe existant s'il n'est pas déjà membre
          const members = group.members || [];
          if (!members.includes(user.numeroH)) {
            members.push(user.numeroH);
            await group.update({ members });
          }
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors de la création des groupes d\'activités:', error);
    // Ne pas bloquer l'enregistrement si la création des groupes échoue
  }
}

// Fonction pour ajouter un décédé à l'arbre familial
async function addDeceasedToFamilyTree(numeroHD, numeroHPere, numeroHMere) {
  
  // Trouver l'arbre avec les mêmes parents
  let tree = await FamilyTree.findOne({
    where: {
      [Op.or]: [
        { numeroHPere, numeroHMere },
        { numeroHPere, numeroHMere: null },
        { numeroHPere: null, numeroHMere }
      ],
      isActive: true
    }
  });

  if (tree) {
    // Ajouter le décédé à l'arbre existant
    const deceasedMembers = tree.deceasedMembers || [];
    if (!deceasedMembers.includes(numeroHD)) {
      deceasedMembers.push(numeroHD);
      await tree.update({ deceasedMembers });
    }
  } else {
    // Créer un nouvel arbre pour les décédés
    tree = await FamilyTree.create({
      rootMember: numeroHD,
      numeroHPere: numeroHPere || null,
      numeroHMere: numeroHMere || null,
      members: [],
      deceasedMembers: [numeroHD]
    });
  }

  return tree;
}

// Middleware de validation
const validateUser = [
  // numeroH optionnel pour les défunts (le backend génère le numeroHD automatiquement)
  body('numeroH').if((value, { req }) => req.body.type !== 'defunt' && !req.body.isDeceased).trim().notEmpty().withMessage('Le NumeroH est requis'),
  body('prenom').trim().notEmpty().withMessage('Le prénom est requis'),
  body('nomFamille').trim().notEmpty().withMessage('Le nom de famille est requis'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Email invalide'),
];

// @route   POST /api/auth/register
// @desc    Enregistrer un nouvel utilisateur
// @access  Public
router.post('/register', validateUser, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errList = errors.array();
      console.warn('[register] Validation échouée:', errList.map(e => ({ path: e.path, msg: e.msg })));
      console.warn('[register] Body reçu (clés):', Object.keys(req.body || {}));
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errList
      });
    }

    // Extraire les données nécessaires
    const { numeroH, email, password } = req.body;

    // Bloquer G0–G90 : générations réservées à l'admin
    const generationDemandee = req.body.generation || 'G1';
    if (isReservedGeneration(generationDemandee)) {
      return res.status(400).json({
        success: false,
        message: 'Ce numéro est impossible. Notre plateforme existe depuis 2025, aucun vivant ne peut avoir ce numéro.'
      });
    }

    // Hasher le mot de passe
    const saltRounds = config.BCRYPT_ROUNDS;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Créer l'objet utilisateur avec TOUS les champs du formulaire
    const userData = {
      ...req.body, // Tous les champs du formulaire
      password: hashedPassword, // Remplacer par le mot de passe hashé
      numeroH: numeroH,
      genre: req.body.genre || 'AUTRE',
      dateNaissance: req.body.dateNaissance || null,
      generation: req.body.generation || 'G1',
      type: req.body.type || 'vivant',
      isActive: true,
      isVerified: false,
      role: 'user'
    };

    // Timeout 25 s max pour ne jamais bloquer plus d'une minute
    const REGISTER_TIMEOUT_MS = 25000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), REGISTER_TIMEOUT_MS)
    );

    try {
      const registerWork = (async () => {
      // Pour les défunts, pas de compte utilisateur → pas de vérification de doublon
      if (!userData.isDeceased && userData.type !== 'defunt') {
        const where = email && numeroH
          ? { [Op.or]: [{ numeroH }, { email }] }
          : email
            ? { email }
            : { numeroH };
        const existingUser = await User.findOne({ where });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: 'Un utilisateur avec ce NumeroH ou cet email existe déjà'
          });
        }
      }

      // Si l'utilisateur est un défunt, créer un DeceasedMember au lieu d'un User
      if (userData.type === 'defunt' || userData.isDeceased) {
        // Toujours générer un numeroHD propre au format DM0001 côté serveur
        const total = await DeceasedMember.count();
        let seq = total + 1;
        let numeroHD = `DM${String(seq).padStart(4, '0')}`;
        while (await DeceasedMember.findOne({ where: { numeroHD } })) {
          seq++;
          numeroHD = `DM${String(seq).padStart(4, '0')}`;
        }

        const deceasedData = {
          numeroHD,
          prenom: userData.prenom,
          nomFamille: userData.nomFamille,
          genre: userData.genre,
          dateNaissance: userData.dateNaissance,
          dateDeces: userData.dateDeces,
          anneeDeces: userData.anneeDeces,
          lieuNaissance: userData.lieuNaissance,
          lieuDeces: userData.lieuDeces,
          numeroHPere: userData.numeroHPere,
          numeroHMere: userData.numeroHMere,
          prenomPere: userData.prenomPere,
          prenomMere: userData.prenomMere,
          pereStatut: userData.pereStatut || 'Mort',
          mereStatut: userData.mereStatut || 'Mort',
          ethnie: userData.ethnie,
          regionOrigine: userData.regionOrigine,
          pays: userData.pays,
          religion: userData.religion,
          statutSocial: userData.statutSocial,
          generation: userData.generation,
          decet: userData.decet,
          ageObtenu: userData.ageObtenu,
          photo: userData.photo,
          video: userData.video,
          preuve: userData.preuve,
          additionalInfo: userData.additionalInfo || null,
          createdBy: userData.createdBy || null
        };

        const deceased = await DeceasedMember.create(deceasedData);
        
        // Ajouter le décédé à l'arbre familial
        await addDeceasedToFamilyTree(deceased.numeroHD, deceased.numeroHPere, deceased.numeroHMere);
        
        return res.status(201).json({
          success: true,
          message: 'Décédé enregistré dans l\'arbre généalogique (pas de compte créé)',
          deceased: deceased.toJSON()
        });
      }

      // ✅ CRÉER L'UTILISATEUR EN BASE DE DONNÉES
      const newUser = await User.create(userData);

      // Générer le token et préparer la réponse tout de suite
      const token = jwt.sign(
        { userId: newUser.numeroH, numeroH: newUser.numeroH },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRE }
      );
      const userWithoutPassword = { ...newUser.dataValues };
      delete userWithoutPassword.password;

      // ✅ RÉPONSE IMMÉDIATE (< 1 s) : l'utilisateur voit tout de suite le succès
      res.status(201).json({
        success: true,
        message: 'Utilisateur créé avec succès',
        user: userWithoutPassword,
        token
      });

      // Tâches lourdes en arrière-plan (ne bloquent plus la réponse)
      setImmediate(() => {
        if (newUser.numeroHPere || newUser.numeroHMere) {
          handleParentConfirmations(newUser).catch(err => console.error('handleParentConfirmations:', err.message));
        }
        createActivityGroupsForUser(newUser).catch(err => console.error('createActivityGroupsForUser:', err.message));
        if (newUser.email) {
          sendWelcomeEmail({ to: newUser.email, toName: newUser.prenom || '', numeroH: newUser.numeroH })
            .catch(err => console.error('sendWelcomeEmail:', err.message));
        }
      });
      })();

      await Promise.race([registerWork, timeoutPromise]);
    } catch (dbError) {
      if (dbError?.message === 'TIMEOUT' && !res.headersSent) {
        console.error('❌ Inscription: timeout (réponse trop lente)');
        return res.status(503).json({
          success: false,
          message: 'Le serveur met trop de temps à répondre. Réessayez dans un moment.'
        });
      }
      // Erreur de contrainte d'unicité (email ou téléphone déjà utilisé)
      if (dbError?.name === 'SequelizeUniqueConstraintError' || dbError?.parent?.code === '23505') {
        const fields = (dbError.errors || []).map(e => e.path).join(', ');
        let msg = 'Un compte existe déjà avec ces informations.';
        if (fields.includes('email'))  msg = 'Cette adresse email est déjà associée à un compte existant. Utilisez une autre adresse email.';
        else if (fields.includes('tel1') || fields.includes('telephone')) msg = 'Ce numéro de téléphone est déjà associé à un compte existant. Utilisez un autre numéro.';
        else if (fields.includes('numero_h')) msg = 'Un problème de génération du NuméroH est survenu. Réessayez.';
        return res.status(409).json({ success: false, message: msg });
      }
      console.error('❌ Erreur base de données lors de l\'inscription:', dbError);
      return res.status(500).json({
        success: false,
        message: 'La base de données est indisponible. Aucune inscription n\'a été enregistrée. Veuillez réessayer plus tard.'
      });
    }

  } catch (error) {
    console.error('Erreur lors de l\'enregistrement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'enregistrement'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Connexion utilisateur
// @access  Public
router.post('/login', [
  body('numeroH').notEmpty().withMessage('Le NumeroH est requis'),
  body('password').notEmpty().withMessage('Le mot de passe est requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { numeroH, password } = req.body;
    
    try {
      // Normaliser : espaces + remplacer lettre O par chiffre 0
      const normalizedNumeroH = numeroH
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/O/g, '0')
        .replace(/o/g, '0');

      let user = await User.findByNumeroH(normalizedNumeroH);

      if (!user && normalizedNumeroH !== numeroH.trim()) {
        const originalTrimmed = numeroH.trim().replace(/\s+/g, ' ');
        user = await User.findByNumeroH(originalTrimmed);
      }

      // Fallback SQL brut si Sequelize ne trouve pas (problème modèle/colonne)
      if (!user) {
        try {
          const [rows] = await User.sequelize.query(
            'SELECT * FROM users WHERE LOWER(numero_h) = LOWER(:n) LIMIT 1',
            { replacements: { n: normalizedNumeroH }, type: 'SELECT' }
          );
          if (rows && rows.length > 0) {
            const r = rows[0];
            user = {
              numeroH: r.numero_h, password: r.password, role: r.role,
              type: r.type, isActive: r.is_active, isVerified: r.is_verified,
              prenom: r.prenom, nomFamille: r.nom_famille, genre: r.genre,
              generation: r.generation, photo: r.photo,
              update: (data) => User.sequelize.query(
                'UPDATE users SET last_login=NOW() WHERE numero_h=:n',
                { replacements: { n: r.numero_h } }
              ).catch(() => {})
            };
          }
        } catch(sqlErr) {
          console.error('Login SQL fallback error:', sqlErr.message);
        }
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'NumeroH ou mot de passe incorrect',
        });
      }

      if (user.type === 'defunt' || user.isDeceased) {
        return res.status(403).json({
          success: false,
          message: 'Les décédés n\'ont pas de compte. Leurs informations sont dans l\'arbre généalogique.',
          numeroHExists: false
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Mot de passe incorrect',
          numeroHExists: true
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Compte désactivé'
        });
      }

      // Mise à jour lastLogin en arrière-plan, sans bloquer la réponse
      user.update({ lastLogin: new Date() }).catch(() => {});

      const token = jwt.sign(
        { userId: user.numeroH, numeroH: user.numeroH },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRE }
      );

      const userWithoutPassword = { ...user.dataValues };
      delete userWithoutPassword.password;

      res.json({
        success: true,
        message: 'Connexion réussie',
        user: userWithoutPassword,
        token
      });

    } catch (dbError) {
      console.error('❌ Erreur base de données lors de la connexion:', dbError);
      return res.status(500).json({
        success: false,
        message: 'La base de données est indisponible. Connexion impossible pour le moment. Veuillez réessayer plus tard.'
      });
    }

  } catch (error) {
    console.error('💥 Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la connexion'
    });
  }
});

// Normaliser NumeroH (même logique que login)
function normalizeNumeroHForAuth(numeroH) {
  if (!numeroH || typeof numeroH !== 'string') return '';
  return numeroH
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/O/g, '0')
    .replace(/o/g, '0');
}

// @route   POST /api/auth/forgot-password/verify
// @desc    Vérifier l'identité : NumeroH obligatoire, NumeroH parent et code arbre facultatifs
// @access  Public
router.post('/forgot-password/verify', [
  body('numeroH').trim().notEmpty().withMessage('Le NumeroH est requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }
    const { numeroH, parentNumeroH, familyCode } = req.body;
    const normalizedNumeroH = normalizeNumeroHForAuth(numeroH);

    const user = await User.findByNumeroH(normalizedNumeroH);
    if (!user) {
      return res.status(400).json({ success: false, message: 'NumeroH introuvable. Vérifiez votre numéro.' });
    }
    if (user.type === 'defunt' || user.isDeceased) {
      return res.status(403).json({ success: false, message: 'Ce compte ne peut pas réinitialiser un mot de passe.' });
    }
    if (!MASTER_ADMIN_NUMEROS.includes(user.numeroH) && isReservedGeneration(user.generation)) {
      return res.status(400).json({ success: false, message: 'Ce numéro est impossible. Notre plateforme existe depuis 2025, aucun vivant ne peut avoir ce numéro.' });
    }

    // Vérification parent (facultative — si fournie, elle doit correspondre)
    if (parentNumeroH && parentNumeroH.trim()) {
      const normalizedParent = normalizeNumeroHForAuth(parentNumeroH);
      const pereNorm = user.numeroHPere ? normalizeNumeroHForAuth(user.numeroHPere) : '';
      const mereNorm = user.numeroHMere ? normalizeNumeroHForAuth(user.numeroHMere) : '';
      const parentMatch = (pereNorm && pereNorm === normalizedParent) || (mereNorm && mereNorm === normalizedParent);
      if (!parentMatch) {
        return res.status(400).json({ success: false, message: 'Le NumeroH du parent ne correspond pas.' });
      }
    }

    // Vérification arbre familial (facultative — si fournie, elle doit correspondre)
    if (familyCode && familyCode.trim()) {
      const codeStr = String(familyCode).trim().toUpperCase();
      const { Op } = await import('sequelize');
      const familyTree = await FamilyTree.findOne({
        where: { familyCode: { [Op.iLike]: codeStr } }
      });
      if (!familyTree) {
        return res.status(400).json({ success: false, message: 'Code de l\'arbre familial introuvable.' });
      }
      const treeMembers = familyTree.members || [];
      const userInTree = treeMembers.includes(normalizedNumeroH) ||
                         treeMembers.includes(user.numeroH) ||
                         familyTree.rootMember === user.numeroH;
      if (!userInTree) {
        return res.status(400).json({ success: false, message: 'Vous n\'appartenez pas à cet arbre familial.' });
      }
    }

    // Générer un code OTP à 6 chiffres
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Signer un token OTP (contient le code, valide 10 min)
    const otpToken = jwt.sign(
      { numeroH: user.numeroH, code: otpCode, purpose: 'forgot_password_otp' },
      config.JWT_SECRET,
      { expiresIn: '10m' }
    );

    // Envoi du code par email si l'utilisateur a une adresse email — on attend le
    // résultat réel avant de répondre, pour ne jamais annoncer "envoyé" à tort.
    let emailSent = false;
    let maskedEmail = null;
    if (user.email) {
      maskedEmail = maskEmail(user.email);
      const fullName = `${user.prenom || ''} ${user.nomFamille || ''}`.trim() || user.numeroH;
      emailSent = await sendPasswordOtpEmail({
        to: user.email,
        toName: fullName,
        code: otpCode,
      }).catch(err => { console.error('sendPasswordOtpEmail:', err.message); return false; });
    }

    res.json({ success: true, otpToken, emailSent, maskedEmail });
  } catch (err) {
    console.error('forgot-password/verify:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// @route   POST /api/auth/forgot-password/verify-code
// @desc    Vérifier le code OTP envoyé par email → retourne le token de réinitialisation
// @access  Public
router.post('/forgot-password/verify-code', [
  body('otpToken').notEmpty().withMessage('Token OTP requis'),
  body('code').trim().isLength({ min: 6, max: 6 }).withMessage('Code à 6 chiffres requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }
    const { otpToken, code } = req.body;
    let payload;
    try {
      payload = jwt.verify(otpToken, config.JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Code expiré. Recommencez la procédure.' });
    }
    if (payload.purpose !== 'forgot_password_otp' || !payload.numeroH) {
      return res.status(400).json({ success: false, message: 'Token invalide.' });
    }
    if (payload.code !== code.trim()) {
      return res.status(400).json({ success: false, message: 'Code incorrect. Vérifiez le code reçu par email.' });
    }
    const user = await User.findByNumeroH(payload.numeroH);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Compte introuvable.' });
    }
    // Code correct → générer le token de réinitialisation, lié à l'état actuel du
    // compte (pwv) pour qu'il devienne invalide dès qu'il a servi une fois.
    const resetToken = jwt.sign(
      { numeroH: payload.numeroH, purpose: 'forgot_password', pwv: new Date(user.updatedAt).getTime() },
      config.JWT_SECRET,
      { expiresIn: '15m' }
    );
    res.json({ success: true, token: resetToken });
  } catch (err) {
    console.error('forgot-password/verify-code:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// @route   POST /api/auth/forgot-password/reset
// @desc    Réinitialiser le mot de passe avec le token obtenu après vérification
// @access  Public
router.post('/forgot-password/reset', [
  body('token').notEmpty().withMessage('Token requis'),
  body('newPassword').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }
    const { token, newPassword } = req.body;
    let payload;
    try {
      payload = jwt.verify(token, config.JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Lien expiré ou invalide. Recommencez la procédure « Mot de passe oublié ».' });
    }
    if (payload.purpose !== 'forgot_password' || !payload.numeroH) {
      return res.status(400).json({ success: false, message: 'Token invalide.' });
    }

    const user = await User.findByNumeroH(payload.numeroH);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Compte introuvable.' });
    }
    // Le lien/token n'est valable qu'une seule fois : s'il a déjà servi (le compte a
    // changé depuis), on le refuse même s'il n'a pas encore expiré.
    if (payload.pwv !== undefined && payload.pwv !== new Date(user.updatedAt).getTime()) {
      return res.status(400).json({ success: false, message: 'Ce lien a déjà été utilisé. Recommencez la procédure « Mot de passe oublié ».' });
    }
    user.password = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);
    await user.save();
    res.json({ success: true, message: 'Mot de passe modifié. Vous pouvez vous connecter.' });
  } catch (err) {
    console.error('forgot-password/reset:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur.' });
  }
});

// @route   GET /api/auth/last-numero
// @desc    Récupérer le dernier numéro utilisé pour un préfixe donné
// @access  Public
router.get('/last-numero', async (req, res) => {
  try {
    const { prefix } = req.query;
    
    if (!prefix) {
      return res.status(400).json({
        success: false,
        message: 'Le préfixe est requis'
      });
    }
    
    try {
      // Chercher dans la base de données tous les NumeroH qui commencent par ce préfixe
      const users = await User.findAll({
        where: {
          numeroH: {
            [Op.like]: `${prefix}%`
          }
        },
        attributes: ['numeroH']
      });
      
      let maxNumber = 0;
      
      // Extraire le numéro le plus élevé
      users.forEach(user => {
        const numeroH = user.numeroH;
        if (numeroH && numeroH.startsWith(prefix)) {
          const parts = numeroH.split(' ');
          if (parts.length > 1) {
            const number = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(number) && number > maxNumber) {
              maxNumber = number;
            }
          }
        }
      });
      
      res.json({
        success: true,
        lastNumber: maxNumber,
        prefix: prefix
      });
      
    } catch (dbError) {
      console.warn('⚠️ Base de données indisponible pour last-numero:', dbError.message);
      // Retourner 0 si la base n'est pas disponible
      res.json({
        success: true,
        lastNumber: 0,
        prefix: prefix
      });
    }
  } catch (error) {
    console.error('Erreur récupération dernier numéro:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Obtenir les informations complètes de l'utilisateur connecté (rafraîchit la session)
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findByNumeroH(req.user.numeroH);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }
    const userWithoutPassword = { ...user.dataValues };
    delete userWithoutPassword.password;
    // Renouvelle le token à chaque visite pour maintenir la session active
    const newToken = jwt.sign(
      { userId: user.numeroH, numeroH: user.numeroH },
      config.JWT_SECRET,
      { expiresIn: '90d' }
    );
    res.json({ success: true, user: userWithoutPassword, token: newToken });
  } catch (error) {
    console.error('Erreur GET /auth/me:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   POST /api/auth/logout
// @desc    Déconnexion utilisateur
// @access  Private
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Déconnexion réussie'
  });
});

// @route   PUT /api/auth/profile
// @desc    Mettre à jour le profil utilisateur
// @access  Private
router.put('/profile', async (req, res) => {
  try {
    const { numeroH } = req.body;
    
    if (!numeroH) {
      return res.status(400).json({
        success: false,
        message: 'NumeroH requis'
      });
    }

    const user = await User.findByNumeroH(numeroH);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Mettre à jour les champs autorisés
    const allowedFields = [
      'prenom', 'nomFamille', 'email', 'telephone', 'tel1', 'genre',
      'dateNaissance', 'age', 'generation', 'ethnie', 'region', 'pays',
      'nationalite', 'prenomPere', 'nomFamillePere', 'numeroHPere',
      'prenomMere', 'nomFamilleMere', 'numeroHMere', 'treeVisibility',
      'activite1', 'activite2', 'activite3', 'specialite', 'statutMatrimonial',
      'lieu1', 'lieu2', 'lieu3', 'languesAutre'
    ];
    
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    await user.update(updates);

    const userWithoutPassword = { ...user.dataValues };
    delete userWithoutPassword.password;

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour du profil'
    });
  }
});

// @route   POST /api/auth/profile/photo
// @desc    Mettre à jour la photo de profil
// @access  Private
router.post('/profile/photo', (req, res) => {
  // Wrapper multer pour attraper ses erreurs et renvoyer du JSON propre
  upload.single('photo')(req, res, async (multerErr) => {
    if (multerErr) {
      console.error('Erreur multer upload photo:', multerErr);
      return res.status(400).json({
        success: false,
        message: multerErr.message || 'Erreur lors de l\'upload du fichier'
      });
    }

    try {
      const { numeroH } = req.body;

      if (!numeroH) {
        return res.status(400).json({
          success: false,
          message: 'NumeroH requis'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucun fichier fourni'
        });
      }

      const user = await User.findByNumeroH(numeroH);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utilisateur non trouvé'
        });
      }

      const photoUrl = `/uploads/${req.file.filename}`;

      await user.update({ photo: photoUrl });

      const userWithoutPassword = { ...user.dataValues };
      delete userWithoutPassword.password;

      res.json({
        success: true,
        message: 'Photo de profil mise à jour avec succès',
        photoUrl,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la photo:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur serveur lors de la mise à jour de la photo'
      });
    }
  });
});

// @route   POST /api/auth/profile/video
// @desc    Remplacer la vidéo d'inscription (jamais supprimer, seulement remplacer)
// @access  Private
router.post('/profile/video', (req, res) => {
  upload.single('video')(req, res, async (multerErr) => {
    if (multerErr) {
      return res.status(400).json({ success: false, message: multerErr.message || 'Erreur upload vidéo' });
    }
    try {
      const { numeroH } = req.body;
      if (!numeroH) return res.status(400).json({ success: false, message: 'NumeroH requis' });
      if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });

      const user = await User.findByNumeroH(numeroH);
      if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

      const videoUrl = `/uploads/${req.file.filename}`;
      await user.update({ video: videoUrl });

      const userWithoutPassword = { ...user.dataValues };
      delete userWithoutPassword.password;

      res.json({ success: true, message: 'Vidéo mise à jour avec succès', videoUrl, user: userWithoutPassword });
    } catch (error) {
      console.error('Erreur upload vidéo profil:', error);
      res.status(500).json({ success: false, message: 'Erreur serveur lors de la mise à jour de la vidéo' });
    }
  });
});

// @route   PUT /api/auth/me/visibility
// @desc    Définir ce que les autres voient de moi dans l'arbre (name_only | name_photo | name_photo_numeroH)
// @access  Private
router.put('/me/visibility', authenticate, async (req, res) => {
  try {
    const { treeVisibility } = req.body;
    const allowed = ['name_only', 'name_photo', 'name_photo_numeroH'];
    if (!treeVisibility || !allowed.includes(treeVisibility)) {
      return res.status(400).json({
        success: false,
        message: 'treeVisibility requis : name_only, name_photo ou name_photo_numeroH'
      });
    }
    const user = await User.findByNumeroH(req.user.numeroH);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    await user.update({ treeVisibility });
    const out = { ...user.dataValues };
    delete out.password;
    res.json({ success: true, user: out, message: 'Visibilité mise à jour' });
  } catch (error) {
    console.error('Erreur mise à jour visibilité:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   GET /api/auth/me/tree-hidden
// @desc    Liste des numeroH masqués dans mon arbre (je ne les vois plus)
// @access  Private
router.get('/me/tree-hidden', authenticate, async (req, res) => {
  try {
    const user = await User.findByNumeroH(req.user.numeroH);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    const list = Array.isArray(user.treeHidden) ? user.treeHidden : [];
    res.json({ success: true, treeHidden: list });
  } catch (error) {
    console.error('Erreur GET tree-hidden:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   PUT /api/auth/me/tree-hidden
// @desc    Mettre à jour la liste des personnes masquées dans mon arbre
// @access  Private
router.put('/me/tree-hidden', authenticate, async (req, res) => {
  try {
    const { treeHidden } = req.body;
    const user = await User.findByNumeroH(req.user.numeroH);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    const list = Array.isArray(treeHidden) ? treeHidden.filter(Boolean).map(String) : [];
    await user.update({ treeHidden: list });
    res.json({ success: true, treeHidden: list, message: 'Liste mise à jour' });
  } catch (error) {
    console.error('Erreur PUT tree-hidden:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Changer son mot de passe depuis son compte (mot de passe actuel requis)
// @access  Private
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Mot de passe actuel requis'),
  body('newPassword').isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByNumeroH(req.user.numeroH);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Mot de passe actuel incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, config.BCRYPT_ROUNDS);
    await user.save();

    res.json({ success: true, message: 'Mot de passe modifié avec succès.' });
  } catch (error) {
    console.error('Erreur lors du changement de mot de passe:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   DELETE /api/auth/account
// @desc    Supprimer son propre compte (confirmation par mot de passe requise)
// @access  Private
router.delete('/account', authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || typeof password !== 'string' || !password.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Votre mot de passe est requis pour confirmer la suppression'
      });
    }

    const user = await User.findByNumeroH(req.user.numeroH);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Ne pas permettre à l'admin principal de supprimer son compte
    if (user.numeroH === 'G0C0P0R0E0F0 0' || user.numeroH === 'G7C7P7R7E7F7 7') {
      return res.status(403).json({
        success: false,
        message: 'Le compte administrateur ne peut pas être supprimé'
      });
    }

    // Vérifier que le mot de passe fourni correspond bien au compte
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe incorrect'
      });
    }

    await user.destroy();

    res.json({
      success: true,
      message: 'Votre compte a été supprimé avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du compte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la suppression du compte'
    });
  }
});

export default router;
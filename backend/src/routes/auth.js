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
import { addUserToFamilyTree, addDeceasedToFamilyTree } from './familyTree.js';
import { normalizeNumeroH, prefixeNumeroH, avecNumeroHLibre } from '../utils/numeroH.js';
import ActivityGroup from '../models/ActivityGroup.js';
import { config } from '../../config.js';
import upload from '../middleware/upload.js';
import { authenticate, MASTER_ADMIN_NUMEROS, PROVISIONAL_PREFIX, isProvisionalNumeroH, ensureNumeroHAliasTable } from '../middleware/auth.js';
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

// (Plus aucun compte de test créé automatiquement au démarrage : il avait
// un mot de passe connu de tous. Les comptes de test existants se suppriment
// depuis l'espace admin.)

// Fonction pour gérer les confirmations par les parents vivants
async function handleParentConfirmations(user) {
  const confirmations = [];
  const numeroHPere = normalizeNumeroH(user.numeroHPere);
  const numeroHMere = normalizeNumeroH(user.numeroHMere);

  // Si le père est fourni, vérifier s'il est vivant
  if (numeroHPere) {
    const pere = await User.findOne({
      where: {
        numeroH: { [Op.iLike]: numeroHPere },
        type: 'vivant',
        isActive: true
      }
    });

    if (pere) {
      // Père vivant : créer une confirmation
      const confirmation = await FamilyTreeConfirmation.create({
        childNumeroH: user.numeroH,
        parentNumeroH: numeroHPere,
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
  if (numeroHMere) {
    const mere = await User.findOne({
      where: {
        numeroH: { [Op.iLike]: numeroHMere },
        type: 'vivant',
        isActive: true
      }
    });

    if (mere) {
      // Mère vivante : créer une confirmation
      const confirmation = await FamilyTreeConfirmation.create({
        childNumeroH: user.numeroH,
        parentNumeroH: numeroHMere,
        parentType: 'mere',
        status: 'pending'
      });
      confirmations.push(confirmation);
    } else {
      // Mère décédée ou n'existe pas : accès direct
    }
  }

  // Si les deux parents sont décédés ou n'existent pas, ajouter directement à l'arbre
  const pereVivant = numeroHPere ? await User.findOne({
    where: {
      numeroH: { [Op.iLike]: numeroHPere },
      type: 'vivant',
      isActive: true
    }
  }) : null;

  const mereVivante = numeroHMere ? await User.findOne({
    where: {
      numeroH: { [Op.iLike]: numeroHMere },
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
    const { numeroH, password } = req.body;
    // Sans e-mail : pas d'adresse inventée (« …@example.com ») qui ferait doublon
    const email = String(req.body.email || '').trim();
    req.body.email = email && !/@example\.com$/i.test(email) ? email : null;

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
      // Le formulaire d'inscription envoie "telephone" — la colonne réelle en
      // base est "tel1" (sinon le numéro n'est jamais enregistré : la connexion
      // par téléphone ne fonctionnerait alors que pour les comptes déjà
      // renseignés ensuite depuis le profil).
      tel1: (String(req.body.tel1 || req.body.telephone || '').trim()) || undefined,
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
        // Le NuméroH n'est jamais refusé : son numéro d'ordre est attribué plus bas.
        if (userData.email && await User.findOne({ where: { email: userData.email } })) {
          return res.status(400).json({
            success: false,
            message: 'Cette adresse email est déjà associée à un compte existant. Utilisez une autre adresse email.'
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

      // Un numéro de téléphone = un seul compte (même écrit autrement)
      const telDigits = String(userData.tel1 || '').replace(/[^0-9]/g, '');
      if (telDigits.length >= 6 && await findNumeroHByPhone(telDigits)) {
        return res.status(409).json({ success: false, message: 'Ce numéro de téléphone est déjà associé à un compte existant. Utilisez un autre numéro.' });
      }

      // ✅ CRÉER L'UTILISATEUR EN BASE DE DONNÉES — le numéro d'ordre final du
      // NuméroH est attribué ici : le dernier numéro de ce préfixe + 1.
      const newUser = await avecNumeroHLibre(User.sequelize, prefixeNumeroH(numeroH),
        (numeroLibre) => User.create({ ...userData, numeroH: numeroLibre }));

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

// Cherche un compte par numéro de téléphone (compare les 9 derniers chiffres,
// pour tolérer l'indicatif pays et les espaces). Renvoie son NuméroH ou null.
async function findNumeroHByPhone(digits) {
  if (!digits || digits.length < 6) return null;
  // type SELECT → la requête renvoie directement le tableau des lignes
  const rows = await User.sequelize.query(
    `SELECT numero_h FROM users
     WHERE tel1 IS NOT NULL
       AND RIGHT(REGEXP_REPLACE(tel1, '[^0-9]', '', 'g'), 9) = RIGHT(:digits, 9)
     LIMIT 1`,
    { replacements: { digits }, type: 'SELECT' }
  );
  return rows && rows.length > 0 ? rows[0].numero_h : null;
}

const signToken = (numeroH) => jwt.sign({ userId: numeroH, numeroH }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRE });

// Seul le titulaire du compte (ou un administrateur) peut modifier son profil.
function peutModifierProfil(req, numeroH) {
  if (!req.user || !numeroH) return false;
  const role = String(req.user.role || '').toLowerCase();
  if (req.user.isMasterAdmin || role === 'admin' || role === 'super-admin' || req.user.isAdmin === true) return true;
  return String(req.user.numeroH).trim().toLowerCase() === String(numeroH).trim().toLowerCase();
}
const refusModification = (res) => res.status(403).json({ success: false, message: 'Vous ne pouvez modifier que votre propre profil.' });

// @route   POST /api/auth/register-quick
// @desc    Inscription rapide : numéro de téléphone + mot de passe seulement.
//          Le compte reçoit un identifiant provisoire (TMP-…) ; le vrai NuméroH,
//          l'email et le reste arrivent avec la mise à jour du profil.
// @access  Public
router.post('/register-quick', [
  body('telephone').trim().notEmpty().withMessage('Le numéro de téléphone est requis'),
  body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
    }
    const telephone = String(req.body.telephone).trim();
    const digits = telephone.replace(/[^0-9]/g, '');
    if (digits.length < 8) {
      return res.status(400).json({ success: false, message: 'Numéro de téléphone invalide.' });
    }
    if (await findNumeroHByPhone(digits)) {
      return res.status(409).json({ success: false, message: 'Ce numéro de téléphone a déjà un compte. Connectez-vous avec ce numéro.' });
    }

    const numeroH = `${PROVISIONAL_PREFIX}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const hashedPassword = await bcrypt.hash(req.body.password, config.BCRYPT_ROUNDS);
    const newUser = await User.create({
      numeroH,
      password: hashedPassword,
      prenom: 'Nouveau',
      nomFamille: 'membre',
      tel1: telephone,
      genre: 'AUTRE',
      generation: 'G1',
      type: 'vivant',
      isActive: true,
      isVerified: false,
      role: 'user'
    });

    const user = { ...newUser.dataValues };
    delete user.password;
    res.status(201).json({ success: true, message: 'Compte créé', user, token: signToken(numeroH), profileIncomplete: true });
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError' || error?.parent?.code === '23505') {
      return res.status(409).json({ success: false, message: 'Ce numéro de téléphone a déjà un compte. Connectez-vous avec ce numéro.' });
    }
    console.error('Erreur inscription rapide:', error);
    res.status(500).json({ success: false, message: "Erreur serveur lors de l'inscription." });
  }
});

// @route   POST /api/auth/complete-profile
// @desc    Mise à jour du profil d'un compte créé par inscription rapide :
//          attribue le vrai NuméroH (calculé comme à l'inscription complète) et
//          enregistre l'identité. L'identifiant provisoire est remplacé partout.
// @access  Privé (compte provisoire uniquement)
router.post('/complete-profile', authenticate, [
  body('numeroH').trim().notEmpty().withMessage('NuméroH manquant'),
  body('prenom').trim().notEmpty().withMessage('Le prénom est requis'),
  body('nomFamille').trim().notEmpty().withMessage('Le nom de famille est requis'),
  body('dateNaissance').trim().notEmpty().withMessage('La date de naissance est requise'),
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Email invalide')
], async (req, res) => {
  const oldNumeroH = req.user.numeroH;
  if (!isProvisionalNumeroH(oldNumeroH)) {
    return res.status(400).json({ success: false, message: 'Votre profil a déjà son NuméroH.' });
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
  }
  // Le téléphone envoie le préfixe (génération, pays, région, ethnie, famille…) ;
  // le numéro d'ordre final est toujours attribué ici : le dernier + 1.
  const prefixe = prefixeNumeroH(req.body.numeroH);
  if (!prefixe || isProvisionalNumeroH(prefixe) || isReservedGeneration(req.body.generation)) {
    return res.status(400).json({ success: false, message: 'NuméroH invalide.' });
  }

  // Champs du profil acceptés (jamais le mot de passe, le rôle ni le téléphone de connexion)
  const { password: _pw, confirmPassword: _cpw, role: _role, isAdmin: _ia, numeroH: _n, tel1: _t, telephone: _tel, ...profil } = req.body;

  let numeroFinal;
  try {
    numeroFinal = await avecNumeroHLibre(User.sequelize, prefixe, async (newNumeroH) => {
      const t = await User.sequelize.transaction();
      try {
        // Des tables ont une clé étrangère vers users.numero_h : on crée d'abord le
        // compte avec le vrai NuméroH, on y rattache tout, puis on supprime le compte
        // provisoire — le tout dans une seule transaction (tout ou rien).
        const oldRow = await User.findOne({ where: { numeroH: oldNumeroH }, transaction: t });
        const allowed = Object.keys(User.rawAttributes).filter((k) => !['numeroH', 'password', 'role', 'isAdmin', 'tel1', 'isActive', 'isVerified', 'type', 'createdAt', 'updatedAt'].includes(k));
        const updates = {};
        for (const k of allowed) if (profil[k] !== undefined) updates[k] = profil[k];
        if (!updates.email) updates.email = null;
        const base = oldRow.get({ plain: true });
        // Libère téléphone / email (colonnes uniques) sur l'ancien compte
        await User.sequelize.query('UPDATE users SET tel1 = NULL, email = NULL WHERE numero_h = :ancien',
          { replacements: { ancien: oldNumeroH }, transaction: t });
        await User.create({ ...base, ...updates, numeroH: newNumeroH }, { transaction: t });

        // Remplacer l'identifiant provisoire dans toutes les colonnes « numero_h » des autres tables
        const cols = await User.sequelize.query(
          // colonnes nommées « …numero_h… » + toute colonne ayant une clé étrangère vers users
          `SELECT table_name, column_name FROM information_schema.columns
           WHERE table_schema = 'public' AND column_name ILIKE '%numero_h%'
             AND data_type IN ('character varying', 'text') AND table_name <> 'users'
           UNION
           SELECT kcu.table_name, kcu.column_name
           FROM information_schema.referential_constraints rc
           JOIN information_schema.key_column_usage kcu
             ON kcu.constraint_name = rc.constraint_name AND kcu.constraint_schema = rc.constraint_schema
           JOIN information_schema.constraint_column_usage ccu
             ON ccu.constraint_name = rc.unique_constraint_name AND ccu.constraint_schema = rc.unique_constraint_schema
           WHERE ccu.table_name = 'users' AND kcu.table_schema = 'public' AND kcu.table_name <> 'users'`,
          { type: 'SELECT', transaction: t }
        );
        for (const c of cols) {
          await User.sequelize.query(
            `UPDATE "${c.table_name}" SET "${c.column_name}" = :nouveau WHERE "${c.column_name}" = :ancien`,
            { replacements: { nouveau: newNumeroH, ancien: oldNumeroH }, transaction: t }
          );
        }
        await User.destroy({ where: { numeroH: oldNumeroH }, transaction: t });
        // Les sessions ouvertes ailleurs avec l'ancien identifiant suivent le vrai NuméroH
        await ensureNumeroHAliasTable(t);
        await User.sequelize.query(
          `INSERT INTO numero_h_aliases (ancien, nouveau) VALUES (:ancien, :nouveau)
           ON CONFLICT (ancien) DO UPDATE SET nouveau = EXCLUDED.nouveau`,
          { replacements: { ancien: oldNumeroH, nouveau: newNumeroH }, transaction: t }
        );
        await t.commit();
        return newNumeroH;
      } catch (error) {
        await t.rollback();
        throw error;
      }
    });
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError' || error?.parent?.code === '23505') {
      const fields = (error.errors || []).map((e) => e.path).join(', ');
      return res.status(409).json({
        success: false,
        message: fields.includes('email') ? 'Cette adresse email est déjà utilisée par un autre compte.' : 'Ces informations sont déjà utilisées par un autre compte.'
      });
    }
    console.error('Erreur complete-profile:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur lors de la mise à jour du profil.' });
  }

  const updated = await User.findByNumeroH(numeroFinal);
  const user = { ...updated.dataValues };
  delete user.password;
  res.json({ success: true, message: 'Profil mis à jour', user, token: signToken(numeroFinal) });

  // Comme après une inscription complète
  setImmediate(() => {
    if (updated.numeroHPere || updated.numeroHMere) {
      handleParentConfirmations(updated).catch((err) => console.error('handleParentConfirmations:', err.message));
    }
    createActivityGroupsForUser(updated).catch((err) => console.error('createActivityGroupsForUser:', err.message));
  });
});

// @route   POST /api/auth/login
// @desc    Connexion utilisateur
// @access  Public
router.post('/login', [
  body('numeroH').notEmpty().withMessage('Le NumeroH, téléphone ou email est requis'),
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

    // Le champ "numeroH" accepte en fait un NuméroH, un numéro de téléphone
    // ou un email — on détecte lequel avant de chercher l'utilisateur.
    const { numeroH, password } = req.body;

    try {
      const rawIdentifiant = numeroH.trim();
      let user = null;

      if (rawIdentifiant.includes('@')) {
        // Connexion par email
        user = await User.findOne({ where: { email: { [Op.iLike]: rawIdentifiant } } });
      } else {
        const digitsOnly = rawIdentifiant.replace(/[^0-9]/g, '');
        const strippedOfPunctuation = rawIdentifiant.replace(/[\s\-().+]/g, '');
        const looksLikePhone = digitsOnly.length >= 6 && digitsOnly === strippedOfPunctuation;
        if (looksLikePhone) {
          // Connexion par téléphone — tolère indicatif pays et formats différents
          // en comparant seulement les 9 derniers chiffres (numéro guinéen).
          try {
            const numeroHParTel = await findNumeroHByPhone(digitsOnly);
            if (numeroHParTel) user = await User.findByNumeroH(numeroHParTel);
          } catch (phoneErr) {
            console.error('Login phone lookup error:', phoneErr.message);
          }
        }
      }

      // Normaliser : espaces + remplacer lettre O par chiffre 0
      const normalizedNumeroH = numeroH
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/O/g, '0')
        .replace(/o/g, '0');

      if (!user) user = await User.findByNumeroH(normalizedNumeroH);

      if (!user && normalizedNumeroH !== numeroH.trim()) {
        const originalTrimmed = numeroH.trim().replace(/\s+/g, ' ');
        user = await User.findByNumeroH(originalTrimmed);
      }

      // Fallback SQL brut si Sequelize ne trouve pas (problème modèle/colonne)
      if (!user) {
        try {
          // type SELECT → la requête renvoie directement le tableau des lignes
          const rows = await User.sequelize.query(
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
          message: 'NuméroH, téléphone, email ou mot de passe incorrect',
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


// @route   POST /api/auth/forgot-password/verify
// @desc    Vérifier l'identité : NumeroH obligatoire, NumeroH parent et code arbre facultatifs
// @access  Public
router.post('/forgot-password/verify', [
  body('numeroH').trim().notEmpty().withMessage('Le NumeroH, le téléphone ou l\'email est requis')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Données invalides', errors: errors.array() });
    }
    const { numeroH, parentNumeroH, familyCode } = req.body;
    // Comme pour la connexion : NuméroH, numéro de téléphone ou email
    const identifiant = String(numeroH).trim();
    const digitsOnly = identifiant.replace(/[^0-9]/g, '');
    let user = null;
    if (identifiant.includes('@')) {
      user = await User.findOne({ where: { email: { [Op.iLike]: identifiant } } });
    } else if (digitsOnly.length >= 6 && digitsOnly === identifiant.replace(/[\s\-().+]/g, '')) {
      const n = await findNumeroHByPhone(digitsOnly);
      if (n) user = await User.findByNumeroH(n);
    }
    const normalizedNumeroH = user ? user.numeroH : normalizeNumeroH(identifiant);
    if (!user) user = await User.findByNumeroH(normalizedNumeroH);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Compte introuvable. Vérifiez votre NuméroH, téléphone ou email.' });
    }
    // Récupération réservée à un compte complet : profil à jour ET email.
    // Le numéro de téléphone seul ne permet jamais de récupérer un compte.
    if (isProvisionalNumeroH(user.numeroH)) {
      return res.status(400).json({
        success: false,
        noEmail: true,
        message: "Ce compte n'a pas encore été mis à jour : il ne peut pas être récupéré. " +
          "Le numéro de téléphone seul ne permet pas de récupérer un compte ; il faut un profil à jour avec une adresse email."
      });
    }
    // Le code de récupération est envoyé par email : sans email, pas de récupération
    if (!user.email) {
      return res.status(400).json({
        success: false,
        noEmail: true,
        message: "Ce compte n'a pas d'adresse email : le mot de passe ne peut pas être récupéré. " +
          "Le numéro de téléphone seul ne permet pas de récupérer un compte. Une fois reconnecté, ajoutez un email dans votre profil."
      });
    }
    if (user.type === 'defunt' || user.isDeceased) {
      return res.status(403).json({ success: false, message: 'Ce compte ne peut pas réinitialiser un mot de passe.' });
    }
    if (!MASTER_ADMIN_NUMEROS.includes(user.numeroH) && isReservedGeneration(user.generation)) {
      return res.status(400).json({ success: false, message: 'Ce numéro est impossible. Notre plateforme existe depuis 2025, aucun vivant ne peut avoir ce numéro.' });
    }

    // Vérification parent (facultative — si fournie, elle doit correspondre)
    if (parentNumeroH && parentNumeroH.trim()) {
      const normalizedParent = normalizeNumeroH(parentNumeroH);
      const pereNorm = user.numeroHPere ? normalizeNumeroH(user.numeroHPere) : '';
      const mereNorm = user.numeroHMere ? normalizeNumeroH(user.numeroHMere) : '';
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
            // Exactement ce préfixe, suivi d'un espace (F2 ≠ F21)
            [Op.like]: `${String(prefix).replace(/[\\%_]/g, '\\$&')} %`
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
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { numeroH } = req.body;
    
    if (!numeroH) {
      return res.status(400).json({
        success: false,
        message: 'NumeroH requis'
      });
    }

    if (!peutModifierProfil(req, numeroH)) return refusModification(res);
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
      'lieu1', 'lieu2', 'lieu3', 'languesAutre',
      'sousPrefecture', 'handicap'
    ];
    
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Un numéro de téléphone = un seul compte (même écrit autrement)
    const nouveauTel = String(updates.tel1 || updates.telephone || '').replace(/[^0-9]/g, '');
    if (nouveauTel.length >= 6) {
      const titulaire = await findNumeroHByPhone(nouveauTel);
      if (titulaire && titulaire !== user.numeroH) {
        return res.status(409).json({ success: false, message: 'Ce numéro de téléphone est déjà associé à un autre compte.' });
      }
    }

    await user.update(updates);

    // Si les parents viennent d'être renseignés/corrigés (ex: inconnus à
    // l'inscription, ajoutés ensuite depuis le profil), rattacher l'utilisateur
    // à l'arbre familial correspondant — sinon il reste isolé pour toujours,
    // même si son NuméroH parent est maintenant correct.
    if ('numeroHPere' in updates || 'numeroHMere' in updates) {
      try {
        await addUserToFamilyTree(user.numeroH, user.numeroHPere, user.numeroHMere);
      } catch (treeErr) {
        console.error('addUserToFamilyTree (profile update):', treeErr.message);
      }
    }

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
router.post('/profile/photo', authenticate, (req, res) => {
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

      if (!peutModifierProfil(req, numeroH)) return refusModification(res);
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
router.post('/profile/video', authenticate, (req, res) => {
  upload.single('video')(req, res, async (multerErr) => {
    if (multerErr) {
      return res.status(400).json({ success: false, message: multerErr.message || 'Erreur upload vidéo' });
    }
    try {
      const { numeroH } = req.body;
      if (!numeroH) return res.status(400).json({ success: false, message: 'NumeroH requis' });
      if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });

      if (!peutModifierProfil(req, numeroH)) return refusModification(res);
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

// @route   POST /api/auth/profile/vitrine-photo1
// @route   POST /api/auth/profile/vitrine-photo2
// @desc    Mettre à jour l'une des 2 photos de la vitrine de profil (badge)
// @access  Private
function registerVitrinePhotoRoute(slot) {
  router.post(`/profile/vitrine-${slot}`, authenticate, (req, res) => {
    upload.single('photo')(req, res, async (multerErr) => {
      if (multerErr) {
        return res.status(400).json({ success: false, message: multerErr.message || 'Erreur lors de l\'upload du fichier' });
      }
      try {
        const { numeroH } = req.body;
        if (!numeroH) return res.status(400).json({ success: false, message: 'NumeroH requis' });
        if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });
        if (!peutModifierProfil(req, numeroH)) return refusModification(res);

        const user = await User.findByNumeroH(numeroH);
        if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

        const photoUrl = `/uploads/${req.file.filename}`;
        const field = slot === 'photo1' ? 'vitrinePhoto1' : 'vitrinePhoto2';
        await user.update({ [field]: photoUrl });

        const userWithoutPassword = { ...user.dataValues };
        delete userWithoutPassword.password;

        res.json({ success: true, message: 'Photo de vitrine mise à jour avec succès', photoUrl, user: userWithoutPassword });
      } catch (error) {
        console.error('Erreur lors de la mise à jour de la photo de vitrine:', error);
        res.status(500).json({ success: false, message: 'Erreur serveur lors de la mise à jour de la photo de vitrine' });
      }
    });
  });
}
registerVitrinePhotoRoute('photo1');
registerVitrinePhotoRoute('photo2');

// @route   POST /api/auth/profile/vitrine-video
// @desc    Mettre à jour la courte vidéo (5s max, vérifié côté client) de la vitrine de profil
// @access  Private
router.post('/profile/vitrine-video', authenticate, (req, res) => {
  upload.single('video')(req, res, async (multerErr) => {
    if (multerErr) {
      return res.status(400).json({ success: false, message: multerErr.message || 'Erreur upload vidéo' });
    }
    try {
      const { numeroH } = req.body;
      if (!numeroH) return res.status(400).json({ success: false, message: 'NumeroH requis' });
      if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier fourni' });

      if (!peutModifierProfil(req, numeroH)) return refusModification(res);
      const user = await User.findByNumeroH(numeroH);
      if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

      const videoUrl = `/uploads/${req.file.filename}`;
      await user.update({ vitrineVideo: videoUrl });

      const userWithoutPassword = { ...user.dataValues };
      delete userWithoutPassword.password;

      res.json({ success: true, message: 'Vidéo de vitrine mise à jour avec succès', videoUrl, user: userWithoutPassword });
    } catch (error) {
      console.error('Erreur upload vidéo de vitrine:', error);
      res.status(500).json({ success: false, message: 'Erreur serveur lors de la mise à jour de la vidéo de vitrine' });
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
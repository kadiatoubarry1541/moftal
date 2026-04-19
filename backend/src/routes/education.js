import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Op } from 'sequelize';
import Formation from '../models/Formation.js';
import FormationRegistration from '../models/FormationRegistration.js';
import Professor from '../models/Professor.js';
import ProfessorRequest from '../models/ProfessorRequest.js';
import Course from '../models/Course.js';
import CoursePermission from '../models/CoursePermission.js';
import User from '../models/User.js';
import ParentChildLink from '../models/ParentChildLink.js';
import School from '../models/School.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Configuration multer pour l'upload des médias
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/education';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `education-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image, vidéo, audio et PDF sont autorisés'), false);
    }
  }
});

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// ========== FORMATIONS ==========

// @route   GET /api/education/formations
// @desc    Récupérer les formations disponibles
// @access  Authentifié
router.get('/formations', async (req, res) => {
  try {
    const { category, search } = req.query;
    
    const where = { isActive: true };
    if (category) {
      where.category = category;
    }
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const formations = await Formation.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      success: true,
      formations
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des formations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des formations'
    });
  }
});

// @route   POST /api/education/formations
// @desc    Créer une nouvelle formation
// @access  Admin
router.post('/formations', requireAdmin, async (req, res) => {
  try {
    const { title, description, category, duration, level, requirements, curriculum, maxStudents, price } = req.body;
    
    const formation = await Formation.create({
      title,
      description,
      category,
      duration: duration ? parseInt(duration) : null,
      level,
      requirements: requirements ? JSON.parse(requirements) : {},
      curriculum: curriculum ? JSON.parse(curriculum) : [],
      maxStudents: maxStudents ? parseInt(maxStudents) : null,
      price: price ? parseFloat(price) : 0,
      createdBy: req.user.numeroH
    });
    
    res.json({
      success: true,
      message: 'Formation créée avec succès',
      formation
    });
  } catch (error) {
    console.error('Erreur lors de la création de la formation:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création de la formation'
    });
  }
});

// @route   POST /api/education/formations/:id/register
// @desc    S'inscrire à une formation
// @access  Authentifié
router.post('/formations/:id/register', async (req, res) => {
  try {
    const { id } = req.params;
    
    const formation = await Formation.findByPk(id);
    if (!formation) {
      return res.status(404).json({
        success: false,
        message: 'Formation non trouvée'
      });
    }
    
    if (!formation.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cette formation n\'est plus disponible'
      });
    }
    
    // Vérifier si l'utilisateur est déjà inscrit
    const existingRegistration = await FormationRegistration.findOne({
      where: { formationId: id, numeroH: req.user.numeroH }
    });
    
    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'Vous êtes déjà inscrit à cette formation'
      });
    }
    
    const registration = await FormationRegistration.create({
      formationId: id,
      numeroH: req.user.numeroH,
      status: 'pending'
    });
    
    res.json({
      success: true,
      message: 'Demande d\'inscription envoyée avec succès',
      registration
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'inscription'
    });
  }
});

// @route   GET /api/education/my-formations
// @desc    Récupérer les formations de l'utilisateur
// @access  Authentifié
router.get('/my-formations', async (req, res) => {
  try {
    const registrations = await FormationRegistration.getUserRegistrations(req.user.numeroH);
    
    res.json({
      success: true,
      registrations
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des formations:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des formations'
    });
  }
});

// ========== INSCRIPTION PROF / APPRENANT / SUIVI PARENTS ==========

// @route   POST /api/education/register-professor
// @desc    S'inscrire comme professeur (lien avec le compte utilisateur)
// @access  Authentifié
router.post('/register-professor', async (req, res) => {
  try {
    const user = req.user;
    const existing = await Professor.findOne({
      where: { numeroH: user.numeroH }
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Vous êtes déjà inscrit comme professeur'
      });
    }
    const { specialty, bio } = req.body;
    const name = `${(user.prenom || '').trim()} ${(user.nomFamille || '').trim()}`.trim() || 'Professeur';
    const professor = await Professor.create({
      name,
      specialty: specialty || 'Général',
      experience: 0,
      bio: bio || '',
      contactInfo: {},
      numeroH: user.numeroH,
      createdBy: user.numeroH,
      isActive: false,
      isAvailable: false
    });
    res.status(201).json({
      success: true,
      message: 'Demande enregistrée. Un administrateur confirmera votre statut de professeur ou guide.',
      professor
    });
  } catch (error) {
    console.error('Erreur inscription professeur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'inscription'
    });
  }
});

// @route   GET /api/education/my-professor-profile
// @desc    Récupérer mon profil professeur (si inscrit)
// @access  Authentifié
router.get('/my-professor-profile', async (req, res) => {
  try {
    const professor = await Professor.findOne({
      where: { numeroH: req.user.numeroH }
    });
    res.json({
      success: true,
      professor: professor || null
    });
  } catch (error) {
    console.error('Erreur récupération profil professeur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// @route   POST /api/education/register-school
// @desc    Inscription d'une école pour plus de visibilité (créateur = req.user.numeroH)
// @access  Authentifié
router.post('/register-school', async (req, res) => {
  try {
    const user = req.user;
    const { name, address, contact, description } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le nom de l\'établissement est obligatoire'
      });
    }
    const school = await School.create({
      name: String(name).trim(),
      address: address ? String(address).trim() : null,
      contact: contact ? String(contact).trim() : null,
      description: description ? String(description).trim() : null,
      createdByNumeroH: user.numeroH,
      isActive: false
    });
    res.status(201).json({
      success: true,
      message: 'École enregistrée. Elle sera visible après validation par l\'administrateur.',
      school
    });
  } catch (error) {
    console.error('Erreur inscription école:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'inscription de l\'école'
    });
  }
});

// @route   GET /api/education/schools
// @desc    Liste des écoles (visibles = isActive true)
// @access  Public ou authentifié
router.get('/schools', async (req, res) => {
  try {
    const schools = await School.getVisibleSchools();
    res.json({
      success: true,
      schools
    });
  } catch (error) {
    console.error('Erreur liste écoles:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
});

// @route   GET /api/education/my-children-progress
// @desc    Pour les parents : suivi des enfants (formations, cours, progression)
// @access  Authentifié
router.get('/my-children-progress', async (req, res) => {
  try {
    const links = await ParentChildLink.getMyChildren(req.user.numeroH);
    const children = [];
    for (const link of links) {
      const childUser = await User.findByNumeroH(link.childNumeroH);
      const registrations = await FormationRegistration.findAll({
        where: { numeroH: link.childNumeroH },
        order: [['created_at', 'DESC']]
      });
      const formationIds = [...new Set(registrations.map(r => r.formationId).filter(Boolean))];
      const formations = formationIds.length ? await Formation.findAll({ where: { id: formationIds } }) : [];
      const formationMap = Object.fromEntries(formations.map(f => [f.id, f]));
      children.push({
        childNumeroH: link.childNumeroH,
        childName: childUser ? `${(childUser.prenom || '').trim()} ${(childUser.nomFamille || '').trim()}`.trim() || link.childNumeroH : link.childNumeroH,
        formations: registrations.map(r => {
          const formation = formationMap[r.formationId];
          return {
            id: r.id,
            formationId: r.formationId,
            formationTitle: formation?.title,
            category: formation?.category,
            level: formation?.level,
            status: r.status,
            progress: r.progress ?? 0,
            registeredAt: r.registeredAt
          };
        })
      });
    }
    res.json({
      success: true,
      children
    });
  } catch (error) {
    console.error('Erreur suivi enfants:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du suivi des enfants'
    });
  }
});

// ========== PROFESSEURS ==========

// @route   GET /api/education/professors
// @desc    Récupérer les professeurs disponibles
// @access  Authentifié
router.get('/professors', async (req, res) => {
  try {
    const { specialty, search } = req.query;
    
    const where = { isActive: true };
    if (specialty) {
      where.specialty = { [Op.iLike]: `%${specialty}%` };
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { specialty: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const professors = await Professor.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      success: true,
      professors
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des professeurs:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des professeurs'
    });
  }
});

// @route   POST /api/education/professors
// @desc    Créer un nouveau professeur
// @access  Admin
router.post('/professors', requireAdmin, async (req, res) => {
  try {
    const { name, specialty, experience, qualifications, bio, contactInfo, hourlyRate, availability } = req.body;
    
    const professor = await Professor.create({
      name,
      specialty,
      experience: experience ? parseInt(experience) : null,
      qualifications: qualifications ? JSON.parse(qualifications) : [],
      bio,
      contactInfo: contactInfo ? JSON.parse(contactInfo) : {},
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : null,
      availability: availability ? JSON.parse(availability) : {},
      createdBy: req.user.numeroH
    });
    
    res.json({
      success: true,
      message: 'Professeur créé avec succès',
      professor
    });
  } catch (error) {
    console.error('Erreur lors de la création du professeur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du professeur'
    });
  }
});

// @route   POST /api/education/professors/:id/request
// @desc    Demander un cours avec un professeur
// @access  Authentifié
router.post('/professors/:id/request', async (req, res) => {
  try {
    const { id } = req.params;
    const { requestMessage, scheduledDate, duration } = req.body;
    
    const professor = await Professor.findByPk(id);
    if (!professor) {
      return res.status(404).json({
        success: false,
        message: 'Professeur non trouvé'
      });
    }
    
    if (!professor.isActive || !professor.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Ce professeur n\'est pas disponible'
      });
    }
    
    const request = await ProfessorRequest.create({
      professorId: id,
      numeroH: req.user.numeroH,
      requestMessage,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      duration: duration ? parseInt(duration) : null,
      status: 'pending'
    });
    
    res.json({
      success: true,
      message: 'Demande envoyée avec succès',
      request
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la demande:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'envoi de la demande'
    });
  }
});

// @route   GET /api/education/my-requests
// @desc    Récupérer les demandes de cours de l'utilisateur
// @access  Authentifié
router.get('/my-requests', async (req, res) => {
  try {
    const requests = await ProfessorRequest.getUserRequests(req.user.numeroH);
    
    res.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des demandes'
    });
  }
});

// ========== COURS ==========

// @route   GET /api/education/courses
// @desc    Récupérer les cours disponibles
// @access  Authentifié
router.get('/courses', async (req, res) => {
  try {
    const { type, category, search } = req.query;
    
    const where = { isActive: true };
    if (type) {
      where.type = type;
    }
    if (category) {
      where.category = category;
    }
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { category: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const courses = await Course.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      success: true,
      courses
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des cours:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des cours'
    });
  }
});

// Middleware pour vérifier les permissions de création de cours
const canCreateCourse = async (req, res, next) => {
  try {
    const user = req.user;
    
    // L'admin peut toujours créer des cours
    if (
      user.role === 'admin' ||
      user.role === 'super-admin' ||
      user.numeroH === 'G7C7P7R7E7F7 7'
    ) {
      return next();
    }
    
    // Vérifier si l'utilisateur a la permission pour ce type de cours
    const { type } = req.body;
    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Type de cours requis'
      });
    }
    
    const hasPermission = await CoursePermission.checkPermission(user.numeroH, type);
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission de créer ce type de cours. Contactez un administrateur.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Erreur lors de la vérification des permissions:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la vérification des permissions'
    });
  }
};

// @route   POST /api/education/courses
// @desc    Créer un nouveau cours (admin ou professeur autorisé)
// @access  Admin ou Professeur autorisé
router.post('/courses', canCreateCourse, upload.single('media'), async (req, res) => {
  try {
    const { title, description, type, duration, level, category, prerequisites } = req.body;
    
    const courseData = {
      title,
      description,
      type,
      duration: duration ? parseInt(duration) : null,
      level,
      category,
      prerequisites: (prerequisites !== undefined && prerequisites !== '') ? (typeof prerequisites === 'string' ? JSON.parse(prerequisites) : prerequisites) : [],
      createdBy: req.user.numeroH
    };
    
    if (req.file) {
      courseData.content = {
        mediaUrl: `/uploads/education/${req.file.filename}`,
        mediaType: req.file.mimetype
      };
    }
    
    const course = await Course.create(courseData);
    
    res.json({
      success: true,
      message: 'Cours créé avec succès',
      course
    });
  } catch (error) {
    console.error('Erreur lors de la création du cours:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la création du cours'
    });
  }
});

// @route   POST /api/education/courses/publish
// @desc    Publier un cours (vidéo, audio, écrit ou test) — professeurs et admin uniquement
// @access  Admin ou Professeur autorisé
router.post('/courses/publish', upload.single('media'), canCreateCourse, async (req, res) => {
  try {
    const { title, description, type, duration, level, category } = req.body;
    
    if (!title || !type) {
      return res.status(400).json({
        success: false,
        message: 'Titre et type de contenu sont requis'
      });
    }
    
    const allowedTypes = ['audio', 'video', 'written', 'library', 'test'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type invalide. Utilisez: audio, video, written, library ou test'
      });
    }
    
    // Si le professeur assigne le cours à des apprenants spécifiques
    const assignedStudents = req.body.assignedStudents
      ? (typeof req.body.assignedStudents === 'string'
          ? req.body.assignedStudents.split(',').map(s => s.trim()).filter(Boolean)
          : req.body.assignedStudents)
      : [];

    const courseData = {
      title,
      description: description || '',
      type,
      duration: duration ? parseInt(duration) : null,
      level: level || 'débutant',
      category: category || 'Général',
      prerequisites: [],
      createdBy: req.user.numeroH,
      students: assignedStudents
    };
    
    if (req.file) {
      courseData.content = {
        mediaUrl: `/uploads/education/${req.file.filename}`,
        mediaType: req.file.mimetype
      };
    } else if (type === 'written' || type === 'test') {
      const textContent = req.body.content || req.body.text || '';
      if (textContent) {
        courseData.content = { text: textContent };
      }
    }
    
    const course = await Course.create(courseData);
    
    res.status(201).json({
      success: true,
      message: 'Contenu publié avec succès',
      course
    });
  } catch (error) {
    console.error('Erreur lors de la publication du cours:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la publication'
    });
  }
});

// @route   GET /api/education/my-courses
// @desc    Récupérer les cours de l'utilisateur
// @access  Authentifié
router.get('/my-courses', async (req, res) => {
  try {
    const courses = await Course.getUserCourses(req.user.numeroH);

    res.json({
      success: true,
      courses
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des cours:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des cours'
    });
  }
});

// @route   GET /api/education/my-linked-courses
// @desc    Cours publiés par le(s) professeur(s) lié(s) à cet apprenant
// @access  Authentifié
router.get('/my-linked-courses', async (req, res) => {
  try {
    const studentNumeroH = req.user.numeroH;

    // 1. Trouver les demandes approuvées de professeurs liés à cet apprenant
    const approvedRequests = await ProfessorRequest.findAll({
      where: { numeroH: studentNumeroH, status: 'approved' }
    });

    // 2. Récupérer les NumeroH des professeurs liés
    const professorIds = approvedRequests.map(r => r.professorId);
    if (professorIds.length === 0) {
      return res.json({ success: true, courses: [] });
    }

    const professors = await Professor.findAll({ where: { id: professorIds } });
    const professorNumeroHs = professors.map(p => p.numeroH).filter(Boolean);

    // 3. Récupérer les cours créés par ces professeurs qui incluent cet apprenant
    //    OU tous les cours du professeur (s'il n'y a pas de filtre par étudiant)
    const allProfCourses = await Course.findAll({
      where: {
        createdBy: { [Op.in]: professorNumeroHs },
        isActive: true
      },
      order: [['created_at', 'DESC']]
    });

    // Filtrer : cours assignés à cet étudiant, ou cours sans restriction d'étudiants (students=[])
    const courses = allProfCourses.filter(c => {
      const students = Array.isArray(c.students) ? c.students : [];
      return students.length === 0 || students.includes(studentNumeroH);
    });

    res.json({ success: true, courses });
  } catch (error) {
    console.error('Erreur my-linked-courses:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   GET /api/education/my-linked-students
// @desc    Liste des apprenants liés à ce professeur (demandes approuvées)
// @access  Authentifié (professeur)
router.get('/my-linked-students', async (req, res) => {
  try {
    const professor = await Professor.findOne({ where: { numeroH: req.user.numeroH } });
    if (!professor) {
      return res.json({ success: true, students: [] });
    }

    const approvedRequests = await ProfessorRequest.findAll({
      where: { professorId: professor.id, status: 'approved' }
    });

    const students = [];
    for (const req2 of approvedRequests) {
      const u = await User.findByNumeroH(req2.numeroH);
      students.push({
        numeroH: req2.numeroH,
        name: u ? `${u.prenom} ${u.nomFamille}` : req2.numeroH
      });
    }

    res.json({ success: true, students });
  } catch (error) {
    console.error('Erreur my-linked-students:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   POST /api/education/course-permissions
// @desc    Accorder une permission de création de cours à un professeur
// @access  Admin uniquement
router.post('/course-permissions', requireAdmin, async (req, res) => {
  try {
    const { numeroH, courseType, expiresAt, notes } = req.body;
    const user = req.user;

    if (!numeroH || !courseType) {
      return res.status(400).json({
        success: false,
        message: 'NumeroH et courseType sont requis'
      });
    }

    // Vérifier que l'utilisateur existe
    const targetUser = await User.findByNumeroH(numeroH);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    // Vérifier si la permission existe déjà
    const existingPermission = await CoursePermission.findOne({
      where: { numeroH, courseType, isActive: true }
    });

    if (existingPermission) {
      return res.status(400).json({
        success: false,
        message: 'Cette permission existe déjà'
      });
    }

    const permission = await CoursePermission.create({
      numeroH,
      courseType,
      isActive: true,
      grantedBy: user.numeroH,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Permission accordée avec succès',
      permission
    });
  } catch (error) {
    console.error('Erreur lors de l\'octroi de permission:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'octroi de permission'
    });
  }
});

// @route   GET /api/education/course-permissions
// @desc    Récupérer les permissions de cours
// @access  Admin uniquement
router.get('/course-permissions', requireAdmin, async (req, res) => {
  try {
    const { numeroH, courseType } = req.query;
    
    let where = {};
    if (numeroH) {
      where.numeroH = numeroH;
    }
    if (courseType) {
      where.courseType = courseType;
    }
    
    const permissions = await CoursePermission.findAll({
      where,
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      success: true,
      permissions
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des permissions'
    });
  }
});

// @route   GET /api/education/my-course-permissions
// @desc    Récupérer les permissions de cours de l'utilisateur
// @access  Authentifié
router.get('/my-course-permissions', async (req, res) => {
  try {
    const permissions = await CoursePermission.getUserPermissions(req.user.numeroH);
    
    res.json({
      success: true,
      permissions
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des permissions'
    });
  }
});

// @route   GET /api/education/stats
// @desc    Récupérer les statistiques de l'éducation
// @access  Admin
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const [formationStats, professorStats] = await Promise.all([
      Formation.getFormationStats(),
      Professor.getProfessorStats()
    ]);
    
    res.json({
      success: true,
      stats: {
        formations: formationStats,
        professors: professorStats
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

// ========== STAGES ==========

// @route   GET /api/education/stages
// @desc    Récupérer les stages disponibles (formations de type stage)
// @access  Authentifié
router.get('/stages', async (req, res) => {
  try {
    const { category } = req.query;
    const where = { isActive: true };
    if (category) where.category = category;

    const formations = await Formation.findAll({
      where,
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, stages: formations });
  } catch (error) {
    console.error('Erreur /education/stages:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   POST /api/education/stages/:id/request
// @desc    Postuler à un stage
// @access  Authentifié
router.post('/stages/:id/request', async (req, res) => {
  try {
    const { id } = req.params;
    const { motivation } = req.body;
    const numeroH = req.user.numeroH;

    const formation = await Formation.findByPk(id);
    if (!formation) {
      return res.status(404).json({ success: false, message: 'Stage non trouvé' });
    }

    const existing = await FormationRegistration.findOne({
      where: { numeroH: numeroH, formationId: id }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Vous avez déjà postulé à ce stage' });
    }

    const registration = await FormationRegistration.create({
      numeroH,
      formationId: id,
      status: 'pending',
      notes: motivation ? `Motivation: ${motivation}` : null
    });

    res.status(201).json({ success: true, message: 'Candidature envoyée avec succès', registration });
  } catch (error) {
    console.error('Erreur /education/stages/:id/request:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   GET /api/education/my-stage-requests
// @desc    Récupérer les candidatures aux stages de l'utilisateur
// @access  Authentifié
router.get('/my-stage-requests', async (req, res) => {
  try {
    const requests = await FormationRegistration.findAll({
      where: { numeroH: req.user.numeroH },
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, requests });
  } catch (error) {
    console.error('Erreur /education/my-stage-requests:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   GET /api/education/my-registrations
// @desc    Récupérer les inscriptions de l'utilisateur aux formations
// @access  Authentifié
router.get('/my-registrations', async (req, res) => {
  try {
    const registrations = await FormationRegistration.findAll({
      where: { numeroH: req.user.numeroH },
      order: [['created_at', 'DESC']]
    });
    res.json({ success: true, registrations });
  } catch (error) {
    console.error('Erreur /education/my-registrations:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   GET /api/education/my-progress
// @desc    Récupérer la progression de l'utilisateur dans les cours
// @access  Authentifié
router.get('/my-progress', async (req, res) => {
  try {
    const registrations = await FormationRegistration.findAll({
      where: { numeroH: req.user.numeroH, status: 'approved' },
      order: [['created_at', 'DESC']]
    });

    const progress = registrations.map(r => ({
      formationId: r.formationId,
      status: r.status,
      progress: r.progress ?? 0,
      registeredAt: r.registeredAt || r.createdAt
    }));

    res.json({ success: true, progress });
  } catch (error) {
    console.error('Erreur /education/my-progress:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// @route   GET /api/education/my-certificates
// @desc    Récupérer les certificats obtenus par l'utilisateur
// @access  Authentifié
router.get('/my-certificates', async (req, res) => {
  try {
    const completed = await FormationRegistration.findAll({
      where: { numeroH: req.user.numeroH, status: 'approved' },
      order: [['created_at', 'DESC']]
    });

    const certificates = completed
      .filter(r => (r.progress ?? 0) >= 100)
      .map(r => ({
        id: r.id,
        formationId: r.formationId,
        completedAt: r.completedAt || r.approvedAt || r.updatedAt,
        progress: r.progress
      }));

    res.json({ success: true, certificates });
  } catch (error) {
    console.error('Erreur /education/my-certificates:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;


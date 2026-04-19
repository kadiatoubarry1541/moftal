import express from 'express';
import { authenticateToken, requireAdmin, requireMuslimOrAdmin } from '../middleware/auth.js';
import {
  HistorySection,
  FamilyMember,
  FamilyTree,
  Document,
  EmergencyCall,
  LocationCheck,
  Donation,
  ZakatCalculation,
  SecurityAgent,
  Hospital,
  Doctor,
  HealthProduct,
  Supplier,
  ExchangeProduct,
  PoorPerson,
  DocumentPermission
} from '../models/index.js';

const router = express.Router();

// Routes pour l'Histoire
router.get('/history/sections', authenticateToken, async (req, res) => {
  try {
    const { category } = req.query;
    const sections = await HistorySection.findAll({
      where: category ? { category } : {},
      order: [['createdAt', 'DESC']]
    });
    res.json({ sections });
  } catch (error) {
    console.error('Erreur lors du chargement des sections:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/history/sections', authenticateToken, async (req, res) => {
  try {
    const section = await HistorySection.create(req.body);
    res.status(201).json({ section });
  } catch (error) {
    console.error('Erreur lors de la création de la section:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les Échanges
router.get('/exchange/products', authenticateToken, async (req, res) => {
  try {
    const { level } = req.query;
    const products = await ExchangeProduct.findAll({
      where: level ? { level } : {},
      order: [['createdAt', 'DESC']]
    });
    res.json({ products });
  } catch (error) {
    console.error('Erreur lors du chargement des produits:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/exchange/products', authenticateToken, async (req, res) => {
  try {
    const product = await ExchangeProduct.create(req.body);
    res.status(201).json({ product });
  } catch (error) {
    console.error('Erreur lors de la création du produit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/exchange/suppliers', authenticateToken, async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({
      where: { isApproved: true },
      order: [['createdAt', 'DESC']]
    });
    res.json({ suppliers });
  } catch (error) {
    console.error('Erreur lors du chargement des fournisseurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/exchange/suppliers', authenticateToken, async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);
    res.status(201).json({ supplier });
  } catch (error) {
    console.error('Erreur lors de l\'inscription du fournisseur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour la Santé
router.get('/health/hospitals', authenticateToken, async (req, res) => {
  try {
    const hospitals = await Hospital.findAll({
      where: { isActive: true },
      order: [['rating', 'DESC']]
    });
    res.json({ hospitals });
  } catch (error) {
    console.error('Erreur lors du chargement des hôpitaux:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Inscription d'un hôpital pour plus de visibilité (créateur = utilisateur connecté, isActive: false jusqu'à validation admin)
router.post('/health/register-hospital', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { name, type, region, city, address, phone, emergencyPhone } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le nom de l\'établissement est obligatoire'
      });
    }
    const hospital = await Hospital.create({
      name: String(name).trim(),
      type: type || 'centre de santé',
      region: region || '',
      city: city || '',
      address: address || '',
      phone: phone ? String(phone).trim() : null,
      emergencyPhone: emergencyPhone ? String(emergencyPhone).trim() : null,
      services: [],
      specialties: [],
      createdBy: user.numeroH,
      isActive: false,
      isEmergency: !!emergencyPhone
    });
    res.status(201).json({
      success: true,
      message: 'Établissement enregistré. Il sera visible après validation par l\'administrateur.',
      hospital
    });
  } catch (error) {
    console.error('Erreur inscription hôpital:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'inscription de l\'établissement'
    });
  }
});

router.get('/health/doctors', authenticateToken, async (req, res) => {
  try {
    const doctors = await Doctor.findAll({
      where: { isActive: true, isAvailable: true },
      order: [['rating', 'DESC']]
    });
    res.json({ doctors });
  } catch (error) {
    console.error('Erreur lors du chargement des médecins:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/health/products', authenticateToken, async (req, res) => {
  try {
    const products = await HealthProduct.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']]
    });
    res.json({ products });
  } catch (error) {
    console.error('Erreur lors du chargement des produits de santé:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour la Famille
router.get('/family/members', authenticateToken, async (req, res) => {
  try {
    const { relation } = req.query;
    const members = await FamilyMember.findAll({
      where: relation ? { relation } : {},
      order: [['createdAt', 'DESC']]
    });
    res.json({ members });
  } catch (error) {
    console.error('Erreur lors du chargement des membres de la famille:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/family/members', authenticateToken, async (req, res) => {
  try {
    const member = await FamilyMember.create(req.body);
    res.status(201).json({ member });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du membre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/family/tree', authenticateToken, async (req, res) => {
  try {
    const tree = await FamilyTree.findOne({
      where: { rootMember: req.user.numeroH },
      include: [{ model: FamilyMember, as: 'members' }]
    });
    res.json({ tree });
  } catch (error) {
    console.error('Erreur lors du chargement de l\'arbre:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/family/tree/messages', authenticateToken, async (req, res) => {
  try {
    // Logique pour envoyer un message à la famille
    res.status(201).json({ message: 'Message envoyé' });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les États
router.get('/etats/documents', authenticateToken, async (req, res) => {
  try {
    const documents = await Document.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({ documents });
  } catch (error) {
    console.error('Erreur lors du chargement des documents:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/etats/documents', authenticateToken, async (req, res) => {
  try {
    const document = await Document.create(req.body);
    res.status(201).json({ document });
  } catch (error) {
    console.error('Erreur lors de l\'upload du document:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/etats/permissions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const permissions = await DocumentPermission.findAll({
      order: [['grantedAt', 'DESC']]
    });
    res.json({ permissions });
  } catch (error) {
    console.error('Erreur lors du chargement des permissions:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/etats/permissions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const permission = await DocumentPermission.create(req.body);
    res.status(201).json({ permission });
  } catch (error) {
    console.error('Erreur lors de l\'attribution de la permission:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour la Sécurité
router.get('/security/countries', authenticateToken, async (req, res) => {
  try {
    const countries = await SecurityAgent.getCountriesWithAgents();
    res.json({ countries: countries.length ? countries : ['Guinée'] });
  } catch (error) {
    console.error('Erreur lors du chargement des pays:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/security/agents', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    // Chaque utilisateur ne voit que les agents de son pays (sécurité de son pays uniquement)
    const userCountry = (user.pays || user.nationalite || 'Guinée').trim() || 'Guinée';
    const where = { isActive: true, country: userCountry };
    const agents = await SecurityAgent.findAll({
      where,
      order: [['rating', 'DESC'], ['name', 'ASC']]
    });
    res.json({ agents, country: userCountry });
  } catch (error) {
    console.error('Erreur lors du chargement des agents:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/security/emergency-calls', authenticateToken, async (req, res) => {
  try {
    const calls = await EmergencyCall.findAll({
      where: { caller: req.user.numeroH },
      order: [['createdAt', 'DESC']]
    });
    res.json({ calls });
  } catch (error) {
    console.error('Erreur lors du chargement des appels:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/security/emergency-calls', authenticateToken, async (req, res) => {
  try {
    const call = await EmergencyCall.create(req.body);
    res.status(201).json({ call });
  } catch (error) {
    console.error('Erreur lors de l\'appel d\'urgence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/security/location-checks', authenticateToken, async (req, res) => {
  try {
    const checks = await LocationCheck.findAll({
      where: { user: req.user.numeroH },
      order: [['checkedAt', 'DESC']]
    });
    res.json({ checks });
  } catch (error) {
    console.error('Erreur lors du chargement des vérifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/security/location-checks', authenticateToken, async (req, res) => {
  try {
    // Logique pour vérifier la sécurité d'une localisation
    const safetyLevel = Math.random() > 0.5 ? 'safe' : 'moderate';
    const recommendations = ['Restez vigilant', 'Évitez les heures tardives'];
    
    const check = await LocationCheck.create({
      ...req.body,
      safetyLevel,
      recommendations
    });
    
    res.status(201).json({ check, safetyLevel, recommendations });
  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour Zakat et Dons
router.get('/zakat/poor-people', authenticateToken, async (req, res) => {
  try {
    const people = await PoorPerson.findAll({
      where: { isActive: true },
      order: [['urgency', 'DESC'], ['createdAt', 'DESC']]
    });
    res.json({ poorPeople: people });
  } catch (error) {
    console.error('Erreur lors du chargement des pauvres:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/zakat/donations', authenticateToken, async (req, res) => {
  try {
    const donations = await Donation.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({ donations });
  } catch (error) {
    console.error('Erreur lors du chargement des dons:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/zakat/donations', authenticateToken, async (req, res) => {
  try {
    const donation = await Donation.create(req.body);
    res.status(201).json({ donation });
  } catch (error) {
    console.error('Erreur lors du don:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route make-donation utilisée par le frontend Solidarité
router.post('/zakat/make-donation', authenticateToken, async (req, res) => {
  try {
    const { donor, donorName, recipient, recipientName, amount, currency, type, description, donationType } = req.body;
    const dt = donationType || 'sadaqah';
    if (dt === 'zakat') {
      const role = (req.user.role || '').toLowerCase();
      const isAdminUser =
        role === 'admin' ||
        role === 'super-admin' ||
        req.user.isAdmin === true ||
        ['G7C7P7R7E7F7 7', 'G0C0P0R0E0F0 0'].includes(req.user.numeroH);
      if (!isAdminUser && req.user.religion !== 'Islam') {
        return res.status(403).json({
          success: false,
          message: 'La zakat est réservée aux comptes enregistrés comme musulmans'
        });
      }
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Montant invalide' });
    }
    const donation = await Donation.create({
      donor,
      donorName,
      recipient,
      recipientName,
      amount,
      currency: currency || 'FG',
      type: type || 'money',
      description: description || '',
      donationType: donationType || 'sadaqah',
      status: 'completed',
      createdAt: new Date()
    });
    res.status(201).json({ success: true, donation });
  } catch (error) {
    console.error('Erreur lors du don:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur lors du don' });
  }
});

router.get('/zakat/calculations', authenticateToken, requireMuslimOrAdmin, async (req, res) => {
  try {
    const calculations = await ZakatCalculation.findAll({
      where: { user: req.user.numeroH },
      order: [['calculatedAt', 'DESC']]
    });
    res.json({ calculations });
  } catch (error) {
    console.error('Erreur lors du chargement des calculs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/zakat/calculations', authenticateToken, requireMuslimOrAdmin, async (req, res) => {
  try {
    const { totalWealth, currency } = req.body;
    const zakatAmount = totalWealth * 0.025; // 2.5%
    
    const calculation = await ZakatCalculation.create({
      ...req.body,
      zakatAmount
    });
    
    res.status(201).json({ calculation, zakatAmount });
  } catch (error) {
    console.error('Erreur lors du calcul:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── Routes /api/user/info et /api/user/update-info ─────────────────────────

// GET /api/user/info → retourne le profil de l'utilisateur connecté
router.get('/user/info', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      info: {
        numeroH: user.numeroH,
        prenom: user.prenom,
        nomFamille: user.nomFamille,
        email: user.email || '',
        phone: user.tel1 || '',
        bio: '',
        location: user.lieu1 || user.lieuResidence1 || '',
        occupation: user.activite1 || '',
        education: '',
        birthDate: user.dateNaissance || '',
        maritalStatus: user.statutSocial || '',
        children: (user.nbFilles || 0) + (user.nbGarcons || 0),
        languages: user.langues || [],
        hobbies: [],
        interests: [],
        isPublic: true
      }
    });
  } catch (error) {
    console.error('Erreur /api/user/info:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/user/update-info → met à jour le profil de l'utilisateur connecté
router.post('/user/update-info', authenticateToken, async (req, res) => {
  try {
    const { default: User } = await import('../models/User.js');
    const user = await User.findByPk(req.user.numeroH);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });

    const { location, occupation, birthDate, maritalStatus, languages } = req.body;
    if (location !== undefined) user.lieu1 = location;
    if (occupation !== undefined) user.activite1 = occupation;
    if (birthDate !== undefined) user.dateNaissance = birthDate;
    if (maritalStatus !== undefined) user.statutSocial = maritalStatus;
    if (languages !== undefined) user.langues = Array.isArray(languages) ? languages : [];

    await user.save();
    res.json({ success: true, message: 'Informations mises à jour avec succès' });
  } catch (error) {
    console.error('Erreur /api/user/update-info:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

export default router;











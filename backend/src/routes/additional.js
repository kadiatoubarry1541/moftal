import express from 'express';
import { Op } from 'sequelize';
import { authenticateToken, requireAdmin, requireMuslimOrAdmin } from '../middleware/auth.js';
import {
  HistorySection,
  FamilyMember,
  FamilyTree,
  EmergencyCall,
  LocationCheck,
  Donation,
  ZakatCalculation,
  SecurityAgent,
  Hospital,
  Doctor,
  HealthProduct,
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

// Une section d'Histoire est publiée pour tout le site : administrateurs seulement,
// et seuls les champs du contenu sont repris (jamais l'auteur ni l'état).
router.post('/history/sections', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const b = req.body || {};
    const champs = ['title', 'description', 'content', 'images', 'videos', 'documents', 'category', 'period', 'location', 'importance'];
    const donnees = Object.fromEntries(champs.filter((c) => b[c] !== undefined).map((c) => [c, b[c]]));
    const section = await HistorySection.create({ ...donnees, createdBy: req.user.numeroH });
    res.status(201).json({ section });
  } catch (error) {
    console.error('Erreur lors de la création de la section:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les Échanges
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

// Routes pour les États
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
    // L'appel est toujours au nom de la personne connectée ; ni le statut ni
    // l'agent ne viennent du téléphone.
    const b = req.body || {};
    const call = await EmergencyCall.create({
      caller: req.user.numeroH,
      callerName: [req.user.prenom, req.user.nomFamille].filter(Boolean).join(' ') || req.user.numeroH,
      location: b.location,
      coordinates: b.coordinates,
      emergencyType: b.emergencyType,
      description: b.description,
    });
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
    // Aucune source vérifiée sur la sécurité d'un lieu : on ne l'invente jamais
    // (un niveau « Sûr » tiré au hasard pouvait mettre quelqu'un en danger).
    const safetyLevel = 'inconnu';
    const recommendations = [
      "Moftal n'a pas encore d'information de sécurité vérifiée pour ce lieu.",
      'En cas de doute ou de danger, appelez un agent de sécurité de votre pays (liste ci-dessous).',
    ];
    const b = req.body || {};
    // L'historique est un plus : s'il ne s'enregistre pas, la réponse reste la même
    const check = await LocationCheck.create({
      user: req.user.numeroH,
      userName: [req.user.prenom, req.user.nomFamille].filter(Boolean).join(' ') || req.user.numeroH,
      destination: b.destination,
      coordinates: b.coordinates,
      safetyLevel,
      recommendations
    }).catch((e) => { console.warn('location-checks:', e.message); return null; });
    
    res.status(201).json({ check, safetyLevel, recommendations });
  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour Zakat et Dons
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
      user: req.user.numeroH,
      userName: [req.user.prenom, req.user.nomFamille].filter(Boolean).join(' ') || req.user.numeroH,
      totalWealth,
      currency,
      zakatAmount
    });
    
    res.status(201).json({ calculation, zakatAmount });
  } catch (error) {
    console.error('Erreur lors du calcul:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ─── Routes /api/developpement ───────────────────────────────────────────────

// GET /api/developpement/stats → total collecté et répartition par domaine
router.get('/developpement/stats', authenticateToken, async (req, res) => {
  try {
    // Seuls les dons réellement payés (date de paiement posée par le paiement)
    const dons = await Donation.findAll({ where: { donationType: 'developpement', status: 'completed', completedAt: { [Op.ne]: null } } });
    const totalCollecte = dons.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
    const parDomaine = {};
    dons.forEach(d => {
      parDomaine[d.recipient] = (parDomaine[d.recipient] || 0) + parseFloat(d.amount || 0);
    });
    res.json({ success: true, totalCollecte, parDomaine, nbDonneurs: dons.length });
  } catch (error) {
    console.error('Erreur /api/developpement/stats:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/developpement/mes-dons → dons de l'utilisateur connecté
router.get('/developpement/mes-dons', authenticateToken, async (req, res) => {
  try {
    const dons = await Donation.findAll({
      where: { donor: req.user.numeroH, donationType: 'developpement' },
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, dons });
  } catch (error) {
    console.error('Erreur /api/developpement/mes-dons:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST /api/developpement/donate → prépare un don pour le développement.
// Le don est enregistré « en attente » : il ne compte qu'une fois PAYÉ (paiement
// Djomy, objet « don_developpement », voir payment.js). Avant, il était noté
// « complété » sans aucun paiement et gonflait les totaux affichés.
router.post('/developpement/donate', authenticateToken, async (req, res) => {
  try {
    const { domaine, domaineLabel, message } = req.body || {};
    const user = req.user;
    const montant = Math.round(Number(req.body?.amount));
    if (!Number.isFinite(montant) || montant < 1000) {
      return res.status(400).json({ success: false, message: 'Montant minimum : 1 000 GNF.' });
    }
    const don = await Donation.create({
      donor: user.numeroH,
      donorName: `${user.prenom || ''} ${user.nomFamille || ''}`.trim() || user.numeroH,
      recipient: String(domaine || 'general').slice(0, 100),
      recipientName: String(domaineLabel || 'Fonds Général de Développement').slice(0, 200),
      amount: montant,
      currency: 'GNF',
      type: 'money',
      donationType: 'developpement',
      description: String(message || `Don pour le développement — ${domaineLabel || 'Fonds Général'}`).slice(0, 2000),
      status: 'pending'
    });
    res.status(201).json({ success: true, don, donId: don.id, montant });
  } catch (error) {
    console.error('Erreur /api/developpement/donate:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
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











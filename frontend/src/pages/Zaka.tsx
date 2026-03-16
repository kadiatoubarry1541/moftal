import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdmin } from '../utils/auth';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  [key: string]: any;
}

interface PoorPerson {
  id: string;
  numeroH: string;
  prenom: string;
  nomFamille: string;
  age: number;
  location: string;
  situation: string;
  needs: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  religion?: string;
  contactInfo: {
    phone?: string;
    email?: string;
    address: string;
  };
  verifiedBy: string;
  verifiedAt: string;
  isActive: boolean;
  donations: any[];
  totalDonations: number;
  profilePicture?: string;
  familySize?: number;
  occupation?: string;
  healthCondition?: string;
}

interface Donation {
  id: string;
  donor: string;
  donorName: string;
  recipient: string;
  recipientName: string;
  amount: number;
  currency: string;
  type: 'money' | 'food' | 'clothing' | 'medicine' | 'other';
  donationType: 'zakat' | 'sadaqah';
  description: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
}

interface ZakatCalculation {
  id: string;
  user: string;
  userName: string;
  totalWealth: number;
  zakatAmount: number;
  currency: string;
  calculationDate: string;
  isPaid: boolean;
  paidAt?: string;
}

interface ReligiousCommunity {
  id: string;
  name: string;
  religion: string;
  description: string;
  members: string[];
  posts: any[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

interface Formation {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: number;
  level: string;
  requirements: string[];
  curriculum: string[];
  isActive: boolean;
  createdBy: string;
  maxStudents: number;
  price: number;
  startDate: string;
  endDate: string;
}

interface Stage {
  id: string;
  title: string;
  description: string;
  specialties: string[];
  qualifications: string[];
  experience: number;
  city: string;
  address: string;
  phone: string;
  email: string;
  consultationFee: number;
  availability: any;
  languages: string[];
  isActive: boolean;
  isAvailable: boolean;
  ratings: number;
  reviews: any[];
  createdBy: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  type: 'audio' | 'video' | 'written' | 'library';
  content: string;
  duration: number;
  level: string;
  category: string;
  instructor: string;
  materials: string[];
  isActive: boolean;
  createdBy: string;
}

interface FormationRegistration {
  id: string;
  studentNumeroH: string;
  studentName: string;
  formationId: string;
  formationTitle: string;
  status: 'pending' | 'approved' | 'rejected';
  registeredAt: string;
  approvedAt?: string;
  approvedBy?: string;
}

interface StageRequest {
  id: string;
  studentNumeroH: string;
  studentName: string;
  stageId: string;
  stageTitle: string;
  subject: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  respondedAt?: string;
}

interface Progress {
  id: string;
  studentNumeroH: string;
  courseId: string;
  courseTitle: string;
  progress: number;
  completedLessons: string[];
  lastAccessed: string;
  totalTimeSpent: number;
}

interface Certificate {
  id: string;
  studentNumeroH: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  issuedAt: string;
  issuedBy: string;
  badgeUrl: string;
  isValid: boolean;
}

export default function Zaka() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'pauvres' | 'dons' | 'zakat' | 'communaute' | 'formation-religieux'>('pauvres');
  const [poorPeople, setPoorPeople] = useState<PoorPerson[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [zakatCalculations, setZakatCalculations] = useState<ZakatCalculation[]>([]);
  const [communities, setCommunities] = useState<ReligiousCommunity[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [myRegistrations, setMyRegistrations] = useState<FormationRegistration[]>([]);
  const [myStageRequests, setMyStageRequests] = useState<StageRequest[]>([]);
  const [myProgress, setMyProgress] = useState<Progress[]>([]);
  const [myCertificates, setMyCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDonationForm, setShowDonationForm] = useState(false);
  const [showZakatForm, setShowZakatForm] = useState(false);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showStageRequestForm, setShowStageRequestForm] = useState(false);
  const [selectedPoorPerson, setSelectedPoorPerson] = useState<PoorPerson | null>(null);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [activeCourseTab, setActiveCourseTab] = useState<'audio' | 'video' | 'written' | 'exercice' | 'library' | 'progress' | 'certificates'>('audio');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const navigate = useNavigate();
  
  const [newCommunity, setNewCommunity] = useState({
    name: '',
    religion: 'Islam',
    description: ''
  });
  
  const [registrationForm, setRegistrationForm] = useState({
    numeroH: '',
    motivation: ''
  });
  
  const [stageRequestForm, setStageRequestForm] = useState({
    numeroH: '',
    subject: '',
    message: ''
  });

  const [donationForm, setDonationForm] = useState({
    amount: '',
    currency: 'FG',
    type: 'money' as 'money' | 'food' | 'clothing' | 'medicine' | 'other',
    description: '',
    recipient: ''
  });

  const [zakatForm, setZakatForm] = useState({
    totalWealth: '',
    currency: 'FG'
  });

  useEffect(() => {
    const session = localStorage.getItem("session_user");
    if (!session) {
      navigate("/login");
      return;
    }

    try {
      const parsed = JSON.parse(session);
      const user = parsed.userData || parsed;
      if (!user || !user.numeroH) {
        navigate("/login");
        return;
      }
      
      // Vérifier que l'utilisateur est musulman OU admin
      const userIsAdmin = isAdmin(user);
      if (user.religion !== 'Islam' && !userIsAdmin) {
        alert('Cette page est réservée aux musulmans uniquement.');
        navigate("/");
        return;
      }
      
      setUserData(user);
      loadData();
    } catch {
      navigate("/login");
    }
  }, [navigate]);
  
  useEffect(() => {
    if (activeTab === 'formation-religieux' && userData) {
      loadFormationReligieuxData();
    }
  }, [activeTab, userData]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPoorPeople(),
        loadDonations(),
        loadZakatCalculations(),
        loadCommunities()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadCommunities = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/faith/communities', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const allCommunities = data.communities || [];
        // Si admin, voir toutes les communautés, sinon seulement les musulmanes
        const userIsAdmin = userData ? isAdmin(userData) : false;
        if (userIsAdmin) {
          setCommunities(allCommunities);
        } else {
          setCommunities(allCommunities.filter((c: ReligiousCommunity) => c.religion === 'Islam'));
        }
      } else {
        const defaultComms = getDefaultCommunities();
        const userIsAdmin = userData ? isAdmin(userData) : false;
        if (userIsAdmin) {
          // Pour l'admin, on peut ajouter d'autres communautés par défaut si nécessaire
          setCommunities(defaultComms);
        } else {
          setCommunities(defaultComms);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des communautés:', error);
      setCommunities(getDefaultCommunities());
    }
  };
  
  const getDefaultCommunities = (): ReligiousCommunity[] => [
    {
      id: '1',
      name: 'Communauté Musulmane de Conakry',
      religion: 'Islam',
      description: 'Communauté musulmane pour partager la foi et les enseignements',
      members: ['USER001', 'USER002', 'USER003'],
      posts: [],
      isActive: true,
      createdBy: 'admin',
      createdAt: '2024-01-15T10:00:00Z'
    }
  ];
  
  const loadFormationReligieuxData = async () => {
    try {
      await Promise.all([
        loadFormations(),
        loadStages(),
        loadCourses(),
        loadMyRegistrations(),
        loadMyStageRequests(),
        loadMyProgress(),
        loadMyCertificates()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données de formation religieux:', error);
    }
  };
  
  const loadFormations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('http://localhost:5002/api/education/formations?category=religieux', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFormations(data.formations || []);
      } else {
        setFormations([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des formations:', error);
      alert('Erreur lors du chargement des formations');
      setFormations([]);
    }
  };
  
  const loadStages = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('http://localhost:5002/api/education/stages?category=religieux', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStages(data.stages || []);
      } else {
        setStages([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des stages:', error);
      alert('Erreur lors du chargement des stages');
      setStages([]);
    }
  };
  
  const loadCourses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('http://localhost:5002/api/education/courses?category=religieux', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      } else {
        setCourses([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des cours:', error);
      alert('Erreur lors du chargement des cours');
      setCourses([]);
    }
  };
  
  const loadMyRegistrations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('http://localhost:5002/api/education/my-registrations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMyRegistrations(data.registrations || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des inscriptions:', error);
      alert('Erreur lors du chargement des inscriptions');
    }
  };
  
  const loadMyStageRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('http://localhost:5002/api/education/my-stage-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMyStageRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des demandes de stage:', error);
      alert('Erreur lors du chargement des demandes de stage');
    }
  };
  
  const loadMyProgress = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('http://localhost:5002/api/education/my-progress', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMyProgress(data.progress || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du progrès:', error);
      alert('Erreur lors du chargement du progrès');
    }
  };
  
  const loadMyCertificates = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('http://localhost:5002/api/education/my-certificates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMyCertificates(data.certificates || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des certificats:', error);
      alert('Erreur lors du chargement des certificats');
    }
  };
  
  const handleJoinCommunity = async (communityId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/faith/communities/${communityId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          numeroH: userData?.numeroH
        })
      });
      
      if (response.ok) {
        alert('Vous avez rejoint la communauté !');
        loadCommunities();
      } else {
        alert('Erreur lors de l\'adhésion');
      }
    } catch (error) {
      console.error('Erreur lors de l\'adhésion:', error);
      alert('Erreur lors de l\'adhésion');
    }
  };
  
  const submitFormationRegistration = async () => {
    if (!selectedFormation || !registrationForm.numeroH) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5002/api/education/formations/${selectedFormation.id}/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          numeroH: registrationForm.numeroH,
          motivation: registrationForm.motivation
        })
      });
      
      if (response.ok) {
        alert('Inscription envoyée avec succès !');
        setShowRegistrationForm(false);
        setRegistrationForm({ numeroH: '', motivation: '' });
        loadMyRegistrations();
      } else {
        alert('Erreur lors de l\'inscription');
      }
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      alert('Erreur lors de l\'inscription');
    }
  };
  
  const submitStageRequest = async () => {
    if (!selectedStage || !stageRequestForm.numeroH) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5002/api/education/stages/${selectedStage.id}/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          numeroH: stageRequestForm.numeroH,
          subject: stageRequestForm.subject,
          message: stageRequestForm.message
        })
      });
      
      if (response.ok) {
        alert('Demande envoyée avec succès !');
        setShowStageRequestForm(false);
        setStageRequestForm({ numeroH: '', subject: '', message: '' });
        loadMyStageRequests();
      } else {
        alert('Erreur lors de l\'envoi de la demande');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la demande:', error);
      alert('Erreur lors de l\'envoi de la demande');
    }
  };

  const loadPoorPeople = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/zakat/poor-people', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const allPoorPeople = data.poorPeople || [];
        // Si admin, voir tous les pauvres, sinon seulement les musulmans
        const userIsAdmin = userData ? isAdmin(userData) : false;
        if (userIsAdmin) {
          setPoorPeople(allPoorPeople);
        } else {
          setPoorPeople(allPoorPeople.filter((p: PoorPerson) => p.religion === 'Islam'));
        }
      } else {
        const defaultPeople = getDefaultPoorPeople();
        const userIsAdmin = userData ? isAdmin(userData) : false;
        if (userIsAdmin) {
          setPoorPeople(defaultPeople);
        } else {
          setPoorPeople(defaultPeople.filter(p => p.religion === 'Islam'));
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des pauvres:', error);
      const defaultPeople = getDefaultPoorPeople();
      const userIsAdmin = userData ? isAdmin(userData) : false;
      if (userIsAdmin) {
        setPoorPeople(defaultPeople);
      } else {
        setPoorPeople(defaultPeople.filter(p => p.religion === 'Islam'));
      }
    }
  };

  const loadDonations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/zakat/donations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const allDonations = data.donations || [];
        // Si admin, voir tous les dons (zakat et sadaqah), sinon seulement les zakat
        const userIsAdmin = userData ? isAdmin(userData) : false;
        if (userIsAdmin) {
          setDonations(allDonations);
        } else {
          setDonations(allDonations.filter((d: Donation) => d.donationType === 'zakat'));
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des dons:', error);
    }
  };

  const loadZakatCalculations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/zakat/calculations', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setZakatCalculations(data.calculations || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des calculs:', error);
    }
  };

  const getDefaultPoorPeople = (): PoorPerson[] => [
    {
      id: '1',
      numeroH: 'POOR001',
      prenom: 'Fatou',
      nomFamille: 'Camara',
      age: 65,
      location: 'Conakry',
      situation: 'Veuve avec 5 enfants orphelins',
      needs: ['Nourriture', 'Vêtements', 'Médicaments'],
      urgency: 'critical',
      religion: 'Islam',
      contactInfo: {
        phone: '+224 123 456 789',
        address: 'Kaloum, Conakry'
      },
      verifiedBy: 'admin',
      verifiedAt: '2024-01-15T10:00:00Z',
      isActive: true,
      donations: [],
      totalDonations: 0,
      familySize: 6,
      occupation: 'Sans emploi',
      healthCondition: 'Maladie chronique'
    },
    {
      id: '2',
      numeroH: 'POOR002',
      prenom: 'Alpha',
      nomFamille: 'Diallo',
      age: 45,
      location: 'Kindia',
      situation: 'Handicapé, père de 3 enfants',
      needs: ['Nourriture', 'Frais médicaux', 'Éducation enfants'],
      urgency: 'high',
      religion: 'Islam',
      contactInfo: {
        phone: '+224 987 654 321',
        address: 'Centre-ville, Kindia'
      },
      verifiedBy: 'admin',
      verifiedAt: '2024-01-10T14:30:00Z',
      isActive: true,
      donations: [],
      totalDonations: 0,
      familySize: 4,
      occupation: 'Vendeur ambulant',
      healthCondition: 'Handicap physique'
    },
    {
      id: '3',
      numeroH: 'POOR003',
      prenom: 'Mariama',
      nomFamille: 'Bah',
      age: 35,
      location: 'Kankan',
      situation: 'Mère célibataire avec 4 enfants',
      needs: ['Nourriture', 'Vêtements enfants', 'Loyer'],
      urgency: 'medium',
      religion: 'Islam',
      contactInfo: {
        phone: '+224 555 123 456',
        address: 'Quartier populaire, Kankan'
      },
      verifiedBy: 'admin',
      verifiedAt: '2024-01-05T09:15:00Z',
      isActive: true,
      donations: [],
      totalDonations: 0,
      familySize: 5,
      occupation: 'Femme de ménage',
      healthCondition: 'Bon'
    }
  ];

  const handleDonation = (poorPerson: PoorPerson) => {
    setSelectedPoorPerson(poorPerson);
    setDonationForm({
      amount: '',
      currency: 'FG',
      type: 'money',
      description: '',
      recipient: poorPerson.id
    });
    setShowDonationForm(true);
  };

  const submitDonation = async () => {
    if (!donationForm.amount || !selectedPoorPerson) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/zakat/make-donation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          donor: userData?.numeroH,
          donorName: `${userData?.prenom} ${userData?.nomFamille}`,
          recipient: selectedPoorPerson.id,
          recipientName: `${selectedPoorPerson.prenom} ${selectedPoorPerson.nomFamille}`,
          amount: parseFloat(donationForm.amount),
          currency: donationForm.currency,
          type: donationForm.type,
          description: donationForm.description,
          donationType: 'zakat' // Toujours zakat pour cette page
        })
      });
      
      if (response.ok) {
        alert('Zakat effectuée avec succès !');
        setShowDonationForm(false);
        loadDonations();
        loadPoorPeople();
      } else {
        alert('Erreur lors de la zakat');
      }
    } catch (error) {
      console.error('Erreur lors de la zakat:', error);
      alert('Erreur lors de la zakat');
    }
  };

  const submitZakatCalculation = async () => {
    if (!zakatForm.totalWealth) return;

    const totalWealth = parseFloat(zakatForm.totalWealth);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch('/api/zakat/calculations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user: userData?.numeroH,
          userName: `${userData?.prenom} ${userData?.nomFamille}`,
          totalWealth,
          currency: zakatForm.currency
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const zakatAmount = data.zakatAmount ?? totalWealth * 0.025;
        alert(`Votre zakat s'élève à ${zakatAmount.toLocaleString()} ${zakatForm.currency}`);
        setShowZakatForm(false);
        loadZakatCalculations();
      } else {
        alert('Erreur lors du calcul');
      }
    } catch (error) {
      console.error('Erreur lors du calcul:', error);
      alert('Erreur lors du calcul');
    }
  };

  const filteredPoorPeople = poorPeople.filter(person => {
    const matchesSearch = person.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.nomFamille.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         person.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUrgency = !selectedUrgency || person.urgency === selectedUrgency;
    const matchesLocation = !selectedLocation || person.location === selectedLocation;
    return matchesSearch && matchesUrgency && matchesLocation;
  });

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'Critique';
      case 'high': return 'Élevée';
      case 'medium': return 'Moyenne';
      case 'low': return 'Faible';
      default: return 'Inconnue';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des données de zakat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🤲 Zaka (Musulmans)</h1>
              <p className="mt-2 text-gray-600">
                {userData && isAdmin(userData) 
                  ? "Aide aux pauvres, calcul de la zakat, communauté et formation religieuse - Vue admin (toutes les données)"
                  : "Aide aux pauvres musulmans, calcul de la zakat, communauté et formation religieuse"}
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setShowZakatForm(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                🧮 Calculer Zakat
              </button>
              <button
                onClick={() => navigate('/moi')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'pauvres', label: 'Pauvres Musulmans', icon: '👥' },
              { id: 'dons', label: 'Mes Zakat', icon: '💝' },
              { id: 'zakat', label: 'Calculs Zakat', icon: '🧮' },
              { id: 'communaute', label: 'Communauté', icon: '👥' },
              { id: 'formation-religieux', label: 'Formation religieux', icon: '📚' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'pauvres' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                    placeholder="Rechercher par nom ou localisation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <select
                value={selectedUrgency}
                onChange={(e) => setSelectedUrgency(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Toutes les urgences</option>
                  <option value="critical">Critique</option>
                  <option value="high">Élevée</option>
                  <option value="medium">Moyenne</option>
                  <option value="low">Faible</option>
                </select>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Toutes les villes</option>
                  <option value="Conakry">Conakry</option>
                  <option value="Kindia">Kindia</option>
                  <option value="Kankan">Kankan</option>
                  <option value="Labé">Labé</option>
                  <option value="N\'Zérékoré">N'Zérékoré</option>
              </select>
              </div>
            </div>

            {/* Liste des pauvres */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {userData && isAdmin(userData) ? "👥 Tous les Pauvres (Vue Admin)" : "👥 Pauvres Musulmans"}
              </h2>
              {userData && isAdmin(userData) ? (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <p className="text-sm text-blue-700">
                    <strong>🔐 Vue Admin :</strong> Vous voyez toutes les données. En mode normal, seuls les pauvres musulmans sont affichés.
                  </p>
                </div>
              ) : (
                <div className="mb-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Note importante :</strong> La <strong>Zakat</strong> (aumône obligatoire) est destinée aux pauvres musulmans uniquement. Cette page affiche uniquement les personnes musulmanes éligibles à recevoir la zakat.
                  </p>
                </div>
              )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPoorPeople.map((person) => (
                  <div key={person.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {person.prenom} {person.nomFamille}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getUrgencyColor(person.urgency)}`}>
                        {getUrgencyLabel(person.urgency)}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">🎂</span>
                        <span>{person.age} ans</span>
                    </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">📍</span>
                        <span>{person.location}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">👥</span>
                        <span>{person.familySize} personnes</span>
                      </div>
                      {person.occupation && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">💼</span>
                          <span>{person.occupation}</span>
                        </div>
                      )}
                  </div>
                  
                  <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Situation:</h4>
                      <p className="text-sm text-gray-600">{person.situation}</p>
                  </div>
                  
                  <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Besoins:</h4>
                    <div className="flex flex-wrap gap-1">
                      {person.needs.map((need, index) => (
                          <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                          {need}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                    {person.healthCondition && (
                  <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-1">État de santé:</h4>
                        <p className="text-sm text-gray-600">{person.healthCondition}</p>
                  </div>
                    )}

                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-1">Contact:</h4>
                      {person.contactInfo.phone && (
                        <p className="text-sm text-gray-600">📞 {person.contactInfo.phone}</p>
                      )}
                      <p className="text-sm text-gray-600">📍 {person.contactInfo.address}</p>
                    </div>

                    <div className="flex space-x-2">
                    <button
                        onClick={() => handleDonation(person)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                      >
                        🤲 Donner Zakat
                    </button>
                      <button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors">
                        📞 Contacter
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {filteredPoorPeople.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">Aucun pauvre musulman trouvé</p>
              </div>
            )}
            </div>
          </div>
        )}

        {activeTab === 'dons' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">💝 Mes Zakat</h2>
              <div className="space-y-4">
                {donations.map((donation) => (
                  <div key={donation.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-semibold text-gray-900">
                          Zakat à {donation.recipientName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Montant: {donation.amount.toLocaleString()} {donation.currency}
                        </p>
                        <p className="text-sm text-gray-600">
                          Type: {donation.type === 'money' ? 'Argent' :
                                 donation.type === 'food' ? 'Nourriture' :
                                 donation.type === 'clothing' ? 'Vêtements' :
                                 donation.type === 'medicine' ? 'Médicaments' : 'Autre'}
                        </p>
                        {donation.description && (
                          <p className="text-sm text-gray-600">Description: {donation.description}</p>
                        )}
                        <p className="text-sm text-gray-600">
                          Date: {new Date(donation.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        donation.status === 'completed' ? 'bg-green-100 text-green-800' :
                        donation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {donation.status === 'completed' ? 'Effectuée' :
                         donation.status === 'pending' ? 'En attente' : 'Annulée'}
                      </span>
                    </div>
                  </div>
                ))}
                {donations.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Aucune zakat effectuée</p>
                  </div>
                )}
                  </div>
                </div>
          </div>
        )}

        {activeTab === 'zakat' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🧮 Calculs Zakat</h2>
              <div className="space-y-4">
                {zakatCalculations.map((calculation) => (
                  <div key={calculation.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-semibold text-gray-900">
                          Calcul du {new Date(calculation.calculationDate).toLocaleDateString()}
                        </h3>
                      <p className="text-sm text-gray-600">
                          Patrimoine total: {calculation.totalWealth.toLocaleString()} {calculation.currency}
                        </p>
                        <p className="text-sm text-gray-600">
                          Zakat due: {calculation.zakatAmount.toLocaleString()} {calculation.currency}
                        </p>
                        <p className="text-sm text-gray-600">
                          Statut: {calculation.isPaid ? 'Payée' : 'Non payée'}
                        </p>
                        {calculation.paidAt && (
                          <p className="text-sm text-gray-600">
                            Payée le: {new Date(calculation.paidAt).toLocaleDateString()}
                          </p>
                        )}
                    </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        calculation.isPaid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {calculation.isPaid ? 'Payée' : 'Non payée'}
                      </span>
                    </div>
                  </div>
                ))}
                {zakatCalculations.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">Aucun calcul de zakat effectué</p>
                  </div>
                )}
                  </div>
                </div>
              </div>
            )}

        {activeTab === 'communaute' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                {userData && isAdmin(userData) ? "👥 Toutes les Communautés (Vue Admin)" : "👥 Communautés Musulmanes"}
              </h2>
              {userData && isAdmin(userData) && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <p className="text-sm text-blue-700">
                    <strong>🔐 Vue Admin :</strong> Vous voyez toutes les communautés. En mode normal, seules les communautés musulmanes sont affichées.
                  </p>
                </div>
              )}
                <button
                  onClick={() => setShowCreateCommunity(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  ➕ Créer Communauté
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {communities.map((community) => (
                  <div key={community.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{community.name}</h3>
                    <p className="text-gray-600 mb-4">{community.description}</p>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">🕌</span>
                        <span>{community.religion}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">👥</span>
                        <span>{community.members.length} membres</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">📅</span>
                        <span>Créé le {new Date(community.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  
                    <button
                      onClick={() => handleJoinCommunity(community.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                      Rejoindre
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'formation-religieux' && (
          <div className="space-y-8">
            {/* Section 1: Formations Disponibles */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 border-2 border-blue-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-2xl">
                  📚
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Formations Disponibles</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {formations.length > 0 ? formations.map((formation) => (
                  <div key={formation.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{formation.title}</h3>
                    <p className="text-gray-600 mb-4">{formation.description}</p>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Catégorie:</span>
                        <span className="text-sm font-medium">{formation.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Durée:</span>
                        <span className="text-sm font-medium">{formation.duration} mois</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Niveau:</span>
                        <span className="text-sm font-medium">{formation.level}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Prix:</span>
                        <span className="text-sm font-medium">{formation.price.toLocaleString()} FG</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFormation(formation);
                        setShowRegistrationForm(true);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                    >
                      S'inscrire
                    </button>
                  </div>
                )) : (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">Aucune formation disponible pour le moment</p>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Mes Inscriptions */}
            {myRegistrations.length > 0 && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg p-6 border-2 border-green-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center text-2xl">
                    ✅
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Mes Inscriptions</h3>
                </div>
                <div className="space-y-4">
                  {myRegistrations.map((registration) => (
                    <div key={registration.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{registration.formationTitle}</h4>
                          <p className="text-sm text-gray-600">Inscrit le: {new Date(registration.registeredAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          registration.status === 'approved' ? 'bg-green-100 text-green-800' :
                          registration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {registration.status === 'approved' ? 'Approuvé' :
                           registration.status === 'pending' ? 'En attente' : 'Rejeté'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 3: Oustage Disponible */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-lg p-6 border-2 border-purple-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-2xl">
                  🕌
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Oustage Disponible</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stages.length > 0 ? stages.map((stage) => (
                  <div key={stage.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-white">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{stage.title}</h3>
                    <p className="text-gray-600 mb-2">{stage.description}</p>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Spécialités:</span>
                        <span className="text-sm font-medium">{stage.specialties.join(', ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Expérience:</span>
                        <span className="text-sm font-medium">{stage.experience} ans</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Ville:</span>
                        <span className="text-sm font-medium">{stage.city}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Tarif:</span>
                        <span className="text-sm font-medium">{stage.consultationFee.toLocaleString()} FG</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Note:</span>
                        <span className="text-sm font-medium">⭐ {stage.ratings}/5</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedStage(stage);
                          setShowStageRequestForm(true);
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                      >
                        Demander
                      </button>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                        Contacter
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">Aucun oustage disponible pour le moment</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Section 4: Mes Demandes d'Oustage */}
            {myStageRequests.length > 0 && (
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl shadow-lg p-6 border-2 border-yellow-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center text-2xl">
                    📝
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Mes Demandes d'Oustage</h3>
                </div>
                <div className="space-y-4">
                  {myStageRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{request.stageTitle}</h4>
                          <p className="text-sm text-gray-600">Sujet: {request.subject}</p>
                          <p className="text-sm text-gray-600">Demandé le: {new Date(request.requestedAt).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {request.status === 'approved' ? 'Approuvé' :
                           request.status === 'pending' ? 'En attente' : 'Rejeté'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 5: Mes Cours */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl shadow-lg p-6 border-2 border-indigo-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-2xl">
                  🎯
                </div>
                <h2 className="text-3xl font-bold text-gray-900">Mes Cours</h2>
              </div>
              <nav className="flex space-x-4 mb-6 overflow-x-auto">
                {[
                  { id: 'audio', label: 'Audio', icon: '🎵' },
                  { id: 'video', label: 'Vidéo', icon: '🎥' },
                  { id: 'written', label: 'Écrit', icon: '📝' },
                  { id: 'exercice', label: 'Exercice', icon: '📝' },
                  { id: 'library', label: 'Bibliothèque', icon: '📚' },
                  { id: 'progress', label: 'Progrès', icon: '📊' },
                  { id: 'certificates', label: 'Certificats', icon: '🏆' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCourseTab(tab.id as any)}
                    className={`py-2 px-4 rounded-lg font-medium whitespace-nowrap ${
                      activeCourseTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>

              {/* Contenu des cours */}
              <div className="space-y-6">
                {activeCourseTab === 'audio' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">🎵 Cours Audio</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courses.filter(c => c.type === 'audio').length > 0 ? courses.filter(c => c.type === 'audio').map((course) => (
                        <div key={course.id} className="border rounded-lg p-4 bg-white">
                          <h4 className="font-semibold text-gray-900 mb-2">{course.title}</h4>
                          <p className="text-gray-600 text-sm mb-2">{course.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Durée: {course.duration} min</span>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm">
                              Écouter
                            </button>
                          </div>
                        </div>
                      )) : (
                        <div className="col-span-full text-center py-8">
                          <p className="text-gray-500">Aucun cours audio disponible</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeCourseTab === 'video' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">🎥 Cours Vidéo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courses.filter(c => c.type === 'video').length > 0 ? courses.filter(c => c.type === 'video').map((course) => (
                        <div key={course.id} className="border rounded-lg p-4 bg-white">
                          <h4 className="font-semibold text-gray-900 mb-2">{course.title}</h4>
                          <p className="text-gray-600 text-sm mb-2">{course.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Durée: {course.duration} min</span>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm">
                              Regarder
                            </button>
                          </div>
                        </div>
                      )) : (
                        <div className="col-span-full text-center py-8">
                          <p className="text-gray-500">Aucun cours vidéo disponible</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeCourseTab === 'written' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">📝 Cours Écrits</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {courses.filter(c => c.type === 'written').length > 0 ? courses.filter(c => c.type === 'written').map((course) => (
                        <div key={course.id} className="border rounded-lg p-4 bg-white">
                          <h4 className="font-semibold text-gray-900 mb-2">{course.title}</h4>
                          <p className="text-gray-600 text-sm mb-2">{course.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Pages: {course.duration}</span>
                            <button className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm">
                              Lire
                            </button>
                          </div>
                        </div>
                      )) : (
                        <div className="col-span-full text-center py-8">
                          <p className="text-gray-500">Aucun cours écrit disponible</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeCourseTab === 'exercice' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">📝 Exercices</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border rounded-lg p-4 bg-white">
                        <h4 className="font-semibold text-gray-900 mb-2">Exercices disponibles</h4>
                        <p className="text-gray-600 text-sm mb-4">Pratiquez avec des exercices interactifs</p>
                        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm">
                          Commencer
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeCourseTab === 'library' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">📚 Bibliothèque</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {courses.filter(c => c.type === 'library').length > 0 ? courses.filter(c => c.type === 'library').map((course) => (
                        <div key={course.id} className="border rounded-lg p-4 bg-white">
                          <h4 className="font-semibold text-gray-900 mb-2">{course.title}</h4>
                          <p className="text-gray-600 text-sm mb-2">{course.description}</p>
                          <div className="space-y-1">
                            {course.materials && course.materials.map((material, index) => (
                              <div key={index} className="text-sm text-gray-500">• {material}</div>
                            ))}
                          </div>
                          <button className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm">
                            Consulter
                          </button>
                        </div>
                      )) : (
                        <div className="col-span-full text-center py-8">
                          <p className="text-gray-500">Aucun matériel de bibliothèque disponible</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
            
                {activeCourseTab === 'progress' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 Mon Progrès</h3>
                    <div className="space-y-4">
                      {myProgress.length > 0 ? myProgress.map((progress) => (
                        <div key={progress.id} className="border rounded-lg p-4 bg-white">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900">{progress.courseTitle}</h4>
                            <span className="text-sm text-gray-500">{progress.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${progress.progress}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>Temps passé: {progress.totalTimeSpent} min</span>
                            <span>Dernière fois: {new Date(progress.lastAccessed).toLocaleDateString()}</span>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">Aucun progrès enregistré</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeCourseTab === 'certificates' && (
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">🏆 Mes Certificats</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myCertificates.length > 0 ? myCertificates.map((certificate) => (
                        <div key={certificate.id} className="border rounded-lg p-4 bg-white">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900">{certificate.courseTitle}</h4>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              certificate.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {certificate.isValid ? 'Valide' : 'Expiré'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            Émis le: {new Date(certificate.issuedAt).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600 mb-3">
                            Par: {certificate.issuedBy}
                          </p>
                          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm">
                            Télécharger
                          </button>
                        </div>
                      )) : (
                        <div className="col-span-full text-center py-8">
                          <p className="text-gray-500">Aucun certificat disponible</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
          </div>

      {/* Modal de don */}
      {showDonationForm && selectedPoorPerson && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              🤲 Donner Zakat à {selectedPoorPerson.prenom} {selectedPoorPerson.nomFamille}
              </h3>
            <div className="mb-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <strong>Note :</strong> La Zakat est une aumône obligatoire destinée aux pauvres musulmans uniquement.
              </p>
            </div>
              <div className="space-y-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de don
                </label>
                <select
                  value={donationForm.type}
                  onChange={(e) => setDonationForm({...donationForm, type: e.target.value as any})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="money">Argent</option>
                  <option value="food">Nourriture</option>
                  <option value="clothing">Vêtements</option>
                  <option value="medicine">Médicaments</option>
                  <option value="other">Autre</option>
                </select>
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Montant/Valeur
                </label>
                <input
                  type="number"
                  value={donationForm.amount}
                  onChange={(e) => setDonationForm({...donationForm, amount: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Montant en FG"
                />
                </div>
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Devise
                </label>
                <select
                  value={donationForm.currency}
                  onChange={(e) => setDonationForm({...donationForm, currency: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="FG">Franc Guinéen (FG)</option>
                  <option value="USD">Dollar US (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
                  </div>
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optionnel)
                </label>
                <textarea
                  value={donationForm.description}
                  onChange={(e) => setDonationForm({...donationForm, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                  placeholder="Description de la zakat..."
                />
                  </div>
              </div>
            <div className="flex space-x-3 mt-6">
                <button
                onClick={() => setShowDonationForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                Annuler
                </button>
                <button
                onClick={submitDonation}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                Effectuer la Zakat
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Modal de calcul de zakat */}
      {showZakatForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">🧮 Calculer ma Zakat</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Patrimoine total
                </label>
                <input
                  type="number"
                  value={zakatForm.totalWealth}
                  onChange={(e) => setZakatForm({...zakatForm, totalWealth: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Montant total de votre patrimoine"
                />
          </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Devise
                </label>
                <select
                  value={zakatForm.currency}
                  onChange={(e) => setZakatForm({...zakatForm, currency: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="FG">Franc Guinéen (FG)</option>
                  <option value="USD">Dollar US (USD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
      </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Information:</h4>
                <p className="text-sm text-gray-600">
                  La zakat est calculée à 2.5% de votre patrimoine total si celui-ci dépasse le seuil minimum (Nisab).
                </p>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowZakatForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={submitZakatCalculation}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Calculer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de création de communauté */}
      {showCreateCommunity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">👥 Créer une Communauté</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la communauté
                </label>
                <input
                  type="text"
                  value={newCommunity.name}
                  onChange={(e) => setNewCommunity({...newCommunity, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom de la communauté"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Religion
                </label>
                <select
                  value={newCommunity.religion}
                  onChange={(e) => setNewCommunity({...newCommunity, religion: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Islam">Islam</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newCommunity.description}
                  onChange={(e) => setNewCommunity({...newCommunity, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Description de la communauté"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateCommunity(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  alert('Communauté créée !');
                  setShowCreateCommunity(false);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'inscription à une formation */}
      {showRegistrationForm && selectedFormation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              S'inscrire à: {selectedFormation.title}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NumeroH
                </label>
                <input
                  type="text"
                  value={registrationForm.numeroH}
                  onChange={(e) => setRegistrationForm({...registrationForm, numeroH: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Votre NumeroH"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivation
                </label>
                <textarea
                  value={registrationForm.motivation}
                  onChange={(e) => setRegistrationForm({...registrationForm, motivation: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Pourquoi voulez-vous suivre cette formation ?"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowRegistrationForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={submitFormationRegistration}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Envoyer la demande
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de demande de stage */}
      {showStageRequestForm && selectedStage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Demander: {selectedStage.title}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NumeroH
                </label>
                <input
                  type="text"
                  value={stageRequestForm.numeroH}
                  onChange={(e) => setStageRequestForm({...stageRequestForm, numeroH: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Votre NumeroH"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sujet
                </label>
                <input
                  type="text"
                  value={stageRequestForm.subject}
                  onChange={(e) => setStageRequestForm({...stageRequestForm, subject: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Sujet de votre demande"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={stageRequestForm.message}
                  onChange={(e) => setStageRequestForm({...stageRequestForm, message: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Décrivez votre demande..."
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowStageRequestForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={submitStageRequest}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Envoyer la demande
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


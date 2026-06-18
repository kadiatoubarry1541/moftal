import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { isAdmin } from '../utils/auth';
import ProSection from '../components/ProSection';
import { sortAnyByProximity, getUserGeoContext, requestGPS, type UserGeoContext } from '../utils/proximity';

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
  description: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
}

interface HolyBook {
  id: string;
  title: string;
  author: string;
  description: string;
  content: string;
  language: string;
  category: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  reflexions?: string; // Réflexions spécifiques à ce livre
}

export default function Solidarite() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'dons' | 'zaka' | 'livres' | 'realite' | 'ong'>('dons');
  const [donsSubTab, setDonsSubTab] = useState<'pauvres' | 'mes-dons'>('pauvres');
  const [rawPoorPeople, setRawPoorPeople] = useState<PoorPerson[]>([]);
  const [userGeo, setUserGeo] = useState<UserGeoContext>(getUserGeoContext());
  const [gpsActive, setGpsActive] = useState(false);
  const poorPeople = useMemo(() => sortAnyByProximity(rawPoorPeople, userGeo), [rawPoorPeople, userGeo]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [holyBooks, setHolyBooks] = useState<HolyBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDonationForm, setShowDonationForm] = useState(false);
  const [selectedPoorPerson, setSelectedPoorPerson] = useState<PoorPerson | null>(null);
  const [showReflexionsModal, setShowReflexionsModal] = useState(false);
  const [selectedBookForReflexions, setSelectedBookForReflexions] = useState<HolyBook | null>(null);
  const [showAddBookForm, setShowAddBookForm] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', description: '', author: '', language: 'Français', category: 'Islam' });
  const [bookPdfFile, setBookPdfFile] = useState<File | null>(null);
  const [uploadingBook, setUploadingBook] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const navigate = useNavigate();

  // S'assurer que l'onglet actif est toujours valide pour l'utilisateur
  useEffect(() => {
    if (!userData) return;
    const canSeeZaka = userData.religion === 'Islam' || isAdmin(userData);
    if (!canSeeZaka && activeTab === 'zaka') {
      setActiveTab('dons');
    }
  }, [userData, activeTab]);

  // Etats pour la section Réalité
  const [realityPosts, setRealityPosts] = useState<any[]>([]);
  const [selectedContentType, setSelectedContentType] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'message' as 'video' | 'photo' | 'message',
    type: 'text' as string
  });

  const [donationForm, setDonationForm] = useState({
    amount: '',
    currency: 'FG',
    type: 'money' as 'money' | 'food' | 'clothing' | 'medicine' | 'other',
    description: '',
    recipient: ''
  });

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
    }
  ];

  const getDefaultHolyBooks = (): HolyBook[] => [
    {
      id: '1',
      title: 'Le Coran',
      author: 'Révélation Divine',
      description: 'Livre sacré de l\'Islam',
      content: 'Contenu du Coran...',
      language: 'Arabe',
      category: 'Livre Sacré',
      isActive: true,
      createdBy: 'admin',
      createdAt: '2024-01-01T00:00:00Z',
      reflexions: `📖 Points de réflexion sur le Coran :

1. La miséricorde divine
   "Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux"
   - Réfléchissez sur la place centrale de la miséricorde dans l'Islam
   - Comment cette miséricorde se manifeste-t-elle dans votre vie quotidienne ?

2. L'unicité de Dieu (Tawhid)
   "Dis : Il est Allah, Unique. Allah, Le Seul à être imploré pour ce que nous désirons."
   - Méditez sur le concept d'unicité divine
   - Comment cette unicité influence-t-elle votre relation avec le Créateur ?

3. La justice et l'équité
   "Ô vous qui croyez ! Soyez stricts (dans vos devoirs) envers Allah et (soyez) des témoins équitables."
   - Réfléchissez sur l'importance de la justice dans la société
   - Comment pouvez-vous contribuer à une société plus juste ?`
    },
    {
      id: '2',
      title: 'La Bible',
      author: 'Révélation Divine',
      description: 'Livre sacré du Christianisme',
      content: 'Contenu de la Bible...',
      language: 'Français',
      category: 'Livre Sacré',
      isActive: true,
      createdBy: 'admin',
      createdAt: '2024-01-01T00:00:00Z',
      reflexions: `📖 Points de réflexion sur la Bible :

1. L'amour du prochain
   "Tu aimeras ton prochain comme toi-même."
   - Réfléchissez sur la portée de cet amour inconditionnel
   - Comment cet amour se manifeste-t-il dans vos relations quotidiennes ?

2. Le pardon
   "Pardonne-nous nos offenses, comme nous aussi nous pardonnons à ceux qui nous ont offensés."
   - Méditez sur la puissance du pardon
   - Quels sont les obstacles qui vous empêchent de pardonner ?`
    },
    {
      id: '3',
      title: 'Les Traditions Guinéennes',
      author: 'Ancêtres Guinéens',
      description: 'Sagesse et traditions des ancêtres',
      content: 'Contenu des traditions...',
      language: 'Français',
      category: 'Sagesse Traditionnelle',
      isActive: true,
      createdBy: 'admin',
      createdAt: '2024-01-01T00:00:00Z',
      reflexions: `📖 Points de réflexion sur les Traditions Guinéennes :

1. Le respect des ancêtres
   "Les ancêtres sont les piliers de notre société"
   - Réfléchissez sur l'importance de la mémoire et de l'héritage
   - Comment honorez-vous la sagesse de vos ancêtres ?

2. L'unité communautaire
   "Un seul doigt ne peut pas ramasser la farine"
   - Méditez sur la force de la communauté
   - Comment contribuez-vous à l'harmonie de votre communauté ?`
    }
  ];

  const loadPoorPeople = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/zakat/poor-people`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRawPoorPeople(data.poorPeople || []);
      } else {
        setRawPoorPeople(getDefaultPoorPeople());
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      setRawPoorPeople(getDefaultPoorPeople());
    }
  };

  const loadDonations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/zakat/donations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Filtrer uniquement les dons (sadaqah), pas la zakat
        const allDonations = data.donations || [];
        setDonations(allDonations.filter((d: any) => !d.donationType || d.donationType === 'sadaqah'));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des dons:', error);
    }
  };

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
      const response = await fetch(`${API_URL}/api/zakat/make-donation`, {
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
          donationType: 'sadaqah' // Toujours sadaqah pour cette page
        })
      });
      
      if (response.ok) {
        alert('Don effectué avec succès !');
        setShowDonationForm(false);
        loadDonations();
        loadPoorPeople();
      } else {
        alert('Erreur lors du don');
      }
    } catch (error) {
      console.error('Erreur lors du don:', error);
      alert('Erreur lors du don');
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

  const loadHolyBooks = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/faith/books`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHolyBooks(data.books || []);
      } else {
        setHolyBooks(getDefaultHolyBooks());
      }
    } catch (error) {
      console.error('Erreur lors du chargement des livres:', error);
      setHolyBooks(getDefaultHolyBooks());
    }
  };

  const submitNewBook = async () => {
    if (!newBook.title.trim()) { alert('Le titre est obligatoire'); return; }
    setUploadingBook(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append('title', newBook.title.trim());
      formData.append('description', newBook.description.trim());
      formData.append('author', newBook.author.trim());
      formData.append('language', newBook.language);
      formData.append('category', newBook.category);
      if (bookPdfFile) formData.append('pdf', bookPdfFile);

      const response = await fetch(`${API_URL}/api/faith/books`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (response.ok) {
        alert('Livre publié avec succès !');
        setNewBook({ title: '', description: '', author: '', language: 'Français', category: 'Islam' });
        setBookPdfFile(null);
        setShowAddBookForm(false);
        loadHolyBooks();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.message || 'Erreur lors de la publication');
      }
    } catch (e) {
      alert('Erreur de connexion');
    } finally {
      setUploadingBook(false);
    }
  };

  // --- Fonctions Réalité ---
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

  const loadRealityPosts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/reality/posts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRealityPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des publications:', error);
    }
  };

  const getPostsByCategory = (category: string) => {
    return realityPosts.filter((post: any) => post.category === category);
  };

  const handleCreatePost = () => {
    setNewPost({ title: '', content: '', category: 'message', type: 'text' });
    setSelectedFile(null);
    setShowCreatePost(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const submitCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      alert('Veuillez remplir le titre et le contenu');
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append('title', newPost.title);
      formData.append('content', newPost.content);
      formData.append('category', newPost.category);
      formData.append('type', newPost.type);
      formData.append('author', userData?.numeroH || '');
      formData.append('authorName', `${userData?.prenom || ''} ${userData?.nomFamille || ''}`);
      if (selectedFile) {
        formData.append('media', selectedFile);
      }
      const response = await fetch(`${API_URL}/api/reality/create-post`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (response.ok) {
        alert('Publication créée avec succès !');
        setShowCreatePost(false);
        setSelectedFile(null);
        setNewPost({ title: '', content: '', category: 'message', type: 'text' });
        loadRealityPosts();
      } else {
        const data = await response.json().catch(() => ({ message: 'Erreur' }));
        alert(data.message || 'Erreur lors de la publication');
      }
    } catch (error) {
      console.error('Erreur lors de la publication:', error);
      alert('Erreur lors de la publication');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPoorPeople(),
        loadDonations(),
        loadHolyBooks(),
        loadRealityPosts()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

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
      
      setUserData(user);
      loadData();
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  // GPS silencieux
  useEffect(() => {
    requestGPS().then(coords => {
      if (coords) setUserGeo(prev => ({ ...prev, coords }));
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">🤝 Solidarité</h1>
              <p className="mt-2 text-gray-600">Aide aux pauvres - Solidarité pour tous, toutes religions confondues</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
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
          <nav className="flex flex-nowrap gap-1 py-2">
            {[
              { id: 'dons', label: 'Dons', icon: '🤝' },
              // Onglet Zaka uniquement pour les musulmans (ou admin)
              ...(userData && (userData.religion === 'Islam' || isAdmin(userData))
                ? [{ id: 'zaka', label: 'Zaka (Musulmans)', icon: '🤲' as const }]
                : []),
              { id: 'realite', label: 'Réalité', icon: '📷' },
              { id: 'ong', label: 'ONG', icon: '🌍' },
              { id: 'livres', label: 'Les Livres de Dieu Unique', icon: '📖' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => tab.id === 'zaka' ? navigate('/zaka') : setActiveTab(tab.id as any)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-lg font-medium text-[10px] transition-all ${
                  activeTab === tab.id
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="text-sm">{tab.icon}</span>
                <span className="text-center leading-tight">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === 'dons' && (
          <div className="space-y-6">
            {/* Navigation sous-onglets pour Dons */}
            <div className="bg-white border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <nav className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1 py-2">
                  {[
                    { id: 'pauvres', label: 'Liste des Pauvres', icon: '👥' },
                    { id: 'mes-dons', label: 'Mes Dons', icon: '💝' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setDonsSubTab(tab.id as any)}
                      className={`flex flex-col items-center justify-center gap-1 px-2 py-2 sm:px-4 sm:py-3 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                        donsSubTab === tab.id
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span className="text-base sm:text-lg">{tab.icon}</span>
                      <span className="text-center leading-tight">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {donsSubTab === 'pauvres' && (
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
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <select
                      value={selectedUrgency}
                      onChange={(e) => setSelectedUrgency(e.target.value)}
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">👥 Liste des Pauvres</h2>
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg space-y-2">
                    <p className="text-sm text-gray-700">
                      <strong>Note importante :</strong> Cette page est destinée aux <strong>dons généraux (Sadaqah)</strong> qui peuvent être donnés à tous les pauvres, quelle que soit leur religion. Pour les dons spécifiques aux musulmans (Zakat), veuillez utiliser la page <strong>Zaka (Musulman)</strong>.
                    </p>
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Comment cette liste est alimentée :</strong> Lorsqu'une famille rencontre un problème qu'elle ne peut pas gérer seule, elle le signale ici. Deux types de problèmes sont reconnus :<br/>
                      <span className="inline-flex items-center gap-1 mt-1">🏥 <strong>Problème de santé</strong> — maladie, blessure, handicap, frais médicaux</span><br/>
                      <span className="inline-flex items-center gap-1">🍽️ <strong>Problème de nourriture</strong> — manque de repas, famille sans ressources alimentaires</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                    {filteredPoorPeople.map((person) => (
                      <div key={person.id} className="border rounded-lg p-3 sm:p-6 hover:shadow-md transition-shadow">
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
                          {person.familySize && (
                            <div className="flex items-center text-sm text-gray-600">
                              <span className="mr-2">👥</span>
                              <span>{person.familySize} personnes</span>
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
                              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                {need}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDonation(person)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                        >
                          💝 Faire un Don
                        </button>
                      </div>
                    ))}
                  </div>
                  {filteredPoorPeople.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Aucune personne trouvée</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {donsSubTab === 'mes-dons' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">💝 Mes Dons</h2>
                  <div className="space-y-4">
                    {donations.map((donation) => (
                      <div key={donation.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              Don à {donation.recipientName}
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
                            {donation.status === 'completed' ? 'Effectué' :
                             donation.status === 'pending' ? 'En attente' : 'Annulé'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {donations.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">Aucun don effectué</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'zaka' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">🤲 Zaka (Musulmans)</h2>
              <p className="text-gray-600 mb-6">Aumône obligatoire pour les musulmans uniquement</p>
              <p className="text-gray-600 mb-6">Cette section a été déplacée vers une page dédiée.</p>
              <Link
                to="/zaka"
                className="inline-block bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg transition-colors"
              >
                Ouvrir la page Zaka
              </Link>
            </div>
          </div>
        )}

        {activeTab === 'livres' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                <h2 className="text-2xl font-bold text-gray-900">📖 Les Livres de Dieu Unique</h2>
                <button
                  onClick={() => setShowAddBookForm(!showAddBookForm)}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-medium rounded-lg text-sm transition-colors"
                >
                  {showAddBookForm ? '✕ Annuler' : '➕ Publier un livre / PDF'}
                </button>
              </div>

              {/* Formulaire ajout livre / PDF */}
              {showAddBookForm && (
                <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-5 space-y-3">
                  <h3 className="font-semibold text-yellow-900 text-base">Publier un livre ou un PDF</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
                      <input type="text" value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500" placeholder="Ex: Le Saint Coran" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Auteur</label>
                      <input type="text" value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500" placeholder="Ex: Révélation Divine" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                      <select value={newBook.category} onChange={e => setNewBook({...newBook, category: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500">
                        <option value="Islam">Islam</option>
                        <option value="Christianisme">Christianisme</option>
                        <option value="Judaïsme">Judaïsme</option>
                        <option value="Bouddhisme">Bouddhisme</option>
                        <option value="Hindouisme">Hindouisme</option>
                        <option value="Traditions Africaines">Traditions Africaines</option>
                        <option value="Autre">Autre</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Langue</label>
                      <select value={newBook.language} onChange={e => setNewBook({...newBook, language: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500">
                        <option value="Français">Français</option>
                        <option value="Arabe">Arabe</option>
                        <option value="Anglais">Anglais</option>
                        <option value="Peul">Peul</option>
                        <option value="Soussou">Soussou</option>
                        <option value="Malinké">Malinké</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea value={newBook.description} onChange={e => setNewBook({...newBook, description: e.target.value})}
                      rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-500" placeholder="Décrivez ce livre..." />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fichier PDF (optionnel)</label>
                    <input type="file" accept=".pdf,application/pdf" onChange={e => setBookPdfFile(e.target.files?.[0] || null)}
                      className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-yellow-100 file:text-yellow-800 hover:file:bg-yellow-200" />
                    {bookPdfFile && <p className="text-xs text-green-700 mt-1">📄 {bookPdfFile.name}</p>}
                  </div>
                  <button
                    onClick={submitNewBook}
                    disabled={uploadingBook || !newBook.title.trim()}
                    className="px-6 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
                  >
                    {uploadingBook ? 'Publication...' : '✓ Publier le livre'}
                  </button>
                </div>
              )}

              <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <p className="text-sm text-blue-800">
                  <strong>💡 Réfléchissons ensemble :</strong> Prenez le temps de méditer sur les passages qui vous marquent dans chaque livre sacré. La réflexion nous aide à mieux comprendre et à grandir spirituellement.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {holyBooks.map((book) => (
                  <div key={book.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{book.title}</h3>
                    <p className="text-gray-600 mb-4">{book.description}</p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">✍️</span>
                        <span>{book.author}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">🌍</span>
                        <span>{book.language}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">📚</span>
                        <span>{book.category}</span>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <div className="flex space-x-2">
                        <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-sm">
                          📖 Lire
                        </button>
                        {(book as any).pdfUrl && (
                          <a href={(book as any).pdfUrl} target="_blank" rel="noopener noreferrer"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors text-sm text-center">
                            📥 PDF
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setSelectedBookForReflexions(book);
                          setShowReflexionsModal(true);
                        }}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                      >
                        🤔 Réflexions
                      </button>
                    </div>
                  </div>
                ))}
                {holyBooks.length === 0 && (
                  <div className="col-span-full text-center py-10 text-gray-500">
                    <div className="text-5xl mb-3">📖</div>
                    <p>Aucun livre disponible. Soyez le premier à publier un livre sacré.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'realite' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">📷 Réalité (Publications Admin)</h2>
              {userData?.numeroH === 'G0C0P0R0E0F0 0' || userData?.role === 'admin' ? (
                <div className="bg-blue-50 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-blue-900 mb-2">Vous êtes administrateur</h3>
                  <p className="text-blue-800 text-sm mb-4">Vous pouvez publier des vidéos, photos et textes.</p>
                  <button
                    onClick={handleCreatePost}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    + Publier du contenu
                  </button>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-6">
                  <p className="text-gray-600 text-center">Seuls les administrateurs peuvent publier du contenu ici.</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-6 border-2 border-gray-200">
                  <div className="text-4xl mb-4">📹</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Vidéos de sensibilisation</h3>
                  <p className="text-gray-600 text-sm mb-4">Découvrez les campagnes de sensibilisation</p>
                  <button
                    onClick={() => setSelectedContentType('video')}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Voir les vidéos ({getPostsByCategory('video').length})
                  </button>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border-2 border-gray-200">
                  <div className="text-4xl mb-4">🖼️</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Photos de sensibilisation</h3>
                  <p className="text-gray-600 text-sm mb-4">Images de sensibilisation</p>
                  <button
                    onClick={() => setSelectedContentType('photo')}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Voir les photos ({getPostsByCategory('photo').length})
                  </button>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-gray-200">
                  <div className="text-4xl mb-4">📄</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Messages importants</h3>
                  <p className="text-gray-600 text-sm mb-4">Communiqués officiels</p>
                  <button
                    onClick={() => setSelectedContentType('message')}
                    className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Lire les messages ({getPostsByCategory('message').length})
                  </button>
                </div>
              </div>

              {selectedContentType && (
                <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">
                      {selectedContentType === 'video' ? '📹 Vidéos de sensibilisation' :
                       selectedContentType === 'photo' ? '🖼️ Photos de sensibilisation' :
                       '📄 Messages importants'}
                    </h3>
                    <button
                      onClick={() => setSelectedContentType(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕ Fermer
                    </button>
                  </div>

                  {getPostsByCategory(selectedContentType).length > 0 ? (
                    <div className="space-y-4">
                      {getPostsByCategory(selectedContentType).map((post: any) => (
                        <div key={post.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{post.title}</h4>
                              <p className="text-sm text-gray-600">{post.authorName}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(post.created_at || post.createdAt).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>

                          {post.mediaUrl && (
                            <div className="mb-3">
                              {post.type === 'video' ? (
                                <video controls className="w-full max-w-2xl rounded-lg">
                                  <source src={post.mediaUrl.startsWith('http') ? post.mediaUrl : `${API_URL}${post.mediaUrl}`} type="video/mp4" />
                                </video>
                              ) : post.type === 'image' ? (
                                <img src={post.mediaUrl.startsWith('http') ? post.mediaUrl : `${API_URL}${post.mediaUrl}`} alt={post.title} className="max-w-2xl rounded-lg" />
                              ) : null}
                            </div>
                          )}

                          <p className="text-gray-800">{post.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <div className="text-6xl mb-4">
                        {selectedContentType === 'video' ? '📹' :
                         selectedContentType === 'photo' ? '🖼️' : '📄'}
                      </div>
                      <p className="text-gray-500 text-lg mb-4">
                        Aucun {selectedContentType === 'video' ? 'vidéo' :
                                selectedContentType === 'photo' ? 'photo' : 'message'} publié pour le moment
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ong' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">🌍 ONG & Associations</h2>
              <p className="text-gray-600 mb-6">
                Découvrez les organisations non gouvernementales inscrites. Vous pouvez les contacter pour des projets de solidarité, prendre rendez-vous ou leur envoyer des messages.
              </p>
              <ProSection
                type="ngo"
                title="Organisations inscrites"
                icon="🌍"
                description=""
                hideEmptyMessage={false}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modal de don */}
      {showDonationForm && selectedPoorPerson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              💝 Faire un Don à {selectedPoorPerson.prenom} {selectedPoorPerson.nomFamille}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de don
                </label>
                <select
                  value={donationForm.type}
                  onChange={(e) => setDonationForm({...donationForm, type: e.target.value as any})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Description du don..."
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
                disabled={!donationForm.amount || parseFloat(donationForm.amount) <= 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
              >
                Effectuer le don
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Réflexions pour un livre */}
      {showReflexionsModal && selectedBookForReflexions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                🤔 Réflexions sur "{selectedBookForReflexions.title}"
              </h3>
              <button
                onClick={() => {
                  setShowReflexionsModal(false);
                  setSelectedBookForReflexions(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                x
              </button>
            </div>

            <div className="mb-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm text-blue-800">
                <strong>💡 Invitation à la réflexion :</strong> Prenez le temps de méditer sur ces passages et points importants de ce livre sacré. Réfléchissez sur les passages qui vous marquent et notez vos pensées.
              </p>
            </div>

            <div className="space-y-4">
              {selectedBookForReflexions.reflexions ? (
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {selectedBookForReflexions.reflexions}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="mb-4">Aucune réflexion n&apos;a encore été ajoutée pour ce livre.</p>
                  <p className="text-sm">Les réflexions vous aideront à méditer sur les passages importants et les enseignements de ce livre sacré.</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowReflexionsModal(false);
                  setSelectedBookForReflexions(null);
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de création de post Réalité */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              📝 Publier du contenu
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie *
                </label>
                <select
                  value={newPost.category}
                  onChange={(e) => {
                    const category = e.target.value as 'video' | 'photo' | 'message';
                    setNewPost({
                      ...newPost,
                      category,
                      type: category === 'video' ? 'video' : category === 'photo' ? 'image' : 'text'
                    });
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="message">📄 Message</option>
                  <option value="photo">🖼️ Photo</option>
                  <option value="video">📹 Vidéo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Titre du contenu..."
                />
              </div>

              {(newPost.category === 'photo' || newPost.category === 'video') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {newPost.category === 'photo' ? '🖼️' : '📹'} Fichier média *
                  </label>
                  <input
                    type="file"
                    accept={newPost.category === 'photo' ? 'image/*' : 'video/*'}
                    onChange={handleFileChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {selectedFile && (
                    <p className="mt-2 text-sm text-green-600">Fichier sélectionné : {selectedFile.name}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contenu *
                </label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={6}
                  placeholder="Rédigez votre contenu..."
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreatePost(false);
                  setSelectedFile(null);
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={submitCreatePost}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Publier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


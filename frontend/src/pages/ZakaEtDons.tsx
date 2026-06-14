import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

export default function ZakaEtDons() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'pauvres' | 'dons' | 'zakat'>('pauvres');
  const [poorPeople, setPoorPeople] = useState<PoorPerson[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [zakatCalculations, setZakatCalculations] = useState<ZakatCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDonationForm, setShowDonationForm] = useState(false);
  const [showZakatForm, setShowZakatForm] = useState(false);
  const [selectedPoorPerson, setSelectedPoorPerson] = useState<PoorPerson | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUrgency, setSelectedUrgency] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const navigate = useNavigate();

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
      
      setUserData(user);
      loadData();
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPoorPeople(),
        loadDonations(),
        loadZakatCalculations()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
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
        setPoorPeople(data.poorPeople || []);
      } else {
        setPoorPeople(getDefaultPoorPeople());
      }
    } catch (error) {
      console.error('Erreur lors du chargement des pauvres:', error);
      setPoorPeople(getDefaultPoorPeople());
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
        setDonations(data.donations || []);
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
    },
    {
      id: '4',
      numeroH: 'POOR004',
      prenom: 'Ousmane',
      nomFamille: 'Barry',
      age: 70,
      location: 'Labé',
      situation: 'Vieux sans famille',
      needs: ['Nourriture', 'Médicaments', 'Soins médicaux'],
      urgency: 'high',
      contactInfo: {
        address: 'Vieux quartier, Labé'
      },
      verifiedBy: 'admin',
      verifiedAt: '2024-01-12T16:45:00Z',
      isActive: true,
      donations: [],
      totalDonations: 0,
      familySize: 1,
      occupation: 'Sans emploi',
      healthCondition: 'Problèmes de vue'
    },
    {
      id: '5',
      numeroH: 'POOR005',
      prenom: 'Aminata',
      nomFamille: 'Sow',
      age: 28,
      location: 'N\'Zérékoré',
      situation: 'Famille nombreuse, père malade',
      needs: ['Nourriture', 'Frais médicaux', 'Éducation'],
      urgency: 'medium',
      contactInfo: {
        phone: '+224 777 888 999',
        address: 'Banlieue, N\'Zérékoré'
      },
      verifiedBy: 'admin',
      verifiedAt: '2024-01-08T11:20:00Z',
      isActive: true,
      donations: [],
      totalDonations: 0,
      familySize: 8,
      occupation: 'Étudiante',
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
          description: donationForm.description
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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
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
              <h1 className="text-3xl font-bold text-gray-900">🤲 Zaka et Dons</h1>
              <p className="mt-2 text-gray-600">Aide aux pauvres et calcul de la zakat</p>
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
          <nav className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1 py-2">
            {[
              { id: 'pauvres', label: 'Liste des Pauvres', icon: '👥' },
              { id: 'dons', label: 'Mes Dons', icon: '💝' },
              { id: 'zakat', label: 'Ma Zakat', icon: '🧮' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center justify-center gap-1 px-2 py-2 sm:px-4 sm:py-3 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                  activeTab === tab.id
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
              <h2 className="text-2xl font-bold text-gray-900 mb-4">👥 Liste des Pauvres</h2>
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
                          <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
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
                        💝 Aider
                    </button>
                      <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                        📞 Contacter
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        )}

        {activeTab === 'dons' && (
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

        {activeTab === 'zakat' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🧮 Ma Zakat</h2>
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
                className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                Effectuer le don
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

    </div>
  );
}
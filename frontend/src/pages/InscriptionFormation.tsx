import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/?$/, '');

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  [key: string]: any;
}

interface Formation {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: number;
  level: string;
  requirements: any;
  curriculum: any[];
  isActive: boolean;
  createdBy: string;
  maxStudents: number;
  price: number;
  instructor?: string;
  startDate?: string;
  endDate?: string;
  schedule?: string;
  location?: string;
  prerequisites?: string[];
  skills?: string[];
}

interface RegistrationRequest {
  id: string;
  formationId: string;
  numeroH: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export default function InscriptionFormation() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const navigate = useNavigate();

  const [registrationData, setRegistrationData] = useState({
    numeroH: '',
    message: ''
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
      loadFormations();
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const loadFormations = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/education/formations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFormations(data.formations || []);
      } else {
        setFormations(getDefaultFormations());
      }
    } catch (error) {
      console.error('Erreur lors du chargement des formations:', error);
      setFormations(getDefaultFormations());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultFormations = (): Formation[] => [
    {
      id: '1',
      title: 'Développement Web Full Stack',
      description: 'Formation complète en développement web avec React, Node.js et PostgreSQL',
      category: 'tertiaire',
      duration: 6,
      level: 'intermédiaire',
      requirements: { prerequis: 'Connaissances de base en programmation' },
      curriculum: ['HTML/CSS', 'JavaScript', 'React', 'Node.js', 'PostgreSQL'],
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      maxStudents: 30,
      price: 500000,
      instructor: 'Dr. Alpha Barry',
      startDate: '2024-01-15',
      endDate: '2024-07-15',
      schedule: 'Lundi, Mercredi, Vendredi 18h-20h',
      location: 'Centre de Formation Tech, Conakry',
      prerequisites: ['JavaScript de base', 'HTML/CSS'],
      skills: ['React', 'Node.js', 'PostgreSQL', 'API REST']
    },
    {
      id: '2',
      title: 'Gestion de Projet',
      description: 'Apprendre les méthodologies de gestion de projet',
      category: 'professionnel',
      duration: 3,
      level: 'débutant',
      requirements: { prerequis: 'Aucun prérequis' },
      curriculum: ['Planification', 'Suivi', 'Communication'],
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      maxStudents: 25,
      price: 300000,
      instructor: 'Prof. Fatoumata Diallo',
      startDate: '2024-02-01',
      endDate: '2024-05-01',
      schedule: 'Samedi 9h-12h',
      location: 'Institut de Management, Conakry',
      prerequisites: [],
      skills: ['Planification', 'Gestion d\'équipe', 'Communication']
    },
    {
      id: '3',
      title: 'Marketing Digital',
      description: 'Formation complète en marketing digital et réseaux sociaux',
      category: 'professionnel',
      duration: 4,
      level: 'débutant',
      requirements: { prerequis: 'Aucun prérequis' },
      curriculum: ['SEO', 'Réseaux sociaux', 'Publicité en ligne', 'Analytics'],
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      maxStudents: 20,
      price: 400000,
      instructor: 'Mme. Aminata Traoré',
      startDate: '2024-03-01',
      endDate: '2024-07-01',
      schedule: 'Dimanche 14h-17h',
      location: 'Centre de Formation Digital, Conakry',
      prerequisites: [],
      skills: ['SEO', 'Facebook Ads', 'Google Analytics', 'Content Marketing']
    },
    {
      id: '4',
      title: 'Comptabilité Générale',
      description: 'Formation en comptabilité générale et gestion financière',
      category: 'tertiaire',
      duration: 5,
      level: 'intermédiaire',
      requirements: { prerequis: 'Mathématiques de base' },
      curriculum: ['Comptabilité générale', 'Fiscalité', 'Audit', 'Gestion financière'],
      isActive: true,
      createdBy: 'G0C0P0R0E0F0 0',
      maxStudents: 25,
      price: 450000,
      instructor: 'M. Mamadou Bah',
      startDate: '2024-01-20',
      endDate: '2024-06-20',
      schedule: 'Mardi, Jeudi 18h-20h',
      location: 'École de Commerce, Conakry',
      prerequisites: ['Mathématiques de base'],
      skills: ['Comptabilité', 'Fiscalité', 'Audit', 'Excel']
    }
  ];

  const registerToFormation = async () => {
    if (!selectedFormation || !registrationData.numeroH.trim()) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/education/formations/${selectedFormation.id}/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          numeroH: registrationData.numeroH,
          message: registrationData.message
        })
      });
      
      if (response.ok) {
        alert('Demande d\'inscription envoyée avec succès !');
        setShowRegistrationForm(false);
        setRegistrationData({ numeroH: '', message: '' });
        setSelectedFormation(null);
      } else {
        alert('Erreur lors de l\'inscription');
      }
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      alert('Erreur lors de l\'inscription');
    }
  };

  const filteredFormations = formations.filter(formation => {
    const matchesSearch = formation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         formation.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         formation.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || formation.category === filterCategory;
    const matchesLevel = filterLevel === 'all' || formation.level === filterLevel;
    
    return matchesSearch && matchesCategory && matchesLevel;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'tertiaire': return '🎓';
      case 'professionnel': return '💼';
      case 'technique': return '🔧';
      case 'langue': return '🗣️';
      default: return '📚';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'débutant': return 'bg-green-100 text-green-800';
      case 'intermédiaire': return 'bg-yellow-100 text-yellow-800';
      case 'avancé': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Chargement des formations...</div>
        </div>
      </div>
    );
  }

  if (!userData) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => window.history.back()}
        className="mb-6 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
      >
        ← Retour
      </button>

      <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-purple-500 border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="text-4xl">🎓</div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">S'inscrire à une Formation</h1>
            <p className="text-gray-600">Choisissez une formation et envoyez votre demande d'inscription</p>
          </div>
        </div>
        
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">{formations.length}</div>
            <div className="text-sm text-purple-800">Formations disponibles</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {formations.filter(f => f.category === 'tertiaire').length}
            </div>
            <div className="text-sm text-blue-800">Formations tertiaires</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {formations.filter(f => f.category === 'professionnel').length}
            </div>
            <div className="text-sm text-green-800">Formations professionnelles</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {formations.reduce((total, f) => total + f.maxStudents, 0)}
            </div>
            <div className="text-sm text-orange-800">Places disponibles</div>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rechercher une formation</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Nom de la formation..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Toutes les catégories</option>
                <option value="tertiaire">Tertiaire</option>
                <option value="professionnel">Professionnel</option>
                <option value="technique">Technique</option>
                <option value="langue">Langue</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Niveau</label>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Tous les niveaux</option>
                <option value="débutant">Débutant</option>
                <option value="intermédiaire">Intermédiaire</option>
                <option value="avancé">Avancé</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterCategory('all');
                  setFilterLevel('all');
                }}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
              >
                🔄 Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Liste des formations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFormations.map((formation) => (
            <div key={formation.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{formation.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg">{getCategoryIcon(formation.category)}</span>
                    <span className="text-sm text-gray-600 capitalize">{formation.category}</span>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {formation.duration} mois
                </div>
              </div>
              
              <p className="text-gray-700 mb-4 text-sm">{formation.description}</p>
              
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-900">Niveau:</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getLevelColor(formation.level)}`}>
                    {formation.level}
                  </span>
                </div>
                
                {formation.instructor && (
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Formateur:</strong> {formation.instructor}
                  </div>
                )}
                
                {formation.schedule && (
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Horaires:</strong> {formation.schedule}
                  </div>
                )}
                
                {formation.location && (
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Lieu:</strong> {formation.location}
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2 text-sm">Programme :</h4>
                <div className="flex flex-wrap gap-1">
                  {formation.curriculum.slice(0, 3).map((item, index) => (
                    <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                      {item}
                    </span>
                  ))}
                  {formation.curriculum.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                      +{formation.curriculum.length - 3} autres
                    </span>
                  )}
                </div>
              </div>
              
              {formation.prerequisites && formation.prerequisites.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">Prérequis :</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {formation.prerequisites.map((prereq, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="text-purple-500">✓</span>
                        {prereq}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <div className="text-lg font-semibold text-purple-600">
                  {formation.price.toLocaleString()} FG
                </div>
                <button
                  onClick={() => {
                    setSelectedFormation(formation);
                    setRegistrationData({ numeroH: userData.numeroH, message: '' });
                    setShowRegistrationForm(true);
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 text-sm"
                >
                  📝 S'inscrire
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredFormations.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">Aucune formation trouvée</h3>
            <p>Essayez de modifier vos critères de recherche</p>
          </div>
        )}

        {/* Formulaire d'inscription */}
        {showRegistrationForm && selectedFormation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                S'inscrire à : {selectedFormation.title}
              </h3>
              
              {/* Informations de la formation */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Détails de la formation</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div><strong>Durée:</strong> {selectedFormation.duration} mois</div>
                  <div><strong>Niveau:</strong> {selectedFormation.level}</div>
                  <div><strong>Prix:</strong> {selectedFormation.price.toLocaleString()} FG</div>
                  {selectedFormation.instructor && (
                    <div><strong>Formateur:</strong> {selectedFormation.instructor}</div>
                  )}
                  {selectedFormation.schedule && (
                    <div><strong>Horaires:</strong> {selectedFormation.schedule}</div>
                  )}
                  {selectedFormation.location && (
                    <div><strong>Lieu:</strong> {selectedFormation.location}</div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">NumeroH</label>
                  <input
                    type="text"
                    value={registrationData.numeroH}
                    onChange={(e) => setRegistrationData({...registrationData, numeroH: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Votre NumeroH"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message (optionnel)</label>
                  <textarea
                    value={registrationData.message}
                    onChange={(e) => setRegistrationData({...registrationData, message: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={4}
                    placeholder="Pourquoi souhaitez-vous suivre cette formation ? Avez-vous des questions particulières ?"
                  />
                </div>
              </div>
              
              <div className="flex gap-4 mt-6">
                <button
                  onClick={registerToFormation}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                >
                  ✅ Envoyer la demande
                </button>
                <button
                  onClick={() => setShowRegistrationForm(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
                >
                  ❌ Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

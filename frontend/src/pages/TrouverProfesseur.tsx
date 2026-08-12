import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5002').replace(/\/api\/?$/, '');

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  [key: string]: any;
}

interface Professor {
  id: string;
  name: string;
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
  ratings: any[];
  reviews: any[];
  createdBy: string;
  bio?: string;
  education?: string[];
  certifications?: string[];
  teachingStyle?: string;
  subjects?: string[];
}

interface ProfessorRequest {
  id: string;
  professorId: string;
  numeroH: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export default function TrouverProfesseur() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [professeurs, setProfesseurs] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [filterExperience, setFilterExperience] = useState('all');
  const navigate = useNavigate();

  const [professorRequest, setProfessorRequest] = useState({
    numeroH: '',
    message: '',
    subject: '',
    preferredTime: '',
    budget: ''
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
      loadProfessors();
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const loadProfessors = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/education/professors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfesseurs(data.professors || []);
      } else {
        setProfesseurs(getDefaultProfessors());
      }
    } catch (error) {
      console.error('Erreur lors du chargement des professeurs:', error);
      setProfesseurs(getDefaultProfessors());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultProfessors = (): Professor[] => [
    {
      id: '1',
      name: 'Dr. Alpha Barry',
      specialties: ['Développement Web', 'Base de données', 'JavaScript'],
      qualifications: ['Master en Informatique', 'Certification AWS', 'Certification Google Cloud'],
      experience: 8,
      city: 'Conakry',
      address: 'Commune de Kaloum',
      phone: '+224 123 456 789',
      email: 'alpha.barry@example.com',
      consultationFee: 50000,
      availability: { monday: '09:00-17:00', tuesday: '09:00-17:00', wednesday: '09:00-17:00' },
      languages: ['français', 'anglais'],
      isActive: true,
      isAvailable: true,
      ratings: [],
      reviews: [],
      createdBy: 'G0C0P0R0E0F0 0',
      bio: 'Expert en développement web avec plus de 8 ans d\'expérience. Spécialisé dans les technologies modernes.',
      education: ['Master en Informatique - Université de Conakry', 'Certification AWS Solutions Architect'],
      certifications: ['AWS Solutions Architect', 'Google Cloud Professional', 'Microsoft Azure'],
      teachingStyle: 'Pratique et interactif',
      subjects: ['React', 'Node.js', 'PostgreSQL', 'JavaScript', 'TypeScript']
    },
    {
      id: '2',
      name: 'Prof. Fatoumata Diallo',
      specialties: ['Gestion de Projet', 'Leadership', 'Management'],
      qualifications: ['MBA', 'PMP Certification', 'Certification Agile'],
      experience: 12,
      city: 'Conakry',
      address: 'Commune de Dixinn',
      phone: '+224 987 654 321',
      email: 'fatoumata.diallo@example.com',
      consultationFee: 75000,
      availability: { wednesday: '10:00-18:00', thursday: '10:00-18:00', friday: '10:00-18:00' },
      languages: ['français', 'anglais', 'pular'],
      isActive: true,
      isAvailable: true,
      ratings: [],
      reviews: [],
      createdBy: 'G0C0P0R0E0F0 0',
      bio: 'Experte en gestion de projet avec une expérience internationale. Formée aux meilleures pratiques.',
      education: ['MBA - INSEAD', 'Master en Management - Université de Conakry'],
      certifications: ['PMP', 'Certified Scrum Master', 'Agile Certified Practitioner'],
      teachingStyle: 'Structuré et méthodique',
      subjects: ['Gestion de projet', 'Leadership', 'Agile', 'Scrum', 'Management']
    },
    {
      id: '3',
      name: 'Mme. Aminata Traoré',
      specialties: ['Marketing Digital', 'Réseaux sociaux', 'E-commerce'],
      qualifications: ['Master en Marketing', 'Certification Google Ads', 'Certification Facebook Blueprint'],
      experience: 6,
      city: 'Conakry',
      address: 'Commune de Ratoma',
      phone: '+224 555 123 456',
      email: 'aminata.traore@example.com',
      consultationFee: 40000,
      availability: { monday: '14:00-20:00', tuesday: '14:00-20:00', saturday: '09:00-15:00' },
      languages: ['français', 'anglais'],
      isActive: true,
      isAvailable: true,
      ratings: [],
      reviews: [],
      createdBy: 'G0C0P0R0E0F0 0',
      bio: 'Spécialiste du marketing digital avec une expertise en e-commerce et réseaux sociaux.',
      education: ['Master en Marketing - Université de Conakry', 'Certification Digital Marketing'],
      certifications: ['Google Ads Certified', 'Facebook Blueprint', 'HubSpot Content Marketing'],
      teachingStyle: 'Créatif et pratique',
      subjects: ['SEO', 'Facebook Ads', 'Google Analytics', 'Content Marketing', 'E-commerce']
    },
    {
      id: '4',
      name: 'M. Mamadou Bah',
      specialties: ['Comptabilité', 'Fiscalité', 'Audit'],
      qualifications: ['Expert-Comptable', 'Master en Finance', 'Certification IFRS'],
      experience: 15,
      city: 'Conakry',
      address: 'Commune de Matam',
      phone: '+224 777 888 999',
      email: 'mamadou.bah@example.com',
      consultationFee: 60000,
      availability: { monday: '08:00-16:00', tuesday: '08:00-16:00', wednesday: '08:00-16:00' },
      languages: ['français', 'anglais', 'soussou'],
      isActive: true,
      isAvailable: true,
      ratings: [],
      reviews: [],
      createdBy: 'G0C0P0R0E0F0 0',
      bio: 'Expert-comptable avec une longue expérience dans l\'audit et la fiscalité.',
      education: ['Expert-Comptable', 'Master en Finance - Université de Conakry'],
      certifications: ['Expert-Comptable', 'Certification IFRS', 'Certification Audit'],
      teachingStyle: 'Rigoureux et détaillé',
      subjects: ['Comptabilité générale', 'Fiscalité', 'Audit', 'IFRS', 'Excel avancé']
    }
  ];

  const requestProfessor = async () => {
    if (!selectedProfessor || !professorRequest.numeroH.trim()) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/education/professors/${selectedProfessor.id}/request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          numeroH: professorRequest.numeroH,
          message: professorRequest.message,
          subject: professorRequest.subject,
          preferredTime: professorRequest.preferredTime,
          budget: professorRequest.budget
        })
      });
      
      if (response.ok) {
        alert('Demande envoyée avec succès !');
        setShowRequestForm(false);
        setProfessorRequest({ numeroH: '', message: '', subject: '', preferredTime: '', budget: '' });
        setSelectedProfessor(null);
      } else {
        alert('Erreur lors de l\'envoi de la demande');
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la demande:', error);
      alert('Erreur lors de l\'envoi de la demande');
    }
  };

  const filteredProfessors = professeurs.filter(professor => {
    const matchesSearch = professor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         professor.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         professor.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = filterSpecialty === 'all' || professor.specialties.includes(filterSpecialty);
    const matchesCity = filterCity === 'all' || professor.city === filterCity;
    const matchesExperience = filterExperience === 'all' || 
      (filterExperience === 'junior' && professor.experience < 5) ||
      (filterExperience === 'senior' && professor.experience >= 5 && professor.experience < 10) ||
      (filterExperience === 'expert' && professor.experience >= 10);
    
    return matchesSearch && matchesSpecialty && matchesCity && matchesExperience;
  });

  const getAllSpecialties = () => {
    const specialties = new Set<string>();
    professeurs.forEach(professor => {
      professor.specialties.forEach(specialty => specialties.add(specialty));
    });
    return Array.from(specialties);
  };

  const getAllCities = () => {
    const cities = new Set<string>();
    professeurs.forEach(professor => cities.add(professor.city));
    return Array.from(cities);
  };

  const getAverageRating = (professor: Professor) => {
    if (professor.ratings.length === 0) return 0;
    return professor.ratings.reduce((sum, rating) => sum + rating.score, 0) / professor.ratings.length;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Chargement des professeurs...</div>
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

      <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-blue-500 border border-slate-200 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center gap-4 mb-6">
          <div className="text-4xl">👨‍🏫</div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trouver un Professeur</h1>
            <p className="text-gray-600">Recherchez et contactez des professeurs qualifiés</p>
          </div>
        </div>
        
        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">{professeurs.length}</div>
            <div className="text-sm text-blue-800">Professeurs disponibles</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {professeurs.filter(p => p.isAvailable).length}
            </div>
            <div className="text-sm text-green-800">Actuellement disponibles</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {getAllSpecialties().length}
            </div>
            <div className="text-sm text-purple-800">Spécialités</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {Math.round(professeurs.reduce((sum, p) => sum + p.experience, 0) / professeurs.length)}
            </div>
            <div className="text-sm text-orange-800">Années d'expérience moy.</div>
          </div>
        </div>

        {/* Filtres et recherche */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rechercher un professeur</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nom, spécialité..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Spécialité</label>
              <select
                value={filterSpecialty}
                onChange={(e) => setFilterSpecialty(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Toutes les spécialités</option>
                {getAllSpecialties().map(specialty => (
                  <option key={specialty} value={specialty}>{specialty}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ville</label>
              <select
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Toutes les villes</option>
                {getAllCities().map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expérience</label>
              <select
                value={filterExperience}
                onChange={(e) => setFilterExperience(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Tous les niveaux</option>
                <option value="junior">Junior (0-4 ans)</option>
                <option value="senior">Senior (5-9 ans)</option>
                <option value="expert">Expert (10+ ans)</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterSpecialty('all');
                  setFilterCity('all');
                  setFilterExperience('all');
                }}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200"
              >
                🔄 Réinitialiser
              </button>
            </div>
          </div>
        </div>

        {/* Liste des professeurs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProfessors.map((professor) => (
            <div key={professor.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{professor.name}</h3>
                  <p className="text-sm text-gray-600">{professor.city}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    professor.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {professor.isAvailable ? '✅ Disponible' : '❌ Indisponible'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {professor.experience} ans
                  </div>
                </div>
              </div>
              
              {professor.bio && (
                <p className="text-gray-700 mb-4 text-sm">{professor.bio}</p>
              )}
              
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2 text-sm">Spécialités :</h4>
                <div className="flex flex-wrap gap-1">
                  {professor.specialties.map((specialty, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2 text-sm">Qualifications :</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {professor.qualifications.slice(0, 3).map((qualification, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="text-blue-500">✓</span>
                      {qualification}
                    </li>
                  ))}
                  {professor.qualifications.length > 3 && (
                    <li className="text-xs text-gray-500">
                      +{professor.qualifications.length - 3} autres qualifications
                    </li>
                  )}
                </ul>
              </div>
              
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2 text-sm">Langues :</h4>
                <div className="flex flex-wrap gap-1">
                  {professor.languages.map((language, index) => (
                    <span key={index} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                      {language}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  <strong>Téléphone :</strong> {professor.phone}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Email :</strong> {professor.email}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Frais de consultation :</strong> {professor.consultationFee.toLocaleString()} FG
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedProfessor(professor);
                    setProfessorRequest({ 
                      numeroH: userData.numeroH, 
                      message: '', 
                      subject: '',
                      preferredTime: '',
                      budget: ''
                    });
                    setShowRequestForm(true);
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm"
                >
                  📞 Contacter
                </button>
                <button
                  onClick={() => {
                    // Afficher plus de détails
                    alert(`Plus de détails sur ${professor.name}\n\nBio: ${professor.bio || 'Non disponible'}\n\nStyle d'enseignement: ${professor.teachingStyle || 'Non spécifié'}`);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 text-sm"
                >
                  ℹ️ Détails
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredProfessors.length === 0 && (
          <div className="text-center text-gray-500 py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">Aucun professeur trouvé</h3>
            <p>Essayez de modifier vos critères de recherche</p>
          </div>
        )}

        {/* Formulaire de demande */}
        {showRequestForm && selectedProfessor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Contacter : {selectedProfessor.name}
              </h3>
              
              {/* Informations du professeur */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-2">Informations du professeur</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div><strong>Spécialités:</strong> {selectedProfessor.specialties.join(', ')}</div>
                  <div><strong>Expérience:</strong> {selectedProfessor.experience} ans</div>
                  <div><strong>Frais:</strong> {selectedProfessor.consultationFee.toLocaleString()} FG</div>
                  <div><strong>Contact:</strong> {selectedProfessor.phone}</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">NumeroH *</label>
                  <input
                    type="text"
                    value={professorRequest.numeroH}
                    onChange={(e) => setProfessorRequest({...professorRequest, numeroH: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Votre NumeroH"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sujet/Matière</label>
                  <input
                    type="text"
                    value={professorRequest.subject}
                    onChange={(e) => setProfessorRequest({...professorRequest, subject: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Développement Web, Gestion de projet..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Horaire préféré</label>
                  <input
                    type="text"
                    value={professorRequest.preferredTime}
                    onChange={(e) => setProfessorRequest({...professorRequest, preferredTime: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: Week-ends, Soirées..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget (optionnel)</label>
                  <input
                    type="text"
                    value={professorRequest.budget}
                    onChange={(e) => setProfessorRequest({...professorRequest, budget: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ex: 50,000 FG/session"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                  <textarea
                    value={professorRequest.message}
                    onChange={(e) => setProfessorRequest({...professorRequest, message: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder="Décrivez votre demande, vos objectifs d'apprentissage..."
                  />
                </div>
              </div>
              
              <div className="flex gap-4 mt-6">
                <button
                  onClick={requestProfessor}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  📤 Envoyer la demande
                </button>
                <button
                  onClick={() => setShowRequestForm(false)}
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProSection from '../components/ProSection';
import { sortByProximity, getUserGeoContext, proximityLabel, requestGPS, type UserGeoContext } from '../utils/proximity';
interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  [key: string]: any;
}

interface Hospital {
  id: string;
  name: string;
  type: 'public' | 'privé' | 'missionnaire';
  region: string;
  city: string;
  address: string;
  phone: string;
  emergencyPhone?: string;
  services: string[];
  specialties: string[];
  coordinates: {
    lat: number;
    lng: number;
  };
  isActive: boolean;
  isEmergency: boolean;
  rating: number;
  reviews: any[];
  createdBy: string;
}

interface Doctor {
  id: string;
  name: string;
  specialties: string[];
  qualifications: string[];
  experience: number;
  city: string;
  address: string;
  phone: string;
  email?: string;
  consultationFee: number;
  currency: string;
  availability: any;
  languages: string[];
  isActive: boolean;
  isAvailable: boolean;
  ratings: number;
  reviews: any[];
  createdBy: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

export default function Sante() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'hopitaux' | 'medecins'>('hopitaux');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [userGeo, setUserGeo] = useState<UserGeoContext>(getUserGeoContext());
  const [gpsActive, setGpsActive] = useState(false);
  const navigate = useNavigate();

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

  // Demande GPS silencieuse
  useEffect(() => {
    requestGPS().then(coords => {
      if (coords) {
        setUserGeo(prev => ({ ...prev, coords }));
        setGpsActive(true);
      }
    });
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadHospitals(),
        loadDoctors()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHospitals = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/health/hospitals`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const geo = getUserGeoContext();
        setHospitals(sortByProximity(data.hospitals || [], geo));
      } else {
        setHospitals(sortByProximity(getDefaultHospitals(), getUserGeoContext()));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des hôpitaux:', error);
      setHospitals(sortByProximity(getDefaultHospitals(), getUserGeoContext()));
    }
  };

  const loadDoctors = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/health/doctors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const geo = getUserGeoContext();
        setDoctors(sortByProximity(data.doctors || [], geo));
      } else {
        setDoctors(sortByProximity(getDefaultDoctors(), getUserGeoContext()));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des médecins:', error);
      setDoctors(sortByProximity(getDefaultDoctors(), getUserGeoContext()));
    }
  };



  const getDefaultHospitals = (): Hospital[] => [
    {
      id: '1',
      name: 'Hôpital National Ignace Deen',
      type: 'public',
      region: 'Conakry',
      city: 'Conakry',
      address: 'Kaloum, Conakry',
      phone: '+224 30 45 12 34',
      emergencyPhone: '+224 30 45 12 35',
      services: ['Urgences', 'Chirurgie', 'Médecine interne', 'Pédiatrie'],
      specialties: ['Cardiologie', 'Neurologie', 'Orthopédie'],
      coordinates: { lat: 9.6412, lng: -13.5784 },
      isActive: true,
      isEmergency: true,
      rating: 4.2,
      reviews: [],
      createdBy: 'admin'
    },
    {
      id: '2',
      name: 'Clinique Pasteur',
      type: 'privé',
      region: 'Conakry',
      city: 'Conakry',
      address: 'Hamdallaye, Conakry',
      phone: '+224 30 45 67 89',
      emergencyPhone: '+224 30 45 67 90',
      services: ['Consultations', 'Analyses', 'Imagerie'],
      specialties: ['Gynécologie', 'Pédiatrie', 'Médecine générale'],
      coordinates: { lat: 9.6412, lng: -13.5784 },
      isActive: true,
      isEmergency: false,
      rating: 4.5,
      reviews: [],
      createdBy: 'admin'
    },
    {
      id: '3',
      name: 'Hôpital Régional de Kindia',
      type: 'public',
      region: 'Kindia',
      city: 'Kindia',
      address: 'Centre-ville, Kindia',
      phone: '+224 30 45 23 45',
      emergencyPhone: '+224 30 45 23 46',
      services: ['Urgences', 'Médecine générale', 'Chirurgie'],
      specialties: ['Médecine interne', 'Chirurgie générale'],
      coordinates: { lat: 10.0569, lng: -12.8652 },
      isActive: true,
      isEmergency: true,
      rating: 3.8,
      reviews: [],
      createdBy: 'admin'
    }
  ];

  const getDefaultDoctors = (): Doctor[] => [
    {
      id: '1',
      name: 'Dr. Alpha Diallo',
      specialties: ['Cardiologie', 'Médecine interne'],
      qualifications: ['MD Cardiologie', 'Spécialiste en Médecine interne'],
      experience: 15,
      city: 'Conakry',
      address: 'Kaloum, Conakry',
      phone: '+224 123 456 789',
      email: 'alpha.diallo@email.com',
      consultationFee: 50000,
      currency: 'FG',
      availability: { monday: true, tuesday: true, wednesday: true },
      languages: ['Français', 'Soussou'],
      isActive: true,
      isAvailable: true,
      ratings: 4.8,
      reviews: [],
      createdBy: 'admin'
    },
    {
      id: '2',
      name: 'Dr. Fatou Camara',
      specialties: ['Gynécologie', 'Obstétrique'],
      qualifications: ['MD Gynécologie', 'Spécialiste en Obstétrique'],
      experience: 12,
      city: 'Conakry',
      address: 'Hamdallaye, Conakry',
      phone: '+224 987 654 321',
      email: 'fatou.camara@email.com',
      consultationFee: 45000,
      currency: 'FG',
      availability: { tuesday: true, thursday: true, friday: true },
      languages: ['Français', 'Malinké'],
      isActive: true,
      isAvailable: true,
      ratings: 4.6,
      reviews: [],
      createdBy: 'admin'
    },
    {
      id: '3',
      name: 'Dr. Mamadou Bah',
      specialties: ['Pédiatrie', 'Médecine générale'],
      qualifications: ['MD Pédiatrie', 'Médecine générale'],
      experience: 8,
      city: 'Kindia',
      address: 'Centre-ville, Kindia',
      phone: '+224 555 123 456',
      email: 'mamadou.bah@email.com',
      consultationFee: 35000,
      currency: 'FG',
      availability: { monday: true, wednesday: true, friday: true },
      languages: ['Français', 'Peul'],
      isActive: true,
      isAvailable: true,
      ratings: 4.4,
      reviews: [],
      createdBy: 'admin'
    }
  ];


  const filteredHospitals = hospitals.filter(hospital => {
    const matchesSearch = hospital.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hospital.city.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = !selectedCity || hospital.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doctor.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCity = !selectedCity || doctor.city === selectedCity;
    const matchesSpecialty = !selectedSpecialty || doctor.specialties.includes(selectedSpecialty);
    return matchesSearch && matchesCity && matchesSpecialty;
  });


  const callEmergency = () => {
    window.open('tel:117', '_self');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des données de santé...</p>
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
              <h1 className="text-3xl font-bold text-gray-900">🏥 Santé</h1>
              <p className="mt-2 text-gray-600">Hôpitaux, médecins et produits de santé</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={callEmergency}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                🚨 Urgence: 117
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
              { id: 'hopitaux', label: 'Trouver un hôpital', icon: '🏥' },
              { id: 'medecins', label: 'Trouver un médecin', icon: '👨‍⚕️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
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
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {activeTab === 'hopitaux' && (
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Toutes les villes</option>
                <option value="Conakry">Conakry</option>
                <option value="Kindia">Kindia</option>
                <option value="Kankan">Kankan</option>
                <option value="Labé">Labé</option>
                <option value="N\'Zérékoré">N'Zérékoré</option>
              </select>
            )}
            {activeTab === 'medecins' && (
              <>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Toutes les villes</option>
                  <option value="Conakry">Conakry</option>
                  <option value="Kindia">Kindia</option>
                  <option value="Kankan">Kankan</option>
                  <option value="Labé">Labé</option>
                  <option value="N\'Zérékoré">N'Zérékoré</option>
                </select>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Toutes les spécialités</option>
                  <option value="Cardiologie">Cardiologie</option>
                  <option value="Gynécologie">Gynécologie</option>
                  <option value="Pédiatrie">Pédiatrie</option>
                  <option value="Médecine générale">Médecine générale</option>
                  <option value="Chirurgie">Chirurgie</option>
                </select>
              </>
            )}
          </div>
        </div>

        {/* Results */}

        {activeTab === 'hopitaux' && (
          <div className="space-y-6">

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">🏥 Hôpitaux Guinéens</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {filteredHospitals.map((hospital) => (
                  <div key={hospital.id} className="border rounded-lg p-3 sm:p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-semibold text-gray-900">{hospital.name}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        hospital.type === 'public' ? 'bg-blue-100 text-blue-800' :
                        hospital.type === 'privé' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {hospital.type}
                      </span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">📍</span>
                        <span>{hospital.address}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">📞</span>
                        <span>{hospital.phone}</span>
                      </div>
                      {hospital.emergencyPhone && (
                        <div className="flex items-center text-sm text-red-600">
                          <span className="mr-2">🚨</span>
                          <span>Urgences: {hospital.emergencyPhone}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">⭐</span>
                        <span>{hospital.rating}/5</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Services:</h4>
                      <div className="flex flex-wrap gap-1">
                        {(hospital.services || []).map((service, index) => (
                          <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                        Appeler
                      </button>
                      <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors">
                        Itinéraire
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'medecins' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">👨‍⚕️ Médecins Compétents</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                {filteredDoctors.map((doctor) => (
                  <div key={doctor.id} className="border rounded-lg p-3 sm:p-6 hover:shadow-md transition-shadow">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{doctor.name}</h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">🏥</span>
                        <span>{doctor.address}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">📞</span>
                        <span>{doctor.phone}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">⭐</span>
                        <span>{doctor.ratings}/5 ({doctor.experience} ans d'expérience)</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="mr-2">💰</span>
                        <span>{doctor.consultationFee.toLocaleString()} {doctor.currency}</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Spécialités:</h4>
                      <div className="flex flex-wrap gap-1">
                        {doctor.specialties.map((specialty, index) => (
                          <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Qualifications:</h4>
                      <div className="space-y-1">
                        {doctor.qualifications.map((qualification, index) => (
                          <div key={index} className="text-sm text-gray-600">• {qualification}</div>
                        ))}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                        Prendre RDV
                      </button>
                      <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors">
                        Contacter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Section Professionnels de Santé (Cliniques & Hôpitaux approuvés par l'admin) */}
        <ProSection
          type="clinic"
          title="Cliniques & Hôpitaux"
          icon="🏥"
          description=""
        />

      </div>
    </div>
  );
}
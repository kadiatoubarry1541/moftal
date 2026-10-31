import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTraduction } from '../i18n/traduction';
import ProSection from '../components/ProSection';
import { sortByProximity, getUserGeoContext, proximityLabel, requestGPS, type UserGeoContext } from '../utils/proximity';
import WorldMap from '../components/WorldMap';
import './Securite.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  [key: string]: any;
}

interface SecurityAgent {
  id: string;
  name: string;
  agency: string;
  badgeNumber?: string;
  country?: string;
  region: string;
  city: string;
  address?: string;
  phone: string;
  emergencyPhone?: string;
  email?: string;
  specialties?: string[];
  experience?: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
  isActive: boolean;
  isAvailable: boolean;
  rating?: number;
  reviews?: any[];
  hourlyRate?: number;
}

export default function Securite() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userCountry, setUserCountry] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [activeTab, setActiveTab] = useState<'policiers' | 'gendarmes' | 'pompiers' | 'agents'>('policiers');
  const [rawAgents, setRawAgents] = useState<SecurityAgent[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [userGeo, setUserGeo] = useState<UserGeoContext>(getUserGeoContext());
  const [gpsActive, setGpsActive] = useState(false);
  const [selectedMapPosition, setSelectedMapPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locationCheckResult, setLocationCheckResult] = useState<{ safetyLevel?: string; recommendations?: string[] } | null>(null);
  const [locationCheckLoading, setLocationCheckLoading] = useState(false);
  const navigate = useNavigate();
  const { tr } = useTraduction();

  // Re-tri réactif quand GPS arrive
  const agents = useMemo(() => sortByProximity(rawAgents, userGeo), [rawAgents, userGeo]);

  // Liste des pays disponibles
  const countries = ['Guinée', 'Sénégal', 'Mali', 'Côte d\'Ivoire', 'Burkina Faso', 'Niger', 'France', 'Canada'];

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
      const country = (user.pays || user.nationalite || 'Guinée').trim() || 'Guinée';
      setUserCountry(country);
      setSelectedCountry(country); // pays par défaut = celui de l'utilisateur
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (userCountry) loadAgents();
  }, [userCountry, activeTab]);

  // GPS silencieux
  useEffect(() => {
    requestGPS().then(coords => {
      if (coords) {
        setUserGeo(prev => ({ ...prev, coords }));
        setGpsActive(true);
      }
    });
  }, []);

  const loadAgents = async () => {
    if (!userCountry) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/security/agents`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success !== false) {
        setRawAgents(data.agents || []);
        setLoadError('');
      } else {
        // Jamais d'agents ni de numéros inventés affichés comme réels
        setRawAgents([]);
        setLoadError(tr(data.message || 'Impossible de charger les agents de sécurité.'));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des agents:', error);
      setRawAgents([]);
      setLoadError(tr('Impossible de charger les agents de sécurité : vérifiez votre connexion.'));
    } finally {
      setLoading(false);
    }
  };


  const agencyFilter: Record<string, string | ((a: SecurityAgent) => boolean)> = {
    'policiers': 'Police Nationale',
    'gendarmes': 'Gendarmerie Nationale',
    'pompiers': 'Sapeurs-Pompiers',
    'agents': (a) => (a.agency || '').includes('Sécurité Privée')
  };

  const currentCountry = (selectedCountry || userCountry || '').toLowerCase();

  const filteredAgents = agents.filter(agent => {
    const matchesCountry = !currentCountry || (agent.country || '').toLowerCase() === currentCountry;
    const matchesTab = activeTab === 'agents'
      ? (agencyFilter.agents as (a: SecurityAgent) => boolean)(agent)
      : agent.agency === agencyFilter[activeTab];
    const matchesSearch = !searchTerm ||
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.agency || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.phone || '').includes(searchTerm);
    const matchesRegion = !selectedRegion || agent.region === selectedRegion;
    const matchesCity = !selectedCity || agent.city === selectedCity;
    return matchesCountry && matchesTab && matchesSearch && matchesRegion && matchesCity;
  });

  const regions = Array.from(new Set(agents.map(a => a.region).filter(Boolean))).sort();
  const cities = Array.from(new Set(agents.filter(a => !selectedRegion || a.region === selectedRegion).map(a => a.city).filter(Boolean))).sort();

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleVerifyLocationSecurity = async () => {
    if (!selectedMapPosition || !userData?.numeroH) return;
    setLocationCheckLoading(true);
    setLocationCheckResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/security/location-checks`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: userData.numeroH,
          userName: [userData.prenom, userData.nomFamille].filter(Boolean).join(' ') || 'Membre',
          destination: `Position (${selectedMapPosition.lat.toFixed(5)}, ${selectedMapPosition.lng.toFixed(5)})`,
          coordinates: { lat: selectedMapPosition.lat, lng: selectedMapPosition.lng },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLocationCheckResult({
          safetyLevel: data.safetyLevel,
          recommendations: data.recommendations || [],
        });
      }
    } catch (e) {
      console.error(e);
      setLocationCheckResult({ safetyLevel: 'error', recommendations: [tr('Erreur de connexion. Réessayez.')] });
    } finally {
      setLocationCheckLoading(false);
    }
  };

  if (loading && agents.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                🛡️ {tr("Sécurité")}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {tr("Contacts des agents de sécurité")}
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => navigate("/compte")}
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg transition-colors"
              >
                ← {tr("Retour")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Carte mondiale et géolocalisation */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            🗺️ {tr("Carte mondiale & géolocalisation")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {tr("Du monde entier jusqu'aux quartiers et rues : zoomez avec la molette ou les boutons +/− pour voir tous les détails. Cliquez sur « Ma position » pour vous localiser, ou sur la carte pour choisir un lieu et vérifier la sécurité.")}
          </p>
          <WorldMap
            showMyPositionButton={true}
            onLocationSelect={(lat, lng) => {
              setSelectedMapPosition({ lat, lng });
              setLocationCheckResult(null);
            }}
          />
          {selectedMapPosition && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                {tr("Position sélectionnée : {lat}, {lng}", { lat: selectedMapPosition.lat.toFixed(5), lng: selectedMapPosition.lng.toFixed(5) })}
              </p>
              <button
                type="button"
                onClick={handleVerifyLocationSecurity}
                disabled={locationCheckLoading}
                className="px-4 py-2 rounded-lg font-medium bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {locationCheckLoading ? tr('Vérification…') : tr('🛡️ Vérifier')}
              </button>
              {locationCheckResult && (
                <div className="mt-3 p-2 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {tr('Niveau :')} {locationCheckResult.safetyLevel === 'safe' && tr('✅ Sûr')}
                    {locationCheckResult.safetyLevel === 'moderate' && tr('⚠️ Modéré')}
                    {locationCheckResult.safetyLevel === 'risky' && tr('⚠️ Risqué')}
                    {locationCheckResult.safetyLevel === 'dangerous' && tr('🔴 Dangereux')}
                    {locationCheckResult.safetyLevel === 'error' && tr('❌ Erreur')}
                  </p>
                  {locationCheckResult.recommendations?.length ? (
                    <ul className="text-sm text-gray-600 dark:text-gray-400 mt-1 list-disc list-inside">
                      {locationCheckResult.recommendations.map((r, i) => (
                        <li key={i}>{tr(r)}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Choix du pays – chaque pays a sa propre sécurité */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            🌍 {tr("Pays")}
          </label>
          <select
            value={selectedCountry || userCountry}
            onChange={(e) => {
              setSelectedCountry(e.target.value);
              setSelectedRegion('');
              setSelectedCity('');
            }}
            className="w-full max-w-xs border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
          >
            <option value="">{tr("Choisir un pays")}</option>
            {countries.map((c) => (
              <option key={c} value={c}>{tr(c)}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {tr("Chaque pays a ses propres forces de sécurité. Sélectionnez un pays pour voir les agents.")}
          </p>
        </div>

        {!(selectedCountry || userCountry) ? (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 text-center text-amber-800 dark:text-amber-200">
            <p className="font-medium">{tr("Choisissez un pays ci-dessus pour afficher les agents de sécurité.")}</p>
          </div>
        ) : (
          <>
        {/* Onglets (par type d'agent dans le pays choisi) */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab('policiers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'policiers'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                👮 {tr("Policiers")}
              </button>
              <button
                onClick={() => setActiveTab('gendarmes')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'gendarmes'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                👮‍♂️ {tr("Gendarmes")}
              </button>
              <button
                onClick={() => setActiveTab('pompiers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'pompiers'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                🚒 {tr("Pompiers")}
              </button>
              <button
                onClick={() => setActiveTab('agents')}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === 'agents'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                🛡️ {tr("Agents Privés")}
              </button>
            </nav>
          </div>
        </div>

        {/* Barre de recherche et filtres */}
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tr("Rechercher")}
              </label>
              <input
                type="text"
                placeholder={tr("Nom, agence, ville, téléphone...")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tr("Région")}
              </label>
              <select
                value={selectedRegion}
                onChange={(e) => {
                  setSelectedRegion(e.target.value);
                  setSelectedCity('');
                }}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">{tr("Toutes les régions")}</option>
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {tr("Ville")}
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">{tr("Toutes les villes")}</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Bannière proximité */}
        {(userGeo.city || userGeo.country || gpsActive) && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-4">
            <span className="text-base">{gpsActive ? "📡" : "📍"}</span>
            <span>
              {gpsActive
                ? tr("Les agents les plus proches de vous apparaissent en premier")
                : tr("Résultats personnalisés — les agents de {lieu} apparaissent en premier", { lieu: userGeo.city || userGeo.country || selectedCountry })
              }
            </span>
          </div>
        )}

        {/* Liste des agents */}
        <div className="space-y-4">
          {filteredAgents.length > 0 ? (
            filteredAgents.map((agent) => {
              const aprox = proximityLabel(agent, userGeo);
              return (
              <div
                key={agent.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-2xl">
                          {activeTab === 'policiers' ? '👮' :
                           activeTab === 'gendarmes' ? '👮‍♂️' :
                           activeTab === 'pompiers' ? '🚒' : '🛡️'}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            {agent.name}
                          </h3>
                          {aprox && (
                            <span className="px-2 py-0.5 text-white text-xs font-semibold rounded-full" style={{ backgroundColor: aprox.color }}>
                              {tr(aprox.text)}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">
                          {agent.agency}
                          {agent.badgeNumber && ` • ${tr("Badge: {numero}", { numero: agent.badgeNumber })}`}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div>
                            <span className="font-medium">📍</span> {agent.city}, {agent.region}
                          </div>
                          {agent.address && (
                            <div>
                              <span className="font-medium">🏠</span> {agent.address}
                            </div>
                          )}
                          {agent.experience && (
                            <div>
                              <span className="font-medium">⭐</span> {tr("{n} ans d'expérience", { n: agent.experience })}
                            </div>
                          )}
                          {agent.rating && (
                            <div>
                              <span className="font-medium">⭐</span> {agent.rating.toFixed(1)}/5
                            </div>
                          )}
                        </div>
                        {agent.specialties && agent.specialties.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {agent.specialties.map((specialty, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded-full"
                              >
                                {specialty}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 md:items-end">
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleCall(agent.phone)}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        <span>📞</span>
                        <span className="font-semibold">{agent.phone}</span>
                      </button>
                      {agent.emergencyPhone && (
                        <button
                          onClick={() => handleCall(agent.emergencyPhone!)}
                          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          <span>🚨</span>
                          <span className="font-semibold">{tr("Urgence: {tel}", { tel: agent.emergencyPhone })}</span>
                        </button>
                      )}
                    </div>
                    {!agent.isAvailable && (
                      <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                        {tr("Indisponible")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              );
            })
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-12 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {loadError ? tr('Chargement impossible') : tr('Aucun agent trouvé')}
              </h3>
              <p className={loadError ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}>
                {loadError || tr('Aucun agent de sécurité ne correspond à vos critères de recherche.')}
              </p>
            </div>
          )}
        </div>
          </>
        )}

        {/* Section Agences de Sécurité Professionnelles (approuvées par l'admin) */}
        <ProSection
          type="security_agency"
          title={tr("Agences de Sécurité")}
          icon="🛡️"
          description={tr("Les agences de sécurité peuvent s'inscrire ici. Après validation par l'administrateur, elles apparaîtront dans la liste et disposeront de leur propre espace de travail.")}
        />
      </div>
    </div>
  );
}
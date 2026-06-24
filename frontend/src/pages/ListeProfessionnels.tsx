import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getSessionUser, isAdmin } from "../utils/auth";
import { sortByProximity, proximityScore, getUserGeoContext, proximityLabel, requestGPS, type UserGeoContext } from "../utils/proximity";

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface ProAccount {
  id: string;
  type: string;
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  services: string[];
  specialties: string[];
  photo?: string;
}

const TYPES = [
  { id: "", label: "Tous", icon: "📋" },
  { id: "clinic", label: "Cliniques", icon: "🏥" },
  { id: "security_agency", label: "Sécurité", icon: "🛡️" },
  { id: "journalist", label: "Journalistes", icon: "📰" },
  { id: "commerce", label: "Commerce", icon: "🏪" },
  { id: "enterprise", label: "Entreprises", icon: "🏢" },
  { id: "school", label: "Écoles", icon: "🎓" },
  { id: "supplier", label: "Fournisseurs", icon: "📦" },
  { id: "vendor", label: "Vendeurs", icon: "🛒" },
  { id: "producer", label: "Producteurs", icon: "🏭" },
  { id: "broker", label: "Immobilier", icon: "🏘️" },
  { id: "scientist", label: "Scientifiques", icon: "🔬" },
  { id: "ngo", label: "ONG / Associations", icon: "🤝" },
  { id: "restaurant", label: "Restaurants", icon: "🍽️" },
  { id: "transport", label: "Transport", icon: "🚗" },
  { id: "beauty", label: "Beauté", icon: "💈" },
  { id: "artisan", label: "Artisanat", icon: "🔧" },
  { id: "mairie",  label: "Mairie",    icon: "🏛️" },
];

function getTypeIcon(type: string) {
  return TYPES.find(t => t.id === type)?.icon || "🏢";
}

export default function ListeProfessionnels() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rawAccounts, setRawAccounts] = useState<ProAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const filterType = searchParams.get("type") || "";
  const filterCity = searchParams.get("city") || "";
  const isMairie   = filterType === "mairie";

  const currentUser = getSessionUser();
  const userIsAdmin = isAdmin(currentUser);
  const [userGeo, setUserGeo] = useState<UserGeoContext>(getUserGeoContext());
  const [gpsActive, setGpsActive] = useState(false);

  // Quand type=mairie et city fournie, on filtre strictement par commune
  const accountsFiltered = useMemo(() => {
    if (isMairie && filterCity) {
      const city = filterCity.toLowerCase().trim();
      return rawAccounts.filter(p =>
        (p.city || "").toLowerCase().includes(city) ||
        city.includes((p.city || "").toLowerCase().trim())
      );
    }
    return rawAccounts;
  }, [rawAccounts, isMairie, filterCity]);

  // Tri réactif : se recalcule quand GPS arrive ou liste change
  const accounts = useMemo(
    () => sortByProximity(accountsFiltered, userGeo),
    [accountsFiltered, userGeo]
  );

  // Groupes géographiques : même zone (score ≤ 150) vs reste du monde
  const hasGeoContext = !!(userGeo.city || userGeo.region || userGeo.country || userGeo.coords);
  const { localAccounts, otherAccounts } = useMemo(() => {
    if (isMairie && filterCity) return { localAccounts: accounts, otherAccounts: [] as ProAccount[] };
    if (!hasGeoContext) return { localAccounts: [] as ProAccount[], otherAccounts: accounts };
    const local: ProAccount[] = [];
    const other: ProAccount[] = [];
    for (const pro of accounts) {
      if (proximityScore(pro, userGeo) <= 150) local.push(pro);
      else other.push(pro);
    }
    return { localAccounts: local, otherAccounts: other };
  }, [accounts, userGeo, hasGeoContext, isMairie, filterCity]);

  useEffect(() => {
    loadAccounts();
  }, [filterType]);

  // Demande GPS silencieuse au chargement
  useEffect(() => {
    requestGPS().then(coords => {
      if (coords) {
        setUserGeo(prev => ({ ...prev, coords }));
        setGpsActive(true);
      }
    });
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const url = filterType
        ? `${API_BASE}/api/professionals/approved?type=${filterType}`
        : `${API_BASE}/api/professionals/approved`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setRawAccounts(data.accounts || []);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!search.trim()) { loadAccounts(); return; }
    setLoading(true);
    try {
      const url = `${API_BASE}/api/professionals/search?q=${encodeURIComponent(search)}&type=${filterType}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setRawAccounts(data.accounts || []);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const buildLocation = (pro: ProAccount) => {
    return [pro.address, pro.city, pro.country].filter(Boolean).join(", ");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/compte")} className="min-h-[44px] px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium transition-colors">
            ← Retour
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Professionnels & Services</h1>
        </div>

        {/* Recherche */}
        <div className="flex gap-2 mb-4">
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Rechercher un nom, une adresse, une ville..."
            className="flex-1 min-h-[44px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleSearch} className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            🔍
          </button>
        </div>

        {/* Bandeau mairie par commune */}
        {isMairie && filterCity && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <span className="text-xl">🏛️</span>
            <div>
              <p className="text-sm font-bold text-blue-900">
                Mairie de votre sous-préfecture : <span className="capitalize">{filterCity}</span>
              </p>
              <p className="text-xs text-blue-600">Seule la mairie de votre sous-préfecture est affichée</p>
            </div>
          </div>
        )}
        {isMairie && filterCity && accounts.length === 0 && !loading && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Aucune mairie enregistrée pour la sous-préfecture de <strong className="capitalize">{filterCity}</strong> pour le moment.
          </div>
        )}

        {/* Filtres par type */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-6 scrollbar-thin">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => { setSearchParams(t.id ? { type: t.id } : {}); setExpandedId(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors min-h-[40px] ${
                filterType === t.id
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Indicateur proximité active */}
        {(userGeo.city || userGeo.country || gpsActive) && (
          <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
            <span>{gpsActive ? "📡" : "📍"}</span>
            <span>
              {gpsActive
                ? "Résultats triés par distance GPS — les plus proches de vous apparaissent en premier"
                : `Résultats triés par proximité (${userGeo.city || userGeo.country}) — les plus proches de vous apparaissent en premier`
              }
            </span>
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Chargement...</div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <div className="text-6xl mb-4">
              {filterType ? (TYPES.find(t => t.id === filterType)?.icon || "🏢") : "💼"}
            </div>
            <h3 className="text-base font-bold text-gray-700 mb-2">
              Aucun professionnel inscrit pour l'instant
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs leading-relaxed">
              {filterType
                ? `Aucun ${TYPES.find(t => t.id === filterType)?.label?.toLowerCase() || 'professionnel'} n'a encore rejoint la plateforme. Soyez le premier !`
                : "Aucun professionnel n'a encore rejoint la plateforme. Proposez votre service dès aujourd'hui !"
              }
            </p>
            <button
              onClick={() => navigate('/inscription-pro')}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-sm rounded-xl shadow-sm transition-colors"
            >
              ➕ Proposer votre service
            </button>
          </div>
        ) : hasGeoContext ? (
          <>
            {/* ── SECTION : DANS VOTRE ZONE ── */}
            {localAccounts.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm">
                    <span>{gpsActive ? "📡" : "📍"}</span>
                    <span>{gpsActive ? `Près de vous (${localAccounts.length})` : `Dans votre pays (${localAccounts.length})`}</span>
                  </div>
                  <div className="flex-1 h-px bg-emerald-200 dark:bg-emerald-800" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {localAccounts.map((pro) => {
                    const isExpanded = expandedId === pro.id;
                    const location = buildLocation(pro);

              return (
                <div key={pro.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden hover:shadow-lg transition-shadow flex flex-col">

                  {/* ── PHOTO ── */}
                  <div className="relative w-full h-44 bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                    {pro.photo ? (
                      <img
                        src={pro.photo}
                        alt={pro.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">
                        {getTypeIcon(pro.type)}
                      </div>
                    )}
                    {/* Badge type */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-full shadow-sm">
                      {TYPES.find(t => t.id === pro.type)?.icon} {TYPES.find(t => t.id === pro.type)?.label}
                    </span>
                    {/* Badge proximité */}
                    {(() => {
                      const prox = proximityLabel(pro, userGeo);
                      return prox ? (
                        <span className="absolute top-2 right-2 px-2 py-0.5 text-white text-xs font-semibold rounded-full shadow-sm"
                          style={{ backgroundColor: prox.color }}>
                          {prox.text}
                        </span>
                      ) : null;
                    })()}
                  </div>

                  {/* ── INFOS PRINCIPALES ── */}
                  <div className="p-4 flex flex-col flex-1">

                    {/* Nom */}
                    <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 mb-2 leading-snug">
                      {pro.name}
                    </h3>

                    {/* Services */}
                    {pro.services?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {pro.services.slice(0, 4).map((s, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full border border-blue-100 dark:border-blue-800">
                            {s}
                          </span>
                        ))}
                        {pro.services.length > 4 && (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs rounded-full">
                            +{pro.services.length - 4}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Adresse */}
                    {location && (
                      <div className="flex items-start gap-1.5 text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span className="mt-0.5 flex-shrink-0">📍</span>
                        <span>{location}</span>
                      </div>
                    )}

                    {/* Téléphone */}
                    {pro.phone && (
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="text-sm flex-shrink-0">📞</span>
                        <a
                          href={`tel:${pro.phone}`}
                          className="text-sm font-semibold text-green-600 dark:text-green-400 hover:underline"
                        >
                          {pro.phone}
                        </a>
                      </div>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* ── BOUTONS PRINCIPAUX ── */}
                    <div className="flex gap-2 mt-2">
                      {pro.phone && (
                        <a
                          href={`tel:${pro.phone}`}
                          className="flex-1 flex items-center justify-center gap-1 min-h-[38px] px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition-colors"
                        >
                          📞 Appeler
                        </a>
                      )}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : pro.id)}
                        className={`flex items-center justify-center gap-1 min-h-[38px] px-3 py-2 text-xs font-semibold rounded-xl transition-colors border ${
                          isExpanded
                            ? "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500"
                            : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
                        }`}
                      >
                        {isExpanded ? "✕ Fermer" : "＋ Plus d'infos"}
                      </button>
                    </div>

                    {/* ── SECTION DÉTAILS EXPANDABLE ── */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">

                        {/* Description */}
                        {pro.description && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Description</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{pro.description}</p>
                          </div>
                        )}

                        {/* Spécialités */}
                        {pro.specialties?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Spécialités</p>
                            <div className="flex flex-wrap gap-1">
                              {pro.specialties.map((s, i) => (
                                <span key={i} className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full border border-purple-100 dark:border-purple-800">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Email */}
                        {pro.email && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">✉️</span>
                            <a href={`mailto:${pro.email}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">
                              {pro.email}
                            </a>
                          </div>
                        )}

                        {/* Bouton Rendez-vous */}
                        <button
                          onClick={() => navigate(`/rendez-vous/${pro.id}`)}
                          className="w-full min-h-[40px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors mt-2"
                        >
                          📅 Prendre rendez-vous
                        </button>

                        {/* Bouton admin — accès direct au dashboard du professionnel */}
                        {userIsAdmin && (
                          <button
                            onClick={() => navigate(`/espace-pro/${pro.id}`)}
                            className="w-full min-h-[40px] px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                          >
                            👁️ Voir le dashboard (Admin)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
                </div>
              </section>
            )}

            {/* ── SECTION : RESTE DU MONDE ── */}
            {otherAccounts.length > 0 && (
              <section>
                {localAccounts.length > 0 && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 bg-gray-400 dark:bg-gray-600 text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm">
                      <span>🌍</span>
                      <span>Autres pays ({otherAccounts.length})</span>
                    </div>
                    <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {otherAccounts.map((pro) => {
                    const isExpanded = expandedId === pro.id;
                    const location = buildLocation(pro);
                    const prox = proximityLabel(pro, userGeo);
                    return (
                      <div key={pro.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                        <div className="relative w-full h-44 bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                          {pro.photo ? <img src={pro.photo} alt={pro.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">{getTypeIcon(pro.type)}</div>}
                          <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-full shadow-sm">{TYPES.find(t => t.id === pro.type)?.icon} {TYPES.find(t => t.id === pro.type)?.label}</span>
                          {prox && <span className="absolute top-2 right-2 px-2 py-0.5 text-white text-xs font-semibold rounded-full shadow-sm" style={{ backgroundColor: prox.color }}>{prox.text}</span>}
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 mb-2 leading-snug">{pro.name}</h3>
                          {pro.services?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {pro.services.slice(0, 4).map((s, i) => <span key={i} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full border border-blue-100 dark:border-blue-800">{s}</span>)}
                              {pro.services.length > 4 && <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs rounded-full">+{pro.services.length - 4}</span>}
                            </div>
                          )}
                          {location && <div className="flex items-start gap-1.5 text-sm text-gray-600 dark:text-gray-400 mb-2"><span className="mt-0.5 flex-shrink-0">📍</span><span>{location}</span></div>}
                          {pro.phone && <div className="flex items-center gap-1.5 mb-3"><span className="text-sm flex-shrink-0">📞</span><a href={`tel:${pro.phone}`} className="text-sm font-semibold text-green-600 dark:text-green-400 hover:underline">{pro.phone}</a></div>}
                          <div className="flex-1" />
                          <div className="flex gap-2 mt-2">
                            {pro.phone && <a href={`tel:${pro.phone}`} className="flex-1 flex items-center justify-center gap-1 min-h-[38px] px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition-colors">📞 Appeler</a>}
                            <button onClick={() => setExpandedId(isExpanded ? null : pro.id)} className={`flex items-center justify-center gap-1 min-h-[38px] px-3 py-2 text-xs font-semibold rounded-xl transition-colors border ${isExpanded ? "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500" : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"}`}>{isExpanded ? "✕ Fermer" : "＋ Plus d'infos"}</button>
                          </div>
                          {isExpanded && (
                            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                              {pro.description && <div><p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Description</p><p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{pro.description}</p></div>}
                              {pro.specialties?.length > 0 && <div><p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Spécialités</p><div className="flex flex-wrap gap-1">{pro.specialties.map((s, i) => <span key={i} className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full border border-purple-100 dark:border-purple-800">{s}</span>)}</div></div>}
                              {pro.email && <div className="flex items-center gap-1.5"><span className="text-sm">✉️</span><a href={`mailto:${pro.email}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">{pro.email}</a></div>}
                              <button onClick={() => navigate(`/rendez-vous/${pro.id}`)} className="w-full min-h-[40px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors mt-2">📅 Prendre rendez-vous</button>
                              {userIsAdmin && <button onClick={() => navigate(`/espace-pro/${pro.id}`)} className="w-full min-h-[40px] px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">👁️ Voir le dashboard (Admin)</button>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {accounts.map((pro) => {
              const isExpanded = expandedId === pro.id;
              const location = buildLocation(pro);
              const prox = proximityLabel(pro, userGeo);
              return (
                <div key={pro.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
                  <div className="relative w-full h-44 bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                    {pro.photo ? <img src={pro.photo} alt={pro.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">{getTypeIcon(pro.type)}</div>}
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-full shadow-sm">{TYPES.find(t => t.id === pro.type)?.icon} {TYPES.find(t => t.id === pro.type)?.label}</span>
                    {prox && <span className="absolute top-2 right-2 px-2 py-0.5 text-white text-xs font-semibold rounded-full shadow-sm" style={{ backgroundColor: prox.color }}>{prox.text}</span>}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 mb-2 leading-snug">{pro.name}</h3>
                    {pro.services?.length > 0 && <div className="flex flex-wrap gap-1.5 mb-3">{pro.services.slice(0, 4).map((s, i) => <span key={i} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full border border-blue-100 dark:border-blue-800">{s}</span>)}{pro.services.length > 4 && <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs rounded-full">+{pro.services.length - 4}</span>}</div>}
                    {location && <div className="flex items-start gap-1.5 text-sm text-gray-600 dark:text-gray-400 mb-2"><span className="mt-0.5 flex-shrink-0">📍</span><span>{location}</span></div>}
                    {pro.phone && <div className="flex items-center gap-1.5 mb-3"><span className="text-sm flex-shrink-0">📞</span><a href={`tel:${pro.phone}`} className="text-sm font-semibold text-green-600 dark:text-green-400 hover:underline">{pro.phone}</a></div>}
                    <div className="flex-1" />
                    <div className="flex gap-2 mt-2">
                      {pro.phone && <a href={`tel:${pro.phone}`} className="flex-1 flex items-center justify-center gap-1 min-h-[38px] px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition-colors">📞 Appeler</a>}
                      <button onClick={() => setExpandedId(isExpanded ? null : pro.id)} className={`flex items-center justify-center gap-1 min-h-[38px] px-3 py-2 text-xs font-semibold rounded-xl transition-colors border ${isExpanded ? "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500" : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"}`}>{isExpanded ? "✕ Fermer" : "＋ Plus d'infos"}</button>
                    </div>
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                        {pro.description && <div><p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Description</p><p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{pro.description}</p></div>}
                        {pro.specialties?.length > 0 && <div><p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Spécialités</p><div className="flex flex-wrap gap-1">{pro.specialties.map((s, i) => <span key={i} className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full border border-purple-100 dark:border-purple-800">{s}</span>)}</div></div>}
                        {pro.email && <div className="flex items-center gap-1.5"><span className="text-sm">✉️</span><a href={`mailto:${pro.email}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all">{pro.email}</a></div>}
                        <button onClick={() => navigate(`/rendez-vous/${pro.id}`)} className="w-full min-h-[40px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors mt-2">📅 Prendre rendez-vous</button>
                        {userIsAdmin && <button onClick={() => navigate(`/espace-pro/${pro.id}`)} className="w-full min-h-[40px] px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">👁️ Voir le dashboard (Admin)</button>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

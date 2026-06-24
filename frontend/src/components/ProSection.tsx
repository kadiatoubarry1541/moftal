import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { sortByProximity, getUserGeoContext, proximityLabel, requestGPS, type UserGeoContext } from "../utils/proximity";

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
  status: string;
}

interface ProSectionProps {
  type: "clinic" | "security_agency" | "journalist" | "enterprise" | "school" | "supplier" | "scientist" | "ngo" | "broker" | "restaurant" | "transport" | "commerce" | "vendor" | "producer" | "artisan" | "beauty" | "mosque" | "madrasa" | "mairie";
  title: string;
  icon: string;
  description: string;
  /** Ne pas afficher le message "Aucun X disponible" quand la liste est vide */
  hideEmptyMessage?: boolean;
}

export default function ProSection({ type, title, icon, description, hideEmptyMessage }: ProSectionProps) {
  const navigate = useNavigate();
  const [rawAccounts, setRawAccounts] = useState<ProAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [userGeo, setUserGeo] = useState<UserGeoContext>(getUserGeoContext());
  const [gpsActive, setGpsActive] = useState(false);

  const accounts = useMemo(() => sortByProximity(rawAccounts, userGeo), [rawAccounts, userGeo]);

  useEffect(() => { loadAccounts(); }, [type]);

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
      const res = await fetch(`http://localhost:5002/api/professionals/approved?type=${type}`);
      const data = await res.json();
      if (data.success) setRawAccounts(data.accounts || []);
    } catch (error) {
      console.error("Erreur:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = accounts.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.city.toLowerCase().includes(search.toLowerCase()) ||
    (a.address || '').toLowerCase().includes(search.toLowerCase())
  );

  const buildLocation = (pro: ProAccount) => {
    const parts = [pro.address, pro.city, pro.country].filter(Boolean);
    return parts.join(", ");
  };

  return (
    <div className="mt-8" id={`section-${type}`}>
      {/* Titre section */}
      <div className="mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          {icon} {title}
        </h2>
      </div>
      {description && <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{description}</p>}

      {/* Bannière proximité géographique */}
      {(userGeo.city || userGeo.country || gpsActive) && accounts.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2 mb-4">
          <span className="text-base">{gpsActive ? "📡" : "📍"}</span>
          <span>
            {gpsActive
              ? "Les résultats les plus proches de vous apparaissent en premier"
              : `Résultats personnalisés — ceux de ${userGeo.city || userGeo.country} apparaissent en premier`}
          </span>
        </div>
      )}

      {/* Recherche */}
      {accounts.length > 0 && (
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, adresse ou ville..."
          className="w-full min-h-[40px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 mb-4 text-sm" />
      )}

      {/* Liste */}
      {loading ? (
        <div className="text-center py-6 text-gray-500 text-sm">Chargement...</div>
      ) : filtered.length === 0 ? (
        hideEmptyMessage ? null : (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 mt-2">
            <div className="text-6xl mb-4">{icon}</div>
            <h3 className="text-base font-bold text-gray-700 mb-2">
              Aucun {title.toLowerCase()} inscrit pour l'instant
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs leading-relaxed">
              Les professionnels rejoignent bientôt la plateforme dans votre région.
              Vous proposez ce service ? Soyez parmi les premiers à vous inscrire !
            </p>
            <button
              onClick={() => navigate('/inscription-pro')}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold text-sm rounded-xl shadow-sm transition-colors"
            >
              ➕ Proposer votre service
            </button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((pro) => {
            const isExpanded = expandedId === pro.id;
            const location = buildLocation(pro);
            const prox = proximityLabel(pro, userGeo);

            return (
              <div key={pro.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 overflow-hidden hover:shadow-lg transition-shadow flex">

                {/* ── COLONNE GAUCHE : PHOTO + BOUTON RDV ── */}
                <div className="flex flex-col items-stretch w-32 sm:w-40 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                  <div className="relative w-full h-28 sm:h-32 bg-gray-100 dark:bg-gray-700">
                    {pro.photo ? (
                      <img
                        src={pro.photo}
                        alt={pro.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">
                        {type === "clinic" ? "🏥" : type === "school" ? "🎓" : type === "security_agency" ? "🛡️" : type === "journalist" ? "📰" : type === "supplier" ? "📦" : type === "scientist" ? "🔬" : type === "ngo" ? "🤝" : "🏢"}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/rendez-vous/${pro.id}`)}
                    className="mt-2 mx-1 mb-2 flex items-center justify-center gap-1 min-h-[32px] px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-[11px] sm:text-xs font-semibold rounded-xl transition-colors"
                  >
                    📅 Prendre rendez-vous
                  </button>
                </div>

                {/* ── INFOS PRINCIPALES ── */}
                <div className="p-3 sm:p-4 flex flex-col flex-1 min-w-0">

                  {/* Nom */}
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-gray-100 leading-snug truncate">
                      {pro.name}
                    </h3>
                    {prox && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{ color: prox.color, backgroundColor: `${prox.color}1A`, border: `1px solid ${prox.color}33` }}
                      >
                        {prox.text}
                      </span>
                    )}
                  </div>

                  {/* Services */}
                  {pro.services?.length > 0 ? (
                    <div className="mb-2">
                      <div className="text-[11px] text-gray-600 dark:text-gray-300 mb-0.5">
                        <span className="font-semibold">Services principaux :</span>{" "}
                        <span>
                          {pro.services.slice(0, 2).join(", ")}
                          {pro.services.length > 2 && " ..."}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {pro.services.slice(0, 4).map((s, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full border border-blue-100 dark:border-blue-800"
                          >
                            {s}
                          </span>
                        ))}
                        {pro.services.length > 4 && (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 text-xs rounded-full">
                            +{pro.services.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-2 text-[11px] text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">Services principaux :</span>{" "}
                      <span>non renseignés pour le moment</span>
                    </div>
                  )}

                  {/* Adresse */}
                  {location && (
                    <div className="flex items-start gap-1.5 text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span className="mt-0.5 flex-shrink-0">📍</span>
                      <span>{location}</span>
                    </div>
                  )}

                  {/* Téléphone (affiché pour information, appel manuel possible) */}
                  {pro.phone && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-sm flex-shrink-0">📞</span>
                      <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                        {pro.phone}
                      </span>
                    </div>
                  )}

                  {/* ── BOUTON DÉTAILS (juste sous le téléphone) ── */}
                  <div className="flex gap-2 mt-1 justify-start">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : pro.id)}
                      className={`flex items-center justify-center gap-1 min-h-[32px] px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors border ${
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
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

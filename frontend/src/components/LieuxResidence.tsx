import { useState, useEffect } from "react";
import "./LieuxResidence.css";
import { config } from "../config/api";
import { getPhotoUrl } from "../utils/auth";

interface Residence {
  id: string;
  type: "actuel" | "precedent" | "futur";
  pays: string;
  region: string;
  ville: string;
  commune?: string;
  quartier?: string;
  adresse?: string;
  dateDebut: string;
  dateFin?: string;
  description?: string;
  photo?: string;
  coordonnees?: {
    latitude: number;
    longitude: number;
  };
}

interface LieuxResidenceProps {
  userData: {
    prenom: string;
    nomFamille: string;
    numeroH: string;
    photo?: string;
    [key: string]: string | number | boolean | undefined;
  };
}

export function LieuxResidence({ userData }: LieuxResidenceProps) {
  const [activeTab, setActiveTab] = useState("lieu1");
  const [menuOpen, setMenuOpen] = useState(false);
  const [residences, setResidences] = useState<Residence[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingResidence, setEditingResidence] = useState<Residence | null>(
    null,
  );

  // Récupérer les 3 lieux de résidence choisis lors de l'inscription
  const lieu1 = userData.lieu1 || 'Non renseigné';
  const lieu2 = userData.lieu2 || 'Non renseigné';
  const lieu3 = userData.lieu3 || 'Non renseigné';

  // URL de la photo de profil de l'utilisateur (si disponible)
  const userPhotoUrl = getPhotoUrl(userData.photo as string | undefined);

  useEffect(() => {
    // Simuler des données de résidence pour la démo
    const mockResidences: Residence[] = [
      {
        id: "1",
        type: "actuel",
        pays: "Guinée",
        region: "Conakry",
        ville: "Conakry",
        commune: "Ratoma",
        quartier: "Hamdallaye",
        adresse: "Avenue de la République, Immeuble ABC",
        dateDebut: "2020-01-01",
        description: "Résidence principale depuis 2020",
        coordonnees: {
          latitude: 9.5315,
          longitude: -13.7122,
        },
      },
      {
        id: "2",
        type: "precedent",
        pays: "Guinée",
        region: "Labé",
        ville: "Labé",
        commune: "Labé Centre",
        quartier: "Tata",
        dateDebut: "2015-03-01",
        dateFin: "2019-12-31",
        description: "Résidence pendant mes études universitaires",
      },
      {
        id: "3",
        type: "precedent",
        pays: "Guinée",
        region: "Kindia",
        ville: "Kindia",
        commune: "Kindia Centre",
        dateDebut: "2010-01-01",
        dateFin: "2015-02-28",
        description: "Résidence familiale d'enfance",
      },
    ];

    setResidences(mockResidences);
  }, []);

  const tabs = [
    { id: "lieu1", label: `Lieu 1: ${lieu1}`, icon: "🥇", subtitle: "District" },
    { id: "lieu2", label: `Lieu 2: ${lieu2}`, icon: "🥈", subtitle: "Sous-préfecture" },
    { id: "lieu3", label: `Lieu 3: ${lieu3}`, icon: "🥉", subtitle: "Préfecture" },
    { id: "actuel", label: "Résidence actuelle", icon: "🏠" },
    { id: "carte", label: "Carte des lieux", icon: "🗺️" },
    { id: "statistiques", label: "Statistiques", icon: "📊" },
  ];

  const getResidencesByType = (type: string) => {
    return residences.filter((residence) => residence.type === type);
  };

  const formatPeriode = (dateDebut: string, dateFin?: string) => {
    const debut = new Date(dateDebut).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });
    const fin = dateFin
      ? new Date(dateFin).toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        })
      : "Présent";
    return `${debut} - ${fin}`;
  };

  const calculateDuree = (dateDebut: string, dateFin?: string) => {
    const debut = new Date(dateDebut);
    const fin = dateFin ? new Date(dateFin) : new Date();
    const diffTime = Math.abs(fin.getTime() - debut.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);

    if (years > 0) {
      return `${years} an${years > 1 ? "s" : ""} ${months > 0 ? `et ${months} mois` : ""}`;
    }
    return `${months} mois`;
  };

  const getStats = () => {
    const totalResidences = residences.length;
    const paysVisites = [...new Set(residences.map((r) => r.pays))].length;
    const regionsVisitees = [...new Set(residences.map((r) => r.region))]
      .length;
    const villesVisitees = [...new Set(residences.map((r) => r.ville))].length;

    return {
      totalResidences,
      paysVisites,
      regionsVisitees,
      villesVisitees,
    };
  };

  const stats = getStats();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Principal */}
      <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-blue-500 border border-slate-200 p-6 mb-8 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center justify-center gap-3">
          🏠 Lieux de résidence de {userData.prenom} {userData.nomFamille}
        </h2>
        <div className="text-slate-600">
          <span className="font-medium">NuméroH:</span>{" "}
          <span className="text-blue-600 font-semibold">
            {userData.numeroH}
          </span>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-emerald-500 border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">
              🏠
            </div>
            <div>
              <h3 className="text-xl font-semibold text-emerald-800 mb-0">
                {stats.totalResidences}
              </h3>
              <p className="text-slate-500">Total résidences</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-blue-500 border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-3xl">
              🌍
            </div>
            <div>
              <h3 className="text-xl font-semibold text-blue-800 mb-0">
                {stats.paysVisites}
              </h3>
              <p className="text-slate-500">Pays visités</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-amber-500 border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl">
              🗺️
            </div>
            <div>
              <h3 className="text-xl font-semibold text-amber-800 mb-0">
                {stats.regionsVisitees}
              </h3>
              <p className="text-slate-500">Régions visitées</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-purple-500 border border-slate-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center text-3xl">
              🏙️
            </div>
            <div>
              <h3 className="text-xl font-semibold text-purple-800 mb-0">
                {stats.villesVisitees}
              </h3>
              <p className="text-slate-500">Villes visitées</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation — menu 3 points */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 py-3 mb-6 flex items-center justify-between">
        {/* Section active */}
        <div className="flex items-center gap-2">
          <span className="text-xl">{tabs.find(t => t.id === activeTab)?.icon}</span>
          <span className="font-semibold text-slate-800 text-sm">
            {tabs.find(t => t.id === activeTab)?.label}
          </span>
        </div>

        {/* ⋮ Menu 3 points */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            className="flex flex-col items-center justify-center gap-[4px] p-2.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition"
            aria-label="Menu"
          >
            <span className="block w-[5px] h-[5px] rounded-full bg-gray-600" />
            <span className="block w-[5px] h-[5px] rounded-full bg-gray-600" />
            <span className="block w-[5px] h-[5px] rounded-full bg-gray-600" />
          </button>

          {menuOpen && (
            <>
              {/* Overlay pour fermer en cliquant dehors */}
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-12 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 min-w-[220px]">
                {tabs.map((tab, i) => (
                  <div key={tab.id}>
                    {i === 3 && <div className="border-t border-gray-100 my-1" />}
                    <button
                      type="button"
                      onClick={() => { setActiveTab(tab.id); setMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition ${
                        activeTab === tab.id
                          ? 'text-blue-600 font-bold bg-blue-50'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-lg">{tab.icon}</span>
                      <span className="flex-1 text-left">{tab.label}</span>
                      {activeTab === tab.id && <span className="text-blue-500">✓</span>}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end mb-6">
        <button
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors duration-200"
          onClick={() => setShowAddModal(true)}
        >
          ➕ Ajouter une résidence
        </button>
      </div>

      {/* Contenu des onglets */}
      <div className="space-y-6">
        {/* LIEU 1 - District */}
        {activeTab === "lieu1" && (
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-blue-500 border border-slate-200 p-6">
            <h3 className="text-2xl font-semibold text-blue-800 mb-6 flex items-center gap-3">
              🥇 Lieu de résidence 1 : {lieu1}
            </h3>
            
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200 mb-6">
              <h5 className="text-lg font-bold text-blue-900 mb-3">📍 Type de localisation</h5>
              <p className="text-2xl font-semibold text-blue-700 mb-2">District</p>
              <p className="text-slate-700">
                Ce lieu correspond à votre <strong>district</strong> de résidence en Guinée.
              </p>
            </div>

            {/* Membres du même lieu */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <h4 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                👥 Membres du même district ({lieu1})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Simulation de membres */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold overflow-hidden">
                      {userPhotoUrl ? (
                        <img
                          src={userPhotoUrl}
                          alt="Photo de profil"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        userData.prenom?.charAt(0)
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{userData.prenom} {userData.nomFamille}</p>
                      <p className="text-sm text-slate-600">{userData.numeroH}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center text-slate-500">
                  Autres membres à venir...
                </div>
              </div>
            </div>

            {/* Espace d'échange */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border-2 border-emerald-200">
              <h4 className="text-xl font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                💬 Espace d'échange - {lieu1}
              </h4>
              <p className="text-slate-700 mb-4">
                Échangez avec les autres membres de votre district par écrit, audio ou vidéo.
              </p>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg">
                  ✍️ Écrire un message
                </button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                  🎤 Message audio
                </button>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg">
                  🎥 Message vidéo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LIEU 2 - Sous-préfecture */}
        {activeTab === "lieu2" && (
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-green-500 border border-slate-200 p-6">
            <h3 className="text-2xl font-semibold text-green-800 mb-6 flex items-center gap-3">
              🥈 Lieu de résidence 2 : {lieu2}
            </h3>
            
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 mb-6">
              <h5 className="text-lg font-bold text-green-900 mb-3">📍 Type de localisation</h5>
              <p className="text-2xl font-semibold text-green-700 mb-2">Sous-préfecture</p>
              <p className="text-slate-700">
                Ce lieu correspond à votre <strong>sous-préfecture</strong> de résidence en Guinée.
              </p>
            </div>

            {/* Membres du même lieu */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <h4 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                👥 Membres de la même sous-préfecture ({lieu2})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center font-bold overflow-hidden">
                      {userPhotoUrl ? (
                        <img
                          src={userPhotoUrl}
                          alt="Photo de profil"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        userData.prenom?.charAt(0)
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{userData.prenom} {userData.nomFamille}</p>
                      <p className="text-sm text-slate-600">{userData.numeroH}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center text-slate-500">
                  Autres membres à venir...
                </div>
              </div>
            </div>

            {/* Espace d'échange */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border-2 border-emerald-200">
              <h4 className="text-xl font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                💬 Espace d'échange - {lieu2}
              </h4>
              <p className="text-slate-700 mb-4">
                Échangez avec les autres membres de votre sous-préfecture par écrit, audio ou vidéo.
              </p>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg">
                  ✍️ Écrire un message
                </button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                  🎤 Message audio
                </button>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg">
                  🎥 Message vidéo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LIEU 3 - Préfecture */}
        {activeTab === "lieu3" && (
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-red-500 border border-slate-200 p-6">
            <h3 className="text-2xl font-semibold text-red-800 mb-6 flex items-center gap-3">
              🥉 Lieu de résidence 3 : {lieu3}
            </h3>
            
            <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-6 border-2 border-red-200 mb-6">
              <h5 className="text-lg font-bold text-red-900 mb-3">📍 Type de localisation</h5>
              <p className="text-2xl font-semibold text-red-700 mb-2">Préfecture</p>
              <p className="text-slate-700">
                Ce lieu correspond à votre <strong>préfecture</strong> de résidence en Guinée.
              </p>
            </div>

            {/* Membres du même lieu */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <h4 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                👥 Membres de la même préfecture ({lieu3})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center font-bold overflow-hidden">
                      {userPhotoUrl ? (
                        <img
                          src={userPhotoUrl}
                          alt="Photo de profil"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        userData.prenom?.charAt(0)
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{userData.prenom} {userData.nomFamille}</p>
                      <p className="text-sm text-slate-600">{userData.numeroH}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center text-slate-500">
                  Autres membres à venir...
                </div>
              </div>
            </div>

            {/* Espace d'échange */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border-2 border-emerald-200">
              <h4 className="text-xl font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                💬 Espace d'échange - {lieu3}
              </h4>
              <p className="text-slate-700 mb-4">
                Échangez avec les autres membres de votre préfecture par écrit, audio ou vidéo.
              </p>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg">
                  ✍️ Écrire un message
                </button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg">
                  🎤 Message audio
                </button>
                <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg">
                  🎥 Message vidéo
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "actuel" && (
          <div className="bg-white rounded-xl shadow-sm border-l-4 border-l-emerald-500 border border-slate-200 p-6">
            <h3 className="text-xl font-semibold text-slate-700 mb-6 flex items-center gap-2">
              🏠 Résidence actuelle
            </h3>
            {getResidencesByType("actuel").length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-300 rounded-xl">
                <div className="text-6xl mb-4">🏠</div>
                <p className="text-slate-600 mb-4">
                  Aucune résidence actuelle renseignée
                </p>
                <button
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors duration-200"
                  onClick={() => setShowAddModal(true)}
                >
                  Ajouter votre résidence actuelle
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {getResidencesByType("actuel").map((residence) => (
                  <div
                    key={residence.id}
                    className="bg-white rounded-xl shadow-sm border-l-4 border-l-emerald-500 border border-slate-200 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        🏠 Actuelle
                      </span>
                      <button
                        className="px-4 py-2 hover:bg-slate-100 text-slate-700 font-medium rounded-lg transition-colors duration-200"
                        onClick={() => setEditingResidence(residence)}
                      >
                        ✏️
                      </button>
                    </div>

                    <div className="space-y-2 mb-4">
                      <h4 className="text-lg font-medium text-slate-600 mb-0">
                        {residence.ville}, {residence.region}
                      </h4>
                      <p className="text-slate-900 font-semibold">
                        {residence.pays}
                      </p>
                      {residence.commune && (
                        <p className="text-slate-600">
                          Commune: {residence.commune}
                        </p>
                      )}
                      {residence.quartier && (
                        <p className="text-slate-600">
                          Quartier: {residence.quartier}
                        </p>
                      )}
                      {residence.adresse && (
                        <p className="text-blue-600 font-medium">
                          📍 {residence.adresse}
                        </p>
                      )}
                    </div>

                    <div className="bg-slate-50 p-4 mb-4 rounded-xl">
                      <p className="text-slate-600">
                        <span className="font-semibold">Période:</span>{" "}
                        {formatPeriode(residence.dateDebut, residence.dateFin)}
                      </p>
                      <p className="text-slate-600">
                        <span className="font-semibold">Durée:</span>{" "}
                        {calculateDuree(residence.dateDebut, residence.dateFin)}
                      </p>
                    </div>

                    {residence.description && (
                      <div className="border-t border-slate-200 pt-4">
                        <p className="text-slate-500 italic">
                          {residence.description}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {activeTab === "carte" && (
          <div className="carte-section">
            <h4>🗺️ Carte des lieux de résidence</h4>
            <div className="map-container">
              <div className="map-placeholder">
                <div className="map-content">
                  <h5>🗺️ Carte interactive</h5>
                  <p>Visualisation de tous vos lieux de résidence</p>
                  <div className="map-legend">
                    <div className="legend-item">
                      <span className="legend-dot current"></span>
                      <span>Résidence actuelle</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot previous"></span>
                      <span>Résidences précédentes</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot future"></span>
                      <span>Projets futurs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "statistiques" && (
          <div className="statistiques-section">
            <h4>📊 Statistiques de résidence</h4>

            <div className="stats-detailed">
              <div className="stat-category">
                <h5>📈 Répartition géographique</h5>
                <div className="stat-bars">
                  {[...new Set(residences.map((r) => r.region))].map(
                    (region) => (
                      <div key={region} className="stat-bar">
                        <span className="stat-label">{region}</span>
                        <div className="bar-container">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${(residences.filter((r) => r.region === region).length / residences.length) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <span className="stat-value">
                          {residences.filter((r) => r.region === region).length}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="stat-category">
                <h5>⏱️ Durée des résidences</h5>
                <div className="duration-stats">
                  {residences
                    .filter((r) => r.dateFin)
                    .map((residence) => (
                      <div key={residence.id} className="duration-item">
                        <span className="location">{residence.ville}</span>
                        <span className="duration">
                          {calculateDuree(
                            residence.dateDebut,
                            residence.dateFin,
                          )}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="stat-category">
                <h5>🎯 Objectifs de mobilité</h5>
                <div className="mobility-goals">
                  <p>
                    • Découvrir{" "}
                    {stats.paysVisites > 3
                      ? "de nouveaux continents"
                      : "de nouveaux pays africains"}
                  </p>
                  <p>
                    • Établir des connexions dans{" "}
                    {stats.regionsVisitees > 5
                      ? "toutes les régions guinéennes"
                      : "plus de régions"}
                  </p>
                  <p>
                    • Contribuer au développement local partout où je réside
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal d'ajout/modification */}
      {(showAddModal || editingResidence) && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowAddModal(false);
            setEditingResidence(null);
          }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>
              {editingResidence
                ? "Modifier la résidence"
                : "Ajouter une résidence"}
            </h4>
            <form className="residence-form">
              <div className="form-row">
                <div className="form-field">
                  <label>Type de résidence</label>
                  <select defaultValue={editingResidence?.type || "actuel"}>
                    <option value="actuel">Résidence actuelle</option>
                    <option value="precedent">Résidence précédente</option>
                    <option value="futur">Projet futur</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Pays</label>
                  <input
                    type="text"
                    defaultValue={editingResidence?.pays || "Guinée"}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Région</label>
                  <input
                    type="text"
                    defaultValue={editingResidence?.region || ""}
                  />
                </div>
                <div className="form-field">
                  <label>Ville</label>
                  <input
                    type="text"
                    defaultValue={editingResidence?.ville || ""}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Commune</label>
                  <input
                    type="text"
                    defaultValue={editingResidence?.commune || ""}
                  />
                </div>
                <div className="form-field">
                  <label>Quartier</label>
                  <input
                    type="text"
                    defaultValue={editingResidence?.quartier || ""}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Adresse complète</label>
                <input
                  type="text"
                  defaultValue={editingResidence?.adresse || ""}
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Date de début</label>
                  <input
                    type="date"
                    defaultValue={editingResidence?.dateDebut || ""}
                  />
                </div>
                <div className="form-field">
                  <label>Date de fin (optionnel)</label>
                  <input
                    type="date"
                    defaultValue={editingResidence?.dateFin || ""}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Description</label>
                <textarea
                  rows={3}
                  defaultValue={editingResidence?.description || ""}
                  placeholder="Contexte, raisons, souvenirs..."
                ></textarea>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingResidence(null);
                  }}
                >
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingResidence ? "Modifier" : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

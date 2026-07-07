import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  genre: "HOMME" | "FEMME" | "AUTRE";
  dateNaissance?: string;
  lieuNaissance?: string;
  ethnie?: string;
  regionOrigine?: string;
  pays?: string;
  nationalite?: string;
  religion?: string;
  [key: string]: string | number | boolean | undefined;
}

const CONTINENT_NAMES: Record<string, string> = {
  C1: "Afrique", C2: "Europe", C3: "Asie", C4: "Amérique", C5: "Océanie", C6: "Antarctique"
};

function parseNumeroH(numeroH: string) {
  const match = numeroH.match(/^(G\d+)(C\d+)(P\d+)(R\d+)(E\d+)(F\d+)\s(\d+)$/)
  if (!match) return null;
  const genNum = parseInt(match[1].slice(1));
  const anneeDepart = -4003;
  const start = anneeDepart + (genNum - 1) * 63;
  const end = start + 62;
  return {
    generation: match[1], genNum,
    continent: match[2],
    pays: match[3],
    region: match[4],
    ethnie: match[5],
    famille: match[6],
    sequence: match[7],
    yearStart: start,
    yearEnd: end,
  };
}

function NumeroHDecoder({ numeroH, userData }: { numeroH: string; userData: UserData }) {
  const parsed = parseNumeroH(numeroH);
  if (!parsed) return null;

  const continentName = CONTINENT_NAMES[parsed.continent] ?? parsed.continent;
  const paysName = userData.pays ?? parsed.pays;
  const regionName = userData.regionOrigine ?? parsed.region;
  const ethnieName = userData.ethnie ?? parsed.ethnie;
  const familleName = userData.nomFamille ?? parsed.famille;

  const formatYear = (y: number) => y < 0 ? `${Math.abs(y)} av. J.-C.` : `${y}`;

  const segments = [
    { code: parsed.generation, label: "Génération", value: `Génération ${parsed.genNum} — ${formatYear(parsed.yearStart)} à ${formatYear(parsed.yearEnd)}`, bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300", dot: "bg-emerald-500" },
    { code: parsed.continent, label: "Continent", value: continentName, bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300", dot: "bg-blue-500" },
    { code: parsed.pays, label: "Pays", value: paysName, bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300", dot: "bg-amber-500" },
    { code: parsed.region, label: "Région", value: regionName, bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300", dot: "bg-purple-500" },
    { code: parsed.ethnie, label: "Ethnie", value: ethnieName, bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300", dot: "bg-orange-500" },
    { code: parsed.famille, label: "Famille", value: familleName, bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-300", dot: "bg-rose-500" },
    { code: parsed.sequence, label: "Numéro unique", value: `N° ${parsed.sequence} dans votre lignée`, bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300", dot: "bg-slate-400" },
  ];

  return (
    <div className="mt-8 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl border border-blue-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center text-white text-lg flex-shrink-0">🔬</div>
        <div>
          <h4 className="text-white font-bold text-base tracking-wide">Décodage de votre NumeroH</h4>
          <p className="text-blue-100 text-xs mt-0.5">Votre identifiant humain unique — il encode toute votre origine</p>
        </div>
      </div>

      <div className="p-6">
        {/* Chips visuels */}
        <div className="flex flex-wrap gap-2 mb-6">
          {segments.map((s) => (
            <span key={s.code} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono font-bold text-sm ${s.bg} ${s.text} ${s.border}`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
              {s.code}
            </span>
          ))}
        </div>

        {/* Légende */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {segments.map((s) => (
            <div key={s.code} className={`flex items-start gap-3 p-3 rounded-xl border ${s.border} ${s.bg}`}>
              <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center`}>
                <span className={`w-3 h-3 rounded-full ${s.dot}`} />
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-semibold uppercase tracking-wider ${s.text} opacity-70`}>{s.label}</div>
                <div className={`font-mono font-bold text-sm ${s.text}`}>{s.code}</div>
                <div className="text-slate-600 text-sm mt-0.5 leading-snug">{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Note bas */}
        <div className="mt-5 flex items-start gap-2 p-3 bg-white rounded-xl border border-blue-100">
          <span className="text-blue-500 mt-0.5">ℹ️</span>
          <p className="text-xs text-slate-500 leading-relaxed">
            Ce NumeroH est <strong className="text-slate-700">votre identité permanente</strong> sur la plateforme.
            Il est unique dans toute l'humanité et encode votre génération, votre origine géographique, votre ethnie et votre famille.
            <strong className="text-slate-700"> Retenez-le bien</strong> — il vous sera toujours demandé pour vous connecter.
          </p>
        </div>
      </div>
    </div>
  );
}

const CONFIRM_DELETE_TEXT = "SUPPRIMER";

export default function Identite() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
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
    } catch {
      navigate("/login");
    }
  }, [navigate]);

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
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h3 className="text-xl font-semibold text-slate-700 flex items-center gap-2">
            🆔 Mon Identité
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(true);
                setDeletePassword("");
                setDeleteConfirmText("");
                setDeleteError("");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium transition-colors duration-200 border border-red-200"
            >
              🗑️ Supprimer mon compte
            </button>
            <button
              onClick={() => navigate("/moi/profil")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors duration-200"
            >
              ✏️ Mettre à jour
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
              <input
                type="text"
                value={userData.prenom || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nom de famille</label>
              <input
                type="text"
                value={userData.nomFamille || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">NuméroH</label>
              <input
                type="text"
                value={userData.numeroH || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Genre</label>
              <input
                type="text"
                value={userData.genre || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date de naissance</label>
              <input
                type="text"
                value={userData.dateNaissance || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lieu de naissance</label>
              <input
                type="text"
                value={userData.lieuNaissance || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ethnie</label>
              <input
                type="text"
                value={userData.ethnie || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pays</label>
              <input
                type="text"
                value={userData.pays || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-blue-800 text-sm">
            ℹ️ Ces informations sont protégées et ne peuvent être modifiées que par un administrateur.
          </p>
        </div>
      </div>

      <NumeroHDecoder numeroH={userData.numeroH} userData={userData} />

      {/* Modal suppression de compte */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !deleteLoading && setShowDeleteModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-800">Supprimer mon compte</h3>
            <p className="text-sm text-slate-600">
              Cette action est irréversible. Saisissez votre mot de passe et tapez <strong>{CONFIRM_DELETE_TEXT}</strong> pour confirmer.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => { setDeletePassword(e.target.value); setDeleteError(""); }}
                placeholder="Votre mot de passe"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                disabled={deleteLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Taper &quot;{CONFIRM_DELETE_TEXT}&quot; pour confirmer
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => { setDeleteConfirmText(e.target.value); setDeleteError(""); }}
                placeholder={CONFIRM_DELETE_TEXT}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                disabled={deleteLoading}
              />
            </div>
            {deleteError && (
              <p className="text-sm text-red-600">{deleteError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => !deleteLoading && setShowDeleteModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium"
                disabled={deleteLoading}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!deletePassword.trim()) {
                    setDeleteError("Veuillez saisir votre mot de passe.");
                    return;
                  }
                  if (deleteConfirmText.trim() !== CONFIRM_DELETE_TEXT) {
                    setDeleteError(`Veuillez taper exactement "${CONFIRM_DELETE_TEXT}" pour confirmer.`);
                    return;
                  }
                  setDeleteLoading(true);
                  setDeleteError("");
                  const result = await api.deleteAccount(deletePassword.trim());
                  setDeleteLoading(false);
                  if (result.success) {
                    localStorage.removeItem("session_user");
                    localStorage.removeItem("token");
                    setShowDeleteModal(false);
                    navigate("/", { replace: true });
                    window.location.reload();
                  } else {
                    setDeleteError(result.message || "Erreur lors de la suppression du compte.");
                  }
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50"
                disabled={deleteLoading}
              >
                {deleteLoading ? "Suppression…" : "Supprimer mon compte"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
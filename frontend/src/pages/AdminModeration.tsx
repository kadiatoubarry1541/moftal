import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { config } from "../config/api";

interface FlaggedItem {
  source: string;
  deleteId: string;
  field?: string;
  index?: number;
  album?: string;
  uploaderNumeroH: string;
  uploaderName: string;
  familyName?: string;
  label: string;
  reason: string;
  preview: string;
}

interface ScanResult {
  total: number;
  scanned: number;
  flaggedCount: number;
  flagged: FlaggedItem[];
}

type ScanSource = "gallery" | "users" | "problems";

const SOURCE_LABELS: Record<string, string> = {
  family_gallery: "Galerie familiale",
  problem_media: "Média santé",
  user_photo: "Photo de profil",
  user_field: "Photo famille",
  user_children: "Photo enfant",
  user_album: "Album privé",
};

export default function AdminModeration() {
  const navigate = useNavigate();
  const API = (config.API_BASE_URL || "http://localhost:5002/api");

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedSources, setSelectedSources] = useState<ScanSource[]>(["gallery", "users", "problems"]);

  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const getItemKey = (item: FlaggedItem) =>
    `${item.source}-${item.deleteId}-${item.field || ""}-${item.index ?? ""}-${item.album || ""}`;

  const toggleSource = (src: ScanSource) => {
    setSelectedSources(prev =>
      prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]
    );
  };

  const startScan = async () => {
    if (selectedSources.length === 0) {
      setError("Sélectionne au moins une source à scanner.");
      return;
    }
    setScanning(true);
    setResult(null);
    setError(null);
    setDeleted(new Set());

    try {
      const params = new URLSearchParams({ sources: selectedSources.join(",") });
      const res = await fetch(`${API}/admin/moderation/scan?${params}`, { headers });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Erreur lors du scan");
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Erreur réseau");
    } finally {
      setScanning(false);
    }
  };

  const deleteImage = async (item: FlaggedItem) => {
    const key = getItemKey(item);
    setDeleting(key);
    try {
      const res = await fetch(`${API}/admin/moderation/delete`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({
          source: item.source,
          deleteId: item.deleteId,
          field: item.field,
          index: item.index,
          album: item.album,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Erreur suppression");
      setDeleted(prev => new Set([...prev, key]));
    } catch (err: any) {
      alert("Erreur : " + (err.message || "Suppression échouée"));
    } finally {
      setDeleting(null);
    }
  };

  const visibleFlagged = result?.flagged.filter(item => !deleted.has(getItemKey(item))) ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-700 to-red-900 text-white px-6 py-5 flex items-center gap-4">
        <button onClick={() => navigate("/admin")} className="text-white/80 hover:text-white transition-colors">
          ← Retour Admin
        </button>
        <div>
          <h1 className="text-2xl font-bold">🔍 Contrôle IA — Modération des médias</h1>
          <p className="text-red-200 text-sm mt-0.5">
            Détection automatique des images à caractère nudité ou explicite
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Panneau de contrôle */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">⚙️ Paramètres du scan</h2>

          <div className="flex flex-wrap gap-3 mb-6">
            {(["gallery", "users", "problems"] as ScanSource[]).map(src => {
              const labels: Record<ScanSource, string> = {
                gallery: "🖼️ Galerie familiale partagée",
                users: "👤 Photos de profil & famille",
                problems: "🏥 Médias santé"
              };
              const active = selectedSources.includes(src);
              return (
                <button
                  key={src}
                  onClick={() => toggleSource(src)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    active
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-red-400"
                  }`}
                >
                  {labels[src]}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={startScan}
              disabled={scanning}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {scanning ? (
                <>
                  <span className="animate-spin">⏳</span> Analyse en cours…
                </>
              ) : (
                <>🔍 Lancer le contrôle IA</>
              )}
            </button>

            {result && (
              <span className="text-sm text-gray-500">
                {result.scanned} image{result.scanned > 1 ? "s" : ""} analysée{result.scanned > 1 ? "s" : ""} —{" "}
                <strong className={result.flaggedCount > 0 ? "text-red-600" : "text-green-600"}>
                  {result.flaggedCount} signalée{result.flaggedCount > 1 ? "s" : ""}
                </strong>
              </span>
            )}
          </div>

          {scanning && (
            <div className="mt-4 flex items-center gap-3 text-sm text-gray-500">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
              L'IA analyse toutes les images… cela peut prendre quelques minutes.
            </div>
          )}
        </div>

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold">Erreur</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Résultats : aucune image suspecte */}
        {result && result.flaggedCount === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="text-xl font-semibold text-green-800">Aucune image suspecte détectée</h3>
            <p className="text-green-600 mt-1 text-sm">
              {result.scanned} image{result.scanned > 1 ? "s" : ""} analysée{result.scanned > 1 ? "s" : ""} — tout est conforme.
            </p>
          </div>
        )}

        {/* Résultats : images flaggées */}
        {visibleFlagged.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-red-700">
                🚨 {visibleFlagged.length} image{visibleFlagged.length > 1 ? "s" : ""} inappropriée{visibleFlagged.length > 1 ? "s" : ""} détectée{visibleFlagged.length > 1 ? "s" : ""}
              </h2>
              <span className="text-xs text-gray-400">
                {deleted.size} supprimée{deleted.size > 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visibleFlagged.map(item => {
                const key = getItemKey(item);
                const isDeleting = deleting === key;
                const isVideo = item.preview?.startsWith("data:video/") || false;

                return (
                  <div
                    key={key}
                    className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden"
                  >
                    {/* Aperçu image */}
                    <div className="relative bg-gray-900 h-48 flex items-center justify-center">
                      {isVideo ? (
                        <div className="text-white text-center">
                          <div className="text-4xl mb-2">🎥</div>
                          <p className="text-sm text-gray-300">Vidéo — aperçu non disponible</p>
                        </div>
                      ) : item.preview ? (
                        <img
                          src={item.preview}
                          alt="Contenu signalé"
                          className="h-full w-full object-cover opacity-70"
                          onError={e => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="text-gray-400 text-sm">Aperçu indisponible</div>
                      )}
                      {/* Badge source */}
                      <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                        {SOURCE_LABELS[item.source] || item.source}
                      </span>
                      {/* Badge NSFW */}
                      <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                        NSFW
                      </span>
                    </div>

                    {/* Infos */}
                    <div className="p-4">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.label}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Publié par : <strong>{item.uploaderName}</strong>
                        {item.familyName && <> — Famille : <strong>{item.familyName}</strong></>}
                      </p>
                      <p className="text-xs text-red-500 mt-1">🤖 {item.reason}</p>

                      <button
                        onClick={() => deleteImage(item)}
                        disabled={isDeleting}
                        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isDeleting ? (
                          <><span className="animate-spin">⏳</span> Suppression…</>
                        ) : (
                          <>🗑️ Supprimer cette image</>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info : tout supprimé */}
        {result && result.flaggedCount > 0 && visibleFlagged.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-semibold text-green-800">
              Toutes les images signalées ont été supprimées.
            </p>
          </div>
        )}

        {/* Info technologie */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <strong>ℹ️ Technologie :</strong> Le contrôle utilise <strong>Hugging Face</strong> — modèle{" "}
          <code className="bg-blue-100 px-1 rounded">Falconsai/nsfw_image_detection</code> (93% de précision),
          gratuit. Ajoutez <code className="bg-blue-100 px-1 rounded">HF_TOKEN=votre_token</code> dans{" "}
          <code className="bg-blue-100 px-1 rounded">backend/config.env</code>.
          Token gratuit sur{" "}
          <strong>huggingface.co → Settings → Access Tokens</strong>.
        </div>

        {error?.includes("HF_TOKEN") && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
            <strong>⚠️ Token manquant :</strong> Ajoutez{" "}
            <code className="bg-yellow-100 px-1 rounded">HF_TOKEN=votre_token</code> dans{" "}
            <code className="bg-yellow-100 px-1 rounded">backend/config.env</code> et relancez le serveur.
          </div>
        )}
      </div>
    </div>
  );
}
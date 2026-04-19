import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Etat } from "../components/Etat";

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  [key: string]: any;
}

export default function Probleme() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const navigate = useNavigate();
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [familyMedia, setFamilyMedia] = useState<Array<{
    id: string;
    authorName: string;
    mediaType: 'image' | 'video';
    description?: string | null;
    mediaUrl: string;
    created_at: string;
  }>>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [description, setDescription] = useState('');

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

  useEffect(() => {
    const loadMedia = async () => {
      if (!userData) return;
      try {
        setLoadingMedia(true);
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:5002/api/family/problems/media", {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        setFamilyMedia(data.items || []);
      } catch {
        // on garde la page même si la liste échoue
      } finally {
        setLoadingMedia(false);
      }
    };
    loadMedia();
  }, [userData]);

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    try {
      setUploading(true);
      setUploadError(null);
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("media", file);
      formData.append("description", description);
      const res = await fetch("http://localhost:5002/api/family/problems/media", {
        method: "POST",
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setUploadError(data.message || "Impossible d'enregistrer la vidéo.");
        return;
      }
      setDescription("");
      setFamilyMedia((prev) => [data.item, ...prev]);
    } catch (e) {
      setUploadError("Erreur réseau. Réessayez plus tard.");
    } finally {
      setUploading(false);
    }
  };

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-red-600 mx-auto" />
          <p className="mt-4 text-gray-600">
            Chargement de vos informations de problèmes...
          </p>
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
              <h1 className="text-3xl font-bold text-gray-900">🚨 Problèmes de la famille</h1>
              <p className="mt-2 text-gray-600">
                Page réservée aux <strong>problèmes de la famille</strong> (maladie, situations difficiles, alertes importantes).
                Quand quelqu&apos;un est malade, c&apos;est ici que l&apos;information et les preuves (vidéos, etc.) sont centralisées.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => navigate("/moi")}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Cartes principales (aucune redirection vers d'autres pages) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-left bg-white rounded-xl shadow-sm border border-red-100 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏥</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Problèmes de santé de la famille
                </h2>
                <p className="text-sm text-gray-600">
                  Centralise ici les informations et preuves (vidéos, etc.) quand un membre de la famille est malade.
                  Les détails se suivent dans le tableau d&apos;état ci‑dessous.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-5 flex flex-col gap-3 opacity-80">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👨‍👩‍👧‍👦</span>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Problèmes familiaux & sociaux
                </h2>
                <p className="text-sm text-gray-600">
                  Relations avec la famille et la communauté.
                </p>
              </div>
            </div>
            <span className="mt-2 text-xs text-gray-500">
              Section en préparation.
            </span>
          </div>
        </div>

        {/* Numéro familial de solidarité (pour les contributions) */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 sm:p-5">
          <h2 className="text-lg sm:text-xl font-bold text-emerald-800 mb-2">
            💳 Numéro familial de solidarité
          </h2>
          <p className="text-sm text-emerald-900 mb-3">
            C&apos;est le <strong>numéro unique</strong> que la famille peut utiliser pour contribuer et assister un membre
            malade. Partagez-le dans la famille pour que tout le monde sache où envoyer l&apos;aide.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center px-4 py-2 rounded-lg bg-white border border-emerald-300 shadow-sm">
              <span className="text-xs font-semibold text-emerald-700 mr-2">Numéro de solidarité</span>
              <span className="font-mono text-sm sm:text-base text-emerald-900">
                {userData.numeroH}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-700">
              Plus tard, ce numéro pourra être relié à un compte (mobile money, banque, Zaka, etc.) pour les contributions.
            </p>
          </div>
        </div>

        {/* Zone de partage des vidéos / preuves pour les problèmes de santé familiaux */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            🎥 Partage des vidéos des problèmes de santé de la famille
          </h2>
          <p className="text-sm text-gray-600">
            Quand un membre de la famille est malade, vous pouvez publier ici une <strong>vidéo</strong> (ou photo) pour expliquer la
            situation. Seuls les membres ayant le même nom de famille peuvent voir ces médias.
          </p>

          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="flex-1 w-full">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Décrivez brièvement le problème de santé (facultatif)..."
                rows={2}
              />
            </div>
            <div>
              <label className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg cursor-pointer">
                <span>{uploading ? "Envoi..." : "📤 Publier une vidéo"}</span>
                <input
                  type="file"
                  accept="video/*,image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.type.startsWith('video/')) {
                      const vid = document.createElement('video');
                      vid.preload = 'metadata';
                      vid.onloadedmetadata = () => {
                        URL.revokeObjectURL(vid.src);
                        if (vid.duration > 60) {
                          setUploadError('La vidéo ne doit pas dépasser 1 minute.');
                          e.target.value = '';
                          return;
                        }
                        handleUpload(file);
                      };
                      vid.src = URL.createObjectURL(file);
                    } else {
                      handleUpload(file);
                    }
                  }}
                />
              </label>
            </div>
          </div>
          {uploadError && (
            <p className="text-sm text-red-600">{uploadError}</p>
          )}

          <div className="mt-4 space-y-3">
            {loadingMedia ? (
              <p className="text-sm text-gray-500">Chargement des vidéos de la famille...</p>
            ) : familyMedia.length === 0 ? (
              <p className="text-sm text-gray-500">
                Aucune vidéo partagée pour le moment. Quand un membre est malade, partagez une vidéo ici pour informer toute la famille.
              </p>
            ) : (
              familyMedia.map((m) => (
                <div
                  key={m.id}
                  className="border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row gap-3 items-start"
                >
                  <div className="w-full sm:w-64">
                    {m.mediaType === "video" ? (
                      <video src={m.mediaUrl} controls className="w-full h-40 bg-black rounded-lg" />
                    ) : (
                      <img src={m.mediaUrl} alt="" className="w-full h-40 object-cover rounded-lg" />
                    )}
                  </div>
                  <div className="flex-1 text-sm text-gray-700">
                    <p className="font-semibold text-gray-900 mb-1">{m.authorName}</p>
                    {m.description && <p className="mb-1">{m.description}</p>}
                    <p className="text-xs text-gray-500">
                      Partagé le {new Date(m.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tableau de bord des états (familial + santé) */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
          <Etat userData={userData} />
        </div>
      </div>
    </div>
  );
}


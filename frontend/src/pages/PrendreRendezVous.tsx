import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

interface ProAccount {
  id: string;
  type: string;
  name: string;
  description: string;
  address?: string;
  city: string;
  country: string;
  phone?: string;
  email?: string;
  services: string[];
  specialties: string[];
  photo?: string | null;
}

const TYPE_LABELS: Record<string, { label: string; icon: string }> = {
  clinic:          { label: "Clinique / Hôpital",         icon: "🏥" },
  health_worker:   { label: "Médecin / Agent de santé",   icon: "👨‍⚕️" },
  security_agency: { label: "Agence de sécurité",         icon: "🛡️" },
  journalist:      { label: "Journaliste / Média",        icon: "📰" },
  enterprise:      { label: "Entreprise",                 icon: "🏢" },
  school:          { label: "École / Établissement",      icon: "🎓" },
  supplier:        { label: "Fournisseur / Grossiste",    icon: "📦" },
  mosque:          { label: "Mosquée",                    icon: "🕌" },
  madrasa:         { label: "Madrasa / Formation",        icon: "📖" },
  commerce:        { label: "Commerce / Boutique",        icon: "🏪" },
  restaurant:      { label: "Restaurant",                 icon: "🍽️" },
  vendor:          { label: "Vendeur / Détaillant",       icon: "🛒" },
  producer:        { label: "Entreprise de production",   icon: "🏭" },
  broker:          { label: "Immobilier / Démarcheur",    icon: "🏠" },
  scientist:       { label: "Chercheur / Scientifique",   icon: "🔬" },
  ngo:             { label: "ONG / Association",          icon: "🤝" },
  transport:       { label: "Transport & Livraison",      icon: "🚌" },
  beauty:          { label: "Beauté & Bien-être",         icon: "💈" },
  artisan:         { label: "Artisan / Services",         icon: "🔧" },
  mairie:          { label: "Mairie / État Civil",        icon: "🏛️" },
  reseau:          { label: "Association / Réseau",       icon: "🌐" },
};

export default function PrendreRendezVous() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<ProAccount | null>(null);
  const [mode, setMode] = useState<"choose" | "written" | "video" | "done">("choose");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Formulaire écrit
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [service, setService] = useState("");

  // Vidéo — file input (compatible tous appareils)
  const captureRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    loadAccount();
  }, [id]);

  const loadAccount = async () => {
    try {
      const res = await fetch(`http://localhost:5002/api/professionals/detail/${id}`);
      const data = await res.json();
      if (data.success) setAccount(data.account);
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  // === Envoi rendez-vous écrit ===
  const handleSubmitWritten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !time || !service) { setError("Tous les champs sont requis"); return; }
    setSending(true);
    setError("");
    try {
      const res = await fetch("http://localhost:5002/api/appointments/book", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          professionalAccountId: id,
          type: "written",
          appointmentDate: date,
          appointmentTime: time,
          service
        })
      });
      const data = await res.json();
      if (data.success) setMode("done");
      else setError(data.message || "Erreur");
    } catch { setError("Erreur de connexion"); }
    finally { setSending(false); }
  };

  // === Sélection/enregistrement vidéo (file input — compatible tous appareils) ===
  const handleVideoFile = (file: File) => {
    if (file.size > 200 * 1024 * 1024) {
      alert("Vidéo trop volumineuse (maximum 200 MB).");
      return;
    }
    setVideoFile(file);
    const url = URL.createObjectURL(file);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoPreview(url);
  };

  const sendVideoAppointment = async () => {
    if (!videoFile) return;
    setSending(true);
    setError("");
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const res = await fetch("http://localhost:5002/api/appointments/book", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            professionalAccountId: id,
            type: "video",
            videoUrl: reader.result
          })
        });
        const data = await res.json();
        if (data.success) setMode("done");
        else setError(data.message || "Erreur");
        setSending(false);
      };
      reader.readAsDataURL(videoFile);
    } catch {
      setError("Erreur de connexion");
      setSending(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><div className="text-gray-500">Chargement...</div></div>;
  if (!account) return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center"><div className="text-red-500">Établissement non trouvé</div></div>;

  const typeInfo = TYPE_LABELS[account.type] || { label: account.type, icon: "📄" };
  const websiteMatch = account.description?.match(/https?:\/\/[^\s]+/);
  const websiteUrl = websiteMatch ? websiteMatch[0] : "";

  // === Succès ===
  if (mode === "done") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">📨</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Rendez-vous envoyé !</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Votre demande a été envoyée à <strong>{account.name}</strong>.
            Vous recevrez une notification quand elle sera acceptée.
          </p>
          <button onClick={() => navigate("/compte")} className="w-full min-h-[44px] px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors">
            Retour à mon espace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => mode === "choose" ? navigate(-1) : setMode("choose")} className="min-h-[44px] px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium transition-colors">
            ← Retour
          </button>
          <span className="text-2xl">{typeInfo.icon}</span>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">{account.name}</h1>
            <p className="text-sm text-gray-500">{typeInfo.label} • {account.city}</p>
          </div>
        </div>

        {/* Fiche établissement avant la prise de rendez-vous */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md ring-1 ring-gray-200 dark:ring-gray-700 p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {account.photo && (
              <div className="sm:w-40 w-full">
                {account.photo.startsWith("data:video") || account.photo.endsWith(".mp4") || account.photo.endsWith(".webm") ? (
                  <video src={account.photo} className="w-full h-32 object-cover rounded-xl bg-black" controls />
                ) : (
                  <img src={account.photo} alt={account.name} className="w-full h-32 object-cover rounded-xl" />
                )}
              </div>
            )}
            <div className="flex-1 space-y-1 text-sm">
              {account.address && (
                <p className="text-gray-700 dark:text-gray-200">
                  <span className="font-medium">Adresse :</span> {account.address}{account.city ? `, ${account.city}` : ""}{account.country ? `, ${account.country}` : ""}
                </p>
              )}
              {account.phone && (
                <p className="text-gray-700 dark:text-gray-200">
                  <span className="font-medium">Téléphone :</span> {account.phone}
                </p>
              )}
              {account.email && (
                <p className="text-gray-700 dark:text-gray-200">
                  <span className="font-medium">Email :</span> {account.email}
                </p>
              )}
              {websiteUrl && (
                <p className="text-gray-700 dark:text-gray-200">
                  <span className="font-medium">Site web :</span>{" "}
                  <a href={websiteUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">
                    {websiteUrl}
                  </a>
                </p>
              )}
              {account.services?.length > 0 && (
                <div className="pt-1">
                  <span className="text-gray-700 dark:text-gray-200 font-medium text-sm">Services principaux :</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {account.services.slice(0, 6).map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 text-xs rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {account.specialties?.length > 0 && (
                <div className="pt-1">
                  <span className="text-gray-700 dark:text-gray-200 font-medium text-sm">Spécialités :</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {account.specialties.slice(0, 6).map((s, i) => (
                      <span key={i} className="px-2 py-0.5 bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-200 text-xs rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          {account.description && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">
              {account.description}
            </div>
          )}
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{error}</div>}

        {/* Choix du mode */}
        {mode === "choose" && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Comment souhaitez-vous prendre rendez-vous ?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button onClick={() => setMode("written")}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg ring-1 ring-gray-200 dark:ring-gray-700 p-6 text-left transition-all hover:scale-[1.02]">
                <div className="text-4xl mb-3">📝</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Par écrit</h3>
                <p className="text-sm text-gray-500">Remplissez le jour, l'heure et le service souhaité</p>
              </button>
              <button onClick={() => setMode("video")}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg ring-1 ring-gray-200 dark:ring-gray-700 p-6 text-left transition-all hover:scale-[1.02]">
                <div className="text-4xl mb-3">📹</div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Par vidéo</h3>
                <p className="text-sm text-gray-500">Enregistrez ou importez une vidéo courte</p>
              </button>
            </div>
          </div>
        )}

        {/* Formulaire écrit */}
        {mode === "written" && (
          <form onSubmit={handleSubmitWritten} className="bg-white dark:bg-gray-800 rounded-2xl shadow-md ring-1 ring-gray-200 dark:ring-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">📝 Rendez-vous par écrit</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jour *</label>
                <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Heure *</label>
                <input type="time" required value={time} onChange={e => setTime(e.target.value)}
                  className="w-full min-h-[44px] px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service recherché *</label>
                {account.services && account.services.length > 0 ? (
                  <select required value={service} onChange={e => setService(e.target.value)}
                    className="w-full min-h-[44px] px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Choisir un service --</option>
                    {account.services.map((s, i) => <option key={i} value={s}>{s}</option>)}
                    <option value="autre">Autre</option>
                  </select>
                ) : (
                  <input type="text" required value={service} onChange={e => setService(e.target.value)}
                    placeholder="Ex: Consultation générale"
                    className="w-full min-h-[44px] px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
                )}
              </div>
            </div>
            <button type="submit" disabled={sending}
              className="mt-6 w-full min-h-[44px] px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors">
              {sending ? "Envoi en cours..." : "Envoyer ma demande"}
            </button>
          </form>
        )}

        {/* Enregistrement / sélection vidéo */}
        {mode === "video" && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md ring-1 ring-gray-200 dark:ring-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">📹 Rendez-vous par vidéo</h2>

            {/* Inputs cachés */}
            <input
              ref={captureRef}
              type="file"
              accept="video/*"
              capture="user"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFile(f); e.target.value = ""; }}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="video/*"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFile(f); e.target.value = ""; }}
            />

            {!videoPreview ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-4">
                  Filmez ou importez une courte vidéo de présentation de votre demande (maximum 30 s recommandé).
                </p>
                <button
                  onClick={() => captureRef.current?.click()}
                  className="w-full min-h-[44px] px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <span>📷</span> Filmer maintenant
                </button>
                <button
                  onClick={() => galleryRef.current?.click()}
                  className="w-full min-h-[44px] px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <span>🎞️</span> Choisir depuis la galerie
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <video src={videoPreview} controls playsInline className="w-full rounded-lg bg-black" />
                <div className="flex gap-3">
                  <button
                    onClick={sendVideoAppointment}
                    disabled={sending}
                    className="flex-1 min-h-[44px] px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg transition-colors"
                  >
                    {sending ? "Envoi en cours..." : "✅ Envoyer"}
                  </button>
                  <button
                    onClick={() => {
                      setVideoFile(null);
                      if (videoPreview) URL.revokeObjectURL(videoPreview);
                      setVideoPreview(null);
                    }}
                    className="flex-1 min-h-[44px] px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-lg transition-colors"
                  >
                    🔄 Recommencer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef, useMemo } from "react";
import { config } from "../config/api";
import { getPhotoUrl } from "../utils/auth";
import { getAllLocationsForGroups } from "../utils/worldGeography";

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  photo?: string;
  email?: string;
  telephone?: string;
  tel1?: string;
  genre?: string;
  dateNaissance?: string;
  age?: number;
  generation?: string;
  ethnie?: string;
  region?: string;
  pays?: string;
  nationalite?: string;
  religion?: string;
   handicap?: string;
  prenomPere?: string;
  nomFamillePere?: string;
  numeroHPere?: string;
  prenomMere?: string;
  nomFamilleMere?: string;
  numeroHMere?: string;
  activite1?: string;
  activite2?: string;
  activite3?: string;
  specialite?: string;
  statutMatrimonial?: string;
  preuve?: string;
  lieu1?: string;
  lieu2?: string;
  lieu3?: string;
  [key: string]: any;
}

interface EditProfileModalProps {
  open: boolean;
  onClose: () => void;
  userData: UserData | null;
  onUpdate: (updatedData: UserData) => void;
}

export default function EditProfileModal({
  open,
  onClose,
  userData,
  onUpdate,
}: EditProfileModalProps) {
  const [formData, setFormData] = useState<UserData | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [preuveFile, setPreuveFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const preuveInputRef = useRef<HTMLInputElement>(null);
  const allLocations = useMemo(() => getAllLocationsForGroups(), []);

  const ACTIVITY_OPTIONS = [
    // ── Santé & Médecine ──
    "Santé",
    "Médecin",
    "Infirmier/Infirmière",
    "Pharmacien",
    "Sage-femme",
    "Dentiste",
    "Psychologue/Thérapeute",
    "Kiné/Physiothérapeute",
    "Vétérinaire",
    "Opticien",
    // ── Éducation ──
    "Élève",
    "Étudiant",
    "Enseignement",
    "Professeur/Formateur",
    "Chercheur/Scientifique",
    // ── Droit, Finance & Admin ──
    "Administration",
    "Avocat/Juriste",
    "Comptable/Auditeur",
    "Économiste",
    "Banque/Finance",
    "Assurance",
    "Agent immobilier",
    "Notaire/Huissier",
    // ── Numérique & Tech ──
    "Informatique",
    "Développeur/Programmeur",
    "Graphiste/Designer",
    "Cybersécurité",
    "Télécommunications",
    // ── BTP & Artisanat ──
    "Construction",
    "Maçonnerie",
    "Menuiserie",
    "Électricité",
    "Plomberie",
    "Soudure/Métallurgie",
    "Climatisation/Froid",
    "Peinture en bâtiment",
    "Carrelage",
    "Mécanique",
    "Artisanat",
    "Couture",
    // ── Commerce & Échanges ──
    "Commerce",
    "Import/Export",
    "Marketing/Communication",
    "Transport",
    "Logistique",
    "Journalisme",
    "Sécurité",
    // ── Alimentation ──
    "Agriculture",
    "Maraîchage",
    "Élevage",
    "Pêche",
    "Boulangerie/Pâtisserie",
    "Restauration",
    "Agroalimentaire",
    // ── Services ──
    "Coiffure",
    "Hôtellerie/Tourisme",
    "Photographie/Vidéo",
    "Sport/Coach sportif",
    "Ingénierie",
    "Architecture",
    "Environnement/Écologie",
    "Travail social",
    "Imam/Prédicateur",
    "Traducteur/Interprète",
    // ── Statut ──
    "Sans emploi",
    "Retraité",
    "Autre",
  ];

  useEffect(() => {
    if (open && userData) {
      setFormData({ ...userData });
      setPhotoPreview(getPhotoUrl(userData.photo));
      setPhotoFile(null);
      setVideoFile(null);
      setVideoPreview(null);
      setError(null);
      setSuccess(false);
    }
  }, [open, userData]);

  const handleInputChange = (field: string, value: any) => {
    if (formData) {
      setFormData({ ...formData, [field]: value });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
  };

  // Fonction pour appeler l'API (essaie URL directe, puis proxy Vite)
  const apiFetch = async (path: string, options: RequestInit): Promise<Response> => {
    const directUrl = `${config.API_BASE_URL || "http://localhost:5002/api"}${path}`;
    try {
      const res = await fetch(directUrl, options);
      return res;
    } catch {
      // Si l'appel direct échoue, essayer via le proxy Vite (/api)
      const proxyUrl = `/api${path}`;
      return fetch(proxyUrl, options);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setLoading(true);
    setError(null);

    try {
      // Récupérer le token (stocké séparément OU dans session_user)
      let token = localStorage.getItem("token");
      if (!token) {
        try {
          const session = JSON.parse(localStorage.getItem("session_user") || "{}");
          token = session.token || null;
        } catch { /* ignore */ }
      }

      // Variables locales pour suivre photo et vidéo uploadées
      let uploadedVideoUrl: string | undefined = formData.video as string | undefined;
      let uploadedPhotoUrl: string | undefined = formData.photo;

      // 1. Mettre à jour la photo si une nouvelle a été choisie
      if (photoFile) {
        const photoFormData = new FormData();
        photoFormData.append("photo", photoFile);
        photoFormData.append("numeroH", formData.numeroH);

        const photoResponse = await apiFetch("/auth/profile/photo", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: photoFormData,
        });

        if (!photoResponse.ok) {
          const photoError = await photoResponse.json().catch(() => ({}));
          throw new Error(photoError.message || "Erreur lors de l'upload de la photo");
        }

        const photoData = await photoResponse.json();
        uploadedPhotoUrl = photoData.photoUrl || (photoData.user && photoData.user.photo) || uploadedPhotoUrl;
      }

      // 2. Uploader la nouvelle vidéo si sélectionnée
      if (videoFile) {
        const videoFormData = new FormData();
        videoFormData.append("video", videoFile);
        videoFormData.append("numeroH", formData.numeroH);
        try {
          const videoResponse = await apiFetch("/auth/profile/video", {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: videoFormData,
          });
          if (videoResponse.ok) {
            const videoData = await videoResponse.json();
            uploadedVideoUrl = videoData.videoUrl || uploadedVideoUrl;
          }
        } catch {
          // Si upload vidéo échoue, on garde l'ancienne URL
        }
      }

      // 3. Mettre à jour les informations textuelles
      let serverUser: any = {};
      try {
        const response = await apiFetch("/auth/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            numeroH: formData.numeroH,
            prenom: formData.prenom,
            nomFamille: formData.nomFamille,
            email: formData.email,
            telephone: formData.telephone || formData.tel1,
            tel1: formData.telephone || formData.tel1,
            genre: formData.genre,
            dateNaissance: formData.dateNaissance,
            age: formData.age,
            generation: formData.generation,
            ethnie: formData.ethnie,
            region: formData.region,
            pays: formData.pays,
            nationalite: formData.nationalite,
            religion: formData.religion,
            activite1: formData.activite1,
            activite2: formData.activite2,
            activite3: formData.activite3,
            specialite: formData.specialite,
            statutMatrimonial: formData.statutMatrimonial,
            lieu1: formData.lieu1,
            lieu2: formData.lieu2,
            lieu3: formData.lieu3,
            numeroHPere: formData.numeroHPere,
            numeroHMere: formData.numeroHMere,
            languesAutre: formData.languesAutre,
            handicap: formData.handicap,
            ...(preuveFile ? await (async () => {
              const reader = new FileReader()
              return new Promise<{ preuve: string }>((resolve) => {
                reader.onload = (e) => resolve({ preuve: e.target?.result as string })
                reader.readAsDataURL(preuveFile)
              })
            })() : {}),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          serverUser = (data && data.user) ? data.user : {};
        }
      } catch {
        // Si la mise à jour du profil échoue mais que la photo a été uploadée,
        // on continue quand même pour sauvegarder la photo dans le localStorage
        console.warn("Mise à jour du profil texte échouée, mais on continue avec la photo");
      }

      // 4. Construire l'utilisateur final
      const finalPhoto = uploadedPhotoUrl || (serverUser as any).photo || formData.photo;
      const finalVideo = uploadedVideoUrl || (serverUser as any).video || formData.video;
      const updatedUser: UserData = {
        ...formData,
        ...serverUser,
        photo: finalPhoto,
        video: finalVideo,
      };

      console.log('✅ Profil mis à jour - photo:', finalPhoto);

      // 4. Mettre à jour le parent (MonProfil)
      onUpdate(updatedUser);

      // 5. Mettre à jour la session globale (localStorage)
      try {
        const rawSession = localStorage.getItem("session_user");
        if (rawSession) {
          const parsed = JSON.parse(rawSession);
          if (parsed.userData) {
            parsed.userData = { ...parsed.userData, ...updatedUser };
          } else {
            Object.assign(parsed, updatedUser);
          }
          localStorage.setItem("session_user", JSON.stringify(parsed));
        }
      } catch {
        localStorage.setItem("session_user", JSON.stringify({ userData: updatedUser }));
      }

      // 6. Notifier les autres composants
      window.dispatchEvent(new Event("session-updated"));

      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        setError("Impossible de joindre le serveur. Vérifiez que le backend est démarré sur le port 5002.");
      } else {
        setError(msg || "Une erreur est survenue");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open || !formData) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">Mettre à jour mon profil</h3>
          <button
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg font-medium text-center">
            ✅ Profil mis à jour avec succès !
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo de profil */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Photo de profil"
                  className="w-32 h-32 rounded-full object-cover border-4 border-blue-500"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-emerald-500 text-white flex items-center justify-center text-4xl font-bold border-4 border-blue-500">
                  {formData.prenom?.charAt(0) || "👤"}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                📷 Choisir une photo
              </button>
            </div>
          </div>

          {/* Vidéo d'inscription */}
          <div className="border border-purple-200 rounded-xl p-4 bg-purple-50">
            <h4 className="text-base font-semibold text-purple-800 mb-2">🎥 Vidéo d'inscription</h4>
            {(videoPreview || formData.video) ? (
              <video
                src={videoPreview || (formData.video as string)}
                controls
                className="w-full max-w-sm rounded-xl border border-purple-200 shadow-sm mb-2"
                style={{ maxHeight: 200 }}
              />
            ) : (
              <p className="text-sm text-gray-400 mb-2">Aucune vidéo enregistrée.</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
              >
                {formData.video ? "🔄 Remplacer la vidéo" : "🎥 Ajouter une vidéo"}
              </button>
              {videoFile && (
                <span className="text-sm text-green-700 font-medium">✓ Nouvelle vidéo prête</span>
              )}
            </div>
            {formData.video && (
              <p className="text-xs text-gray-400 mt-2">
                La vidéo ne peut pas être supprimée — vous pouvez seulement la remplacer.
              </p>
            )}
          </div>

          {/* Informations personnelles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prénom *
              </label>
              <input
                type="text"
                value={formData.prenom || ""}
                onChange={(e) => handleInputChange("prenom", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de famille *
              </label>
              <input
                type="text"
                value={formData.nomFamille || ""}
                onChange={(e) => handleInputChange("nomFamille", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.telephone || formData.tel1 || ""}
                onChange={(e) => {
                  handleInputChange("telephone", e.target.value);
                  handleInputChange("tel1", e.target.value);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Personne en situation de handicap ?
                {formData.handicap && (
                  <span className="ml-2 text-xs text-amber-600 font-normal">🔒 Non modifiable après première saisie</span>
                )}
              </label>
              {formData.handicap ? (
                <input
                  type="text"
                  value={formData.handicap === "OUI" ? "Oui" : "Non"}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-200 bg-gray-100 text-gray-700 rounded-lg cursor-not-allowed"
                />
              ) : (
                <select
                  value=""
                  onChange={(e) => handleInputChange("handicap", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Sélectionner —</option>
                  <option value="NON">Non</option>
                  <option value="OUI">Oui</option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Genre
              </label>
              <select
                value={formData.genre || ""}
                onChange={(e) => handleInputChange("genre", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner</option>
                <option value="HOMME">Homme</option>
                <option value="FEMME">Femme</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de naissance (non modifiable)
              </label>
              <input
                type="date"
                value={formData.dateNaissance || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-lg text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Âge
              </label>
              <input
                type="number"
                value={formData.age || ""}
                onChange={(e) => handleInputChange("age", parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Génération (non modifiable)
              </label>
              <input
                type="text"
                value={formData.generation || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-lg text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ethnie (non modifiable)
              </label>
              <input
                type="text"
                value={formData.ethnie || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-lg text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Région (non modifiable)
              </label>
              <input
                type="text"
                value={formData.region || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-lg text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pays (non modifiable)
              </label>
              <input
                type="text"
                value={formData.pays || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 bg-gray-100 rounded-lg text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nationalité
              </label>
              <input
                type="text"
                value={formData.nationalite || ""}
                onChange={(e) => handleInputChange("nationalite", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Religion
              </label>
              <input
                type="text"
                value={formData.religion || ""}
                onChange={(e) => handleInputChange("religion", e.target.value)}
                placeholder="Ex: Islam, Christianisme..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🌐 Langues parlées
              </label>
              <input
                type="text"
                value={formData.languesAutre || ""}
                onChange={(e) => handleInputChange("languesAutre", e.target.value)}
                placeholder="Ex: Français ; Pulaar ; Soussou ; Malinké ; Anglais"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Séparez chaque langue par un point-virgule ( ; )</p>
            </div>
          </div>

          {/* Compléter votre profil : jusqu'à 3 activités et 3 quartiers */}
          <div className="border-t pt-4">
            <h4 className="text-lg font-semibold mb-2">Compléter votre profil à 100%</h4>
            <p className="text-sm text-gray-500 mb-4">
              Ajoutez jusqu'à 3 activités professionnelles et jusqu'à 3 quartiers ou lieux de résidence.
            </p>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activité principale</label>
                <select
                  value={formData.activite1 || ""}
                  onChange={(e) => handleInputChange("activite1", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner une activité</option>
                  {ACTIVITY_OPTIONS.map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>
                {/* Spécialité — apparaît dès qu'une activité est choisie */}
                {formData.activite1 && (
                  <div className="mt-2">
                    <label className="block text-xs font-semibold text-emerald-700 mb-1">
                      🎯 Spécialité dans « {formData.activite1} »
                      <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.specialite || ""}
                      onChange={(e) => handleInputChange("specialite", e.target.value)}
                      placeholder="Ex : Cardiologie, Maraîchage, Développement web…"
                      className="w-full px-3 py-2 border-2 border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-emerald-50/30 text-sm"
                    />
                    {/* Preuve d'activité */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <label className="block text-xs font-semibold text-gray-600 mb-2">
                        📎 Preuve d'activité
                        <span className="text-gray-400 font-normal ml-1">(diplôme, attestation, carte pro…)</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*,.pdf,.doc,.docx"
                        ref={preuveInputRef}
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          setPreuveFile(file)
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => preuveInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-3 py-2 border border-dashed border-gray-400 rounded-lg text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        📎 {preuveFile ? preuveFile.name : (formData.preuve ? 'Changer la preuve' : 'Joindre un document')}
                      </button>
                      {preuveFile && (
                        <button
                          type="button"
                          onClick={() => { setPreuveFile(null); if (preuveInputRef.current) preuveInputRef.current.value = '' }}
                          className="ml-2 text-xs text-red-500 hover:underline"
                        >
                          Supprimer
                        </button>
                      )}
                      {formData.preuve && !preuveFile && (
                        <p className="text-xs text-green-600 mt-1">✓ Preuve déjà enregistrée</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* Statut matrimonial */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  💍 Statut matrimonial
                  <span className="text-gray-400 font-normal ml-1">(vous pouvez le mettre à jour à tout moment)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { val: 'Célibataire',   icon: '🔵' },
                    { val: 'Marié(e)',       icon: '💍' },
                    { val: 'Veuf/Veuve',    icon: '🕊️' },
                    { val: 'Divorcé(e)',    icon: '📝' },
                    { val: 'Séparé(e)',     icon: '↔️' },
                  ].map(({ val, icon }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleInputChange("statutMatrimonial", formData.statutMatrimonial === val ? '' : val)}
                      className={`py-2 px-3 rounded-full border-2 text-sm font-medium transition-all ${
                        formData.statutMatrimonial === val
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {icon} {val}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activité 2 (optionnel)</label>
                <select
                  value={formData.activite2 || ""}
                  onChange={(e) => handleInputChange("activite2", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Ajouter une 2e activité...</option>
                  {ACTIVITY_OPTIONS.map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Activité 3 (optionnel)</label>
                <select
                  value={formData.activite3 || ""}
                  onChange={(e) => handleInputChange("activite3", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Ajouter une 3e activité...</option>
                  {ACTIVITY_OPTIONS.map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quartier / lieu de résidence 1</label>
                <select
                  value={formData.lieu1 || ""}
                  onChange={(e) => handleInputChange("lieu1", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un quartier ou lieu principal</option>
                  {allLocations.map((loc) => (
                    <option key={loc.code} value={loc.name}>
                      {loc.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quartier / lieu 2 (optionnel)</label>
                <select
                  value={formData.lieu2 || ""}
                  onChange={(e) => handleInputChange("lieu2", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Autre quartier ou lieu</option>
                  {allLocations.map((loc) => (
                    <option key={loc.code} value={loc.name}>
                      {loc.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quartier / lieu 3 (optionnel)</label>
                <select
                  value={formData.lieu3 || ""}
                  onChange={(e) => handleInputChange("lieu3", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Autre quartier ou lieu</option>
                  {allLocations.map((loc) => (
                    <option key={loc.code} value={loc.name}>
                      {loc.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Informations familiales */}
          <div className="border-t pt-4">
            <h4 className="text-lg font-semibold mb-4">Informations familiales</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NuméroH / NumeroHD du père
                </label>
                <input
                  type="text"
                  value={formData.numeroHPere || ""}
                  onChange={(e) => handleInputChange("numeroHPere", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NuméroH / NumeroHD de la mère
                </label>
                <input
                  type="text"
                  value={formData.numeroHMere || ""}
                  onChange={(e) => handleInputChange("numeroHMere", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


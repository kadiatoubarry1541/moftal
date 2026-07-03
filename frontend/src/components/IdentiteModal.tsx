import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPhotoUrl, getNumeroHForDisplay } from "../utils/auth";
import { api } from "../utils/api";
import { useI18n } from "../i18n/useI18n";
import { LANG_LABELS } from "../i18n/strings";

interface UserData {
  numeroH: string;
  prenom: string;
  nomFamille: string;
  photo?: string;
  genre?: string;
  prenomPere?: string;
  prenomMere?: string;
  numeroHPere?: string;
  numeroHMere?: string;
  [key: string]: any;
}

const CONFIRM_DELETE_TEXT = "SUPPRIMER";

export default function IdentiteModal({
  open,
  onClose,
  onEditProfile,
  freshUserData,
}: {
  open: boolean;
  onClose: () => void;
  onEditProfile?: () => void;
  freshUserData?: any;
}) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    if (!open) return;
    if (freshUserData) {
      setUserData(freshUserData);
      return;
    }
    const raw = localStorage.getItem("session_user");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const u = parsed.userData || parsed;
      setUserData(u);
    } catch {}
  }, [open, freshUserData]);

  if (!open) return null;
  if (open && !userData) return null;

  const photoUrl = getPhotoUrl(userData?.photo);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-xl shadow-xl p-4 sm:p-6 max-w-2xl w-11/12 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg sm:text-2xl font-bold truncate">Identité</h3>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Bouton Paramètres ⚙️ */}
            <div className="relative">
              <button
                onClick={() => { setShowSettings(!showSettings); setShowLang(false); }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
                title="Paramètres"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              {showSettings && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSettings(false)} />
                  <div className="absolute right-0 top-11 bg-white rounded-2xl shadow-xl border border-gray-200 w-68 z-50 overflow-hidden" style={{ minWidth: 240 }}>
                    {/* Page d'accueil */}
                    {userData?.numeroH && (
                      <button
                        onClick={() => {
                          localStorage.removeItem(`moftal_favori_${userData.numeroH}`);
                          window.dispatchEvent(new CustomEvent('open-favori-modal'));
                          setShowSettings(false);
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors border-b border-gray-100"
                      >
                        <span>⭐</span>
                        <span>Changer ma page d'accueil</span>
                      </button>
                    )}
                    {/* Langue */}
                    <div className="border-b border-gray-100">
                      <button
                        type="button"
                        onClick={() => setShowLang(!showLang)}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <span className="flex items-center gap-3">
                          <span>🌐</span>
                          <span>{t('header.language')}</span>
                        </span>
                        <span className="text-xs text-gray-400">{showLang ? '▲' : '▼'}</span>
                      </button>
                      {showLang && (
                        <div className="px-3 pb-3 grid grid-cols-2 gap-1.5 border-t border-slate-100 pt-2">
                          {Object.entries(LANG_LABELS).map(([code, label]) => {
                            const isSelected = lang === code;
                            return (
                              <button
                                key={code}
                                type="button"
                                onClick={() => setLang(code as "fr" | "en" | "ar" | "man" | "pul")}
                                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border-2 text-xs font-medium transition-all ${
                                  isSelected
                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50"
                                }`}
                              >
                                <span className="flex-1 text-left">{label}</span>
                                {isSelected && <span className="text-emerald-600">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {/* Se déconnecter */}
                    <button
                      onClick={() => {
                        localStorage.removeItem('token');
                        localStorage.removeItem('session_user');
                        onClose();
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <span>⏻</span>
                      <span>{t('btn.logout')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
              onClick={() => {
                if (onEditProfile) {
                  onEditProfile();
                } else {
                  onClose();
                }
              }}
            >
              ✏️ <span className="hidden sm:inline">Modifier mon profil</span><span className="sm:hidden">Modifier</span>
            </button>
            <button
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-xs sm:text-base whitespace-nowrap"
              onClick={onClose}
            >
              Fermer
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
          <div className="relative self-center sm:self-start flex-shrink-0">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Photo de profil"
                className="w-28 h-28 rounded-full object-cover"
                onError={(e) => {
                  const target = e.currentTarget;
                  // Si l'image ne charge pas, masquer l'img et afficher l'initiale
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector(".avatar-placeholder")) {
                    const placeholder = document.createElement("div");
                    placeholder.className =
                      "w-28 h-28 rounded-full bg-emerald-500 text-white flex items-center justify-center text-4xl font-bold avatar-placeholder";
                    placeholder.textContent =
                      userData!.prenom?.charAt(0) || "👤";
                    parent.appendChild(placeholder);
                  }
                }}
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-emerald-500 text-white flex items-center justify-center text-4xl font-bold">
                {userData!.prenom?.charAt(0) || "👤"}
              </div>
            )}
          </div>

          <div className="flex-1 w-full min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold break-words">
              {userData!.prenom} {userData!.nomFamille}
            </h2>
            <div className="mt-2 text-sm">
              NuméroH:{" "}
              <span className="font-semibold text-blue-700">
                {getNumeroHForDisplay(userData!.numeroH, true, false)}
              </span>
            </div>

            <div className="mt-4 bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur rounded-2xl ring-1 ring-gray-200 p-4 text-gray-800">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <div className="font-semibold">Génération</div>
                  <div>{userData!.generation || "—"}</div>
                </div>
                <div>
                  <div className="font-semibold">E-mail</div>
                  <div>{userData!.email || "—"}</div>
                </div>
                <div>
                  <div className="font-semibold">Région</div>
                  <div>{userData!.region || "—"}</div>
                </div>
                <div>
                  <div className="font-semibold">Ethnie</div>
                  <div>{userData!.ethnie || "—"}</div>
                </div>
                <div>
                  <div className="font-semibold">Pays</div>
                  <div>{userData!.pays || "—"}</div>
                </div>
                <div>
                  <div className="font-semibold">Nationalité</div>
                  <div>{userData!.nationalite || "—"}</div>
                </div>
                <div>
                  <div className="font-semibold">Genre</div>
                  <div>{userData!.genre || "—"}</div>
                </div>
                <div>
                  <div className="font-semibold">Date de naissance</div>
                  <div>{userData!.dateNaissance || "—"}</div>
                </div>
                <div>
                  <div className="font-semibold">Âge</div>
                  <div>{userData!.age ?? "—"}</div>
                </div>
                <div>
                  <div className="font-semibold">Téléphone</div>
                  <div>{userData!.telephone || userData!.tel1 || "—"}</div>
                </div>
                <div>
                  <div className="font-semibold">Père</div>
                  <div>{userData!.prenomPere || "—"}</div>
                </div>
                <div>
                  <div className="font-semibold">Mère</div>
                  <div>{userData!.prenomMere || "—"}</div>
                </div>
                <div>
                  <div className="font-semibold">NuméroH Père</div>
                  <div>{userData!.numeroHPere || "—"}</div>
                </div>
                <div>
                  <div className="font-semibold">NuméroH Mère</div>
                  <div>{userData!.numeroHMere || "—"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Vidéo d'inscription ── */}
        {userData!.video && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
              🎥 Ma vidéo d'inscription
            </h4>
            <p className="text-xs text-slate-400 mb-2">
              Vidéo enregistrée lors de votre inscription. Elle sert à confirmer votre identité.
            </p>
            <video
              src={userData!.video as string}
              controls
              className="w-full max-w-sm rounded-xl border border-slate-200 shadow-sm"
              style={{ maxHeight: 220 }}
            />
          </div>
        )}

        {/* Zone « Supprimer le compte » en bas, à part */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => {
              setShowDeleteModal(true);
              setDeletePassword("");
              setDeleteConfirmText("");
              setDeleteError("");
            }}
            className="text-sm text-red-600 hover:text-red-700 hover:underline"
          >
            🗑️ Supprimer définitivement mon compte
          </button>
        </div>

        {/* Modal suppression de compte */}
        {showDeleteModal && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black/40 rounded-xl" onClick={() => !deleteLoading && setShowDeleteModal(false)}>
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
                      onClose();
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
    </div>
  );
}

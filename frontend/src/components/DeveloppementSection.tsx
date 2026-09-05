import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import CompteSolidariteQuartier, { type CompteSolidariteQuartierHandle } from './CompteSolidariteQuartier';

const MAX_VIDEO_SECONDS = 5;

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface HigherLevel {
  scope: string;
  location: string;
  label: string;
}

interface Props {
  scope: string;
  location: string;
  locationName: string;
  isJournalist?: boolean;
  isAdmin?: boolean;
  higherLevels?: HigherLevel[];
  /** Cache le gros bouton "Projets" intégré — utile quand une page appelante
   *  affiche déjà son propre bouton (ex: à côté de la liste des membres) et
   *  déclenche la modale via la ref plutôt que par ce bouton. */
  hideProjetsButton?: boolean;
}

export interface DeveloppementSectionHandle {
  openCaisse: () => void;
}

function getMyNumeroH(): string | null {
  try {
    const parsed = JSON.parse(localStorage.getItem('session_user') || '{}');
    return (parsed.userData || parsed)?.numeroH || null;
  } catch { return null; }
}

const DeveloppementSection = forwardRef<DeveloppementSectionHandle, Props>(function DeveloppementSection(
  { scope, location, locationName, isJournalist, isAdmin, higherLevels = [], hideProjetsButton = false },
  ref
) {
  const canPublish = !!(isJournalist || isAdmin);
  const myNumeroH = getMyNumeroH();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const soliRef = useRef<CompteSolidariteQuartierHandle>(null);
  useImperativeHandle(ref, () => ({
    openCaisse: () => soliRef.current?.open(),
  }), []);

  // ── Actualités locales (journalistes, admins, personnes autorisées) ──
  const [actualites, setActualites] = useState<any[]>([]);
  const [loadingActualites, setLoadingActualites] = useState(true);
  const [canPublishActu, setCanPublishActu] = useState(canPublish);
  const [showPublierActu, setShowPublierActu] = useState(false);
  const [actuForm, setActuForm] = useState({ titre: '', content: '' });
  const [actuLoading, setActuLoading] = useState(false);
  const [actuMediaFile, setActuMediaFile] = useState<File | null>(null);
  const [actuMediaPreview, setActuMediaPreview] = useState<string | null>(null);
  const [actuMediaType, setActuMediaType] = useState<'image' | 'video' | null>(null);
  const actuMediaInputRef = useRef<HTMLInputElement>(null);
  // Niveaux au-dessus où l'auteur a réellement le droit de publier — donc où
  // il peut faire remonter (partager) cette même actualité.
  const [allowedHigherLevels, setAllowedHigherLevels] = useState<HigherLevel[]>([]);
  const [selectedPartages, setSelectedPartages] = useState<Set<string>>(new Set());
  const [showPublishers, setShowPublishers] = useState(false);
  const [publishers, setPublishers] = useState<any[]>([]);
  const [newPublisher, setNewPublisher] = useState({ numeroH: '', name: '', role: 'chef' });

  useEffect(() => {
    if (location) { loadLogo(); loadActualites(); checkCanPublishActu(); }
  }, [scope, location]);

  // Vérifie, uniquement à l'ouverture du formulaire, sur quels niveaux
  // au-dessus l'auteur a aussi le droit de publier (pour proposer de
  // partager la même actualité là-bas, sans jamais la dupliquer).
  useEffect(() => {
    if (!showPublierActu || higherLevels.length === 0) { setAllowedHigherLevels([]); return; }
    if (canPublish) { setAllowedHigherLevels(higherLevels); return; }
    let cancelled = false;
    const token = localStorage.getItem('token');
    Promise.all(higherLevels.map(async (lvl) => {
      try {
        const res = await fetch(
          `${API_BASE}/api/developpement/actualites/can-publish?scope=${encodeURIComponent(lvl.scope)}&location=${encodeURIComponent(lvl.location)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) return null;
        const d = await res.json();
        return d.canPublish ? lvl : null;
      } catch { return null; }
    })).then(results => {
      if (!cancelled) setAllowedHigherLevels(results.filter((l): l is HigherLevel => !!l));
    });
    return () => { cancelled = true; };
  }, [showPublierActu]);

  const togglePartage = (lvl: HigherLevel) => {
    const key = `${lvl.scope}:${lvl.location}`;
    setSelectedPartages(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const loadActualites = async () => {
    setLoadingActualites(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE}/api/developpement/actualites?scope=${encodeURIComponent(scope)}&location=${encodeURIComponent(location)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) { const d = await res.json(); setActualites(d.actualites || []); }
    } catch {} finally { setLoadingActualites(false); }
  };

  const checkCanPublishActu = async () => {
    if (canPublish) { setCanPublishActu(true); return; }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE}/api/developpement/actualites/can-publish?scope=${encodeURIComponent(scope)}&location=${encodeURIComponent(location)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) { const d = await res.json(); setCanPublishActu(!!d.canPublish); }
    } catch {}
  };

  const removeActuMedia = () => {
    if (actuMediaPreview) URL.revokeObjectURL(actuMediaPreview);
    setActuMediaFile(null);
    setActuMediaPreview(null);
    setActuMediaType(null);
    if (actuMediaInputRef.current) actuMediaInputRef.current.value = '';
  };

  const handleActuMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Seules les images et vidéos sont autorisées.');
      e.target.value = '';
      return;
    }
    const url = URL.createObjectURL(file);
    if (file.type.startsWith('video/')) {
      const videoEl = document.createElement('video');
      videoEl.preload = 'metadata';
      videoEl.onloadedmetadata = () => {
        if (videoEl.duration > MAX_VIDEO_SECONDS + 0.5) {
          alert(`Vidéo trop longue : ${Math.round(videoEl.duration)} secondes.\nMaximum autorisé : ${MAX_VIDEO_SECONDS} secondes.`);
          URL.revokeObjectURL(url);
          e.target.value = '';
          return;
        }
        setActuMediaFile(file);
        setActuMediaPreview(url);
        setActuMediaType('video');
      };
      videoEl.onerror = () => {
        alert('Impossible de lire cette vidéo.');
        URL.revokeObjectURL(url);
      };
      videoEl.src = url;
    } else {
      setActuMediaFile(file);
      setActuMediaPreview(url);
      setActuMediaType('image');
    }
  };

  const submitActualite = async () => {
    if (!actuForm.titre.trim() || !actuForm.content.trim()) return;
    setActuLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('titre', actuForm.titre);
      formData.append('content', actuForm.content);
      formData.append('scope', scope);
      formData.append('location', location);
      if (actuMediaFile) formData.append('media', actuMediaFile);
      const partages = allowedHigherLevels
        .filter(l => selectedPartages.has(`${l.scope}:${l.location}`))
        .map(l => ({ scope: l.scope, location: l.location }));
      if (partages.length) formData.append('partages', JSON.stringify(partages));
      const res = await fetch(`${API_BASE}/api/developpement/actualites`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const d = await res.json();
      if (d.success) {
        setShowPublierActu(false);
        setActuForm({ titre: '', content: '' });
        removeActuMedia();
        setSelectedPartages(new Set());
        loadActualites();
      } else {
        alert(d.message || 'Erreur lors de la publication.');
      }
    } catch {
      alert('Erreur lors de la publication.');
    } finally {
      setActuLoading(false);
    }
  };

  const deleteActualite = async (id: string) => {
    if (!confirm('Retirer cette actualité ?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/developpement/actualites/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      loadActualites();
    } catch {}
  };

  const loadPublishers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE}/api/developpement/publishers?scope=${encodeURIComponent(scope)}&location=${encodeURIComponent(location)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) { const d = await res.json(); setPublishers(d.publishers || []); }
    } catch {}
  };

  const addPublisher = async () => {
    if (!newPublisher.numeroH.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/developpement/publishers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPublisher, scope, location })
      });
      const d = await res.json();
      if (d.success) {
        setNewPublisher({ numeroH: '', name: '', role: 'chef' });
        loadPublishers();
      } else {
        alert(d.message || 'Erreur.');
      }
    } catch {
      alert('Erreur.');
    }
  };

  const removePublisher = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/developpement/publishers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      loadPublishers();
    } catch {}
  };

  const loadLogo = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE}/api/developpement/logo?scope=${encodeURIComponent(scope)}&location=${encodeURIComponent(location)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) { const d = await res.json(); setLogoUrl(d.logoUrl || null); }
    } catch {}
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('logo', file);
      formData.append('scope', scope);
      formData.append('location', location);
      const res = await fetch(`${API_BASE}/api/developpement/logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const d = await res.json();
      if (d.success) {
        setLogoUrl(d.logoUrl);
      } else {
        alert(d.message || 'Impossible de changer le logo');
      }
    } catch { alert('Erreur réseau lors de l\'envoi du logo'); } finally { setUploadingLogo(false); }
  };

  return (
    <div className="space-y-4">

      {/* En-tête du lieu (logo optionnel) */}
      <div className="flex items-center gap-3">
        {(logoUrl || canPublish) && (
          <label
            className={`relative w-11 h-11 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 ${canPublish ? 'cursor-pointer' : ''}`}
            title={canPublish ? `Changer le logo de ${locationName}` : undefined}
          >
            {logoUrl ? (
              <img src={logoUrl.startsWith('http') ? logoUrl : `${API_BASE}${logoUrl}`} alt={`Logo de ${locationName}`} className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg">🏛️</span>
            )}
            {canPublish && (
              <>
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] leading-none opacity-0 hover:opacity-100 transition-opacity">
                  {uploadingLogo ? '…' : '📷'}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingLogo}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                    e.target.value = '';
                  }}
                />
              </>
            )}
          </label>
        )}
        <p className="font-bold text-slate-800 text-lg flex-1">{locationName}</p>
      </div>
      <CompteSolidariteQuartier ref={soliRef} scope={scope} location={location} locationName={locationName} />

      {/* Un seul bouton "Caisse" : santé, orphelins et projets (développement), tout dedans */}
      {!hideProjetsButton && (
        <button
          onClick={() => soliRef.current?.open()}
          className="w-full flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-green-700 to-emerald-600 rounded-xl text-left shadow"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <p className="font-bold text-white text-sm">Caisse</p>
          </div>
          <span className="text-white/80">›</span>
        </button>
      )}

      {/* Actualités locales — le cœur de la page */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-800 text-base">📰 Actualités — {locationName}</h3>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => { setShowPublishers(true); loadPublishers(); }}
                title="Gérer les autorisations"
                className="w-7 h-7 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              >
                ⚙️
              </button>
            )}
            {canPublishActu && (
              <button
                onClick={() => setShowPublierActu(true)}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                + Publier
              </button>
            )}
          </div>
        </div>

        {loadingActualites ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
          </div>
        ) : actualites.length === 0 ? (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 text-center">
            <p className="text-slate-500 text-sm font-medium">Aucune actualité</p>
          </div>
        ) : (
          <div className="space-y-3">
            {actualites.map((actu: any) => (
              <div key={actu.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-slate-800 text-sm">{actu.titre}</h4>
                  {(isAdmin || actu.numeroH === myNumeroH) && (
                    <button onClick={() => deleteActualite(actu.id)} className="text-slate-300 hover:text-red-500 text-xs flex-shrink-0">✕</button>
                  )}
                </div>
                {actu.mediaUrl && (
                  actu.mediaType === 'video' ? (
                    <video src={actu.mediaUrl.startsWith('http') ? actu.mediaUrl : `${API_BASE}${actu.mediaUrl}`} controls className="w-full h-40 object-cover rounded-lg mt-2 bg-black" />
                  ) : (
                    <img src={actu.mediaUrl.startsWith('http') ? actu.mediaUrl : `${API_BASE}${actu.mediaUrl}`} alt="" className="w-full h-40 object-cover rounded-lg mt-2" />
                  )
                )}
                <p className="text-slate-600 text-sm mt-2 whitespace-pre-wrap">{actu.content}</p>
                <div className="flex items-center gap-1.5 mt-3 text-xs text-slate-400">
                  <span className="font-semibold text-slate-500">{actu.authorName}</span>
                  <span>·</span>
                  <span>{new Date(actu.createdAt || actu.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Publier une actualité */}
      {showPublierActu && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-gradient-to-r from-green-700 to-emerald-600 p-5">
              <h2 className="text-lg font-bold text-white">📰 Publier une actualité — {locationName}</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Titre</label>
                <input
                  type="text"
                  value={actuForm.titre}
                  onChange={(e) => setActuForm({ ...actuForm, titre: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Ex : Nouvelle école ouverte à Dogomet"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contenu</label>
                <textarea
                  value={actuForm.content}
                  onChange={(e) => setActuForm({ ...actuForm, content: e.target.value })}
                  rows={4}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  placeholder="Détails de l'actualité..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Photo ou vidéo (optionnel)</label>
                {actuMediaPreview ? (
                  <div className="relative">
                    {actuMediaType === 'video' ? (
                      <video src={actuMediaPreview} controls className="w-full max-h-48 rounded-xl bg-black" />
                    ) : (
                      <img src={actuMediaPreview} alt="Aperçu" className="w-full max-h-48 object-contain rounded-xl" />
                    )}
                    <button
                      onClick={removeActuMedia}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-sm flex items-center justify-center"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => actuMediaInputRef.current?.click()}
                    className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    📷 Ajouter une photo ou une vidéo (5s max)
                  </button>
                )}
                <input
                  ref={actuMediaInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleActuMediaSelect}
                  className="hidden"
                />
              </div>
              {allowedHigherLevels.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Faire remonter aussi vers</label>
                  <div className="space-y-1.5">
                    {allowedHigherLevels.map(lvl => (
                      <label key={`${lvl.scope}:${lvl.location}`} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedPartages.has(`${lvl.scope}:${lvl.location}`)}
                          onChange={() => togglePartage(lvl)}
                          className="w-4 h-4 accent-green-600"
                        />
                        {lvl.label}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">La même publication apparaîtra aussi là-bas — sans être enregistrée deux fois.</p>
                </div>
              )}
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => { setShowPublierActu(false); removeActuMedia(); setSelectedPartages(new Set()); }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={submitActualite}
                disabled={actuLoading || !actuForm.titre.trim() || !actuForm.content.trim()}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-colors"
              >
                {actuLoading ? 'Publication...' : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gérer les autorisations (admin uniquement) */}
      {showPublishers && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col">
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 p-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">👥 Autorisés à publier — {locationName}</h2>
              <button onClick={() => setShowPublishers(false)} className="text-white/80 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <p className="text-xs text-slate-500">Journalistes et administrateurs peuvent déjà publier partout. Ajoute ici les chefs ou correspondants que tu autorises pour ce lieu précis.</p>
              <div className="border border-slate-200 rounded-xl p-3 space-y-2">
                <input
                  type="text"
                  value={newPublisher.numeroH}
                  onChange={(e) => setNewPublisher({ ...newPublisher, numeroH: e.target.value })}
                  placeholder="NuméroH"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
                <input
                  type="text"
                  value={newPublisher.name}
                  onChange={(e) => setNewPublisher({ ...newPublisher, name: e.target.value })}
                  placeholder="Nom (optionnel)"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
                <select
                  value={newPublisher.role}
                  onChange={(e) => setNewPublisher({ ...newPublisher, role: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="chef">Chef</option>
                  <option value="correspondant">Correspondant local</option>
                  <option value="autre">Autre</option>
                </select>
                <button onClick={addPublisher} className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-bold rounded-lg transition-colors">
                  + Autoriser
                </button>
              </div>
              <div className="space-y-2">
                {publishers.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Personne d'autre autorisé pour l'instant</p>
                ) : publishers.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg p-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{p.name || p.numeroH}</p>
                      <p className="text-xs text-slate-500">{p.numeroH} · {p.role || 'autorisé'}</p>
                    </div>
                    <button onClick={() => removePublisher(p.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">
                      Retirer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default DeveloppementSection;

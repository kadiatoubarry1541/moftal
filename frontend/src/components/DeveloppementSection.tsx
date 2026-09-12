import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import CompteSolidariteQuartier, { type CompteSolidariteQuartierHandle } from './CompteSolidariteQuartier';
import ListeEnfants, { type ListeEnfantsHandle } from './ListeEnfants';
import LivreQuartier, { type LivreQuartierHandle } from './LivreQuartier';
import { REGLES_LOCALITE, NUMERO_EMOJI } from '../utils/reglesLocalite';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface Props {
  scope: string;
  location: string;
  locationName: string;
  isJournalist?: boolean;
  isAdmin?: boolean;
  /** Niveaux au-dessus (ex: préfecture, région...) — sert à proposer de
   *  continuer à faire remonter une information reçue de plus bas. */
  higherLevels?: { scope: string; location: string; label: string }[];
  /** Cache le gros bouton "Caisse" intégré — utile quand une page appelante
   *  affiche déjà son propre bouton (ex: à côté de la liste des membres) et
   *  déclenche la modale via la ref plutôt que par ce bouton. */
  hideProjetsButton?: boolean;
}

export interface DeveloppementSectionHandle {
  openCaisse: () => void;
}

const DeveloppementSection = forwardRef<DeveloppementSectionHandle, Props>(function DeveloppementSection(
  { scope, location, locationName, isJournalist, isAdmin, higherLevels = [], hideProjetsButton = false },
  ref
) {
  const soliRef = useRef<CompteSolidariteQuartierHandle>(null);
  const listeRef = useRef<ListeEnfantsHandle>(null);
  const livreRef = useRef<LivreQuartierHandle>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({
    openCaisse: () => soliRef.current?.open(),
  }), []);

  // Le quartier a déjà sa propre photo (celle du groupe de chat) — ce logo
  // générique ne concerne que la sous-préfecture, qui n'a pas de chat.
  const showLogoEtListe = scope === 'sous-prefecture';
  const canPublish = !!(isJournalist || isAdmin);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  // Page "Infos" — même principe que pour le quartier : cliquer sur le logo
  // ouvre un menu (Liste, Photo de profil, Caisse, Livre, Règles) au lieu de
  // changer la photo directement.
  const [showInfos, setShowInfos] = useState(false);

  // Informations partagées depuis les quartiers de cette sous-préfecture
  // (bouton "↗️ Partager" sur un message du chat) — lecture seule ici.
  const [infosPartagees, setInfosPartagees] = useState<any[]>([]);
  const [loadingInfos, setLoadingInfos] = useState(false);

  useEffect(() => {
    if (!showLogoEtListe || !location) return;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${API_BASE}/api/developpement/logo?scope=${encodeURIComponent(scope)}&location=${encodeURIComponent(location)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) { const d = await res.json(); setLogoUrl(d.logoUrl || null); }
      } catch { /* ignore */ }
    })();
    (async () => {
      setLoadingInfos(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(
          `${API_BASE}/api/developpement/actualites?scope=${encodeURIComponent(scope)}&location=${encodeURIComponent(location)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) { const d = await res.json(); setInfosPartagees(d.actualites || []); }
      } catch { /* ignore */ } finally { setLoadingInfos(false); }
    })();
  }, [showLogoEtListe, scope, location]);

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
      if (d.success) setLogoUrl(d.logoUrl);
      else alert(d.message || 'Impossible de changer le logo');
    } catch { alert('Erreur réseau lors de l\'envoi du logo'); } finally { setUploadingLogo(false); }
  };

  // Continuer à faire remonter une information déjà reçue vers les niveaux
  // encore au-dessus (ex : sous-préfecture → préfecture, région...).
  const [shareInfo, setShareInfo] = useState<any | null>(null);
  const [shareLevels, setShareLevels] = useState<{ scope: string; location: string; label: string }[]>([]);
  const [shareSelected, setShareSelected] = useState<Set<string>>(new Set());
  const [shareChecking, setShareChecking] = useState(false);
  const [shareSending, setShareSending] = useState(false);

  const openShare = async (info: any) => {
    setShareInfo(info);
    setShareSelected(new Set());
    setShareLevels([]);
    setShareChecking(true);
    const token = localStorage.getItem('token');
    try {
      const resultats = await Promise.all(higherLevels.map(async (lvl) => {
        try {
          const res = await fetch(
            `${API_BASE}/api/developpement/actualites/can-publish?scope=${encodeURIComponent(lvl.scope)}&location=${encodeURIComponent(lvl.location)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) return null;
          const d = await res.json();
          return d.canPublish ? lvl : null;
        } catch { return null; }
      }));
      setShareLevels(resultats.filter((l): l is { scope: string; location: string; label: string } => !!l));
    } finally {
      setShareChecking(false);
    }
  };

  const toggleShareLevel = (key: string) => {
    setShareSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const confirmShare = async () => {
    if (!shareInfo || shareSelected.size === 0) return;
    setShareSending(true);
    try {
      const cibles = shareLevels.filter(l => shareSelected.has(`${l.scope}:${l.location}`));
      const [premiere, ...reste] = cibles;
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('titre', shareInfo.titre || '');
      formData.append('content', shareInfo.content || '');
      formData.append('scope', premiere.scope);
      formData.append('location', premiere.location);
      if (reste.length) formData.append('partages', JSON.stringify(reste.map(l => ({ scope: l.scope, location: l.location }))));
      const res = await fetch(`${API_BASE}/api/developpement/actualites`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const d = await res.json();
      if (d.success) setShareInfo(null);
      else alert(d.message || 'Erreur lors du partage.');
    } catch {
      alert('Impossible de contacter le serveur.');
    } finally {
      setShareSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {showLogoEtListe && (
        <button
          type="button"
          onClick={() => setShowInfos(true)}
          className="w-full flex items-center gap-3 text-left"
        >
          <div className="relative w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoUrl ? (
              <img src={logoUrl.startsWith('http') ? logoUrl : `${API_BASE}${logoUrl}`} alt={`Logo de ${locationName}`} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">🏛️</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-lg truncate">{locationName}</p>
          </div>
        </button>
      )}

      {showLogoEtListe && (
        <ListeEnfants ref={listeRef} scope={scope} location={location} locationName={locationName} childLabel="quartiers" canManage={canPublish} />
      )}

      {showLogoEtListe && (
        <LivreQuartier ref={livreRef} scope={scope} location={location} locationName={locationName} canPublish={canPublish} />
      )}

      <CompteSolidariteQuartier ref={soliRef} scope={scope} location={location} locationName={locationName} />

      {/* Page entière "Infos" — même principe que pour le quartier : logo,
          nom, puis un menu (Liste des quartiers, Photo de profil, Caisse,
          Livre) et les règles de la localité en dessous. */}
      {showLogoEtListe && showInfos && (
        <div className="fixed inset-0 bg-gray-50 z-50 flex flex-col">
          <div className="bg-gray-800 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <button onClick={() => setShowInfos(false)} aria-label="Retour" className="text-3xl leading-none">‹</button>
            <h2 className="font-bold text-base truncate">{locationName}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center gap-5">
            <label className={`relative w-24 h-24 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-3xl overflow-hidden ${canPublish ? 'cursor-pointer' : ''}`}>
              {logoUrl ? (
                <img src={logoUrl.startsWith('http') ? logoUrl : `${API_BASE}${logoUrl}`} alt={`Logo de ${locationName}`} className="w-full h-full object-cover" />
              ) : (
                <span>🏛️</span>
              )}
              {canPublish && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-xs leading-none opacity-0 hover:opacity-100 transition-opacity">
                  {uploadingLogo ? '…' : '📷'}
                </div>
              )}
            </label>
            {canPublish && (
              <>
                <input
                  ref={logoInputRef}
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
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="text-emerald-700 text-sm font-semibold -mt-3"
                >
                  📷 Changer la photo
                </button>
              </>
            )}
            <div className="w-full max-w-sm space-y-3">
              <button
                onClick={() => { setShowInfos(false); listeRef.current?.open(); }}
                className="w-full flex items-center justify-between gap-3 p-4 bg-white rounded-xl shadow border border-gray-200"
              >
                <span className="flex items-center gap-3 font-bold text-gray-800 text-sm">👥 Liste des quartiers</span>
                <span className="text-gray-400">›</span>
              </button>
              {canPublish && (
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="w-full flex items-center justify-between gap-3 p-4 bg-white rounded-xl shadow border border-gray-200 disabled:opacity-50"
                >
                  <span className="flex items-center gap-3 font-bold text-gray-800 text-sm">🖼️ Photo de profil</span>
                  <span className="text-gray-400">›</span>
                </button>
              )}
              <button
                onClick={() => { setShowInfos(false); soliRef.current?.open(); }}
                className="w-full flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-green-700 to-emerald-600 rounded-xl shadow"
              >
                <span className="flex items-center gap-3 font-bold text-white text-sm">💰 Caisse</span>
                <span className="text-white/80">›</span>
              </button>
              <button
                onClick={() => { setShowInfos(false); livreRef.current?.open(); }}
                className="w-full flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-amber-700 to-amber-600 rounded-xl shadow"
              >
                <span className="flex items-center gap-3 font-bold text-white text-sm">📚 Livre</span>
                <span className="text-white/80">›</span>
              </button>

              <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
                <h3 className="font-bold text-gray-800 text-sm mb-3">📜 Règles de la sous-préfecture</h3>
                <ul className="space-y-2.5 text-sm text-gray-600">
                  {REGLES_LOCALITE.map((regle, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="flex-shrink-0">{NUMERO_EMOJI[i] || `${i + 1}.`}</span>
                      <span>{regle}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Informations partagées depuis les quartiers — lecture seule */}
      {showLogoEtListe && (infosPartagees.length > 0 || loadingInfos) && (
        <div>
          <h3 className="font-bold text-slate-800 text-sm mb-2">📰 Informations partagées</h3>
          {loadingInfos ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {infosPartagees.map((info: any) => (
                <div key={info.id} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                  <h4 className="font-bold text-slate-800 text-sm">{info.titre}</h4>
                  {info.mediaUrl && (
                    info.mediaType === 'video' ? (
                      <video src={info.mediaUrl.startsWith('http') ? info.mediaUrl : `${API_BASE}${info.mediaUrl}`} controls className="w-full h-32 object-cover rounded-lg mt-2 bg-black" />
                    ) : (
                      <img src={info.mediaUrl.startsWith('http') ? info.mediaUrl : `${API_BASE}${info.mediaUrl}`} alt="" className="w-full h-32 object-cover rounded-lg mt-2" />
                    )
                  )}
                  <p className="text-slate-600 text-sm mt-1.5 whitespace-pre-wrap">{info.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-slate-400">
                      {info.authorName} · {new Date(info.createdAt || info.created_at).toLocaleDateString('fr-FR')}
                    </p>
                    {higherLevels.length > 0 && (
                      <button
                        onClick={() => openShare(info)}
                        className="text-[10px] text-slate-400 hover:text-emerald-600 font-semibold flex-shrink-0"
                        title="Continuer à partager plus haut"
                      >
                        ↗️ Partager
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal — Continuer à partager vers un niveau encore au-dessus */}
      {shareInfo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShareInfo(null)}>
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-emerald-700 px-4 py-3 flex items-center justify-between">
              <h2 className="text-white font-bold text-base">↗️ Partager</h2>
              <button onClick={() => setShareInfo(null)} className="text-white/80 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2.5 line-clamp-3">{shareInfo.content}</p>
              {shareChecking ? (
                <div className="text-center text-sm text-gray-400 py-4">Vérification des droits...</div>
              ) : shareLevels.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Tu n'as le droit de publier à aucun niveau au-dessus pour l'instant.</p>
              ) : (
                <div className="space-y-1.5">
                  {shareLevels.map(lvl => {
                    const key = `${lvl.scope}:${lvl.location}`;
                    return (
                      <label key={key} className="flex items-center gap-2 text-sm text-gray-700 py-1">
                        <input
                          type="checkbox"
                          checked={shareSelected.has(key)}
                          onChange={() => toggleShareLevel(key)}
                          className="w-4 h-4 accent-emerald-600"
                        />
                        {lvl.label}
                      </label>
                    );
                  })}
                </div>
              )}
              <button
                onClick={confirmShare}
                disabled={shareSending || shareSelected.size === 0}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-colors"
              >
                {shareSending ? 'Partage...' : 'Partager'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default DeveloppementSection;

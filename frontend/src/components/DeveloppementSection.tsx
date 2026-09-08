import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import CompteSolidariteQuartier, { type CompteSolidariteQuartierHandle } from './CompteSolidariteQuartier';
import ListeEnfants, { type ListeEnfantsHandle } from './ListeEnfants';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface Props {
  scope: string;
  location: string;
  locationName: string;
  isJournalist?: boolean;
  isAdmin?: boolean;
  /** Non utilisé ici (l'ancien flux de partage d'actualités a été retiré) —
   *  gardé pour ne pas casser les appelants qui le passent encore. */
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
  { scope, location, locationName, isJournalist, isAdmin, hideProjetsButton = false },
  ref
) {
  const soliRef = useRef<CompteSolidariteQuartierHandle>(null);
  const listeRef = useRef<ListeEnfantsHandle>(null);
  useImperativeHandle(ref, () => ({
    openCaisse: () => soliRef.current?.open(),
  }), []);

  // Le quartier a déjà sa propre photo (celle du groupe de chat) — ce logo
  // générique ne concerne que la sous-préfecture, qui n'a pas de chat.
  const showLogoEtListe = scope === 'sous-prefecture';
  const canPublish = !!(isJournalist || isAdmin);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

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

  return (
    <div className="space-y-4">
      {showLogoEtListe && (
        <div className="flex items-center gap-3">
          <label
            className={`relative w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 ${canPublish ? 'cursor-pointer' : ''}`}
            title={canPublish ? `Changer le logo de ${locationName}` : undefined}
          >
            {logoUrl ? (
              <img src={logoUrl.startsWith('http') ? logoUrl : `${API_BASE}${logoUrl}`} alt={`Logo de ${locationName}`} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">🏛️</span>
            )}
            {canPublish && (
              <>
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-xs leading-none opacity-0 hover:opacity-100 transition-opacity">
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
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-lg truncate">{locationName}</p>
          </div>
          <button
            onClick={() => listeRef.current?.open()}
            className="flex-shrink-0 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold px-3 py-2 rounded-full transition-colors"
          >
            👥 Liste
          </button>
        </div>
      )}

      {showLogoEtListe && (
        <ListeEnfants ref={listeRef} scope={scope} location={location} locationName={locationName} childLabel="quartiers" canManage={canPublish} />
      )}

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
                  <p className="text-xs text-slate-400 mt-2">
                    {info.authorName} · {new Date(info.createdAt || info.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default DeveloppementSection;

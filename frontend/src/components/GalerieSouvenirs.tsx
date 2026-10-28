import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/useI18n';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface Souvenir {
  id: string;
  numeroH: string;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  caption?: string | null;
  createdAt: string;
}

// Galerie souvenirs 💎 : n'appartient qu'aux deux amis précieux.
// Chacun ajoute ses photos / vidéos et ne retire que les siennes.
export default function GalerieSouvenirs({ linkId, moi, nomAmi, onClose }: {
  linkId: string;
  moi: string;
  nomAmi: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [souvenirs, setSouvenirs] = useState<Souvenir[]>([]);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState('');
  const [ouvert, setOuvert] = useState<Souvenir | null>(null);
  const fichierRef = useRef<HTMLInputElement>(null);

  const entetes = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/friends/souvenirs?linkId=${encodeURIComponent(linkId)}`, { headers: entetes() });
        const data = await res.json();
        if (annule) return;
        if (data.success) setSouvenirs(data.souvenirs || []);
        else setErreur(data.message || t('amitie.souvenirs.erreur'));
      } catch {
        if (!annule) setErreur(t('amitie.souvenirs.erreur'));
      } finally {
        if (!annule) setChargement(false);
      }
    })();
    return () => { annule = true; };
  }, [linkId]);

  const ajouter = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = '';
    if (!fichier) return;
    setEnvoi(true);
    setErreur('');
    try {
      const form = new FormData();
      form.append('linkId', linkId);
      form.append('media', fichier);
      const res = await fetch(`${API_BASE}/api/friends/souvenirs`, { method: 'POST', headers: entetes(), body: form });
      const data = await res.json();
      if (data.success && data.souvenir) setSouvenirs((s) => [data.souvenir, ...s]);
      else setErreur(data.message || t('amitie.souvenirs.erreur'));
    } catch {
      setErreur(t('amitie.souvenirs.erreur'));
    } finally {
      setEnvoi(false);
    }
  };

  const retirer = async (souvenir: Souvenir) => {
    if (!confirm(t('amitie.souvenirs.retirer_confirm'))) return;
    try {
      const res = await fetch(`${API_BASE}/api/friends/souvenirs/${souvenir.id}`, { method: 'DELETE', headers: entetes() });
      const data = await res.json();
      if (data.success) {
        setSouvenirs((s) => s.filter((x) => x.id !== souvenir.id));
        setOuvert(null);
      } else {
        alert(data.message || t('amitie.souvenirs.erreur'));
      }
    } catch {
      alert(t('amitie.souvenirs.erreur'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg max-h-[90vh] rounded-t-2xl sm:rounded-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 p-4 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-rose-50 rounded-t-2xl">
          <h3 className="font-bold text-gray-900 truncate">🖼️ {nomAmi}</h3>
          <button type="button" onClick={onClose} aria-label={t('amitie.souvenirs.fermer')}
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-white text-gray-600 border border-gray-200">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {chargement ? (
            <div className="flex justify-center py-12">
              <span className="w-8 h-8 rounded-full border-[3px] border-amber-500 border-t-transparent animate-spin" />
            </div>
          ) : souvenirs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">🖼️</div>
              <p className="text-gray-500">{t('amitie.souvenirs.vide')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {souvenirs.map((s) => (
                <button key={s.id} type="button" onClick={() => setOuvert(s)}
                  className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  {s.mediaType === 'video' ? (
                    <>
                      <video src={s.mediaUrl} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center text-white text-2xl drop-shadow">▶</span>
                    </>
                  ) : (
                    <img src={s.mediaUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
          {erreur && <p className="text-sm text-red-600 text-center mt-3">{erreur}</p>}
        </div>

        <div className="p-3 border-t border-gray-100">
          <input ref={fichierRef} type="file" accept="image/*,video/*" className="hidden" onChange={ajouter} />
          <button type="button" onClick={() => fichierRef.current?.click()} disabled={envoi}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
            {envoi ? <span className="w-5 h-5 rounded-full border-[3px] border-white border-t-transparent animate-spin" /> : '➕'}
            {t('amitie.souvenirs.ajouter')}
          </button>
        </div>
      </div>

      {ouvert && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[60] p-4" onClick={(e) => { e.stopPropagation(); setOuvert(null); }}>
          {ouvert.mediaType === 'video' ? (
            <video src={ouvert.mediaUrl} controls autoPlay playsInline className="max-w-full max-h-[75vh] rounded-lg" onClick={(e) => e.stopPropagation()} />
          ) : (
            <img src={ouvert.mediaUrl} alt="" className="max-w-full max-h-[75vh] rounded-lg object-contain" />
          )}
          {ouvert.caption && <p className="text-white text-center mt-3">{ouvert.caption}</p>}
          <p className="text-white/60 text-xs mt-2">{new Date(ouvert.createdAt).toLocaleDateString()}</p>
          {ouvert.numeroH === moi && (
            <button type="button" onClick={(e) => { e.stopPropagation(); retirer(ouvert); }}
              className="mt-4 bg-white/10 text-white border border-white/30 px-4 py-2 rounded-lg text-sm">
              🗑️ {t('amitie.souvenirs.retirer')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

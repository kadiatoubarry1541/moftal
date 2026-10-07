import { useState } from 'react';
import { useI18n } from '../i18n/useI18n';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5002';

const mediaUrl = (url: string) =>
  url.startsWith('http') || url.startsWith('data:') ? url : `${API_BASE}${url}`;

interface Props {
  numeroH: string;
  prenom?: string;
  nomFamille?: string;
  activite1?: string | null;
  vitrinePhoto1?: string | null;
  vitrinePhoto2?: string | null;
  vitrineVideo?: string | null;
  className?: string;
}

/**
 * Petit bouton rond (icône photos) placé à côté du nom (jamais sur la photo) :
 * au clic, montre l'activité + les 2
 * photos + la courte vidéo de la vitrine de profil de la personne. Si les 4
 * éléments sont renseignés, un V tricolore s'affiche dans son coin.
 * Rien n'est affiché si la personne n'a rien mis dans sa vitrine.
 */
export default function ProfileBadge({
  numeroH, prenom, nomFamille, activite1, vitrinePhoto1, vitrinePhoto2, vitrineVideo, className = ''
}: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const isComplete = !!(activite1 && vitrinePhoto1 && vitrinePhoto2 && vitrineVideo);
  const hasAnything = !!(activite1 || vitrinePhoto1 || vitrinePhoto2 || vitrineVideo);
  const gradId = `vBadgeGrad-${numeroH.replace(/[^a-zA-Z0-9]/g, '')}`;

  if (!hasAnything) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        title={t('profile_badge.title')}
        aria-label={t('profile_badge.title')}
        className={`relative inline-flex items-center justify-center w-6 h-6 !min-h-0 !min-w-0 p-0 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm hover:brightness-110 flex-shrink-0 transition ${className}`}
      >
        <svg viewBox="0 0 24 24" width={13} height={13} aria-hidden fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="3" />
          <circle cx="9" cy="10" r="1.6" fill="currentColor" stroke="none" />
          <path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4" />
        </svg>
        {isComplete && (
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white border border-gray-300 flex items-center justify-center">
            <svg viewBox="0 0 24 24" width={9} height={9} aria-hidden>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" />
                  <stop offset="50%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#111827" />
                </linearGradient>
              </defs>
              <path d="M3 4 L12 20 L21 4" fill="none" stroke={`url(#${gradId})`} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gray-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <h3 className="text-white font-bold text-sm truncate">{prenom} {nomFamille}</h3>
              <button onClick={() => setOpen(false)} className="text-white text-2xl leading-none flex-shrink-0 ml-2">×</button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {!hasAnything ? (
                <p className="text-center text-gray-400 text-sm py-8">{t('profile_badge.empty')}</p>
              ) : (
                <>
                  {activite1 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{t('profile_badge.activity_label')}</p>
                      <p className="text-sm text-gray-800">{activite1}</p>
                    </div>
                  )}
                  {(vitrinePhoto1 || vitrinePhoto2) && (
                    <div className="grid grid-cols-2 gap-2">
                      {vitrinePhoto1 && <img src={mediaUrl(vitrinePhoto1)} alt="" className="w-full h-32 object-cover rounded-xl" />}
                      {vitrinePhoto2 && <img src={mediaUrl(vitrinePhoto2)} alt="" className="w-full h-32 object-cover rounded-xl" />}
                    </div>
                  )}
                  {vitrineVideo && (
                    <video src={mediaUrl(vitrineVideo)} controls className="w-full rounded-xl" style={{ maxHeight: 260 }} />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

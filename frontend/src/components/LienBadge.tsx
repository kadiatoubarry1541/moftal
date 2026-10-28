import { useI18n } from '../i18n/useI18n';

// Le lien unique avec une personne, le même partout sur Moftal :
// famille, voisin, ami (connaissance ou 💎 précieux), même activité.
export type Lien = 'famille' | 'voisin' | 'precieux' | 'connaissance' | 'activite';

const LIENS: Record<Lien, { emoji: string; cle: string; couleurs: string }> = {
  famille: { emoji: '🏠', cle: 'lien.famille', couleurs: 'bg-sky-100 text-sky-800' },
  voisin: { emoji: '🏘️', cle: 'lien.voisin', couleurs: 'bg-emerald-100 text-emerald-800' },
  precieux: { emoji: '💎', cle: 'lien.precieux', couleurs: 'bg-amber-100 text-amber-800' },
  connaissance: { emoji: '👥', cle: 'lien.connaissance', couleurs: 'bg-gray-100 text-gray-700' },
  activite: { emoji: '💼', cle: 'lien.activite', couleurs: 'bg-violet-100 text-violet-800' },
};

export default function LienBadge({ lien, className = '' }: { lien?: string | null; className?: string }) {
  const { t } = useI18n();
  const info = lien ? LIENS[lien as Lien] : null;
  if (!info) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none ${info.couleurs} ${className}`}>
      <span aria-hidden>{info.emoji}</span>{t(info.cle)}
    </span>
  );
}

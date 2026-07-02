import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { isAdmin } from '../utils/auth'

type Genre = 'HOMME' | 'FEMME' | 'AUTRE'

type NavItem = {
  id: string
  to: string
  emoji: string
  label: string
  hint: string
}

interface Props {
  user: { genre?: Genre; role?: string; isAdmin?: boolean; numeroH?: string } | null
  variant?: 'bar' | 'grid'
  scope?: 'full' | 'entourage'
  /** hub = page Ma Famille : grille équilibrée (2+2+1), cartes blanches uniformes */
  surface?: 'default' | 'hub'
  /** Si true, pas de bloc « Mon entourage » (la page affiche déjà « Étape 2 ») */
  suppressEntourageHeading?: boolean
}

/** Ligne unique, hauteur maîtrisée — pas de gros bloc vertical */
const TREE_ROW =
  'flex w-full min-h-[52px] items-center gap-3 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-3 py-2.5 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100/90 dark:border-emerald-800 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 sm:min-h-[56px] sm:px-4 sm:py-3'

const ICON_RING: Record<string, string> = {
  parents: 'bg-sky-100 ring-sky-200/80 dark:bg-sky-900/50 dark:ring-sky-700',
  enfants: 'bg-amber-100 ring-amber-200/80 dark:bg-amber-900/40 dark:ring-amber-700',
  mari: 'bg-slate-100 ring-slate-200/80 dark:bg-slate-800 dark:ring-slate-600',
  femme: 'bg-rose-100 ring-rose-200/80 dark:bg-rose-900/40 dark:ring-rose-700',
  amours: 'bg-pink-100 ring-pink-200/80 dark:bg-pink-900/40 dark:ring-pink-700',
  noyau: 'bg-emerald-100 ring-emerald-200/80 dark:bg-emerald-900/40 dark:ring-emerald-700'
}

const CARD_UNIFIED =
  'border border-gray-200 bg-white shadow-sm hover:border-emerald-400 hover:shadow-md dark:border-gray-600 dark:bg-gray-800 dark:hover:border-emerald-500'

const linkBase =
  'flex flex-col items-center justify-center rounded-2xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 active:scale-[0.98]'

function useEntourageItems(user: Props['user']): NavItem[] {
  const genre = String(user?.genre ?? '').trim().toUpperCase()
  const userIsAdmin = user ? isAdmin(user as any) : false
  const showMari = userIsAdmin || genre === 'FEMME'
  const showFemme = userIsAdmin || genre === 'HOMME'

  return [
    { id: 'parents', to: '/famille/parents', emoji: '👨‍👩‍👦', label: 'Parents', hint: 'Mes parents' },
    { id: 'enfants', to: '/famille/enfants', emoji: '👶', label: 'Enfants', hint: 'Mes enfants' },
    ...(showMari
      ? [{ id: 'mari', to: '/famille/mari', emoji: '🤵', label: 'Mon homme', hint: 'Mon conjoint' } as NavItem]
      : []),
    ...(showFemme
      ? [{ id: 'femme', to: '/famille/femmes', emoji: '👰', label: 'Ma femme', hint: 'Ma conjointe' } as NavItem]
      : []),
    { id: 'amours', to: '/famille/mes-amours', emoji: '💕', label: 'Mes amours', hint: 'Mes amours' },
    { id: 'noyau', to: '/famille/noyau', emoji: '🏠', label: 'Mon Noyau', hint: 'Famille restreinte : noyau et livre familial' }
  ]
}

const primaryItems: NavItem[] = [
  {
    id: 'arbre',
    to: '/famille/moi',
    emoji: '🌳',
    label: 'Mon arbre',
    hint: 'Photos, messages et arbre de la famille'
  }
]

function EntourageBalancedGrid({
  items,
  children
}: {
  items: NavItem[]
  children: (item: NavItem) => ReactNode
}) {
  const n = items.length
  if (n === 0) return null
  if (n === 1) {
    return <div className="mx-auto max-w-xs">{children(items[0])}</div>
  }
  if (n % 2 === 1 && n >= 3) {
    const head = items.slice(0, n - 1)
    const last = items[n - 1]
    return (
      <>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">{head.map((item) => <div key={item.id}>{children(item)}</div>)}</div>
        <div className="flex justify-center pt-1">
          <div className="w-full max-w-[min(100%,17.5rem)] sm:w-[calc(50%-0.5rem)]">{children(last)}</div>
        </div>
      </>
    )
  }
  const gridEven =
    n === 4 ? 'grid grid-cols-2 gap-3 sm:gap-4' : 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4'
  return <div className={gridEven}>{items.map((item) => children(item))}</div>
}

export function FamilleQuickNav({
  user,
  variant = 'bar',
  scope = 'full',
  surface = 'default',
  suppressEntourageHeading = false
}: Props) {
  const entourage = useEntourageItems(user)
  const hub = surface === 'hub'

  const renderTreeRow = () => (
    <Link
      to={primaryItems[0].to}
      className={`${TREE_ROW} focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900`}
      title={primaryItems[0].hint}
      aria-label={primaryItems[0].hint}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm ring-1 ring-emerald-200/80 dark:bg-gray-800 dark:ring-emerald-700 sm:h-11 sm:w-11 sm:text-[1.65rem]"
        aria-hidden
      >
        {primaryItems[0].emoji}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-bold leading-tight text-gray-900 dark:text-white sm:text-base">
          {primaryItems[0].label}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-gray-600 dark:text-gray-400">
          Photos · Messages · Arbre
        </span>
      </span>
      <span className="shrink-0 text-xl font-light text-emerald-600 dark:text-emerald-400" aria-hidden>
        ›
      </span>
    </Link>
  )

  const renderEntourageCard = (item: NavItem, compact: boolean) => {
    const ring = ICON_RING[item.id] ?? ICON_RING.amours
    return (
      <Link
        key={item.id}
        to={item.to}
        className={`${linkBase} ${CARD_UNIFIED} ${
          compact ? 'min-h-[92px] px-2 py-2.5 sm:min-h-[100px]' : 'min-h-[96px] px-3 py-3 sm:min-h-[104px]'
        }`}
        title={item.hint}
        aria-label={item.hint}
      >
        <span
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[1.65rem] ring-2 ${ring} sm:h-14 sm:w-14 sm:text-4xl`}
          aria-hidden
        >
          {item.emoji}
        </span>
        <span
          className={`mt-2 text-center font-bold leading-tight text-gray-900 dark:text-white ${compact ? 'text-sm sm:text-base' : 'text-base'}`}
        >
          {item.label}
        </span>
      </Link>
    )
  }

  function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
    return (
      <div className="mb-2 flex items-start gap-2.5 sm:mb-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-lg shadow-sm ring-1 ring-stone-200 dark:bg-gray-800 dark:ring-gray-600 sm:h-10 sm:w-10 sm:text-xl"
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0 pt-0.5">
          <h3 className="text-sm font-bold leading-tight text-gray-900 dark:text-white sm:text-base">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs leading-snug text-gray-600 dark:text-gray-400 sm:text-sm">{subtitle}</p> : null}
        </div>
      </div>
    )
  }

  if (scope === 'entourage') {
    return (
      <div>
        {!suppressEntourageHeading && (
          <SectionHeader
            icon="👥"
            title="Mon entourage"
            subtitle={hub ? 'Une touche = une page' : 'Parents, enfants, couple, amours'}
          />
        )}
        {hub ? (
          <EntourageBalancedGrid items={entourage}>{(item) => renderEntourageCard(item, true)}</EntourageBalancedGrid>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
            {entourage.map((item) => renderEntourageCard(item, true))}
          </div>
        )}
      </div>
    )
  }

  const compact = variant === 'bar'

  if (variant === 'grid') {
    return (
      <div className="space-y-6">
        <div>
          <SectionHeader icon="🌳" title="Mon arbre" subtitle="Galerie, messages, généalogie" />
          {renderTreeRow()}
        </div>
        <div>
          <SectionHeader icon="👥" title="Mon entourage" subtitle="Une touche pour ouvrir chaque page" />
          <div
            className={`grid gap-3 sm:gap-4 ${
              entourage.length <= 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'
            }`}
          >
            {entourage.map((item) => renderEntourageCard(item, false))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>{renderTreeRow()}</div>
      <div>
        <SectionHeader icon="👥" title="Mon entourage" subtitle="Choisir une page" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {entourage.map((item) => renderEntourageCard(item, compact))}
        </div>
      </div>
    </div>
  )
}

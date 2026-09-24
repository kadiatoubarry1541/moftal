import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { isAdmin } from '../../utils/auth'
import { AdCarousel } from '../../components/AdCarousel'
import { useI18n } from '../../i18n/useI18n'
import HeritageTab from './Arbre'
import type { MesAmoursHandle } from './MesAmours'

const AmitieTab     = lazy(() => import('./MesAmours'))
const RecitTab      = lazy(() => import('../HistoireHumanite'))
const SolidariteTab = lazy(() => import('../Solidarite'))

type TabId = 'heritage' | 'amitie' | 'recit' | 'solidarite'

const MENU_ITEMS: { id: TabId; emoji: string; labelKey: string }[] = [
  { id: 'heritage',   emoji: '🌳', labelKey: 'famille.menu.heritage'   },
  { id: 'amitie',     emoji: '💕', labelKey: 'famille.menu.amitie'     },
  { id: 'recit',      emoji: '📜', labelKey: 'famille.menu.recit'      },
  { id: 'solidarite', emoji: '🤝', labelKey: 'famille.menu.solidarite' },
]

const VALID_TAB_IDS = MENU_ITEMS.map(m => m.id)

export default function Famille() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const initialTab = (location.state as { tab?: string } | null)?.tab
  const [activeTab, setActiveTab] = useState<TabId | null>(
    VALID_TAB_IDS.includes(initialTab as TabId) ? (initialTab as TabId) : null
  )
  const [user, setUser]           = useState<any>(null)
  const contentRef                = useRef<HTMLDivElement>(null)
  const amitieRef                 = useRef<MesAmoursHandle>(null)

  useEffect(() => {
    const sessionData = JSON.parse(localStorage.getItem('session_user') || '{}')
    const u = sessionData.userData || sessionData
    if (u?.numeroH) setUser(u)
  }, [])

  const handleSelect = (tab: TabId) => {
    setActiveTab(tab)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    contentRef.current?.scrollTo({ top: 0 })
  }

  // La mairie (mariages) est accessible depuis l'en-tête de l'onglet Héritage —
  // même logique que dans Moi.tsx (qui enveloppe /famille/moi/arbre).
  const goToMairie = () => {
    const session = JSON.parse(localStorage.getItem('session_user') || '{}')
    const u = session.userData || session
    const ville = u?.lieuResidence2 || u?.lieuResidence3 || u?.ville || ''
    const params = new URLSearchParams({ type: 'mairie' })
    if (ville) params.set('city', ville)
    navigate(`/liste-professionnels?${params.toString()}`)
  }

  const current = MENU_ITEMS.find(m => m.id === activeTab)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header (style Espace Gestion) ── */}
      <header style={{ background: '#0f172a', position: 'sticky', top: 0, zIndex: 40, borderBottom: '2px solid #1e293b', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              onClick={() => {
                if (activeTab) {
                  setActiveTab(null)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                } else {
                  navigate('/compte')
                }
              }}
              aria-label={activeTab ? 'Retour aux catégories Famille' : "Retour à l'accueil"}
              style={{ background: 'none', color: 'white', border: 'none', padding: 0, cursor: 'pointer', fontSize: 34, fontWeight: 700, lineHeight: 1, opacity: 1 }}
            >
              ‹
            </button>
            {activeTab && current ? (
              <h1 style={{ color: 'white', fontWeight: 800, fontSize: 16, letterSpacing: '-0.2px', margin: 0 }}>
                {current.emoji} {t(current.labelKey)}
              </h1>
            ) : (
              <h1 style={{ color: 'white', fontWeight: 800, fontSize: 16, letterSpacing: '-0.2px', margin: 0 }}>👨‍👩‍👧‍👦 {t('nav.famille')}</h1>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {activeTab === 'heritage' && (
              <button
                type="button"
                onClick={goToMairie}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors flex-shrink-0"
              >
                🏛️ {t('heritage.tab_mairie')}
              </button>
            )}
            {activeTab === 'amitie' && (
              <>
                <Link
                  to="/famille/inspir"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs font-medium rounded-lg transition-colors border border-yellow-300 flex-shrink-0"
                >
                  🤝 Inspir
                </Link>
                <button
                  type="button"
                  onClick={() => amitieRef.current?.openAddFriend()}
                  aria-label={t('amitie.search_aria')}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors text-base flex-shrink-0"
                >
                  🔍
                </button>
              </>
            )}
            {user && isAdmin(user) && (
              <Link
                to="/famille/admin"
                className="flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-white transition flex-shrink-0"
              >
                👑 {t('famille.admin')}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── Contenu ── */}
      <div ref={contentRef}>
        {activeTab === null ? (
          <div className="grid grid-cols-2 gap-3 p-4 max-w-2xl mx-auto">
            {MENU_ITEMS.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-6 hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm"
              >
                <span className="text-3xl leading-none">{item.emoji}</span>
                <span className="text-sm font-bold text-gray-900 text-center">{t(item.labelKey)}</span>
              </button>
            ))}
          </div>
        ) : null}
        {activeTab === null ? (
          <AdCarousel />
        ) : (
          <Suspense fallback={
            <div className="flex items-center justify-center py-20">
              <div className="h-9 w-9 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            {activeTab === 'heritage'   && <HeritageTab />}
            {activeTab === 'amitie'     && <AmitieTab embedded ref={amitieRef} />}
            {activeTab === 'recit'      && <RecitTab />}
            {activeTab === 'solidarite' && <SolidariteTab />}
          </Suspense>
        )}
      </div>

    </div>
  )
}

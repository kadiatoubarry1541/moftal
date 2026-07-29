import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { isAdmin } from '../../utils/auth'
import HeritageTab from './Arbre'

const AmitieTab     = lazy(() => import('./MesAmours'))
const RecitTab      = lazy(() => import('../HistoireHumanite'))
const SolidariteTab = lazy(() => import('../Solidarite'))

type TabId = 'heritage' | 'amitie' | 'recit' | 'solidarite'

const MENU_ITEMS: { id: TabId; emoji: string; label: string }[] = [
  { id: 'heritage',   emoji: '🌳', label: 'Héritage'   },
  { id: 'amitie',     emoji: '💕', label: 'Amitié'     },
  { id: 'recit',      emoji: '📜', label: 'Récit'      },
  { id: 'solidarite', emoji: '🤝', label: 'Solidarité' },
]

const VALID_TAB_IDS = MENU_ITEMS.map(m => m.id)

export default function Famille() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialTab = (location.state as { tab?: string } | null)?.tab
  const [activeTab, setActiveTab] = useState<TabId | null>(
    VALID_TAB_IDS.includes(initialTab as TabId) ? (initialTab as TabId) : null
  )
  const [user, setUser]           = useState<any>(null)
  const contentRef                = useRef<HTMLDivElement>(null)

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

  const current = MENU_ITEMS.find(m => m.id === activeTab)

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header (style Espace Gestion) ── */}
      <header style={{ background: '#0f172a', position: 'sticky', top: 0, zIndex: 40, borderBottom: '2px solid #1e293b', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              onClick={() => activeTab ? setActiveTab(null) : navigate('/compte')}
              aria-label="Retour"
              style={{ background: 'none', color: 'white', border: 'none', padding: 2, cursor: 'pointer', fontSize: 26, fontWeight: 300, lineHeight: 1, opacity: 0.9 }}
            >
              ‹
            </button>
            <h1 style={{ color: 'white', fontWeight: 800, fontSize: 16, letterSpacing: '-0.2px', margin: 0 }}>👨‍👩‍👧‍👦 Famille</h1>

            {current && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#6ee7b7', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 999, padding: '4px 10px' }}>
                <span>{current.emoji}</span>
                <span>{current.label}</span>
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {user && isAdmin(user) && (
              <Link
                to="/famille/admin"
                className="flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-white transition flex-shrink-0"
              >
                👑 Admin
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
                <span className="text-sm font-bold text-gray-900 text-center">{item.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <Suspense fallback={
            <div className="flex items-center justify-center py-20">
              <div className="h-9 w-9 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            {activeTab === 'heritage'   && <HeritageTab />}
            {activeTab === 'amitie'     && <AmitieTab />}
            {activeTab === 'recit'      && <RecitTab />}
            {activeTab === 'solidarite' && <SolidariteTab />}
          </Suspense>
        )}
      </div>

    </div>
  )
}

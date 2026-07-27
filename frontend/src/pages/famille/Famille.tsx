import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

export default function Famille() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('heritage')
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
              onClick={() => navigate('/compte')}
              aria-label="Retour à l'accueil"
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

          {user && isAdmin(user) && (
            <Link
              to="/famille/admin"
              className="flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-white transition flex-shrink-0"
            >
              👑 Admin
            </Link>
          )}
        </div>

        {/* Les 4 sections de Famille — dans la même barre */}
        <div className="flex" style={{ padding: '0 6px 6px' }}>
          {MENU_ITEMS.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition"
              style={{
                borderRadius: 10,
                background: activeTab === item.id ? '#1a8f1a' : 'rgba(255,255,255,0.06)',
                color: activeTab === item.id ? 'white' : '#94a3b8',
              }}
            >
              <span className={`text-lg transition-transform ${activeTab === item.id ? 'scale-110' : ''}`}>{item.emoji}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* ── Contenu ── */}
      <div ref={contentRef}>
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
      </div>

    </div>
  )
}

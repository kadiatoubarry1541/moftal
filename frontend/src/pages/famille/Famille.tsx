import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isAdmin } from '../../utils/auth'

const HeritageTab   = lazy(() => import('./Arbre'))
const AmitieTab     = lazy(() => import('./MesAmours'))
const RecitTab      = lazy(() => import('../HistoireHumanite'))
const SolidariteTab = lazy(() => import('../Solidarite'))

type TabId = 'heritage' | 'amitie' | 'recit' | 'solidarite'

const TABS: { id: TabId; emoji: string; label: string }[] = [
  { id: 'heritage',   emoji: '🌳', label: 'Héritage'   },
  { id: 'amitie',     emoji: '💕', label: 'Amitié'     },
  { id: 'recit',      emoji: '📜', label: 'Récit'      },
  { id: 'solidarite', emoji: '🤝', label: 'Solidarité' },
]

export default function Famille() {
  const [activeTab, setActiveTab] = useState<TabId>('heritage')
  const [user, setUser] = useState<any>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const sessionData = JSON.parse(localStorage.getItem('session_user') || '{}')
    const u = sessionData.userData || sessionData
    if (u?.numeroH) setUser(u)
  }, [])

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab)
    contentRef.current?.scrollTo({ top: 0 })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Barre de navigation Famille ── */}
      <div className="shadow-md">

        {/* Header vert */}
        <div className="flex items-center gap-3 bg-emerald-600 px-4 py-3 text-white">
          <span className="text-2xl leading-none">👨‍👩‍👧</span>
          <div className="flex-1">
            <h1 className="text-base font-bold leading-tight">Ma Famille</h1>
          </div>
          {user && isAdmin(user) && (
            <Link
              to="/famille/admin"
              className="flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-white transition"
            >
              👑 Admin
            </Link>
          )}
        </div>

        {/* Onglets */}
        <div className="grid grid-cols-4 bg-white border-b-2 border-gray-100">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-3 transition-all border-b-2 -mb-[2px] ${
                activeTab === tab.id
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl leading-none">{tab.emoji}</span>
              <span className={`text-[9px] leading-tight ${activeTab === tab.id ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

      </div>

      {/* ── Contenu de l'onglet actif ── */}
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

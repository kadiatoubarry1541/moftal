import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
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

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 bg-white border-b border-gray-100">

        {/* Titre + section active */}
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Famille</h1>
          {current && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-full px-3 py-1.5">
              <span className="text-sm">{current.emoji}</span>
              <span>{current.label}</span>
            </span>
          )}
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

      {/* ── Contenu ── */}
      <div ref={contentRef} style={{ paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px) + 16px)' }}>
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

      {/* ── Barre fixe en bas : les 4 sections de Famille ── */}
      <div
        className="fixed left-0 right-0 bottom-0 z-40 bg-white border-t border-gray-200 flex shadow-[0_-6px_16px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {MENU_ITEMS.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelect(item.id)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition ${
              activeTab === item.id ? 'text-emerald-600' : 'text-gray-400'
            }`}
          >
            <span className={`text-lg transition-transform ${activeTab === item.id ? 'scale-110' : ''}`}>{item.emoji}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

    </div>
  )
}

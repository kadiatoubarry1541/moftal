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
  const [menuOpen, setMenuOpen]   = useState(false)
  const [user, setUser]           = useState<any>(null)
  const contentRef                = useRef<HTMLDivElement>(null)
  const menuRef                   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sessionData = JSON.parse(localStorage.getItem('session_user') || '{}')
    const u = sessionData.userData || sessionData
    if (u?.numeroH) setUser(u)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handleSelect = (tab: TabId) => {
    setActiveTab(tab)
    setMenuOpen(false)
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
          {activeTab !== 'heritage' && current && (
            <span className="text-sm text-emerald-600 font-semibold">
              · {current.emoji} {current.label}
            </span>
          )}
        </div>

        {/* Boutons droite */}
        <div className="flex items-center gap-2">

          {user && isAdmin(user) && (
            <Link
              to="/famille/admin"
              className="flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-white transition"
            >
              👑 Admin
            </Link>
          )}

          {/* ⋮ Menu 3 points */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(v => !v)}
              className="flex flex-col items-center justify-center gap-[4px] p-2.5 rounded-full hover:bg-gray-100 active:bg-gray-200 transition"
              aria-label="Menu"
            >
              <span className="block w-[5px] h-[5px] rounded-full bg-gray-600" />
              <span className="block w-[5px] h-[5px] rounded-full bg-gray-600" />
              <span className="block w-[5px] h-[5px] rounded-full bg-gray-600" />
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div className="absolute right-0 top-12 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 min-w-[180px]">
                {MENU_ITEMS.map((item, i) => (
                  <div key={item.id}>
                    {i === 1 && <div className="border-t border-gray-100 my-1" />}
                    <button
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition ${
                        activeTab === item.id
                          ? 'text-emerald-600 font-bold bg-emerald-50'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-lg">{item.emoji}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {activeTab === item.id && (
                        <span className="text-emerald-500 text-base">✓</span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

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

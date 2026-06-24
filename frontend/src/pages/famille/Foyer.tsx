import { lazy, Suspense, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ParentsTab from './Parents'

const EnfantsTab    = lazy(() => import('./Enfants'))
const PartenaireTab = lazy(() => import('./Partenaire'))

type TabId = 'parents' | 'enfants' | 'femmes' | 'mari'

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'parents', label: 'Parents',   emoji: '👨‍👩‍👦' },
  { id: 'enfants', label: 'Enfants',   emoji: '👶'    },
  { id: 'femmes',  label: 'Ma femme',  emoji: '👰'    },
  { id: 'mari',    label: 'Mon homme', emoji: '🤵'    },
]

export default function Foyer() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('parents')

  const active = TABS.find(t => t.id === activeTab)!

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 dark:bg-gray-900">

      {/* Bouton retour */}
      <div className="px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={() => navigate('/famille')}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg transition-colors text-sm border border-gray-200 dark:border-gray-600"
        >
          ← Famille
        </button>
      </div>

      {/* En-tête */}
      <div className="mx-4 mb-0 flex items-center gap-3 rounded-2xl bg-emerald-600 px-4 py-3 text-white shadow-md">
        <span className="text-3xl leading-none">🏠</span>
        <div>
          <h1 className="text-base font-bold leading-tight">Foyer</h1>
          <p className="text-xs text-emerald-100 mt-0.5">Parents · Enfants · Conjoint</p>
        </div>
      </div>

      {/* Barre d'onglets — sticky, toujours visible */}
      <div className="sticky top-[104px] z-20 bg-white dark:bg-gray-900 shadow-sm">
        <div className="grid grid-cols-4 border-b-2 border-gray-100 dark:border-gray-800">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center py-2.5 gap-0.5 transition-all ${
                  isActive
                    ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {/* Barre active en haut */}
                {isActive && (
                  <span className="absolute top-0 left-2 right-2 h-[3px] rounded-b-full bg-gray-900 dark:bg-white" />
                )}
                <span className={`text-xl leading-none ${isActive ? '' : 'opacity-50'}`}>
                  {tab.emoji}
                </span>
                <span className={`text-[10px] ${isActive ? 'font-black' : 'font-semibold'}`}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Bandeau indiquant la section ouverte */}
        <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-900 dark:bg-gray-950 text-white text-xs font-semibold">
          <span>{active.emoji}</span>
          <span>{active.label}</span>
          <span className="ml-auto opacity-70">section ouverte</span>
        </div>
      </div>

      {/* Contenu de l'onglet */}
      <Suspense fallback={
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <div key={activeTab}>
          {activeTab === 'parents' && <ParentsTab />}
          {activeTab === 'enfants' && <EnfantsTab />}
          {activeTab === 'femmes'  && <PartenaireTab />}
          {activeTab === 'mari'    && <PartenaireTab />}
        </div>
      </Suspense>
    </div>
  )
}

import { useState } from 'react'
import { useTraduction } from '../i18n/traduction'

interface FoiProps {
  userData: any
}

export function Foi({ userData }: FoiProps) {
  const [activeTab, setActiveTab] = useState('prayers')
  const { tr } = useTraduction()

  const tabs = [
    { id: 'prayers', label: 'Prières', icon: '🕌' },
    { id: 'verses', label: 'Versets', icon: '📖' },
    { id: 'guidance', label: 'Guidance', icon: '🌟' },
    { id: 'community', label: 'Communauté', icon: '👥' }
  ]

  return (
    <div className="p-5 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h3 className="text-purple-600 mb-2 text-3xl font-bold">🕌 {tr("Foi de {prenom} {nom}", { prenom: userData.prenom, nom: userData.nomFamille })}</h3>
        <p className="text-purple-400 text-lg">NumeroH: {userData.numeroH}</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tr(tab.label)}</span>
          </button>
        ))}
      </div>

      <div className="foi-content">
        {activeTab === 'prayers' && (
          <div className="prayers-tab">
            <h4>🕌 {tr("Prières")}</h4>
            <div className="prayers-grid">
              <div className="prayer-card">
                <h5>{tr("Prière du Matin")}</h5>
                <p>{tr("Bénédictions pour commencer la journée")}</p>
              </div>
              <div className="prayer-card">
                <h5>{tr("Prière du Soir")}</h5>
                <p>{tr("Remerciements pour la journée")}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'verses' && (
          <div className="verses-tab">
            <h4>📖 {tr("Versets Inspirants")}</h4>
            <div className="verses-list">
              <div className="verse-item">
                <p>"{tr("La patience est la clé de toutes les bénédictions")}"</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'guidance' && (
          <div className="guidance-tab">
            <h4>🌟 {tr("Guidance Spirituelle")}</h4>
            <div className="guidance-content">
              <p>{tr("Conseils spirituels et guidance")}</p>
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="community-tab">
            <h4>👥 {tr("Communauté de Foi")}</h4>
            <div className="community-content">
              <p>{tr("Rejoignez la communauté spirituelle")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}









































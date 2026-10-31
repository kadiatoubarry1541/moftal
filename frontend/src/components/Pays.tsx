import { useState } from 'react'
import './Pays.css'
import { useTraduction } from '../i18n/traduction'
import type { UserData } from '../utils/auth'

interface PaysProps {
  /** Régions choisies dans le profil (region1 … region5) */
  userData: UserData & Partial<Record<"region1" | "region2" | "region3" | "region4" | "region5", string>>
}

export function Pays({ userData }: PaysProps) {
  const { tr } = useTraduction()
  const [activeTab, setActiveTab] = useState('monpays')

  // Récupérer le pays et les régions de Guinée depuis les données utilisateur
  const paysPrincipal = userData.pays || 'Guinée'
  const regions = [
    userData.region1,
    userData.region2,
    userData.region3,
    userData.region4,
    userData.region5
  ].filter(Boolean)

  // Les 8 régions administratives de Guinée
  const regionsGuinee = [
    { nom: 'Boké', capitale: 'Boké', icon: '🏛️' },
    { nom: 'Conakry', capitale: 'Conakry', icon: '🏙️' },
    { nom: 'Faranah', capitale: 'Faranah', icon: '🌾' },
    { nom: 'Kankan', capitale: 'Kankan', icon: '🕌' },
    { nom: 'Kindia', capitale: 'Kindia', icon: '🌳' },
    { nom: 'Labé', capitale: 'Labé', icon: '⛰️' },
    { nom: 'Mamou', capitale: 'Mamou', icon: '🏔️' },
    { nom: 'Nzérékoré', capitale: 'Nzérékoré', icon: '🌴' }
  ]

  const tabs = [
    { id: 'monpays', label: 'Mon Pays & Régions', icon: '⭐' },
    { id: 'guinea', label: 'Guinée', icon: '🇬🇳' },
    { id: 'africa', label: 'Afrique', icon: '🌍' },
    { id: 'world', label: 'Monde', icon: '🌎' },
    { id: 'culture', label: 'Culture', icon: '🎭' }
  ]

  return (
    <div className="pays-page">
      <div className="pays-header">
        <h3>🌍 {tr("Pays de {prenom} {nom}", { prenom: userData.prenom, nom: userData.nomFamille })}</h3>
        <p className="numero-h">NumeroH: {userData.numeroH}</p>
      </div>

      <div className="pays-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tr(tab.label)}</span>
          </button>
        ))}
      </div>

      <div className="pays-content">
        {activeTab === 'monpays' && (
          <div className="monpays-tab">
            <h4 style={{ fontSize: '2rem', marginBottom: '2rem', color: '#2c3e50' }}>
              ⭐ {tr("Mon Pays & Mes Régions")}
            </h4>

            {/* Section Pays */}
            <div style={{ 
              backgroundColor: '#e8f5e9', 
              borderRadius: '15px', 
              padding: '2rem', 
              marginBottom: '3rem',
              border: '3px solid #4caf50'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🇬🇳</div>
                <h5 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2e7d32', marginBottom: '1rem' }}>
                  {tr(paysPrincipal)}
                </h5>
                <p style={{ fontSize: '1.1rem', color: '#555' }}>
                  {tr("Mon pays d'origine choisi lors de l'inscription")}
                </p>
              </div>
            </div>

            {/* Section Régions */}
            <div>
              <h5 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2c3e50', marginBottom: '1.5rem' }}>
                📍 {tr("Mes 5 Régions de Guinée")}
              </h5>
              
              {regions.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '3rem',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '10px',
                  border: '2px dashed #ddd'
                }}>
                  <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🗺️</div>
                  <p style={{ color: '#777', fontSize: '1.1rem' }}>
                    {tr("Aucune région n'a été sélectionnée lors de votre inscription.")}
                  </p>
                </div>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '1.5rem',
                  marginBottom: '2rem'
                }}>
                  {regions.map((region, index) => {
                    const regionInfo = regionsGuinee.find(r => r.nom === region)
                    return (
                      <div
                        key={index}
                        style={{
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          border: '2px solid',
                          borderColor: ['#3498db', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6'][index] || '#95a5a6',
                          textAlign: 'center',
                          transition: 'transform 0.3s',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                      >
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                          {regionInfo?.icon || '📍'}
                        </div>
                        <h6 style={{ 
                          fontSize: '1.3rem', 
                          fontWeight: 'bold', 
                          marginBottom: '0.5rem',
                          color: ['#3498db', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6'][index] || '#95a5a6'
                        }}>
                          {region}
                        </h6>
                        {regionInfo && (
                          <p style={{ fontSize: '0.9rem', color: '#7f8c8d' }}>
                            {tr("Capitale:")} {regionInfo.capitale}
                          </p>
                        )}
                        <div style={{ 
                          marginTop: '0.75rem', 
                          paddingTop: '0.75rem', 
                          borderTop: '1px solid #eee',
                          fontSize: '0.85rem',
                          color: '#95a5a6'
                        }}>
                          {tr("Région {n}", { n: index + 1 })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Informations supplémentaires */}
              <div style={{ 
                backgroundColor: '#fff3cd', 
                borderRadius: '10px', 
                padding: '1.5rem',
                border: '2px solid #ffc107',
                marginTop: '2rem'
              }}>
                <h6 style={{ color: '#856404', fontWeight: 'bold', marginBottom: '1rem', fontSize: '1.1rem' }}>
                  ℹ️ {tr("À propos de vos régions")}
                </h6>
                <p style={{ color: '#856404', lineHeight: '1.6' }}>
                  {tr("Ces régions ont été sélectionnées lors de votre inscription. Elles représentent les zones géographiques de Guinée avec lesquelles vous avez un lien (naissance, résidence, famille, etc.). Cela vous permet de vous connecter avec d'autres membres de ces régions.")}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'guinea' && (
          <div className="guinea-tab">
            <h4>🇬🇳 {tr("Guinée - Les 8 Régions Administratives")}</h4>
            <div style={{ marginTop: '2rem' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '1.5rem' 
              }}>
                {regionsGuinee.map((region, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      border: '1px solid #e0e0e0',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                      {region.icon}
                    </div>
                    <h5 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#2c3e50', marginBottom: '0.5rem' }}>
                      {region.nom}
                    </h5>
                    <p style={{ color: '#7f8c8d' }}>
                      {tr("Capitale:")} {region.capitale}
                    </p>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#e8f5e9', borderRadius: '10px' }}>
                <h5 style={{ color: '#2e7d32', marginBottom: '1rem' }}>🇬🇳 {tr("Informations sur la Guinée")}</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <strong>{tr("Capitale:")}</strong> Conakry
                  </div>
                  <div>
                    <strong>{tr("Population:")}</strong> {tr("~13.5 millions")}
                  </div>
                  <div>
                    <strong>{tr("Superficie:")}</strong> 245 857 km²
                  </div>
                  <div>
                    <strong>{tr("Langues:")}</strong> {tr("Français (officiel), Pular, Malinké, Soussou")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'africa' && (
          <div className="africa-tab">
            <h4>🌍 {tr("Afrique")}</h4>
            <div className="africa-content" style={{ marginTop: '2rem' }}>
              <p style={{ fontSize: '1.1rem', color: '#555', marginBottom: '2rem' }}>
                {tr("Découvrez les pays africains et leurs richesses culturelles")}
              </p>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: '1rem' 
              }}>
                {['Sénégal', 'Mali', 'Côte d\'Ivoire', 'Liberia', 'Sierra Leone', 'Guinée-Bissau'].map((pays, i) => (
                  <div key={i} style={{ 
                    padding: '1rem', 
                    backgroundColor: '#f5f5f5', 
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: '1px solid #ddd'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌍</div>
                    <strong>{tr(pays)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'world' && (
          <div className="world-tab">
            <h4>🌎 {tr("Monde")}</h4>
            <div className="world-content" style={{ marginTop: '2rem' }}>
              <p style={{ fontSize: '1.1rem', color: '#555' }}>
                {tr("Exploration mondiale - Connectez-vous avec la diaspora guinéenne à travers le monde")}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'culture' && (
          <div className="culture-tab">
            <h4>🎭 {tr("Culture Guinéenne")}</h4>
            <div className="culture-content" style={{ marginTop: '2rem' }}>
              <p style={{ fontSize: '1.1rem', color: '#555', marginBottom: '2rem' }}>
                {tr("Traditions, musiques et cultures de Guinée")}
              </p>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ padding: '1.5rem', backgroundColor: '#fff3cd', borderRadius: '10px' }}>
                  <h6 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>🎵 {tr("Musique")}</h6>
                  <p>{tr("Balafon, Kora, Djembé - Instruments traditionnels")}</p>
                </div>
                <div style={{ padding: '1.5rem', backgroundColor: '#d1ecf1', borderRadius: '10px' }}>
                  <h6 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>🍲 {tr("Cuisine")}</h6>
                  <p>{tr("Riz au gras, Fouti, Tô, Sauce feuille")}</p>
                </div>
                <div style={{ padding: '1.5rem', backgroundColor: '#f8d7da', borderRadius: '10px' }}>
                  <h6 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>👗 {tr("Traditions")}</h6>
                  <p>{tr("Boubou, Cérémonies traditionnelles, Palabres")}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



















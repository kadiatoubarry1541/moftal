import { useState, useEffect } from 'react'
import { useTraduction } from '../i18n/traduction'

export function DebugInfo() {
  const { tr } = useTraduction()
  const [debugData, setDebugData] = useState<any>(null)

  useEffect(() => {
    const loadDebugData = () => {
      const data = {
        vivant_video: localStorage.getItem('vivant_video'),
        defunt_video: localStorage.getItem('defunt_video'),
        defunt_written: localStorage.getItem('defunt_written'),
        dernier_vivant: localStorage.getItem('dernier_vivant'),
        dernier_defunt: localStorage.getItem('dernier_defunt'),
        session_user: localStorage.getItem('session_user'),
        numeroH_counter: localStorage.getItem('numeroH_counter')
      }
      setDebugData(data)
    }

    loadDebugData()
    const interval = setInterval(loadDebugData, 1000)
    return () => clearInterval(interval)
  }, [])

  const clearAllData = () => {
    if (confirm(tr('Êtes-vous sûr de vouloir effacer toutes les données ?'))) {
      localStorage.clear()
      setDebugData(null)
    }
  }

  if (!debugData) return null

  return (
    <div className="debug-info">
      <h4>{tr("🔍 Debug - Données LocalStorage")}</h4>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={clearAllData} style={{ 
          background: '#dc3545', 
          color: 'white', 
          border: 'none', 
          padding: '5px 10px', 
          borderRadius: '4px',
          cursor: 'pointer'
        }}>
          {tr("Effacer toutes les données")}
        </button>
      </div>
      
      {Object.entries(debugData).map(([key, value]) => (
        <div key={key} style={{ marginBottom: '8px' }}>
          <strong>{key}:</strong>
          {value ? (
            <pre style={{ 
              background: '#e9ecef', 
              padding: '5px', 
              borderRadius: '3px',
              margin: '5px 0',
              fontSize: '0.7rem',
              overflow: 'auto',
              maxHeight: '100px'
            }}>
              {JSON.stringify(JSON.parse(value as string), null, 2)}
            </pre>
          ) : (
            <span style={{ color: '#6c757d' }}>{tr("Aucune donnée")}</span>
          )}
        </div>
      ))}
    </div>
  )
}

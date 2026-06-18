/**
 * Générateur de NumeroH unique et fixe
 * Vérifie d'abord l'existence dans la base de données avant de générer un nouveau numéro
 */
import { config } from '../config/api'

const API_BASE_URL = config.API_BASE_URL

/**
 * Trouve le dernier numéro utilisé pour un préfixe donné
 * Vérifie d'abord dans la base de données, puis dans localStorage
 */
export async function findLastNumeroForPrefix(prefix: string): Promise<number> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 1000) // 1 s max pour ne pas bloquer l'inscription

  try {
    // Essayer de récupérer depuis le backend
    const response = await fetch(`${API_BASE_URL}/auth/last-numero?prefix=${encodeURIComponent(prefix)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.lastNumber) {
        return data.lastNumber
      }
    }
  } catch (error) {
    // Backend indisponible, utiliser localStorage
    console.warn('Backend indisponible pour vérifier le dernier numéro, utilisation de localStorage')
  } finally {
    clearTimeout(timeoutId)
  }
  
  // Fallback: chercher dans localStorage tous les NumeroH existants
  const searchKeys = [
    'dernier_vivant',
    'vivant_written',
    'vivant_video',
    'defunt_video',
    'defunt_written',
    'dernier_defunt',
    'session_user'
  ]
  
  let maxNumber = 0
  
  for (const key of searchKeys) {
    const raw = localStorage.getItem(key)
    if (raw) {
      try {
        const data = JSON.parse(raw)
        const numeroH = data.numeroH || data.numeroHD || data.userData?.numeroH || data.userData?.numeroHD
        
        if (numeroH && numeroH.startsWith(prefix)) {
          // Extraire le numéro à la fin (après l'espace)
          const parts = numeroH.split(' ')
          if (parts.length > 1) {
            const number = parseInt(parts[parts.length - 1], 10)
            if (!isNaN(number) && number > maxNumber) {
              maxNumber = number
            }
          }
        }
      } catch (e) {
        // Ignore les erreurs de parsing
      }
    }
  }
  
  // Vérifier aussi dans tous les localStorage items qui pourraient contenir des NumeroH
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.includes('vivant') || key.includes('defunt') || key.includes('compte'))) {
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          const data = JSON.parse(raw)
          const numeroH = data.numeroH || data.numeroHD
          
          if (numeroH && numeroH.startsWith(prefix)) {
            const parts = numeroH.split(' ')
            if (parts.length > 1) {
              const number = parseInt(parts[parts.length - 1], 10)
              if (!isNaN(number) && number > maxNumber) {
                maxNumber = number
              }
            }
          }
        } catch (e) {
          // Ignore
        }
      }
    }
  }
  
  return maxNumber
}

/**
 * Génère un NumeroH unique et fixe pour un préfixe donné
 * Vérifie d'abord l'existence avant de générer un nouveau numéro
 */
export async function generateUniqueNumeroH(prefix: string): Promise<string> {
  // Trouver le dernier numéro utilisé pour ce préfixe
  const lastNumber = await findLastNumeroForPrefix(prefix)
  
  // Le prochain numéro unique
  const nextNumber = lastNumber + 1
  
  // Vérifier que ce NumeroH n'existe pas déjà (double vérification)
  const proposedNumeroH = `${prefix} ${nextNumber}`
  
  // Vérifier dans localStorage une dernière fois
  const searchKeys = [
    'dernier_vivant',
    'vivant_written',
    'vivant_video',
    'defunt_video',
    'defunt_written',
    'dernier_defunt',
    'session_user'
  ]
  
  for (const key of searchKeys) {
    const raw = localStorage.getItem(key)
    if (raw) {
      try {
        const data = JSON.parse(raw)
        const numeroH = data.numeroH || data.numeroHD || data.userData?.numeroH || data.userData?.numeroHD
        
        if (numeroH === proposedNumeroH) {
          // Ce NumeroH existe déjà, utiliser le suivant
          return `${prefix} ${nextNumber + 1}`
        }
      } catch (e) {
        // Ignore
      }
    }
  }
  
  return proposedNumeroH
}


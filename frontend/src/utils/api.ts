// En dev : proxy Vite (/api → localhost:7777 via vite.config.ts)
// En prod : VITE_API_URL défini dans .env.production
const API_BASE_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL + '/api'
  : '/api'

export interface User {
  numeroH: string
  prenom: string
  nomFamille: string
  password: string
  email?: string
  genre?: string
  dateNaissance?: string
  generation?: string
  type?: 'vivant' | 'defunt'
  
  // Activités professionnelles
  activite1?: string
  activite2?: string
  activite3?: string
  
  // Nouveaux champs de lieu de résidence
  lieuResidence1?: string
  lieuResidence2?: string
  lieuResidence3?: string
  
  [key: string]: any
}

export const api = {
  // Enregistrer un utilisateur vivant (vidéo + photo → payload lourd, timeout long)
  async registerLiving(userData: User) {
    const controller = new AbortController()
    const timeoutMs = 90000 // 90 s pour permettre l'upload vidéo + photo en base64
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          type: 'vivant'
        }),
        signal: controller.signal
      })
      
      if (!response.ok) {
        let errorMessage = `Erreur HTTP: ${response.status}`
        let errors: Array<{ path: string; msg: string }> | undefined
        try {
          const errorData = await response.json()
          if (errorData?.message) errorMessage = errorData.message
          if (Array.isArray(errorData?.errors)) errors = errorData.errors
        } catch {
          // ignore parse error
        }
        return { success: false, user: null, message: errorMessage, errors }
      }
      
      const result = await response.json()
      
      const userSafe = { ...result.user }

      localStorage.setItem('dernier_vivant', JSON.stringify(userSafe))

      if (result.token) {
        localStorage.setItem('token', result.token)
      }

      return { ...result, user: userSafe }
    } catch (error: any) {
      console.error('Erreur enregistrement vivant:', error)
      const isTimeout = error?.name === 'AbortError'
      return {
        success: false,
        user: null,
        message: isTimeout
          ? "L'envoi a pris trop de temps (vidéo ou photo trop lourde). Réessayez ou vérifiez votre connexion."
          : "Le serveur est indisponible ou inaccessible. Vérifiez que le backend tourne sur " + (API_BASE_URL.replace(/\/api\/?$/, '')) + " et réessayez."
      }
    } finally {
      clearTimeout(timeoutId)
    }
  },

  // Enregistrer un utilisateur défunt
  async registerDeceased(userData: User) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          type: 'defunt',
          isDeceased: true,
          numeroH: userData.numeroHD || userData.numeroH,
          prenom: userData.prenom || 'Défunt',
          nomFamille: userData.nom || userData.nomFamille || 'Inconnu',
          email: userData.email || `${userData.numeroHD || userData.numeroH}@defunt.genealogie`,
          password: crypto.randomUUID()
        })
      })

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }

      const result = await response.json()

      return { ...result, user: { ...result.user } }
    } catch (error) {
      console.error('Erreur enregistrement défunt:', error)
      return {
        success: false,
        user: null,
        message:
          "Le serveur est indisponible ou trop lent. L'enregistrement du défunt n'a pas été effectué. Veuillez réessayer plus tard."
      }
    }
  },

  // Normalise le NumeroH : espaces et lettre O remplacée par chiffre 0 (évite erreur de saisie)
  normalizeNumeroH(numeroH: string): string {
    return numeroH
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/O/g, '0')
      .replace(/o/g, '0')
  },

  async login(numeroH: string, password: string) {
    const normalizedNumeroH = this.normalizeNumeroH(numeroH)
    // En dev : 10s (serveur local, doit répondre immédiatement)
    // En prod : 65s (démarrage à froid Render ~50s)
    const TIMEOUT_MS = import.meta.env.DEV ? 10000 : 65000

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    const loginUrl = `${API_BASE_URL}/auth/login`
    console.log('[LOGIN] URL:', loginUrl, '| DEV:', import.meta.env.DEV)
    try {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroH: normalizedNumeroH, password }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return { success: false, message: errorData.message || 'Identifiants incorrects.' }
      }

      const result = await response.json()

      if (result.success) {
        // Stocker seulement les champs essentiels (évite QuotaExceededError sur gros comptes)
        const userSession = {
          numeroH: result.user.numeroH,
          prenom: result.user.prenom,
          nomFamille: result.user.nomFamille,
          genre: result.user.genre,
          generation: result.user.generation,
          type: result.user.type,
          role: result.user.role,
          isActive: result.user.isActive,
          isVerified: result.user.isVerified,
          wallet: result.user.wallet,
          walletCurrency: result.user.walletCurrency,
          statutSocial: result.user.statutSocial,
          lieuResidence1: result.user.lieuResidence1,
          treeVisibility: result.user.treeVisibility,
        }
        // Supprimer uniquement les anciennes données de session (pas les préférences)
        localStorage.removeItem('session_user')
        localStorage.removeItem('dernier_vivant')
        localStorage.removeItem('vivant_video')
        localStorage.removeItem('vivant_written')
        localStorage.setItem('session_user', JSON.stringify({
          numeroH: normalizedNumeroH,
          userData: { ...userSession },
          token: result.token
        }))
        localStorage.setItem('token', result.token ?? '')
        return result
      } else {
        return {
          success: false,
          message: result.message || 'NumeroH ou mot de passe incorrect.',
          numeroHExists: result.numeroHExists
        }
      }
    } catch (error: any) {
      clearTimeout(timeoutId)
      console.error('[LOGIN] Erreur fetch:', error?.name, error?.message)
      const isAbort = error?.name === 'AbortError'
      return {
        success: false,
        networkError: true,
        message: isAbort
          ? 'Connexion trop lente. Vérifiez votre connexion et réessayez.'
          : 'Serveur momentanément indisponible. Veuillez réessayer dans quelques instants.'
      }
    }
  },

  // Vérifier si le backend est disponible
  async checkBackendHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`)
      return response.ok
    } catch (error) {
      return false
    }
  },

  // Mot de passe oublié : vérifier identité (NumeroH + NumeroH parent + code arbre familial)
  async forgotPasswordVerify(numeroH: string, parentNumeroH: string, familyCode: string) {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numeroH, parentNumeroH, familyCode })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { success: false, message: data.message || 'Vérification impossible.' }
    }
    return { success: true, otpToken: data.otpToken, emailSent: data.emailSent, maskedEmail: data.maskedEmail }
  },

  // Mot de passe oublié : vérifier le code OTP reçu par email
  async forgotPasswordVerifyCode(otpToken: string, code: string) {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otpToken, code })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { success: false, message: data.message || 'Code incorrect.' }
    }
    return { success: true, token: data.token }
  },

  // Mot de passe oublié : définir le nouveau mot de passe (avec token)
  async forgotPasswordReset(token: string, newPassword: string) {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { success: false, message: data.message || 'Réinitialisation impossible.' }
    }
    return { success: true, message: data.message }
  },

  // Supprimer son propre compte (mot de passe requis)
  async deleteAccount(password: string) {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}/auth/account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ password })
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      return { success: false, message: data.message || 'Erreur lors de la suppression du compte' }
    }
    return { success: true, message: data.message }
  }
}

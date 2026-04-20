// URL du backend. En prod, pointe vers Render ; en dev, vers localhost:5002.
// La variable VITE_API_URL est définie dans .env (dev) et .env.production (prod).
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5002') + '/api'

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
      
      // ⚠️ IMPORTANT : Le backend retourne l'utilisateur SANS le mot de passe (sécurité)
      // On doit fusionner avec les données originales pour garder le mot de passe
      // pour l'authentification locale (fallback)
      const userDataWithPassword = {
        ...result.user,
        password: userData.password // Garder le mot de passe original pour le fallback localStorage
      }
      
      // Sauvegarder en localStorage comme backup avec le mot de passe
      localStorage.setItem('dernier_vivant', JSON.stringify(userDataWithPassword))
      
      // Sauvegarder le token JWT si disponible
      if (result.token) {
        localStorage.setItem('token', result.token)
      }
      
      return { ...result, user: userDataWithPassword }
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
      // Pour les défunts, utiliser un mot de passe par défaut
      const defuntPassword = 'defunt123'
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...userData,
          type: 'defunt',
          isDeceased: true,
          // Adapter les champs pour la compatibilité backend
          numeroH: userData.numeroHD || userData.numeroH,
          prenom: userData.prenom || 'Défunt',
          nomFamille: userData.nom || userData.nomFamille || 'Inconnu',
          email: userData.email || `${userData.numeroHD || userData.numeroH}@defunt.genealogie`,
          password: defuntPassword
        })
      })
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`)
      }
      
      const result = await response.json()
      
      // ⚠️ IMPORTANT : Le backend retourne l'utilisateur SANS le mot de passe
      // On garde le mot de passe pour l'authentification locale
      const userDataWithPassword = {
        ...result.user,
        password: defuntPassword // Garder le mot de passe si besoin côté client
      }
      
      return { ...result, user: userDataWithPassword }
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

  // Connexion utilisateur - Version optimisée et rapide
  async login(numeroH: string, password: string) {
    const normalizedNumeroH = this.normalizeNumeroH(numeroH)
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ numeroH: normalizedNumeroH, password })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const message = errorData.message || 'Erreur de connexion'
        return { success: false, message }
      }
      
      const result = await response.json()
      
      if (result.success) {
        // Sauvegarder la session immédiatement
        localStorage.setItem('session_user', JSON.stringify({
          numeroH: normalizedNumeroH,
          userData: result.user,
          token: result.token
        }))
        // Stocker le token séparément pour les appels API (EditProfileModal, etc.)
        if (result.token) {
          localStorage.setItem('token', result.token)
        }
        return result
      } else {
        return {
          success: false,
          message: result.message || 'NumeroH ou mot de passe incorrect',
          numeroHExists: result.numeroHExists
        }
      }
    } catch (error) {
      console.error('Erreur connexion:', error)
      return {
        success: false,
        message:
          "Le serveur est indisponible ou trop lent. La connexion n'a pas pu être effectuée. Veuillez réessayer."
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

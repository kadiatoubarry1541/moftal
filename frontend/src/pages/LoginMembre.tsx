import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'
import { TermsModal, hasAcceptedTerms } from '../components/TermsModal'

const API_BASE = import.meta.env.VITE_API_URL || ''

export function LoginMembre() {
  const [numeroH, setNumeroH] = useState('')
  const [nomComplet, setNomComplet] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const navigate = useNavigate()
  const { t } = useI18n()

  useEffect(() => {
    if (!hasAcceptedTerms()) setShowTerms(true)
  }, [])

  const onSubmit = async () => {
    setError('')
    setIsLoading(true)

    if (!numeroH || !password) {
      setError('Veuillez remplir le NumeroH et le mot de passe.')
      setIsLoading(false)
      return
    }

    // Normaliser le NumeroH : lettre O → chiffre 0 (erreur de saisie fréquente)
    const normalizedNumeroH = numeroH.trim().replace(/O/g, '0').replace(/o/g, '0')

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroH: normalizedNumeroH, password }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.message || "Identifiants incorrects. Vérifiez votre NuméroH et mot de passe.")
        return
      }

      // Vérifier que le nom correspond
      const fullName = `${data.user?.prenom || ''} ${data.user?.nomFamille || ''}`.trim().toLowerCase()
      const inputName = nomComplet.trim().toLowerCase()
      if (inputName && fullName && fullName !== inputName) {
        setError("Le nom complet ne correspond pas à ce compte.")
        return
      }

      // Stocker le token et la session
      if (data.token) localStorage.setItem('token', data.token)
      const sessionUser = { ...(data.user || {}), token: data.token }
      localStorage.setItem('session_user', JSON.stringify(sessionUser))

      navigate('/compte')
    } catch {
      setError('Erreur lors de la connexion. Vérifiez votre connexion internet.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
    {showTerms && (
      <TermsModal
        onAccept={() => setShowTerms(false)}
        onDecline={() => navigate('/')}
      />
    )}
    <div className="login-membre py-8 px-4">
      <div className="login-container">
        <div className="login-header">
          <h1>{t('member.login.title')}</h1>
          <p>{t('member.login.subtitle')}</p>
        </div>
        
        <div className="login-form">
          <div className="form-group">
            <label>{t('login.numeroh')}</label>
            <input 
              type="text"
              value={numeroH}
              onChange={(e) => setNumeroH(e.target.value)}
              placeholder="Ex: G96C1P2R3E2F1 4"
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label>{t('member.fullname')}</label>
            <input 
              type="text"
              value={nomComplet}
              onChange={(e) => setNomComplet(e.target.value)}
              placeholder="Ex: Fatoumata Barry"
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label>{t('login.password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                className="form-input pr-10 w-full"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Voir le mot de passe'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          <div className="form-actions">
            <button 
              className="btn login-btn"
              onClick={onSubmit}
              disabled={isLoading}
            >
              {isLoading ? t('member.loading') : t('member.submit')}
            </button>
          </div>
        </div>
        
        <div className="login-info">
          <h3>{t('member.info.how')}</h3>
          <div className="info-steps">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>{t('member.info.invitation')}</h4>
                <p>{t('member.info.invitation.desc')}</p>
              </div>
            </div>
            
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>{t('member.info.login')}</h4>
                <p>{t('member.info.login.desc')}</p>
              </div>
            </div>
            
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>{t('member.info.interaction')}</h4>
                <p>{t('member.info.interaction.desc')}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="login-footer">
          <p>{t('member.footer.q')}</p>
          <p>{t('member.footer.a')}</p>
        </div>
      </div>
    </div>
    </>
  )
}

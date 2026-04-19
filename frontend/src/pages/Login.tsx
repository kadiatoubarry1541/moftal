import { useState, useEffect } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { api } from '../utils/api'
import { useI18n } from '../i18n/useI18n'
import { TermsModal, hasAcceptedTerms } from '../components/TermsModal'

export function Login() {
  const [numeroH, setNumeroH] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()

  // Afficher la modal si l'utilisateur n'a pas encore accepté les CGU
  useEffect(() => {
    if (!hasAcceptedTerms()) {
      setShowTerms(true)
    }
  }, [])
  const successMessage = (location.state as { message?: string } | null)?.message

  // Auto-remplir depuis sessionStorage si on vient d'un test
  useEffect(() => {
    const testNumeroH = sessionStorage.getItem('test_numeroH')
    const testPassword = sessionStorage.getItem('test_password')
    
    if (testNumeroH && testPassword) {
      setNumeroH(testNumeroH)
      setPassword(testPassword)
      
      // Nettoyer après utilisation
      sessionStorage.removeItem('test_numeroH')
      sessionStorage.removeItem('test_password')
    }
  }, [])

  const onSubmit = async () => {
    if (loading) return
    setError('')
    if (!numeroH || !password) {
      setError(t('login.error_required'))
      return
    }
    
    try {
      setLoading(true)
      // Connexion directe et rapide
      const result = await api.login(numeroH, password)
      
      if (result.success) {
        navigate('/compte', { state: { fromLogin: true } })
      } else {
        // Afficher le vrai message d'erreur (backend éteint, mauvais identifiants, etc.)
        if (result.message && result.message !== 'Erreur de connexion') {
          setError(result.message)
        } else if (result.numeroHExists) {
          setError('Mot de passe incorrect')
        } else {
          setError('NumeroH ou mot de passe incorrect')
        }
      }
    } catch (error: any) {
      // Message d'erreur simple
      setError(error?.message || 'Erreur de connexion. Vérifiez vos identifiants.')
    } finally {
      setLoading(false)
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
    <div className="stack max-w-lg mx-auto w-full px-4 xs:px-2 py-8 sm:py-12">
      <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('login.title')}</h1>
      <div className="card stack">
        <div className="row">
          <div className="col-6">
            <div className="field">
              <label>{t('login.numeroh')}</label>
              <input 
                value={numeroH} 
                onChange={(e)=>setNumeroH(e.target.value)} 
                onKeyPress={(e) => e.key === 'Enter' && onSubmit()}
                placeholder="Ex: G1C1P2R1E1F1 1" 
                autoFocus
              />
            </div>
          </div>
          <div className="col-6">
            <div className="field">
              <label>{t('login.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e)=>setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && onSubmit()}
                  className="pr-10 w-full"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
          </div>
        </div>
        {successMessage && (
          <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-3 py-2 rounded text-sm">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="error">{error}</div>
        )}
        <div className="actions">
        <button
          type="button"
          className="btn min-h-[44px] w-full sm:w-auto"
          onClick={onSubmit}
          disabled={loading}
          style={loading ? { opacity: 0.7, cursor: 'wait' } : undefined}
        >
          {loading ? 'Connexion en cours…' : t('login.submit')}
        </button>
        </div>
        <div className="text-center mt-3">
          <Link to="/mot-de-passe-oublie" className="text-sm text-indigo-500 dark:text-indigo-400 underline hover:no-underline">
            Mot de passe oublié ?
          </Link>
        </div>
        <div className="text-center mt-5 text-gray-600 dark:text-gray-400 text-sm sm:text-base">
          {t('login.signup_prompt')} <Link to="/inscription" className="text-indigo-500 dark:text-indigo-400 underline cursor-pointer hover:no-underline">{t('login.signup_link')}</Link>
        </div>
        <div className="text-center mt-3">
          <Link to="/conditions-utilisation" className="text-xs text-gray-400 hover:text-gray-600 underline">
            Consulter nos Conditions Générales d'Utilisation
          </Link>
        </div>
      </div>
    </div>
    </>
  )
}



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
  const [isNetworkError, setIsNetworkError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [slowServer, setSlowServer] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [retryCountdown, setRetryCountdown] = useState(0)
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()

  // Auto-redirect si déjà connecté (comme Facebook)
  useEffect(() => {
    try {
      const session = localStorage.getItem('session_user')
      const token   = localStorage.getItem('token')
      if (session && token) {
        const parsed = JSON.parse(session)
        const user   = parsed.userData || parsed
        if (user?.numeroH) {
          const from = (location.state as any)?.from || '/compte'
          navigate(from, { replace: true })
          return
        }
      }
    } catch {}
    if (!hasAcceptedTerms()) setShowTerms(true)
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
    setIsNetworkError(false)
    setSlowServer(false)
    setRetryCountdown(0)
    if (!numeroH || !password) {
      setError(t('login.error_required'))
      return
    }

    try {
      setLoading(true)
      const slowTimer = setTimeout(() => setSlowServer(true), 8000)

      const result = await api.login(numeroH, password)
      clearTimeout(slowTimer)
      setSlowServer(false)

      if (result?.success) {
        // Retourner à la page d'origine (espace-pro, gestion, etc.) ou /compte par défaut
        const from = (location.state as any)?.from || '/compte'
        navigate(from, { replace: true, state: { fromLogin: true } })
      } else if (result?.networkError) {
        setIsNetworkError(true)
        setError(result.message || 'Serveur inaccessible. Réessayez dans quelques instants.')
        setRetryCountdown(10)
      } else {
        if (result?.numeroHExists) {
          setError('Mot de passe incorrect.')
        } else if (result?.message) {
          setError(result.message)
        } else {
          setError('NumeroH ou mot de passe incorrect.')
        }
      }
    } catch {
      setSlowServer(false)
      setIsNetworkError(true)
      setError('Serveur inaccessible. Réessayez dans quelques instants.')
      setRetryCountdown(10)
    } finally {
      setLoading(false)
    }
  }

  // Compte à rebours avant reconnexion automatique
  useEffect(() => {
    if (retryCountdown <= 0) return
    const timer = setTimeout(() => {
      if (retryCountdown === 1) {
        onSubmit()
      } else {
        setRetryCountdown(c => c - 1)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [retryCountdown])

  return (
    <>
    {showTerms && (
      <TermsModal
        onAccept={() => setShowTerms(false)}
        onDecline={() => navigate('/')}
      />
    )}
    <div className="stack max-w-lg mx-auto w-full px-4 xs:px-2 py-8 sm:py-12">
      <div className="flex justify-center mb-4">
        <img src="/logo-moftal.svg" alt="Moftal" style={{ width: 130, height: 130, display: 'block' }} />
      </div>
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
        {slowServer && loading && (
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5 rounded-lg">
            <svg className="animate-spin h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            <span>Démarrage du serveur en cours, veuillez patienter…</span>
          </div>
        )}
        {error && (
          <div className={`rounded-lg px-4 py-3 text-sm flex flex-col gap-3 ${isNetworkError ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'}`}>
            {isNetworkError ? (
              <>
                <div className="flex items-start gap-2">
                  <svg className="h-5 w-5 shrink-0 mt-0.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
                <div className="flex items-center gap-3 pl-7">
                  <button
                    type="button"
                    onClick={() => { setRetryCountdown(0); onSubmit() }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Réessayer
                  </button>
                  {retryCountdown > 0 && (
                    <span className="text-xs text-orange-600 dark:text-orange-400">
                      Nouvelle tentative automatique dans {retryCountdown}s…
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2">
                <svg className="h-5 w-5 shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
          </div>
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



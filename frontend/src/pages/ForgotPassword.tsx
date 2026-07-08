import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../utils/api'

export function ForgotPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [step, setStep] = useState<'verify' | 'code' | 'reset'>('verify')
  const [numeroH, setNumeroH] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailInfo, setEmailInfo] = useState<{ sent: boolean; masked: string | null } | null>(null)

  // Si l'utilisateur clique sur le lien dans son email (?token=...)
  useEffect(() => {
    const urlToken = searchParams.get('token')
    if (urlToken) {
      setToken(urlToken)
      setStep('reset')
    }
  }, [searchParams])

  const onVerify = async () => {
    setError('')
    if (!numeroH.trim()) {
      setError('Veuillez saisir votre NumeroH.')
      return
    }
    setLoading(true)
    try {
      const result = await api.forgotPasswordVerify(
        api.normalizeNumeroH(numeroH)
      )
      if (result.success && result.otpToken) {
        setOtpToken(result.otpToken)
        setEmailInfo({
          sent: result.emailSent ?? false,
          masked: result.maskedEmail ?? null,
        })
        setStep('code')
      } else {
        setError(result.message || 'Vérification échouée.')
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur de connexion.')
    } finally {
      setLoading(false)
    }
  }

  const onVerifyCode = async () => {
    setError('')
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError('Veuillez saisir le code à 6 chiffres reçu par email.')
      return
    }
    setLoading(true)
    try {
      const result = await api.forgotPasswordVerifyCode(otpToken, otpCode.trim())
      if (result.success && result.token) {
        setToken(result.token)
        setStep('reset')
      } else {
        setError(result.message || 'Code incorrect.')
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur de connexion.')
    } finally {
      setLoading(false)
    }
  }

  const onReset = async () => {
    setError('')
    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.')
      return
    }
    setLoading(true)
    try {
      const result = await api.forgotPasswordReset(token, newPassword)
      if (result.success) {
        navigate('/login', { state: { message: result.message } })
      } else {
        setError(result.message || 'Réinitialisation échouée.')
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur de connexion.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="stack max-w-lg mx-auto w-full px-4 xs:px-2 py-8 sm:py-12">
      <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
        Mot de passe oublié
      </h1>
      <div className="card stack">
        {step === 'verify' ? (
          <>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Saisissez votre NumeroH pour réinitialiser votre mot de passe.
            </p>

            <div className="field">
              <label>Votre NumeroH</label>
              <input
                value={numeroH}
                onChange={(e) => setNumeroH(e.target.value)}
                placeholder="Ex: G1C1P2R1E1F1 1"
              />
            </div>
            {error && <div className="error">{error}</div>}
            <div className="actions">
              <button
                type="button"
                className="btn min-h-[44px]"
                onClick={onVerify}
                disabled={loading}
              >
                {loading ? 'Vérification…' : 'Vérifier mon identité'}
              </button>
            </div>
          </>
        ) : step === 'code' ? (
          <>
            {/* Étape 2 : saisir le code reçu par email */}
            {emailInfo?.sent && emailInfo.masked ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
                Un code à 6 chiffres a été envoyé à <strong>{emailInfo.masked}</strong>. Saisissez-le ci-dessous.
              </div>
            ) : (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-200">
                Identité vérifiée. Aucun email associé à ce compte — veuillez contacter un administrateur.
              </div>
            )}
            <div className="field">
              <label>Code reçu par email</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                style={{ letterSpacing: '0.3em', fontSize: '1.5rem', textAlign: 'center' }}
              />
            </div>
            {error && <div className="error">{error}</div>}
            <div className="actions">
              <button
                type="button"
                className="btn min-h-[44px]"
                onClick={onVerifyCode}
                disabled={loading || !emailInfo?.sent}
              >
                {loading ? 'Vérification…' : 'Valider le code'}
              </button>
            </div>
            <button
              type="button"
              className="link text-sm text-gray-500 dark:text-gray-400"
              onClick={() => { setStep('verify'); setError(''); setOtpCode(''); setEmailInfo(null) }}
            >
              ← Modifier les informations de vérification
            </button>
          </>
        ) : (
          <>
            {/* Étape 3 : nouveau mot de passe */}

            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Choisissez un nouveau mot de passe (au moins 6 caractères).
            </p>
            <div className="field">
              <label>Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="field">
              <label>Confirmer le mot de passe</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && <div className="error">{error}</div>}
            <div className="actions">
              <button
                type="button"
                className="btn min-h-[44px]"
                onClick={onReset}
                disabled={loading}
              >
                {loading ? 'Enregistrement…' : 'Enregistrer le nouveau mot de passe'}
              </button>
            </div>
            {/* Bouton retour seulement si l'utilisateur n'est pas arrivé via un lien email */}
            {!searchParams.get('token') && (
              <button
                type="button"
                className="link text-sm text-gray-500 dark:text-gray-400"
                onClick={() => { setStep('verify'); setError(''); setEmailInfo(null); }}
              >
                ← Modifier les informations de vérification
              </button>
            )}
          </>
        )}
        <div className="text-center mt-4 text-gray-600 dark:text-gray-400 text-sm">
          <Link to="/login" className="text-indigo-500 dark:text-indigo-400 underline hover:no-underline">
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  )
}

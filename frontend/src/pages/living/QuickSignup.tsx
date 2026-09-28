import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { config } from '../../config/api'

// Inscription rapide : numéro de téléphone + mot de passe seulement.
// Tout le reste (NuméroH, email, photo, quartier…) se fait ensuite avec
// « Mettre mon profil à jour ».
export function QuickSignup() {
  const navigate = useNavigate()
  const [telephone, setTelephone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const digits = telephone.replace(/[^0-9]/g, '')
  const phoneOk = digits.length >= 8
  const pwOk = password.length >= 6
  const same = password === confirm
  const canSubmit = phoneOk && pwOk && same && !loading

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${config.API_BASE_URL}/auth/register-quick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telephone: telephone.trim(), password })
      })
      const data = await res.json()
      if (!data.success) { setError(data.message || "Impossible de créer le compte."); return }
      localStorage.setItem('token', data.token)
      localStorage.setItem('session_user', JSON.stringify({
        numeroH: data.user.numeroH, userData: data.user, token: data.token, type: 'vivant', source: 'registration_quick'
      }))
      navigate('/compte')
    } catch {
      setError('Erreur de connexion. Vérifiez votre connexion internet et réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const field = 'w-full px-4 py-3 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-emerald-500'

  return (
    <div className="max-w-md mx-auto w-full px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium mb-4">
        ← Retour
      </Link>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-2xl font-black text-gray-900">Créer mon compte</h1>
        <p className="text-sm text-gray-500 mt-1 mb-5">
          Il vous faut seulement votre numéro de téléphone et un mot de passe.
          Vous compléterez votre profil ensuite, quand vous voudrez.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">📱 Numéro de téléphone</label>
            <input type="tel" inputMode="tel" autoComplete="tel" value={telephone}
              onChange={e => setTelephone(e.target.value)} placeholder="Ex : 620 00 00 00"
              className={`${field} ${telephone && !phoneOk ? 'border-red-400' : 'border-gray-300'}`} />
            {telephone && !phoneOk && <p className="text-xs text-red-500 mt-1">Numéro trop court.</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">🔒 Mot de passe</label>
            <div className="flex gap-2">
              <input type={show ? 'text' : 'password'} autoComplete="new-password" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Au moins 6 caractères"
                className={`${field} ${password && !pwOk ? 'border-red-400' : 'border-gray-300'}`} />
              <button type="button" onClick={() => setShow(v => !v)} aria-label={show ? 'Masquer' : 'Afficher'}
                className="px-3 rounded-xl border border-gray-300 bg-white text-lg">{show ? '🙈' : '👁️'}</button>
            </div>
            {password && !pwOk && <p className="text-xs text-red-500 mt-1">Au moins 6 caractères.</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">🔒 Confirmer le mot de passe</label>
            <input type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm}
              onChange={e => setConfirm(e.target.value)} placeholder="Retapez le mot de passe"
              className={`${field} ${confirm && !same ? 'border-red-400' : 'border-gray-300'}`} />
            {confirm && !same && <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas.</p>}
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

          <button type="submit" disabled={!canSubmit}
            className="w-full py-3.5 rounded-xl font-bold text-white text-base disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
            {loading ? 'Création du compte…' : '✅ Créer mon compte'}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-5">
          Déjà un compte ? <Link to="/login" className="font-semibold text-emerald-700">Se connecter</Link>
        </p>
      </div>
    </div>
  )
}

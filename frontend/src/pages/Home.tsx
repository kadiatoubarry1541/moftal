import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'

export function Home() {
  const { t } = useI18n()
  const navigate = useNavigate()

  // Auto-redirect si déjà connecté — comme Facebook qui ouvre directement le fil
  useEffect(() => {
    try {
      const session = localStorage.getItem('session_user')
      const token   = localStorage.getItem('token')
      if (session && token) {
        const parsed = JSON.parse(session)
        const user   = parsed.userData || parsed
        if (user?.numeroH) {
          navigate('/compte', { replace: true })
        }
      }
    } catch {}
  }, [])

  return (
    <div className="flex-1 flex flex-col">

      {/* Zone principale : logo + slogan + boutons */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">

        {/* Logo */}
        <img
          src="/logo-moftal.svg"
          alt="Moftal"
          style={{ width: 160, height: 160, display: 'block', margin: '0 auto' }}
        />

        {/* Slogan */}
        <div className="mt-3 mb-6 text-center max-w-xs mx-auto">
          <p className="text-gray-900 font-bold text-base leading-snug">
            Connaître d'où tu viens. Construire où tu vas.
          </p>
          <p className="text-gray-500 font-medium text-xs mt-1 leading-relaxed">
            Moftal réunit votre famille, vos services et votre communauté — tout en un, partout dans le monde.
          </p>
        </div>

        {/* Boutons */}
        <div className="w-full max-w-xs px-6 flex flex-col gap-3">
          <Link
            to="/login"
            className="flex items-center justify-center w-full py-3.5 rounded-xl text-white font-bold text-base tracking-wide shadow-sm transition-all active:scale-[0.98]"
            style={{ backgroundColor: '#22a722' }}
          >
            {t('home.login')}
          </Link>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-xs font-medium">ou</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <Link
            to="/vivant"
            className="flex items-center justify-center w-full py-3.5 rounded-xl text-white font-bold text-base tracking-wide shadow-sm transition-all active:scale-[0.98]"
            style={{ backgroundColor: '#111111' }}
          >
            Créer un compte
          </Link>
        </div>
      </div>


    </div>
  )
}

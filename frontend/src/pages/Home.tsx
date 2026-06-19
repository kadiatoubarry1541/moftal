import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'

export function Home() {
  const { t } = useI18n()

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-10">

      {/* Logo + slogan */}
      <div className="text-center mb-10">
        <h1 style={{
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontWeight: 900,
          fontSize: 'clamp(48px, 10vw, 80px)',
          color: '#16a34a',
          letterSpacing: '2px',
          lineHeight: 1,
          margin: 0,
        }}>
          Moftal
        </h1>
        <p className="mt-4 text-gray-500 text-sm sm:text-base max-w-xs sm:max-w-sm mx-auto leading-relaxed">
          La plateforme qui connecte les familles, les professionnels et les services — en un seul endroit.
        </p>
      </div>

      {/* Carte centrale (comme Facebook) */}
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 w-full max-w-sm flex flex-col gap-4">

        <Link
          to="/login"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-bold text-base sm:text-lg transition-all shadow-md"
        >
          🔐 {t('home.login')}
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-xs font-medium">ou</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <Link
          to="/vivant"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-[0.98] text-emerald-700 font-bold text-base border border-emerald-200 transition-all"
        >
          ✨ Créer un compte
        </Link>
      </div>

      {/* Lien conditions */}
      <div className="mt-6 text-center">
        <Link
          to="/conditions-utilisation"
          className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
        >
          ⚖️ Conditions Générales d'Utilisation
        </Link>
      </div>

    </div>
  )
}

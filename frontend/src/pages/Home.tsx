import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'

export function Home() {
  const { t } = useI18n()

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-10">

      {/* Logo + slogan */}
      <div className="text-center mb-6">
        <img
          src="/logo-moftal.svg"
          alt="Moftal"
          style={{ width: 220, height: 220, display: 'block', margin: '0 auto' }}
        />
        <p className="mt-3 text-gray-900 font-semibold text-sm sm:text-base max-w-xs sm:max-w-sm mx-auto leading-relaxed">
          Gérez votre famille, accédez à vos services et restez connecté à votre communauté — partout dans le monde.
        </p>
      </div>

      {/* Carte centrale */}
      <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 w-full max-w-sm flex flex-col gap-4">

        <Link
          to="/login"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-bold text-base sm:text-lg transition-all shadow-md"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          {t('home.login')}
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
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Créer un compte
        </Link>

      </div>

    </div>
  )
}

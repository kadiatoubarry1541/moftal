import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'

export function Inscription() {
  const { t } = useI18n()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">

        {/* Retour */}
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors text-sm font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Retour
          </Link>
        </div>

        {/* Logo */}
        <div className="text-center mb-10">
          <img
            src="/logo-moftal.svg"
            alt="Moftal"
            className="mx-auto h-20 w-auto object-contain"
          />
        </div>

        {/* Titre et sous-titre */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Créer un compte
          </h1>
          <p className="text-gray-500 text-base">
            {t('home.choose_option')}
          </p>
        </div>

        {/* Carte unique — Inscription Vivant */}
        <Link to="/vivant" className="block group">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all duration-200 flex items-center gap-5">

            {/* Icône professionnelle */}
            <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>

            {/* Texte */}
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                {t('home.register.vivant')}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">
                Inscrivez-vous pour accéder à votre espace personnel
              </p>
            </div>

            {/* Flèche */}
            <div className="flex-shrink-0 text-gray-300 group-hover:text-emerald-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Lien connexion */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Vous avez déjà un compte ?{' '}
          <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-medium underline-offset-2 hover:underline transition-colors">
            Se connecter
          </Link>
        </p>

      </div>
    </div>
  )
}

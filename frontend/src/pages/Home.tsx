import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'

export function Home() {
  const { t } = useI18n()
  
  return (
    <div className="max-w-4xl mx-auto w-full px-2 xs:px-0">
      {/* Logo du site - responsive */}
      <div className="text-center mb-8 xs:mb-10 sm:mb-12">
        <picture>
          <source srcSet="/logo.webp" type="image/webp" />
          <img
            src="/logo.png"
            alt="Logo du site"
            width="256"
            height="256"
            fetchPriority="high"
            className="mx-auto h-32 xs:h-40 sm:h-48 md:h-64 w-auto max-w-[90vw] object-contain"
            style={{ display: 'block' }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        </picture>
      </div>
      
      {/* Boutons tactiles, pleine largeur sur très petit écran */}
      <div className="flex flex-col gap-3 sm:gap-4 max-w-xs xs:max-w-sm mx-auto">
        <Link 
          to="/vivant"
          className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 xs:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-emerald-600 to-sky-500 text-white text-base sm:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all w-full sm:w-auto"
        >
          ✨ {t('home.register')}
        </Link>
        <Link 
          to="/login" 
          className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 xs:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base sm:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all w-full sm:w-auto"
        >
          🔐 {t('home.login')}
        </Link>
      </div>

      {/* Lien Conditions d'utilisation */}
      <div className="mt-6 text-center">
        <Link
          to="/conditions-utilisation"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
        >
          ⚖️ Conditions Générales d'Utilisation
        </Link>
      </div>
    </div>
  )
}

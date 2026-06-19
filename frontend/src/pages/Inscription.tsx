import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'
import { useState } from 'react'

export function Inscription() {
  const { t } = useI18n()
  const [hoveredOption, setHoveredOption] = useState<'vivant' | 'defunt' | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        {/* Bouton Retour - en haut à droite */}
        <div className="mb-6 flex justify-end">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-all"
          >
            ← Retour
          </Link>
        </div>

        {/* Logo du site - Image */}
        <div className="text-center mb-6">
          <img
            src="/logo-moftal.svg"
            alt="Moftal"
            className="mx-auto h-48 md:h-64 w-auto max-w-full object-contain"
            style={{ display: 'block' }}
          />
        </div>

        {/* Titre S'inscrire */}
        <div className="text-center mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
            {t('home.register')}
          </h1>
        </div>

        {/* Phrase explicative */}
        <div className="text-center mb-6">
          <p className="text-base text-gray-600">
            {t('home.choose_option')}
          </p>
        </div>

        {/* Boutons de choix */}
        <div className="flex justify-center gap-4">
          {/* Vivant */}
          <Link 
            to="/vivant" 
            onMouseEnter={() => setHoveredOption('vivant')}
            onMouseLeave={() => setHoveredOption(null)}
          >
            <div className={`
              bg-white px-6 py-3 rounded-lg shadow-md border-2 transition-all duration-300 inline-flex items-center gap-3
              ${hoveredOption === 'vivant' 
                ? 'border-emerald-400 shadow-lg scale-105' 
                : 'border-gray-200 hover:border-emerald-300'
              }
            `}>
              <span className="text-2xl">✨</span>
              <span className="font-semibold text-gray-800">
                {t('home.register.vivant')}
              </span>
            </div>
          </Link>

        </div>
      </div>
    </div>
  )
}


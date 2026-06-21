import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/useI18n'
import { LangButton } from '../../components/LangButton'

export function LivingChoice() {
  const { t } = useI18n()
  return (
    <div className="stack max-w-lg mx-auto w-full px-4 py-8">
      <LangButton />
      <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-sm font-medium w-fit">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Retour
      </Link>
      <h2>{t('choice.method.title')}</h2>
      <div className="card">
        <div className="flex flex-col gap-4">
          <Link className="btn" to="/vivant/video">
            {t('choice.method.video')}
          </Link>

          <Link className="btn secondary" to="/vivant/formulaire">
            {t('choice.method.written')}
          </Link>
        </div>
      </div>
    </div>
  )
}

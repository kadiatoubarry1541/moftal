import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/useI18n'
import { TermsModal, hasAcceptedTerms } from '../components/TermsModal'

export function RegistrationChoice() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [showTerms, setShowTerms] = useState(false)

  useEffect(() => {
    if (!hasAcceptedTerms()) setShowTerms(true)
  }, [])

  return (
    <>
      {showTerms && (
        <TermsModal
          onAccept={() => setShowTerms(false)}
          onDecline={() => navigate('/')}
        />
      )}
      <div className="stack max-w-lg mx-auto w-full px-4 py-8">
        <h2>{t('choice.title')}</h2>
        <div className="card">
          <div className="simple-options">
            <Link className="btn" to="/vivant">
              {t('choice.living')}
            </Link>
            <Link className="btn secondary" to="/defunt">
              {t('choice.deceased')}
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

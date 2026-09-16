import { useNavigate } from 'react-router-dom';
import ProSection from '../components/ProSection';
import { useI18n } from '../i18n/useI18n';

export default function Mosquee() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">

      <button
        type="button"
        onClick={() => navigate('/zaka')}
        className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors text-sm border border-gray-200"
      >
        {t('btn.back_arrow')}
      </button>

      <div className="mb-6 flex items-center gap-3 rounded-2xl bg-teal-700 px-4 py-3 text-white shadow-md">
        <span className="text-3xl leading-none">🕌</span>
        <div>
          <h1 className="text-base font-bold leading-tight">{t('mosquee.header_title')}</h1>
          <p className="text-xs text-teal-100 mt-0.5">
            {t('mosquee.header_subtitle')}
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {t('mosquee.intro_line1')} {t('mosquee.intro_line2')}
      </p>

      <ProSection
        type="mosque"
        title={t('mosquee.header_title')}
        icon="🕌"
        description={t('mosquee.section_desc')}
      />

    </div>
  );
}

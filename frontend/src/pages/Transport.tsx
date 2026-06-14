import { useNavigate } from 'react-router-dom';
import ProSection from '../components/ProSection';

export default function Transport() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">

      <button
        type="button"
        onClick={() => navigate('/services')}
        className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors text-sm border border-gray-200"
      >
        ← Retour
      </button>

      <div className="mb-6 flex items-center gap-3 rounded-2xl bg-orange-600 px-4 py-3 text-white shadow-md">
        <span className="text-3xl leading-none">🚗</span>
        <div>
          <h1 className="text-base font-bold leading-tight">Transport</h1>
          <p className="text-xs text-orange-100 mt-0.5">
            Agences de transport — filtrez par ville, quartier ou pays
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Retrouvez ici les <strong>transporteurs approuvés</strong>. Filtrez par
        <strong> ville</strong>, <strong>quartier</strong> ou <strong>pays</strong>,
        puis cliquez sur <strong>« Prendre rendez-vous »</strong> pour les contacter.
      </p>

      <ProSection
        type="transport"
        title="Transporteurs"
        icon="🚗"
        description="Agences et particuliers proposant des services de transport de personnes et de marchandises."
      />

    </div>
  );
}

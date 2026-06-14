import { useNavigate } from 'react-router-dom';
import ProSection from '../components/ProSection';

export default function Immobilier() {
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

      <div className="mb-6 flex items-center gap-3 rounded-2xl bg-lime-700 px-4 py-3 text-white shadow-md">
        <span className="text-3xl leading-none">🏘️</span>
        <div>
          <h1 className="text-base font-bold leading-tight">Immobilier</h1>
          <p className="text-xs text-lime-100 mt-0.5">
            Agents immobiliers agréés — location et vente de biens
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Retrouvez ici les <strong>agents immobiliers agréés</strong>. Contactez-les pour{' '}
        <strong>louer ou acheter</strong> un logement, un local commercial ou un terrain.
      </p>

      <ProSection
        type="broker"
        title="Agents immobiliers"
        icon="🏘️"
        description="Professionnels de l'immobilier pour la location et la vente de biens."
      />
    </div>
  );
}

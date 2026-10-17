import { useNavigate } from 'react-router-dom';
import ProSection from '../components/ProSection';
import { useTraduction } from '../i18n/traduction';

export default function Beaute() {
  const navigate = useNavigate();
  const { tr } = useTraduction();

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">

      <button
        type="button"
        onClick={() => navigate('/services')}
        className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors text-sm border border-gray-200"
      >
        ← {tr("Retour")}
      </button>

      <div className="mb-6 flex items-center gap-3 rounded-2xl bg-pink-600 px-4 py-3 text-white shadow-md">
        <span className="text-3xl leading-none">💈</span>
        <div>
          <h1 className="text-base font-bold leading-tight">{tr("Beauté & Bien-être")}</h1>
          <p className="text-xs text-pink-100 mt-0.5">
            {tr("Salons, spas, instituts — filtrez par ville, quartier ou pays")}
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {tr("Retrouvez ici les")} <strong>{tr("professionnels de la beauté approuvés")}</strong> — {tr("salons de coiffure, spas, instituts de beauté et bien-être.")}{' '}
        {tr("Filtrez par")} <strong>{tr("ville")}</strong>,{' '}
        <strong>{tr("quartier")}</strong> {tr("ou")} <strong>{tr("pays")}</strong>, {tr("puis cliquez sur")}{' '}
        <strong>{tr("« Prendre rendez-vous »")}</strong> {tr("pour les contacter.")}
      </p>

      <ProSection
        type="beauty"
        title={tr("Beauté & Bien-être")}
        icon="💈"
        description={tr("Salons de coiffure, spas et instituts disponibles dans votre région.")}
      />

    </div>
  );
}

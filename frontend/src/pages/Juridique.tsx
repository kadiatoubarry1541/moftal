import { useNavigate } from 'react-router-dom';
import ProSection from '../components/ProSection';
import { useTraduction } from '../i18n/traduction';

// Rubrique Juridique : uniquement des cabinets privés (avocats, conseil juridique),
// vérifiés par l'administrateur avant d'apparaître.
export default function Juridique() {
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

      <div className="mb-6 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-red-900 to-amber-700 px-4 py-3 text-white shadow-md">
        <span className="text-3xl leading-none">⚖️</span>
        <div>
          <h1 className="text-base font-bold leading-tight">{tr("Juridique")}</h1>
          <p className="text-xs text-red-100 mt-0.5">
            {tr("Avocats et cabinets de conseil juridique — filtrez par ville, quartier ou pays")}
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {tr("Retrouvez ici les")} <strong>{tr("cabinets juridiques vérifiés par Moftal")}</strong> — {tr("avocats et cabinets de conseil juridique.")}{' '}
        {tr("Filtrez par")} <strong>{tr("ville")}</strong>,{' '}
        <strong>{tr("quartier")}</strong> {tr("ou")} <strong>{tr("pays")}</strong>, {tr("puis cliquez sur")}{' '}
        <strong>{tr("« Prendre rendez-vous »")}</strong> {tr("pour une consultation.")}
      </p>

      <ProSection
        type="lawyer"
        title={tr("Avocats & Cabinets d'avocats")}
        icon="⚖️"
        description={tr("Avocats inscrits au Barreau : foncier, famille, affaires, travail, pénal…")}
      />

      <ProSection
        type="legal_advisor"
        title={tr("Cabinets de conseil juridique")}
        icon="📜"
        description={tr("Contrats, création d'entreprise, démarches et conseil aux entreprises.")}
      />

    </div>
  );
}

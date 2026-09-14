import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type Secteur = 'primaire' | 'secondaire' | 'tertiaire' | 'quaternaire';

interface Props {
  /** Si fourni, le secteur est fixé (page détaillée). Sinon, message générique (page d'accueil). */
  secteur?: Secteur;
  className?: string;
}

// Moftal est le seul vendeur (celui qui vend directement aux clients) sur
// Échange — tout le monde d'autre participe en tant que fournisseur
// (approvisionne la plateforme, ne vend jamais directement). Le formulaire
// "Devenir fournisseur" existe pour l'instant sur Primaire et Secondaire.
const FOURNISSEUR_PATH: Record<Secteur, string | null> = {
  primaire: '/echange/primaire',
  secondaire: '/echange/secondaire',
  tertiaire: null,
  quaternaire: null,
};

export function DevenirVendeurButton({ secteur, className }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const path = secteur ? FOURNISSEUR_PATH[secteur] : '/echange/primaire';

  const goToFournisseur = () => {
    setOpen(false);
    if (path) navigate(path);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || 'flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors'}
      >
        🚚 Devenir fournisseur
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="text-center py-2">
              <div className="text-4xl mb-3">🚚</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Devenir fournisseur</h3>
              <p className="text-sm text-gray-600">
                Moftal est le seul vendeur sur Échange. Pour participer, inscrivez-vous comme fournisseur : vous approvisionnez la plateforme, sans vendre directement aux clients.
              </p>
              {!path && (
                <p className="text-xs text-amber-600 mt-3">
                  L'inscription fournisseur pour ce secteur arrive bientôt.
                </p>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setOpen(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors">
                Fermer
              </button>
              {path && (
                <button onClick={goToFournisseur} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors">
                  Continuer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

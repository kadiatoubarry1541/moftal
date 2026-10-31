/** Bouton « Publier » d'Échange : un seul bouton, qui ouvre l'écran unique de
 *  publication (photo, galerie, vidéo, vocal) dans la bonne section. */
import { useNavigate } from 'react-router-dom';
import { useTraduction } from '../i18n/traduction';

export type SecteurEchange = 'primaire' | 'secondaire' | 'tertiaire' | 'quaternaire' | 'nourriture';

interface PublierAnnonceButtonsProps {
  secteur: SecteurEchange;
  /** Titre au-dessus du bouton (optionnel) */
  title?: string;
  /** Classes additionnelles pour le conteneur */
  className?: string;
}

export function PublierAnnonceButtons({ secteur, title, className = '' }: PublierAnnonceButtonsProps) {
  const navigate = useNavigate();
  const { tr } = useTraduction();
  return (
    <div className={className}>
      {title && <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">{title}</h3>}
      <button
        onClick={() => navigate(`/echange/publier?secteur=${secteur}`)}
        className="px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
      >
        <span className="text-xl">➕</span>
        <span>{tr('Publier')}</span>
      </button>
    </div>
  );
}

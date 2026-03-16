/** Boutons \"Publier une annonce\" : un bouton principal + 3 options.
 *  L'utilisateur clique d'abord sur \"Publier\", puis choisit la méthode. */
import { useState } from 'react';

type PublishMode = 'ecrit' | 'photo_audio' | 'video';

interface PublierAnnonceButtonsProps {
  onSelect: (mode: PublishMode) => void;
  /** Titre au-dessus du bouton (optionnel) */
  title?: string;
  /** Classes additionnelles pour le conteneur */
  className?: string;
}

export function PublierAnnonceButtons({ onSelect, title, className = '' }: PublierAnnonceButtonsProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (mode: PublishMode) => {
    setOpen(false);
    onSelect(mode);
  };

  return (
    <div className={className}>
      {title && <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">{title}</h3>}
      <button
        onClick={() => setOpen(v => !v)}
        className="px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-sm"
      >
        <span>➕</span>
        <span>Publier</span>
        <span className="text-xs opacity-80">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => handleSelect('ecrit')}
            className="px-4 py-4 rounded-xl border-2 border-green-500 text-green-700 dark:text-green-300 font-semibold hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors flex flex-col items-center gap-1"
          >
            <span className="text-2xl">💬</span>
            <span>1. Par écrit</span>
            <span className="text-xs font-normal text-gray-600 dark:text-gray-400">Champs + photo</span>
          </button>
          <button
            onClick={() => handleSelect('photo_audio')}
            className="px-4 py-4 rounded-xl border-2 border-amber-500 text-amber-700 dark:text-amber-300 font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex flex-col items-center gap-1"
          >
            <span className="text-2xl">📷🎙️</span>
            <span>2. Photo + Audio</span>
            <span className="text-xs font-normal text-gray-600 dark:text-gray-400">Photo + message vocal (30s)</span>
          </button>
          <button
            onClick={() => handleSelect('video')}
            className="px-4 py-4 rounded-xl border-2 border-blue-500 text-blue-700 dark:text-blue-300 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex flex-col items-center gap-1"
          >
            <span className="text-2xl">🎥</span>
            <span>3. Par vidéo</span>
            <span className="text-xs font-normal text-gray-600 dark:text-gray-400">Vidéo (max 1 min)</span>
          </button>
        </div>
      )}
    </div>
  );
}

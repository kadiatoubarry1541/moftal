import { useRef, forwardRef, useImperativeHandle } from 'react';
import CompteSolidariteQuartier, { type CompteSolidariteQuartierHandle } from './CompteSolidariteQuartier';

interface Props {
  scope: string;
  location: string;
  locationName: string;
  isJournalist?: boolean;
  isAdmin?: boolean;
  /** Niveaux au-dessus (ex: préfecture, région...) — sert à proposer de
   *  continuer à faire remonter une information reçue de plus bas. */
  higherLevels?: { scope: string; location: string; label: string }[];
  /** Cache le gros bouton "Caisse" intégré — utile quand une page appelante
   *  affiche déjà son propre bouton (ex: à côté de la liste des membres) et
   *  déclenche la modale via la ref plutôt que par ce bouton. */
  hideProjetsButton?: boolean;
}

export interface DeveloppementSectionHandle {
  openCaisse: () => void;
}

const DeveloppementSection = forwardRef<DeveloppementSectionHandle, Props>(function DeveloppementSection(
  { scope, location, locationName, hideProjetsButton = false },
  ref
) {
  const soliRef = useRef<CompteSolidariteQuartierHandle>(null);
  useImperativeHandle(ref, () => ({
    openCaisse: () => soliRef.current?.open(),
  }), []);

  return (
    <div className="space-y-4">
      <CompteSolidariteQuartier ref={soliRef} scope={scope} location={location} locationName={locationName} />

      {/* Un seul bouton "Caisse" : santé, orphelins et projets (développement), tout dedans */}
      {!hideProjetsButton && (
        <button
          onClick={() => soliRef.current?.open()}
          className="w-full flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-green-700 to-emerald-600 rounded-xl text-left shadow"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💰</span>
            <p className="font-bold text-white text-sm">Caisse</p>
          </div>
          <span className="text-white/80">›</span>
        </button>
      )}
    </div>
  );
});

export default DeveloppementSection;

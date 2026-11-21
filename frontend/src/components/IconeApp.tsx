import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Icône d'application, comme sur l'écran d'accueil d'un téléphone : un carré
 * blanc aux coins arrondis, rempli entièrement par l'image (logo, photo) ou,
 * à défaut, par une grande image, et le nom écrit en dessous.
 * Même forme partout (page Services, Terre ADAM) : une seule couleur de fond.
 */
interface Props {
  nom: string;
  /** Logo ou photo : remplit tout le carré */
  image?: string | null;
  /** Image affichée quand il n'y a pas de logo */
  emoji?: ReactNode;
  /** Lien d'une page, ou action au toucher */
  to?: string;
  onClick?: () => void;
  /** Petit rond posé sur le coin du carré (ex. ✓ d'un favori) */
  pastille?: ReactNode;
  /** Texte lu par les lecteurs d'écran (par défaut : le nom) */
  description?: string;
}

export default function IconeApp({ nom, image, emoji, to, onClick, pastille, description }: Props) {
  const contenu = (
    <>
      <span className="relative w-[60px] h-[60px] flex-shrink-0">
        <span className="absolute inset-0 rounded-[18px] bg-white overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.18)] ring-1 ring-black/5 flex items-center justify-center">
          {image
            ? <img src={image} alt="" className="w-full h-full object-cover" />
            : <span className="text-[34px] leading-none">{emoji}</span>}
        </span>
        {pastille && <span className="absolute -top-1.5 -right-1.5">{pastille}</span>}
      </span>
      <span className="w-full text-[11px] font-medium text-gray-700 text-center leading-tight line-clamp-2">{nom}</span>
    </>
  );
  const classes = 'w-full min-w-0 flex flex-col items-center gap-1.5 py-1 transition active:scale-95';
  return to
    ? <Link to={to} aria-label={description || nom} className={classes}>{contenu}</Link>
    : <button type="button" onClick={onClick} aria-label={description || nom} className={classes}>{contenu}</button>;
}

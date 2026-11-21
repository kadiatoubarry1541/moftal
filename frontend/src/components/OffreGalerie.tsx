import { Link } from "react-router-dom";
import type { Offre } from "../utils/offreGaleries";

/**
 * Offre gratuite d'une galerie (comptée par le serveur sur ce qui est dans la
 * galerie en ce moment) :
 *  - galerie personnelle et galeries du Noyau : 5 photos + 2 vidéos ;
 *  - galerie famille : 7 photos + 2 vidéos.
 * Supprimer ou remplacer libère une place ; au-delà, on paie avec ses points.
 */

export default function OffreGalerie({ offre, className = "" }: { offre: Offre | null; className?: string }) {
  if (!offre) return null;
  const complet = offre.photosRestantes === 0 || offre.videosRestantes === 0;
  const pastille = (n: number, max: number) => (n >= max ? "text-red-600" : "text-emerald-700");
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 ${className}`}>
      <span className="font-semibold text-slate-600">Offre gratuite :</span>
      <span className={`font-semibold ${pastille(offre.photosUtilisees, offre.photosLibres)}`}>
        📷 {Math.min(offre.photosUtilisees, offre.photosLibres)}/{offre.photosLibres} photos
      </span>
      <span className={`font-semibold ${pastille(offre.videosUtilisees, offre.videosLibres)}`}>
        🎥 {Math.min(offre.videosUtilisees, offre.videosLibres)}/{offre.videosLibres} vidéos
      </span>
      {complet && (
        <span className="w-full text-slate-500">
          Supprimez ou remplacez un élément pour rester gratuit, ou{" "}
          <Link to="/acheter-points" className="font-bold text-amber-600 underline">achetez des points</Link>.
        </span>
      )}
    </div>
  );
}

import { Link } from "react-router-dom";
import { useTraduction } from "../i18n/traduction";

// Compteur des galeries (album privé, couple, parent-enfant, famille) :
// gratuit utilisé / disponible, prochains cadeaux du mois, points.
// Règles : backend/src/utils/quotaGaleries.js

export interface QuotaGalerie {
  photosGratuites: number; videosGratuites: number;
  photosUtilisees: number; videosUtilisees: number;
  photosRestantes: number; videosRestantes: number;
  prochainePhotoOfferte: string; prochaineVideoOfferte: string;
  moisParVideo: number; pointsDisponibles: number;
}

const dateCourte = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** Charge le compteur d'une galerie (null si indisponible : la galerie reste utilisable). */
export async function chargerQuota(url: string): Promise<QuotaGalerie | null> {
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
    const d = await r.json().catch(() => ({}));
    return r.ok && d.success && d.quota ? d.quota as QuotaGalerie : null;
  } catch {
    return null;
  }
}

/** Gratuit restant, prochains cadeaux et points — même affichage dans toutes les galeries. */
export function BarreQuota({ quota }: { quota: QuotaGalerie }) {
  const { tr } = useTraduction();
  const toutUtilise = quota.photosRestantes === 0 || quota.videosRestantes === 0;
  return (
    <div className="rounded-xl bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-900/40 px-4 py-3 text-sm space-y-1.5">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span className={quota.photosRestantes > 0 ? "text-green-700" : "text-red-600"}>
          📷 {tr("{u}/{g} photos gratuites", { u: quota.photosUtilisees, g: quota.photosGratuites })}
        </span>
        <span className={quota.videosRestantes > 0 ? "text-green-700" : "text-red-600"}>
          🎬 {tr("{u}/{g} vidéos gratuites", { u: quota.videosUtilisees, g: quota.videosGratuites })}
        </span>
        <span className="text-indigo-600 font-semibold">🪙 {tr("{n} points", { n: quota.pointsDisponibles })}</span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        🎁 {tr("Offert : 1 photo le {p}, 1 vidéo le {v}.", { p: dateCourte(quota.prochainePhotoOfferte), v: dateCourte(quota.prochaineVideoOfferte) })}
      </p>
      {toutUtilise && (
        <p className="text-xs text-gray-600 dark:text-gray-300">
          {tr("Pour publier plus : retirez un fichier, ou")}{" "}
          <Link to="/acheter-points" className="font-semibold text-amber-600 underline">{tr("achetez des points")}</Link>
          {" "}{tr("(1 point la photo, 2 à 5 points la vidéo selon sa durée).")}
        </p>
      )}
    </div>
  );
}

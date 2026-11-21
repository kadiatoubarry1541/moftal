import { lireDureeMedia } from "./dureesMedias";

/** Offre gratuite d'une galerie, telle que le serveur la compte. */
export interface Offre {
  photosLibres: number;
  videosLibres: number;
  photosUtilisees: number;
  videosUtilisees: number;
  photosRestantes: number;
  videosRestantes: number;
}

/** Réponse du serveur : offre gratuite atteinte et pas assez de points → proposer l'achat. */
export function avertirOffre(data: { code?: string; message?: string } | null | undefined, repli: string) {
  if (data?.code === "QUOTA_EXCEEDED") {
    if (confirm(`${data.message || "Votre offre gratuite est utilisée."}\n\nAcheter des points maintenant ?`)) {
      window.location.href = "/acheter-points";
    }
    return;
  }
  alert(data?.message || repli);
}

/** Ajoute la durée d'une vidéo au formulaire (le prix d'une vidéo payée en dépend). */
export async function ajouterDureeVideo(form: FormData, fichier: Blob) {
  if (!fichier.type.startsWith("video/")) return;
  const d = await lireDureeMedia(fichier);
  if (Number.isFinite(d)) form.append("videoDuration", String(Math.round(d)));
}

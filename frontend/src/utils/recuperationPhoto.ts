import { config } from "../config/api";
import { getPhotoUrl } from "./auth";

/**
 * Anciennes photos gardées sur le disque du serveur (/uploads/…), effacé à chaque
 * mise en ligne. Le téléphone en garde souvent une copie (cache de l'application) :
 * on la renvoie au serveur, qui l'enregistre dans la base de données. Le membre n'a
 * rien à faire, et sa photo ne peut plus disparaître.
 */
const CHAMPS: { champ: "photo" | "vitrinePhoto1" | "vitrinePhoto2"; route: string }[] = [
  { champ: "photo", route: "/auth/profile/photo" },
  { champ: "vitrinePhoto1", route: "/auth/profile/vitrine-photo1" },
  { champ: "vitrinePhoto2", route: "/auth/profile/vitrine-photo2" },
];

async function imageEnMemoire(url: string): Promise<Blob | null> {
  try {
    // Cache de l'application d'abord (marche même si le serveur ne l'a plus)
    const enCache = "caches" in window ? await caches.match(url) : undefined;
    const res = enCache || await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return blob.type.startsWith("image/") && blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

export async function recupererPhotosAnciennes(user: Record<string, unknown> | null) {
  const token = localStorage.getItem("token");
  const numeroH = user?.numeroH as string | undefined;
  if (!token || !numeroH) return;
  const cle = `photos-recuperees:${numeroH}`;
  try { if (sessionStorage.getItem(cle)) return; sessionStorage.setItem(cle, "1"); } catch { /* sans stockage : on tente quand même */ }

  const misAJour: Record<string, string> = {};
  for (const { champ, route } of CHAMPS) {
    const valeur = user?.[champ];
    if (typeof valeur !== "string" || !valeur.includes("/uploads/")) continue;
    const url = getPhotoUrl(valeur);
    if (!url) continue;
    const blob = await imageEnMemoire(url);
    if (!blob) continue;
    const fd = new FormData();
    fd.append("photo", new File([blob], "photo.jpg", { type: blob.type }));
    fd.append("numeroH", numeroH);
    try {
      const res = await fetch(`${config.API_BASE_URL}${route}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.photoUrl) misAJour[champ] = data.photoUrl;
    } catch { /* on réessaiera à la prochaine ouverture */ }
  }

  if (Object.keys(misAJour).length === 0) {
    try { sessionStorage.removeItem(cle); } catch { /* rien */ }
    return;
  }
  try {
    const raw = localStorage.getItem("session_user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.userData) Object.assign(parsed.userData, misAJour); else Object.assign(parsed, misAJour);
      localStorage.setItem("session_user", JSON.stringify(parsed));
    }
  } catch { /* rien */ }
  window.dispatchEvent(new Event("session-updated"));
}

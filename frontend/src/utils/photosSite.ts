import { useEffect, useState } from "react";
import type { PhotoSite } from "../components/ecole/PhotosSite";

// Photos du site vitrine d'une école / madrasa (ajoutées depuis son application).
const API = (import.meta.env.VITE_API_URL || "http://localhost:5002").replace(/\/api\/?$/, "");

/** Photos publiques du site (vide si aucune ou si le serveur ne répond pas). */
export function usePhotosSite(tenantCode?: string) {
  const [photos, setPhotos] = useState<PhotoSite[]>([]);
  useEffect(() => {
    if (!tenantCode) return;
    fetch(`${API}/api/pro-public/etablissement/${encodeURIComponent(tenantCode)}/photos`)
      .then(r => r.json()).then(d => { if (d.success) setPhotos(d.photos || []); }).catch(() => {});
  }, [tenantCode]);
  return photos;
}


import { useEffect } from "react";

const API = "http://localhost:5002";

interface DynamicAppManifestProps {
  name: string;
  shortName?: string;
  description?: string;
  /** ID du compte pro — utilisé pour récupérer l'icône via le backend (URL réelle, pas base64) */
  proId?: string;
  /** Fallback si pas de proId (data URI ou URL) — ignoré si proId est fourni */
  iconUrl?: string | null;
  startUrl: string;
  themeColor?: string;
  backgroundColor?: string;
}

/**
 * Remplace dynamiquement le manifest PWA par un manifest propre à l'établissement.
 * Utilise l'URL backend /api/professionals/pwa-icon/:id pour les icônes
 * car Chrome refuse les data URIs dans les manifests PWA.
 */
export default function DynamicAppManifest({
  name,
  shortName,
  description,
  proId,
  iconUrl,
  startUrl,
  themeColor = "#0f4b0f",
  backgroundColor = "#ffffff",
}: DynamicAppManifestProps) {
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!link) return;
    const originalHref = link.getAttribute("href");

    // Priorité : URL backend (si proId) > URL directe > icône Moftal par défaut
    const iconSrc = proId
      ? `${API}/api/professionals/pwa-icon/${proId}`
      : (iconUrl && !iconUrl.startsWith("data:") ? iconUrl : "/icon-192.png");

    const icon512 = proId
      ? `${API}/api/professionals/pwa-icon/${proId}`
      : "/icon-512.png";

    const manifest = {
      id: startUrl,
      name,
      short_name: shortName || name.slice(0, 12),
      description: description || `Gestion ${name}`,
      start_url: startUrl,
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      lang: "fr",
      background_color: backgroundColor,
      theme_color: themeColor,
      icons: [
        { src: iconSrc, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: icon512, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: icon512, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
    const blobUrl = URL.createObjectURL(blob);
    link.setAttribute("href", blobUrl);

    return () => {
      if (originalHref) link.setAttribute("href", originalHref);
      URL.revokeObjectURL(blobUrl);
    };
  }, [name, shortName, description, proId, iconUrl, startUrl, themeColor, backgroundColor]);

  return null;
}

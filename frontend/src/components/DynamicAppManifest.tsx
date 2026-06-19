import { useEffect } from "react";

interface DynamicAppManifestProps {
  /** Nom affiché sous l'icône installée (ex: nom de l'établissement) */
  name: string;
  shortName?: string;
  description?: string;
  /** Logo de l'établissement (data URI, URL absolue ou chemin /uploads/...). Fallback : logo Moftal */
  iconUrl?: string | null;
  /** Page ouverte au lancement de l'app installée (ex: /espace-pro/123) */
  startUrl: string;
  themeColor?: string;
  backgroundColor?: string;
}

function guessMimeType(url: string): string {
  if (url.startsWith("data:")) {
    const match = url.match(/^data:([^;]+);/);
    return match ? match[1] : "image/png";
  }
  if (url.endsWith(".svg")) return "image/svg+xml";
  if (url.endsWith(".webp")) return "image/webp";
  if (url.endsWith(".jpg") || url.endsWith(".jpeg")) return "image/jpeg";
  return "image/png";
}

/**
 * Remplace dynamiquement le manifest PWA de la page par un manifest propre
 * à l'établissement (nom + logo + accès direct à son espace de gestion),
 * pour que l'installation crée une icône indépendante de "Moftal".
 * Le manifest global est restauré au démontage.
 */
export default function DynamicAppManifest({
  name,
  shortName,
  description,
  iconUrl,
  startUrl,
  themeColor = "#065f46",
  backgroundColor = "#ffffff",
}: DynamicAppManifestProps) {
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!link) return;
    const originalHref = link.getAttribute("href");

    const icon = iconUrl || "/logo-moftal.svg";
    const manifest = {
      id: startUrl,
      name,
      short_name: shortName || name.slice(0, 12),
      description: description || `Gestion ${name}`,
      start_url: startUrl,
      scope: startUrl,
      display: "standalone",
      orientation: "portrait",
      lang: "fr",
      background_color: backgroundColor,
      theme_color: themeColor,
      icons: [
        { src: icon, sizes: "192x192", type: guessMimeType(icon), purpose: "any" },
        { src: icon, sizes: "512x512", type: guessMimeType(icon), purpose: "any" },
      ],
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
    const blobUrl = URL.createObjectURL(blob);
    link.setAttribute("href", blobUrl);

    return () => {
      if (originalHref) link.setAttribute("href", originalHref);
      URL.revokeObjectURL(blobUrl);
    };
  }, [name, shortName, description, iconUrl, startUrl, themeColor, backgroundColor]);

  return null;
}

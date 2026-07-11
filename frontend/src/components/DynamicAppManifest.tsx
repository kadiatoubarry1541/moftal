import { useEffect } from "react";
import { config } from "../config/api";

const API = typeof window !== "undefined" ? window.location.origin : "";
// Base de l'API backend (ex: https://api.moftal.com)
const API_BACKEND = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";

interface DynamicAppManifestProps {
  name: string;
  shortName?: string;
  description?: string;
  proId?: string;
  iconUrl?: string | null;
  startUrl: string;
  themeColor?: string;
  backgroundColor?: string;
}

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

    const pageOrigin = encodeURIComponent(window.location.origin);

    // EspacePro (/espace-pro/:id) — manifest par ID de compte
    if (proId && startUrl.startsWith("/espace-pro/")) {
      link.setAttribute("href", `${API_BACKEND}/api/professionals/pro-manifest/${proId}?origin=${pageOrigin}`);
      return () => { if (originalHref) link.setAttribute("href", originalHref); };
    }

    // Pages Gestion (/gestion-clinique/:code, /gestion-ecole/:code, etc.)
    // On extrait le tenantCode depuis la startUrl
    const gestionMatch = startUrl.match(/^\/gestion-[^/]+\/([^/]+)/);
    if (gestionMatch) {
      const tenantCode = gestionMatch[1];
      const encodedStart = encodeURIComponent(startUrl);
      link.setAttribute("href", `${API_BACKEND}/api/professionals/pro-manifest/by-tenant/${tenantCode}?startUrl=${encodedStart}&origin=${pageOrigin}`);
      return () => { if (originalHref) link.setAttribute("href", originalHref); };
    }

    // Page client (/installer-app) — blob manifest personnalisé avec logo du pro
    const iconSrc = proId
      ? `${API}/api/professionals/pwa-icon/${proId}`
      : (iconUrl && !iconUrl.startsWith("data:") ? iconUrl : "/logo-moftal.svg");

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
        { src: iconSrc, sizes: "any", type: proId ? "image/png" : "image/svg+xml", purpose: "any" },
        { src: iconSrc, sizes: "any", type: proId ? "image/png" : "image/svg+xml", purpose: "maskable" },
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

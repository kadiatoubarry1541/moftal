import { useEffect, useState, type CSSProperties } from "react";
import { config } from "../config/api";
import { useTraduction } from "../i18n/traduction";

// Gestion Interne = l'application propre du professionnel :
//  • partout son logo à lui (jamais celui de Moftal) ;
//  • le logo Moftal n'apparaît QUE sur le bouton de retour vers Moftal.

/** Logo de l'établissement. Sans logo enregistré → l'emoji du secteur. */
export function TenantLogo({ tenantCode, logoUrl, fallback, size = 40, radius = 10, style }: {
  tenantCode?: string;
  logoUrl?: string | null;
  fallback: string;
  size?: number;
  radius?: number;
  style?: CSSProperties;
}) {
  const { tr } = useTraduction();
  const [failed, setFailed] = useState(false);
  // logo_url du tenant, sinon photo du compte pro (servie par le serveur)
  const src = logoUrl || (tenantCode ? `${config.API_BASE_URL}/professionals/tenant-icon/${encodeURIComponent(tenantCode)}?fallback=none` : "");
  // Nouveau logo enregistré → on réessaie de l'afficher (même si l'ancien était illisible)
  useEffect(() => { setFailed(false); }, [src]);
  const box: CSSProperties = {
    width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: "hidden",
    display: "flex", alignItems: "center", justifyContent: "center", ...style,
  };
  if (!src || failed) {
    return <div style={{ ...box, fontSize: Math.round(size * 0.55) }}>{fallback}</div>;
  }
  return (
    <div style={{ ...box, background: "white" }}>
      {/* Le logo en entier, jamais coupé */}
      <img src={src} alt={tr("Logo")} onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
}


/** Logo Moftal — à utiliser uniquement dans le bouton de retour. */
export function MoftalMark({ size = 16 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size + 6, height: size + 6, borderRadius: 6, background: "white", flexShrink: 0 }}>
      <img src="/logo-moftal.svg" alt="Moftal" style={{ width: size, height: size }} />
    </span>
  );
}

/** Code identifiant de l'établissement — affiché uniquement dans Paramètres. */
export function TenantCodeCard({ code }: { code?: string }) {
  const { tr } = useTraduction();
  if (!code) return null;
  return (
    <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 20px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{tr("Code identifiant de l'établissement")}</div>
      <div style={{ fontFamily: "monospace", fontSize: 13, color: "#475569", wordBreak: "break-all" }}>{code}</div>
    </div>
  );
}

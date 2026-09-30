import { useEffect, useState } from "react";

// Logo d'un établissement, tel qu'il a été choisi (obligatoire à l'inscription et
// enregistré en base) : affiché en entier, jamais coupé, sur fond blanc.
// Remplit le cadre qui le contient. Seulement si un ancien compte n'a encore aucun
// logo : l'initiale de l'établissement (comme l'icône de son app), jamais un emoji.
// Couleur de chaque secteur (même palette que l'icône de l'app installée)
const COULEUR_SECTEUR: Record<string, string> = {
  clinic: "#1a8f1a", health_worker: "#1a8f1a", school: "#1a8f1a", madrasa: "#0891b2",
  mosque: "#1a8f1a", ngo: "#e11d48", enterprise: "#4f46e5", restaurant: "#ea580c",
  transport: "#1d4ed8", beauty: "#db2777", artisan: "#d97706", security_agency: "#475569",
  mairie: "#1d4ed8", scientist: "#4338ca", commerce: "#d97706", journalist: "#dc2626",
  supplier: "#0e7490", vendor: "#0891b2", reseau: "#2563eb", broker: "#b45309", producer: "#7c3aed",
};

export default function LogoEtablissement({ src, name, type, fontSize = 22, color, radius }: {
  src?: string | null;
  name?: string | null;
  // Secteur : donne la couleur de fond de l'initiale
  type?: string | null;
  fontSize?: number;
  // Fond de l'initiale (sinon celle du secteur, sinon celui du cadre qui l'entoure)
  color?: string;
  radius?: number | string;
}) {
  const [echec, setEchec] = useState(false);
  useEffect(() => { setEchec(false); }, [src]);
  const avecLogo = Boolean(src) && !echec;
  return (
    <span
      style={{
        width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", borderRadius: radius ?? "inherit",
        background: avecLogo ? "white" : (color || (type ? COULEUR_SECTEUR[type] || "#64748b" : undefined)),
      }}
    >
      {avecLogo ? (
        <img
          src={src!}
          alt={name ? `Logo ${name}` : "Logo"}
          onError={() => setEchec(true)}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
      ) : (
        <span style={{ fontSize, fontWeight: 800, color: "white", lineHeight: 1 }}>
          {((name || "").trim()[0] || "•").toUpperCase()}
        </span>
      )}
    </span>
  );
}

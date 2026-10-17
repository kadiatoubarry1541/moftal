import { useState, type CSSProperties } from "react";
import { config } from "../config/api";
import { getPhotoUrl } from "../utils/auth";
import { compressImage } from "../utils/compressImage";

// Case photo d'un article (produit, service, bien) dans la gestion : un carreau
// en pointillés « 📷 Ajouter une photo » montre tout de suite qu'on peut y mettre
// une image. Un appui : on choisit la photo, elle est enregistrée sur le serveur
// et apparaît sur le site. Avec une photo : un appui pour la changer.

const lireImage = async (f: File) => {
  const petite = await compressImage(f, 1200, 0.82);
  return new Promise<string>((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = ko; r.readAsDataURL(petite); });
};

export default function CarreauPhoto({ tenantCode, articleId, imageUrl, couleur, taille = 72, onChange, style }: {
  tenantCode: string;
  articleId: number | string;
  imageUrl?: string | null;
  couleur: string;
  taille?: number;
  onChange: (url: string | null) => void;
  style?: CSSProperties;
}) {
  const [envoi, setEnvoi] = useState(false);

  const choisir = async (f: File) => {
    setEnvoi(true);
    try {
      const image = await lireImage(f);
      const r = await fetch(`${config.API_BASE_URL}/site-mgmt/${encodeURIComponent(tenantCode)}/articles/${articleId}/photo`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) { alert(d.message || "La photo n'a pas été enregistrée. Réessayez."); return; }
      onChange(d.article?.image_url ?? null);
    } catch {
      alert("Pas de connexion : la photo n'a pas été enregistrée. Réessayez avec internet.");
    } finally { setEnvoi(false); }
  };

  return (
    <label title={imageUrl ? "Changer la photo" : "Ajouter une photo"}
      style={{ width: taille, height: taille, flexShrink: 0, borderRadius: 12, overflow: "hidden", cursor: envoi ? "wait" : "pointer", position: "relative", display: "block",
        border: imageUrl ? "1px solid #e2e8f0" : `2px dashed ${couleur}`, background: imageUrl ? "#f1f5f9" : `${couleur}0d`, ...style }}>
      {imageUrl ? (
        <>
          <img src={getPhotoUrl(imageUrl) || ""} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          <span style={{ position: "absolute", insetInline: 0, bottom: 0, background: "rgba(15,23,42,0.6)", color: "white", fontSize: 9, fontWeight: 700, textAlign: "center", padding: "2px 0" }}>📷 Changer</span>
        </>
      ) : (
        <span style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: couleur, gap: 2 }}>
          <span style={{ fontSize: taille > 60 ? 24 : 18 }}>📷</span>
          <span style={{ fontSize: 9, fontWeight: 800, lineHeight: 1.1, textAlign: "center" }}>Ajouter<br />une photo</span>
        </span>
      )}
      {envoi && <span style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⏳</span>}
      <input type="file" accept="image/*" hidden disabled={envoi} onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void choisir(f); }} />
    </label>
  );
}

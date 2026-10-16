import { useEffect, useState } from "react";
import { getPhotoUrl } from "../../utils/auth";
import { useTraduction } from "../../i18n/traduction";
import type { PhotoSite } from "./PhotosSite";

// Site vitrine d'une école / madrasa : galerie des photos ajoutées depuis son
// application. Filtre par rubrique, et la photo s'agrandit au toucher.

export default function GaleriePhotosSite({ photos, couleur }: { photos: PhotoSite[]; couleur: string }) {
  const { tr } = useTraduction();
  const [filtre, setFiltre] = useState("");
  const [ouverte, setOuverte] = useState<number | null>(null);
  const rubriques = Array.from(new Set(photos.map(p => p.categorie || "Autre")));
  const visibles = filtre ? photos.filter(p => (p.categorie || "Autre") === filtre) : photos;

  useEffect(() => {
    if (ouverte === null) return;
    const clavier = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuverte(null);
      if (e.key === "ArrowRight") setOuverte(i => (i === null ? i : (i + 1) % visibles.length));
      if (e.key === "ArrowLeft") setOuverte(i => (i === null ? i : (i - 1 + visibles.length) % visibles.length));
    };
    window.addEventListener("keydown", clavier);
    return () => window.removeEventListener("keydown", clavier);
  }, [ouverte, visibles.length]);

  if (!photos.length) return null;
  const grande = ouverte !== null ? visibles[ouverte] : null;

  return (
    <section id="photos" style={{ background: "white", padding: "60px 20px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>{tr("Notre établissement en images")}</h2>
          <p style={{ fontSize: 15, color: "#64748b", margin: 0 }}>{tr("Découvrez nos locaux, notre vie scolaire et nos moments forts.")}</p>
        </div>
        {rubriques.length > 1 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 }}>
            {["", ...rubriques].map(r => {
              const actif = filtre === r;
              return (
                <button key={r || "tout"} onClick={() => { setFiltre(r); setOuverte(null); }}
                  style={{ padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${actif ? couleur : "#e2e8f0"}`, background: actif ? couleur : "white", color: actif ? "white" : "#334155", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {r ? tr(r) : tr("Tout")}
                </button>
              );
            })}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: 12 }}>
          {visibles.map((p, i) => (
            <button key={p.id} onClick={() => setOuverte(i)} style={{ padding: 0, border: "none", borderRadius: 14, overflow: "hidden", cursor: "zoom-in", background: "#f1f5f9", position: "relative", aspectRatio: "4 / 3" }}>
              <img src={getPhotoUrl(p.image_url) || ""} alt={p.legende || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {p.legende && (
                <span style={{ position: "absolute", insetInline: 0, bottom: 0, padding: "18px 12px 10px", background: "linear-gradient(transparent, rgba(15,23,42,0.75))", color: "white", fontSize: 13, fontWeight: 600, textAlign: "start" }}>{p.legende}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {grande && (
        <div onClick={() => setOuverte(null)} role="dialog" aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15,23,42,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <img src={getPhotoUrl(grande.image_url) || ""} alt={grande.legende || ""} onClick={e => e.stopPropagation()}
            style={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: 10 }} />
          {grande.legende && <p style={{ color: "white", fontSize: 15, marginTop: 12, textAlign: "center" }}>{grande.legende}</p>}
          {visibles.length > 1 && (
            <div style={{ display: "flex", gap: 12, marginTop: 12 }} onClick={e => e.stopPropagation()}>
              <button aria-label={tr("Photo précédente")} onClick={() => setOuverte(i => (i === null ? i : (i - 1 + visibles.length) % visibles.length))} style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: "white", fontSize: 20, cursor: "pointer" }}>‹</button>
              <button aria-label={tr("Photo suivante")} onClick={() => setOuverte(i => (i === null ? i : (i + 1) % visibles.length))} style={{ width: 44, height: 44, borderRadius: "50%", border: "none", background: "white", fontSize: 20, cursor: "pointer" }}>›</button>
            </div>
          )}
          <button onClick={() => setOuverte(null)} aria-label={tr("Fermer")} style={{ position: "absolute", top: 16, insetInlineEnd: 16, width: 40, height: 40, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.15)", color: "white", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
      )}
    </section>
  );
}

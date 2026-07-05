import { useState, useEffect } from "react";
import { config } from "../config/api";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

interface Publication {
  id: string;
  type: string;
  titre: string;
  contenu: string;
  image: string | null;
  video: string | null;
  prix: string | null;
  disponible: boolean;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  annonce: "📢 Annonce",
  produit: "📦 Produit",
  service: "🛠️ Service",
  promotion: "🎉 Promo",
  evenement: "📅 Événement",
  info: "ℹ️ Info",
};

interface Props {
  tenantCode: string;
  accentColor?: string;
  accentDark?: string;
}

export default function ProPublicationsWidget({ tenantCode, accentColor = "#0891b2", accentDark = "#0e7490" }: Props) {
  const [pubs, setPubs] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [openVideo, setOpenVideo] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantCode) return;
    fetch(`${API}/api/pro-vitrine/by-tenant/${tenantCode}/publications`)
      .then(r => r.json())
      .then(d => { if (d.success) setPubs(d.publications || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tenantCode]);

  if (loading || pubs.length === 0) return null;

  return (
    <section id="publications" style={{ background: "#f8fafc", padding: "64px 20px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Titre section */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: "0 0 10px" }}>
            📢 Publications & Actualités
          </h2>
          <p style={{ color: "#64748b", fontSize: 15, margin: 0 }}>
            Produits disponibles, promotions et annonces récentes
          </p>
        </div>

        {/* Grille publications */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
          {pubs.map(pub => (
            <div
              key={pub.id}
              style={{
                background: "white",
                borderRadius: 16,
                boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                overflow: "hidden",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                opacity: pub.disponible ? 1 : 0.6,
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)"; }}
            >
              {/* Média : vidéo OU image */}
              {pub.video ? (
                <div
                  style={{ position: "relative", width: "100%", paddingTop: "56.25%", background: "#0f172a", cursor: "pointer" }}
                  onClick={() => setOpenVideo(pub.video)}
                >
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", border: "2px solid rgba(255,255,255,0.4)" }}>
                      <span style={{ fontSize: 24, paddingLeft: 4 }}>▶</span>
                    </div>
                    <span style={{ position: "absolute", bottom: 8, right: 10, background: "rgba(0,0,0,0.6)", color: "white", fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>
                      📹 Vidéo
                    </span>
                  </div>
                  <video
                    src={pub.video}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }}
                    muted
                    playsInline
                    preload="metadata"
                  />
                </div>
              ) : pub.image ? (
                <div style={{ width: "100%", paddingTop: "56.25%", position: "relative", overflow: "hidden" }}>
                  <img
                    src={pub.image}
                    alt={pub.titre}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              ) : null}

              {/* Contenu */}
              <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Badges */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  <span style={{ background: accentColor + "18", color: accentDark, fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>
                    {TYPE_LABELS[pub.type] || pub.type}
                  </span>
                  <span style={{ background: pub.disponible ? "#dcfce7" : "#f1f5f9", color: pub.disponible ? "#16a34a" : "#94a3b8", fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>
                    {pub.disponible ? "✅ Disponible" : "Indisponible"}
                  </span>
                </div>

                {/* Titre */}
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 6px", lineHeight: 1.35 }}>
                  {pub.titre}
                </h3>

                {/* Contenu */}
                {pub.contenu && (
                  <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 10px", lineHeight: 1.5, flex: 1,
                    display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" } as any}>
                    {pub.contenu}
                  </p>
                )}

                {/* Prix */}
                {pub.prix && !pub.video && (
                  <div style={{ marginTop: "auto", paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: accentColor }}>
                      💰 {pub.prix}
                    </span>
                  </div>
                )}

                {/* Date */}
                <p style={{ fontSize: 11, color: "#94a3b8", margin: "8px 0 0" }}>
                  {new Date(pub.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal lecture vidéo */}
      {openVideo && (
        <div
          onClick={() => setOpenVideo(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 720, position: "relative" }}>
            <button
              onClick={() => setOpenVideo(null)}
              style={{ position: "absolute", top: -40, right: 0, background: "none", border: "none", color: "white", fontSize: 28, cursor: "pointer", padding: 8 }}
            >✕</button>
            <video
              src={openVideo}
              controls
              autoPlay
              style={{ width: "100%", borderRadius: 12, maxHeight: "80vh", background: "#000" }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

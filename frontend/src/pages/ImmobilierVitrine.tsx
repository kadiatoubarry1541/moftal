import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getPhotoUrl } from "../utils/auth";
import ProPublicationsWidget from "../components/ProPublicationsWidget";
import LogoEtablissement from "../components/LogoEtablissement";
import { CouverturePhotoSite, GalerieVitrine } from "../components/PhotosVitrine";
import { usePhotosSite } from "../utils/photosSite";
import EcrireAuSite from "../components/EcrireAuSite";
import { useTraduction, trHors } from "../i18n/traduction";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

const ORANGE      = "#ea580c";
const ORANGE_DARK = "#9a3412";

function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }

function fmtMoney(n: number) { return Number(n) ? (Number(n) || 0).toLocaleString("fr-FR") + " GNF" : trHors("Sur demande"); }

const TYPE_ICONS: Record<string, string> = {
  "villa": "🏡", "appartement": "🏢", "studio": "🛋️", "bureau": "🏛️",
  "magasin": "🏪", "terrain": "🌍", "chambre": "🛏️",
};

export default function ImmobilierVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const photos = usePhotosSite(tenantCode);
  const navigate = useNavigate();
  const { tr } = useTraduction();
  const [agency, setAgency]   = useState<any>(null);
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [filter, setFilter]   = useState("Tous");

  useEffect(() => {
    const code = tenantCode!;
    Promise.all([
      fetch(`${API}/api/pro-public/immobilier/${code}`).then(r => r.json()),
      fetch(`${API}/api/pro-public/immobilier/${code}/data`).then(r => r.json()),
    ]).then(([t, d]) => {
      if (t.success) setAgency(t.tenant);
      else setError((t.message || "Agence introuvable"));
      if (d.success) setData(d);
    }).catch(() => setError(("Impossible de charger l'agence.")))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "white" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid #fed7aa`, borderTopColor: ORANGE, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: ORANGE_DARK, fontSize: 14, fontWeight: 600 }}>{tr("Chargement...")}</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !agency) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🏠</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{tr("Agence introuvable")}</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{error && tr(error)}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: ORANGE, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>{tr("Retour")}</button>
      </div>
    </div>
  );

  const stats      = data?.stats || {};
  const properties = data?.properties || [];

  const statuts = ["Tous", ...Array.from(new Set(properties.map((p: any) => p.statut).filter(Boolean))) as string[]];
  const filtered = filter === "Tous" ? properties : properties.filter((p: any) => p.statut === filter);

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0f172a", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .vn-link{color:#334155;font-weight:500;font-size:14px;cursor:pointer;padding:6px 4px;border:none;background:none;border-bottom:2px solid transparent;transition:all 0.2s;}
        .vn-link:hover{color:#0f172a;border-bottom-color:${ORANGE};}
        .prop-card{transition:all 0.25s;} .prop-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(234,88,12,0.15) !important;}
        @media(max-width:768px){.hero-t{font-size:26px !important}.stats-g{grid-template-columns:1fr 1fr !important}.prop-g{grid-template-columns:1fr 1fr !important}}
        @media(max-width:480px){.prop-g{grid-template-columns:1fr !important}}
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: "#f8fafc", color: "#64748b", borderBottom: "1px solid #e2e8f0", fontSize: 12, padding: "6px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {agency.phone   && <span>📞 {agency.phone}</span>}
            {agency.email   && <span>✉ {agency.email}</span>}
            {agency.address && <span>📍 {agency.address}</span>}
          </div>
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={{ background: "white", borderBottom: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(15,23,42,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "white", border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogoEtablissement src={agency.logo_url} name={agency.name} fontSize={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>{agency.name}</div>
              <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>{tr("Immobilier")}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[["Accueil","hero"],["Biens","properties"],["Contact","contact"]].map(([lbl,id]) => (
              <button key={id} className="vn-link" onClick={() => scrollTo(id)}>{tr(lbl)}</button>
            ))}
          </div>
        </div>
      </nav>

      {/* PHOTO DE COUVERTURE (ajoutée depuis l'Espace Pro) */}
      <CouverturePhotoSite photos={photos} nom={agency?.name} />

      {/* HERO */}
      <section id="hero" style={{ background: "white", padding: "80px 20px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, background: "white", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <LogoEtablissement src={agency.logo_url} name={agency.name} fontSize={46} />
          </div>
          <h1 className="hero-t" style={{ fontSize: 40, fontWeight: 800, color: "#0f172a", margin: "0 0 16px", lineHeight: 1.2 }}>{agency.name}</h1>
          <p style={{ fontSize: 17, color: "#334155", marginBottom: 36, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px" }}>
            {agency.description || tr("Votre partenaire immobilier de confiance. Vente, location et gestion de biens immobiliers de qualité.")}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("properties")} style={{ background: ORANGE, color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 14px rgba(15,23,42,0.12)" }}>
              {tr("Voir les biens")}
            </button>
            <button onClick={() => scrollTo("contact")} style={{ background: "white", color: ORANGE, border: `1.5px solid ${ORANGE}`, borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              {tr("Nous contacter")}
            </button>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: -1, left: 0, right: 0 }}>
          <svg viewBox="0 0 1440 60" fill="white" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 60 }}>
            <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" />
          </svg>
        </div>
      </section>

      {/* STATS */}
      <section style={{ background: "white", padding: "0 20px 48px" }}>
        <div className="stats-g" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, transform: "translateY(-30px)" }}>
          {[
            { icon: "🏠", val: `${stats.total || 0}`, label: "Biens au total" },
            { icon: "🔑", val: `${stats.vacant || 0}`, label: "Disponibles" },
            { icon: "📋", val: tr("Rapide"), label: "Traitement dossier" },
            { icon: "🤝", val: tr("Confiance"), label: "Engagement qualité" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: ORANGE, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{tr(s.label)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BIENS */}
      <section id="properties" style={{ background: "#f8fafc", padding: "60px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a" }}>{tr("Nos Biens Disponibles")}</h2>
          </div>

          {statuts.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
              {statuts.map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  style={{ padding: "6px 16px", borderRadius: 20, border: "1px solid #e2e8f0", cursor: "pointer", fontWeight: filter === s ? 700 : 500, fontSize: 13, background: filter === s ? ORANGE : "white", color: filter === s ? "white" : "#374151", transition: "all 0.15s", textTransform: "capitalize" }}>
                  {tr(s)}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "60px 0", fontSize: 15 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏠</div>
              {tr("Aucun bien disponible pour l'instant.")}
            </div>
          ) : (
            <div className="prop-g" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {filtered.map((p: any, i: number) => (
                <div key={i} className="prop-card" style={{ background: "white", borderRadius: 16, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  {/* Photo du bien (ajoutée depuis la gestion), sinon une illustration */}
                  {p.image_url
                    ? <img src={getPhotoUrl(p.image_url) || ""} alt={p.nom} loading="lazy" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block", background: "#f1f5f9" }} />
                    : <div style={{ aspectRatio: "16 / 9", background: `linear-gradient(135deg, ${ORANGE}10, ${ORANGE}30)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56 }}>{TYPE_ICONS[p.type_bien?.toLowerCase()] || "🏠"}</div>}
                  <div style={{ height: 4, background: p.statut === "vacant" ? ORANGE : "#94a3b8" }} />
                  <div style={{ padding: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${ORANGE}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                        {TYPE_ICONS[p.type_bien?.toLowerCase()] || "🏠"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{p.nom}</div>
                        {p.type_bien && <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "capitalize" }}>{p.type_bien}</div>}
                      </div>
                    </div>
                    {p.superficie && <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>📐 {p.superficie} m²</div>}
                    {(p.quartier || p.ville) && <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>📍 {[p.quartier, p.ville].filter(Boolean).join(", ")}</div>}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: ORANGE }}>{fmtMoney(p.prix)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: p.statut === "vacant" ? "#dcfcdc" : "#f1f5f9", color: p.statut === "vacant" ? "#1a8f1a" : "#64748b" }}>
                        {tr(p.statut || "Disponible")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ background: "white", padding: "60px 20px" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a" }}>{tr("Nous Contacter")}</h2>
            <p style={{ color: "#64748b", fontSize: 15, marginTop: 8 }}>{tr("Notre équipe est disponible pour vous accompagner dans votre projet immobilier.")}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 32 }}>
            {[
              { icon: "📞", label: "Téléphone", val: agency.phone || tr("Non renseigné") },
              { icon: "✉️", label: "Email", val: agency.email || tr("Non renseigné") },
              { icon: "📍", label: "Adresse", val: agency.address || tr("Non renseignée") },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", padding: "28px 20px", border: "1px solid #e2e8f0", borderRadius: 16, background: "#f8fafc" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{tr(item.label)}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{item.val}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center" }}>
              <EcrireAuSite tenantCode={tenantCode!} nomEtablissement={agency.name} couleur={ORANGE} objet={"Demande immobilière"}
                messageInitial={tr("Bonjour, je suis intéressé par un bien immobilier. Pouvez-vous m'aider ?")}
                style={{ background: ORANGE, color: "white", border: "none", borderRadius: 12, padding: "14px 36px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                ✉️ {tr("Nous écrire")}
              </EcrireAuSite>
            </div>
        </div>
      </section>

      <GalerieVitrine photos={photos} couleur="#ea580c" />

      <ProPublicationsWidget tenantCode={tenantCode!} accentColor="#ea580c" accentDark="#9a3412" />

      {/* FOOTER */}
      <footer style={{ background: "#f8fafc", color: "#64748b", borderTop: "1px solid #e2e8f0", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 8 }}>{agency.name}</div>
        <p style={{ fontSize: 12, margin: "0 0 8px" }}>{tr("Agence Immobilière")}</p>
        <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
          <button onClick={() => navigate("/")} style={{ marginLeft: 16, color: "#64748b", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}><img src="/logo-moftal.svg" alt="" style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 5, background: "white", borderRadius: 4, padding: 1 }} />{tr("Retour à la plateforme")}</button>
        </div>
      </footer>
    </div>
  );
}

import MediasPublics from "../components/MediasPublics";
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
import type { EtablissementPublic, DonneesVitrine, BienVitrine } from "../types/vitrine";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

const ORANGE      = "#ea580c";
const ORANGE_DARK = "#9a3412";

function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); }

function fmtMoney(n: number) { return Number(n) ? (Number(n) || 0).toLocaleString("fr-FR") + " GNF" : trHors("Sur demande"); }

const STATUT_LIBELLE: Record<string, string> = { vacant: "Disponible", occupe: "Occupé", travaux: "En travaux" };

const TYPE_ICONS: Record<string, string> = {
  "villa": "🏡", "appartement": "🏢", "studio": "🛋️", "bureau": "🏛️",
  "magasin": "🏪", "terrain": "🌍", "chambre": "🛏️",
};

export default function ImmobilierVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const photos = usePhotosSite(tenantCode);
  const navigate = useNavigate();
  const { tr } = useTraduction();
  const [agency, setAgency]   = useState<EtablissementPublic | null>(null);
  const [data, setData]       = useState<DonneesVitrine<{ properties: BienVitrine[] }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [filter, setFilter]   = useState("Tous");
  // Pré-demande : le visiteur choisit des biens puis envoie sa demande à l'agence (sa gestion)
  const [choix, setChoix]     = useState<number[]>([]);
  const [demandeOuverte, setDemandeOuverte] = useState(false);
  const [client, setClient]   = useState({ nom: "", telephone: "", type_demande: "visite", message: "" });
  const [envoi, setEnvoi]     = useState(false);
  const [erreurDemande, setErreurDemande] = useState("");
  const [demandeEnvoyee, setDemandeEnvoyee] = useState(false);

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

  const statuts = ["Tous", ...Array.from(new Set(properties.map((p) => p.statut).filter(Boolean))) as string[]];
  const filtered = filter === "Tous" ? properties : properties.filter((p) => p.statut === filter);
  const biensChoisis = properties.filter((p) => choix.includes(p.id));
  const basculerChoix = (id: number) => setChoix(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  const ouvrirDemande = () => { setErreurDemande(""); setDemandeEnvoyee(false); setDemandeOuverte(true); };
  const envoyerDemande = async () => {
    if (envoi) return;
    if (!client.nom.trim() || client.telephone.replace(/\D/g, "").length < 8) { setErreurDemande(tr("Indiquez votre nom et votre numéro de téléphone.")); return; }
    setEnvoi(true); setErreurDemande("");
    try {
      const r = await fetch(`${API}/api/pro-public/immobilier/${tenantCode}/demande`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ biens: choix, client_nom: client.nom, client_telephone: client.telephone, type_demande: client.type_demande, message: client.message }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) { setErreurDemande(tr(d.message || "La demande n'a pas été envoyée. Réessayez.")); return; }
      setDemandeEnvoyee(true);
      setChoix([]);
    } catch {
      setErreurDemande(tr("Pas de connexion : la demande n'a pas été envoyée. Vérifiez internet puis réessayez."));
    } finally { setEnvoi(false); }
  };
  // Toutes les photos du bien (la principale d'abord)
  const photosDe = (p: BienVitrine): string[] => {
    const liste = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    return liste.length ? liste : p.image_url ? [p.image_url] : [];
  };

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0f172a", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .vn-link{color:#334155;font-weight:500;font-size:14px;cursor:pointer;padding:6px 4px;border:none;background:none;border-bottom:2px solid transparent;transition:all 0.2s;}
        .vn-link:hover{color:#0f172a;border-bottom-color:${ORANGE};}
        .galerie-bien{scrollbar-width:none}.galerie-bien::-webkit-scrollbar{display:none}
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
            {[["Biens","properties"],["Agence","hero"],["Contact","contact"]].map(([lbl,id]) => (
              <button key={id} className="vn-link" onClick={() => scrollTo(id)}>{tr(lbl)}</button>
            ))}
          </div>
        </div>
      </nav>

      {/* BIENS : chaque bien publié depuis la gestion, image en premier */}
      <section id="properties" style={{ background: "#f8fafc", padding: "24px 16px 48px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 16px" }}>{tr("Nos biens")} ({properties.length})</h2>

          {statuts.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
              {statuts.map(s => (
                <button key={s} onClick={() => setFilter(s)}
                  style={{ padding: "6px 16px", borderRadius: 20, border: "1px solid #e2e8f0", cursor: "pointer", fontWeight: filter === s ? 700 : 500, fontSize: 13, background: filter === s ? ORANGE : "white", color: filter === s ? "white" : "#374151", transition: "all 0.15s", textTransform: "capitalize" }}>
                  {tr(STATUT_LIBELLE[s] || s)}
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
            <div className="prop-g" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {filtered.map((p, i) => (
                <div key={p.id ?? i} className="prop-card" style={{ background: "white", borderRadius: 16, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
                  {/* L'image (ou la vidéo) publiée depuis la gestion occupe toute la carte */}
                  {p.video_url && !p.image_url
                    ? <video src={getPhotoUrl(p.video_url) || p.video_url} controls playsInline preload="metadata" style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", display: "block", background: "black" }} />
                    : photosDe(p).length
                    ? (
                      <div style={{ position: "relative" }}>
                        <div className="galerie-bien" style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", aspectRatio: "1 / 1", background: "#f1f5f9" }}>
                          {photosDe(p).map((src, k) => (
                            <img key={k} src={getPhotoUrl(src) || ""} alt={p.nom} loading="lazy" style={{ flex: "0 0 100%", width: "100%", height: "100%", objectFit: "cover", display: "block", scrollSnapAlign: "start" }} />
                          ))}
                        </div>
                        {photosDe(p).length > 1 && (
                          <span style={{ position: "absolute", right: 8, bottom: 8, background: "rgba(15,23,42,0.7)", color: "white", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 9px" }}>📷 {photosDe(p).length} · {tr("glissez")}</span>
                        )}
                      </div>
                    )
                    : <div style={{ aspectRatio: "1 / 1", background: `linear-gradient(135deg, ${ORANGE}10, ${ORANGE}30)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56 }}>{TYPE_ICONS[p.type_bien?.toLowerCase()] || "🏠"}</div>}
                  <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: ORANGE }}>{fmtMoney(+p.prix)}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: p.statut === "vacant" ? "#dcfcdc" : "#f1f5f9", color: p.statut === "vacant" ? "#1a8f1a" : "#64748b" }}>
                        {tr(STATUT_LIBELLE[p.statut] || p.statut || "Disponible")}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{p.nom}</div>
                    {(p.quartier || p.ville) && <div style={{ fontSize: 12, color: "#64748b" }}>📍 {[p.quartier, p.ville].filter(Boolean).join(", ")}</div>}
                    {p.superficie && <div style={{ fontSize: 12, color: "#64748b" }}>📐 {p.superficie} m²</div>}
                    {/* La vidéo s'affiche ici quand la carte montre déjà les photos ; le vocal toujours */}
                    <MediasPublics videoUrl={p.image_url ? p.video_url : null} audioUrl={p.audio_url} />
                    {p.description && <div style={{ fontSize: 12, color: "#475569", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.description}</div>}
                    <button onClick={() => basculerChoix(p.id)}
                      style={{ marginTop: "auto", background: choix.includes(p.id) ? "white" : ORANGE, color: choix.includes(p.id) ? ORANGE : "white", border: `1.5px solid ${ORANGE}`, borderRadius: 10, padding: "9px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer", width: "100%" }}>
                      {choix.includes(p.id) ? `✓ ${tr("Choisi — retirer")}` : `➕ ${tr("Ajouter à ma demande")}`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

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
        <div className="stats-g" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, transform: "translateY(-30px)" }}>
          {[
            { icon: "🏠", val: `${stats.total || 0}`, label: "Biens au total" },
            { icon: "🔑", val: `${stats.vacant || 0}`, label: "Disponibles" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: ORANGE, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{tr(s.label)}</div>
            </div>
          ))}
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

      {/* MA DEMANDE — barre en bas de l'écran dès qu'un bien est choisi */}
      {choix.length > 0 && !demandeOuverte && (
        <button onClick={ouvrirDemande}
          style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: "max(16px, env(safe-area-inset-bottom, 0px))", zIndex: 70, background: ORANGE, color: "white", border: "none", borderRadius: 999, padding: "14px 22px", fontWeight: 800, fontSize: 15, cursor: "pointer", boxShadow: "0 6px 24px rgba(234,88,12,0.4)", whiteSpace: "nowrap" }}>
          📩 {tr(choix.length > 1 ? "{n} biens choisis" : "{n} bien choisi", { n: choix.length })} — {tr("Envoyer ma demande")}
        </button>
      )}

      {/* PRÉ-DEMANDE — envoyée directement à l'agence */}
      {demandeOuverte && (
        <div onClick={e => { if (e.target === e.currentTarget && !envoi) setDemandeOuverte(false); }}
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "white", width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", borderRadius: "20px 20px 0 0", padding: "20px 18px 28px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>📩 {tr("Ma demande")}</div>
              <button onClick={() => setDemandeOuverte(false)} disabled={envoi} aria-label={tr("Fermer")} style={{ border: "none", background: "#f1f5f9", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>

            {demandeEnvoyee ? (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ fontSize: 48 }}>✅</div>
                <p style={{ fontSize: 16, fontWeight: 800, margin: "8px 0" }}>{tr("Demande envoyée à {nom}", { nom: agency.name })}</p>
                <p style={{ fontSize: 14, color: "#475569", margin: "0 0 16px" }}>{tr("L'agence vous contactera au {tel}.", { tel: client.telephone })}</p>
                <button onClick={() => { setDemandeOuverte(false); setDemandeEnvoyee(false); }} style={{ width: "100%", padding: 14, background: ORANGE, color: "white", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>{tr("Fermer")}</button>
              </div>
            ) : (<>
              <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                {biensChoisis.map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid #f1f5f9", borderRadius: 10 }}>
                    {photosDe(p)[0]
                      ? <img src={getPhotoUrl(photosDe(p)[0]) || ""} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                      : <span style={{ width: 48, height: 48, borderRadius: 8, background: `${ORANGE}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{TYPE_ICONS[p.type_bien?.toLowerCase()] || "🏠"}</span>}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{p.nom}</div>
                      <div style={{ fontSize: 12, color: ORANGE, fontWeight: 700 }}>{fmtMoney(+p.prix)}</div>
                    </div>
                    <button onClick={() => basculerChoix(p.id)} aria-label={tr("Retirer")} style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 30, height: 30, cursor: "pointer", flexShrink: 0 }}>✕</button>
                  </div>
                ))}
                {biensChoisis.length === 0 && <p style={{ color: "#94a3b8", fontSize: 14, margin: 0 }}>{tr("Aucun bien choisi : touchez « Ajouter à ma demande » sous un bien.")}</p>}
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[["visite", tr("🔑 Visiter")], ["location", tr("📝 Louer")], ["achat", tr("🤝 Acheter")]].map(([v, lbl]) => (
                    <button key={v} onClick={() => setClient(c => ({ ...c, type_demande: v }))}
                      style={{ flex: 1, minWidth: 90, padding: "10px 8px", borderRadius: 10, border: `1.5px solid ${client.type_demande === v ? ORANGE : "#e2e8f0"}`, background: client.type_demande === v ? `${ORANGE}10` : "white", color: client.type_demande === v ? ORANGE : "#334155", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                      {lbl}
                    </button>
                  ))}
                </div>
                <input value={client.nom} onChange={e => setClient(c => ({ ...c, nom: e.target.value }))} placeholder={tr("Votre nom *")} autoComplete="name"
                  style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14 }} />
                <input value={client.telephone} onChange={e => setClient(c => ({ ...c, telephone: e.target.value }))} placeholder={tr("Votre téléphone *")} type="tel" autoComplete="tel"
                  style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14 }} />
                <textarea value={client.message} onChange={e => setClient(c => ({ ...c, message: e.target.value }))} rows={2}
                  placeholder={tr("Jour de visite souhaité, questions… (facultatif)")}
                  style={{ padding: "12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", resize: "vertical" }} />
              </div>

              {erreurDemande && <p style={{ color: "#b91c1c", fontSize: 13, fontWeight: 600, margin: "12px 0 0" }}>{erreurDemande}</p>}
              <button onClick={envoyerDemande} disabled={envoi || biensChoisis.length === 0}
                style={{ width: "100%", marginTop: 14, padding: 14, background: ORANGE, color: "white", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer", opacity: envoi || biensChoisis.length === 0 ? 0.6 : 1 }}>
                {envoi ? tr("⏳ Envoi…") : tr("Envoyer ma demande à l'agence")}
              </button>
            </>)}
          </div>
        </div>
      )}

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

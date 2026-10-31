import MediasPublics from "./MediasPublics";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { config } from "../config/api";
import ProPublicationsWidget from "./ProPublicationsWidget";
import LogoEtablissement from "./LogoEtablissement";
import EcrireAuSite from "./EcrireAuSite";
import { CouverturePhotoSite, GalerieVitrine } from "./PhotosVitrine";
import { usePhotosSite } from "../utils/photosSite";
import { getPhotoUrl } from "../utils/auth";
import { useTraduction } from "../i18n/traduction";
import type { AnnonceVitrine, ArticleVitrine, DonneesVitrine, EtablissementPublic } from "../types/vitrine";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";

// Modèle de site commun aux artisans, salons de beauté, fournisseurs,
// producteurs et vendeurs : même page pour tous les comptes d'un secteur,
// seuls les couleurs, icônes et textes du secteur changent.
// Les images d'abord : photo de couverture, galerie, grandes vignettes.

export interface ModeleVitrine {
  /** Type dans l'adresse de l'API publique (/api/pro-public/<type>/…) */
  type: string;
  metier: string;          // « Artisan », « Salon de beauté »…
  emoji: string;
  couleur: string;
  couleurFoncee: string;
  fond: string;            // fond clair du secteur
  introuvable: string;     // « Artisan introuvable »
  descriptionParDefaut: string;
  titreArticles: string;   // « Nos services »
  rienAAfficher: string;
  boutonArticle: string;   // « Demander »
  objetDemande: string;    // « Demande de devis »
  boutonContact: string;   // « ✉️ Demander un devis »
  iconesCategories?: Record<string, string>;
  chiffres: (stats: Record<string, number>, articles: ArticleVitrine[], categories: string[]) => { icone: string; valeur: string | number; libelle: string }[];
}

function prixDe(a: ArticleVitrine) { return +(a.prix ?? a.prix_detail ?? a.prix_unitaire ?? 0) || 0; }
const fmtMoney = (n: number) => `${(Number(n) || 0).toLocaleString("fr-FR")} GNF`;

export default function VitrineSimple({ tenantCode, modele: m }: { tenantCode: string; modele: ModeleVitrine }) {
  const navigate = useNavigate();
  const { tr } = useTraduction();
  const [pro, setPro] = useState<EtablissementPublic | null>(null);
  const [data, setData] = useState<DonneesVitrine<{ products: ArticleVitrine[]; services: ArticleVitrine[]; works: ArticleVitrine[]; announcements: AnnonceVitrine[] }> | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [categorie, setCategorie] = useState("");
  const [recherche, setRecherche] = useState("");
  const photos = usePhotosSite(tenantCode);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/pro-public/${m.type}/${tenantCode}`).then(r => r.json()),
      fetch(`${API}/api/pro-public/${m.type}/${tenantCode}/data`).then(r => r.json()),
    ]).then(([t, d]) => {
      if (t.success) setPro(t.tenant); else setErreur((t.message || m.introuvable));
      if (d.success) setData(d);
    }).catch(() => setErreur(("Impossible de charger cette page. Vérifiez votre connexion.")))
      .finally(() => setChargement(false));
  }, [tenantCode, m.type, m.introuvable]);

  const articles: ArticleVitrine[] = useMemo(() => data?.products || data?.services || data?.works || [], [data]);
  const annonces: AnnonceVitrine[] = data?.announcements || [];
  const categories = useMemo(() => Array.from(new Set(articles.map(a => a.categorie).filter(Boolean))) as string[], [articles]);
  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return articles.filter(a => (!categorie || a.categorie === categorie) && (!q || String(a.nom || a.name || "").toLowerCase().includes(q)));
  }, [articles, categorie, recherche]);
  const voir = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  if (chargement) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "white" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid ${m.fond}`, borderTopColor: m.couleur, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: m.couleurFoncee, fontSize: 14, fontWeight: 600 }}>{tr("Chargement…")}</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (erreur || !pro) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 400 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{m.emoji}</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{tr(m.introuvable)}</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{erreur && tr(erreur)}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: m.couleur, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>{tr("Retour à l'accueil")}</button>
      </div>
    </div>
  );

  const iconeDe = (a: ArticleVitrine) => m.iconesCategories?.[a.categorie] || m.emoji;
  const boutonPlein = { background: m.couleur, color: "white", border: "none", borderRadius: 12, padding: "13px 24px", fontWeight: 700, fontSize: 15, cursor: "pointer" } as const;
  const boutonClair = { background: "white", color: m.couleur, border: `2px solid ${m.couleur}`, borderRadius: 12, padding: "11px 22px", fontWeight: 700, fontSize: 15, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 } as const;

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0f172a", minHeight: "100vh", background: "#f8fafc" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .vs-carte{transition:transform .2s, box-shadow .2s} .vs-carte:hover{transform:translateY(-3px);box-shadow:0 12px 28px rgba(15,23,42,.10)}
        .vs-desc{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
        @media(max-width:640px){.vs-titre{font-size:26px !important}.vs-chiffres{grid-template-columns:repeat(3,1fr) !important}.vs-nom-barre{max-width:150px}}
      `}</style>

      {/* BARRE DU HAUT */}
      <nav style={{ background: "white", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 8px rgba(15,23,42,.05)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 16px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0", background: "white", flexShrink: 0 }}>
              <LogoEtablissement src={pro.logo_url} name={pro.name} fontSize={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="vs-nom-barre" style={{ fontWeight: 800, fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pro.name}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{tr(m.metier)}</div>
            </div>
          </div>
          <EcrireAuSite tenantCode={tenantCode} nomEtablissement={pro.name} couleur={m.couleur} objet={m.objetDemande}
            style={{ ...boutonPlein, padding: "9px 14px", fontSize: 13, flexShrink: 0 }}>
            ✉️ {tr("Nous écrire")}
          </EcrireAuSite>
        </div>
      </nav>

      {/* PHOTO DE COUVERTURE (ajoutée depuis l'Espace Pro) */}
      <CouverturePhotoSite photos={photos} nom={pro.name} />

      {/* PRÉSENTATION */}
      <section style={{ background: `linear-gradient(180deg, ${m.fond} 0%, white 100%)`, padding: "48px 16px 40px", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", animation: "fadeUp .5s ease" }}>
          <div style={{ width: 96, height: 96, borderRadius: 24, overflow: "hidden", background: "white", border: "1px solid #e2e8f0", margin: "0 auto 18px", boxShadow: "0 8px 24px rgba(15,23,42,.08)" }}>
            <LogoEtablissement src={pro.logo_url} name={pro.name} fontSize={46} />
          </div>
          <span style={{ background: `${m.couleur}18`, color: m.couleurFoncee, padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{m.emoji} {tr(m.metier)}</span>
          <h1 className="vs-titre" style={{ fontSize: 36, fontWeight: 800, margin: "12px 0 10px", lineHeight: 1.2 }}>{pro.name}</h1>
          {(pro.city || pro.address) && (
            <p style={{ color: "#475569", fontSize: 14, margin: "0 0 10px" }}>
              📍 {pro.city || pro.address}
            </p>
          )}
          <p style={{ color: "#334155", fontSize: 16, lineHeight: 1.65, margin: "0 auto 24px", maxWidth: 560 }}>{pro.description || tr(m.descriptionParDefaut)}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            {articles.length > 0 && <button onClick={() => voir("articles")} style={boutonPlein}>{tr(m.titreArticles)}</button>}
            <EcrireAuSite tenantCode={tenantCode} nomEtablissement={pro.name} couleur={m.couleur} objet={m.objetDemande} style={boutonClair}>
              {tr(m.boutonContact)}
            </EcrireAuSite>
            {pro.phone && <a href={`tel:${pro.phone}`} style={boutonClair}>📞 {tr("Appeler")}</a>}
          </div>
        </div>
      </section>

      {/* CHIFFRES */}
      <section style={{ padding: "0 16px" }}>
        <div className="vs-chiffres" style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {m.chiffres(data?.stats || {}, articles, categories).map(c => (
            <div key={c.libelle} style={{ background: "white", borderRadius: 14, padding: "16px 10px", textAlign: "center", border: "1px solid #f1f5f9", boxShadow: "0 4px 16px rgba(15,23,42,.06)" }}>
              <div style={{ fontSize: 26 }}>{c.icone}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: m.couleur, margin: "4px 0 2px" }}>{c.valeur}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{tr(c.libelle)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ARTICLES / SERVICES */}
      <section id="articles" style={{ padding: "48px 16px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, textAlign: "center", margin: "0 0 20px" }}>{tr(m.titreArticles)}</h2>
          {articles.length > 6 && (
            <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder={tr("🔍 Rechercher…")}
              style={{ display: "block", width: "100%", maxWidth: 420, margin: "0 auto 14px", padding: "11px 14px", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 14, boxSizing: "border-box", background: "white" }} />
          )}
          {categories.length > 1 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 20 }}>
              {["", ...categories].map(c => {
                const actif = categorie === c;
                return (
                  <button key={c || "tout"} onClick={() => setCategorie(c)}
                    style={{ padding: "7px 14px", borderRadius: 20, border: `1.5px solid ${actif ? m.couleur : "#e2e8f0"}`, background: actif ? m.couleur : "white", color: actif ? "white" : "#334155", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    {c ? `${m.iconesCategories?.[c] || ""} ${tr(c)}`.trim() : tr("Tout")}
                  </button>
                );
              })}
            </div>
          )}
          {visibles.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>{m.emoji}</div>{recherche ? tr("Rien trouvé pour « {q} »", { q: recherche }) : tr(m.rienAAfficher)}
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: 16 }}>
              {visibles.map((a, i) => {
                const nom = a.nom || a.name;
                const prix = prixDe(a);
                return (
                  <div key={a.id ?? i} className="vs-carte" style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    {a.image_url
                      ? <img src={getPhotoUrl(a.image_url) || ""} alt={nom} loading="lazy" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block", background: "#f1f5f9" }} />
                      : <div style={{ aspectRatio: "4 / 3", background: `linear-gradient(135deg, ${m.fond}, ${m.couleur}22)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 56 }}>{iconeDe(a)}</div>}
                    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                      {a.categorie && <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em" }}>{tr(a.categorie)}</div>}
                      <div style={{ fontWeight: 800, fontSize: 16, lineHeight: 1.3 }}>{nom}</div>
                      {a.description && <div className="vs-desc" style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{a.description}</div>}
                      {a.zone_intervention && <div style={{ fontSize: 12, color: "#64748b" }}>📍 {a.zone_intervention}</div>}
                      <MediasPublics videoUrl={a.video_url} audioUrl={a.audio_url} />
                      <div style={{ marginTop: "auto", paddingTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <div>
                          {prix > 0 && <div style={{ fontWeight: 800, fontSize: 17, color: m.couleur }}>{fmtMoney(prix)}{a.unite ? <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}> / {a.unite}</span> : null}</div>}
                          {+a.prix_gros > 0 && <div style={{ fontSize: 12, color: "#64748b" }}>{tr("Gros : {prix}", { prix: fmtMoney(+a.prix_gros) })}</div>}
                        </div>
                        <EcrireAuSite tenantCode={tenantCode} nomEtablissement={pro.name} couleur={m.couleur} objet={m.objetDemande}
                          messageInitial={tr("Bonjour, je suis intéressé(e) par : {article}.", { article: `${nom}${prix > 0 ? ` (${fmtMoney(prix)})` : ""}` })}
                          style={{ background: `${m.couleur}14`, color: m.couleurFoncee, border: "none", borderRadius: 10, padding: "8px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                          {tr(m.boutonArticle)}
                        </EcrireAuSite>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* PHOTOS */}
      <GalerieVitrine photos={photos} couleur={m.couleur} />

      {/* ANNONCES */}
      {annonces.length > 0 && (
        <section style={{ padding: "40px 16px" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 16px" }}>📢 {tr("Annonces")}</h2>
            <div style={{ display: "grid", gap: 10 }}>
              {annonces.map((a, i) => (
                <div key={i} style={{ background: "white", border: "1px solid #e2e8f0", borderInlineStart: `4px solid ${m.couleur}`, borderRadius: 12, padding: "14px 18px" }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{a.titre}</div>
                  {a.contenu && <div style={{ fontSize: 14, color: "#475569", marginTop: 4, lineHeight: 1.5 }}>{a.contenu}</div>}
                  {a.created_at && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 6 }}>{new Date(a.created_at).toLocaleDateString("fr-FR")}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CONTACT */}
      <section id="contact" style={{ background: "white", padding: "48px 16px", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 20px" }}>{tr("Nous contacter")}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { icone: "📞", libelle: "Téléphone", valeur: pro.phone, lien: pro.phone && `tel:${pro.phone}` },
              { icone: "✉️", libelle: "E-mail", valeur: pro.email, lien: pro.email && `mailto:${pro.email}` },
              { icone: "📍", libelle: "Adresse", valeur: pro.address || pro.city },
            ].filter(c => c.valeur).map(c => (
              <a key={c.libelle} href={c.lien || undefined} style={{ display: "block", padding: "20px 14px", border: "1px solid #e2e8f0", borderRadius: 14, background: "#f8fafc", color: "#0f172a", textDecoration: "none" }}>
                <div style={{ fontSize: 30, marginBottom: 6 }}>{c.icone}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".06em" }}>{tr(c.libelle)}</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4, wordBreak: "break-word" }}>{c.valeur}</div>
              </a>
            ))}
          </div>
          <EcrireAuSite tenantCode={tenantCode} nomEtablissement={pro.name} couleur={m.couleur} objet={m.objetDemande} style={{ ...boutonPlein, padding: "14px 36px" }}>
            {tr(m.boutonContact)}
          </EcrireAuSite>
        </div>
      </section>

      <ProPublicationsWidget tenantCode={tenantCode} accentColor={m.couleur} accentDark={m.couleurFoncee} />

      <footer style={{ background: "#f8fafc", borderTop: "1px solid #e2e8f0", color: "#64748b", padding: "28px 16px", textAlign: "center" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>{pro.name}</div>
        <div style={{ fontSize: 12 }}>{tr(m.metier)}</div>
        <button onClick={() => navigate("/")} style={{ marginTop: 14, color: "#64748b", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>
          <img src="/logo-moftal.svg" alt="" style={{ width: 14, height: 14, verticalAlign: "middle", marginInlineEnd: 5, background: "white", borderRadius: 4, padding: 1 }} />{tr("Retour à la plateforme")}
        </button>
      </footer>
    </div>
  );
}

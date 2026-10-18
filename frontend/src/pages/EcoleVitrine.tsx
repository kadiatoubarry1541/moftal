import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import ProPublicationsWidget from "../components/ProPublicationsWidget";
import LogoEtablissement from "../components/LogoEtablissement";
import EcrireAuSite from "../components/EcrireAuSite";
import GaleriePhotosSite from "../components/ecole/GaleriePhotosSite";
import { usePhotosSite } from "../utils/photosSite";
import { getPhotoUrl } from "../utils/auth";
import { useTraduction } from "../i18n/traduction";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

const GREEN       = "#1a8f1a";
const GREEN_DARK  = "#156315";
const GREEN_LIGHT = "#22c55e";
const GREEN_BG    = "#f0fdf0";

function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString("fr-FR") : "";
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

// Icône d'une matière, pour la reconnaître d'un coup d'œil
function iconeMatiere(m: string) {
  const t = m.toLowerCase();
  const table: [RegExp, string][] = [
    [/math/, "➗"], [/fran|lecture|langue|litt/, "📖"], [/angl|english|espagn|allem|arabe/, "🗣️"], [/phys|chim/, "⚗️"],
    [/svt|biolog|sciences? nat|scienc/, "🧬"], [/hist|géo|geo/, "🌍"], [/info|numér|ordinat/, "💻"], [/sport|eps|physique et sport/, "⚽"],
    [/dessin|art|musique/, "🎨"], [/philo/, "💭"], [/éco|econ|compta/, "📊"], [/coran|islam|religi|tawhid|fiqh/, "📿"], [/civi|moral/, "⚖️"],
  ];
  return table.find(([r]) => r.test(t))?.[1] || "📘";
}

export default function EcoleVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const { tr, locale } = useTraduction();
  const [school, setSchool] = useState<any>(null);
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<{ moyenne: number; total: number }>({ moyenne: 0, total: 0 });
  const [enrollForm, setEnrollForm] = useState({ nom_enfant: "", date_naissance: "", niveau_souhaite: "", nom_parent: "", telephone_parent: "" });
  const [enrollSending, setEnrollSending] = useState(false);
  const [enrollSent, setEnrollSent] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const photos = usePhotosSite(tenantCode);

  useEffect(() => {
    const code = tenantCode!;
    Promise.all([
      fetch(`${API}/api/pro-public/school/${code}`).then(r => r.json()),
      fetch(`${API}/api/pro-public/school/${code}/data`).then(r => r.json()),
      fetch(`${API}/api/pro-public/school/${code}/reviews`).then(r => r.json()),
    ]).then(([t, d, rv]) => {
      if (t.success) setSchool(t.tenant);
      else setError(t.message || "École introuvable");
      if (d.success) setData(d);
      if (rv.success) { setReviews(rv.reviews); setReviewStats({ moyenne: rv.moyenne, total: rv.total }); }
    }).catch(() => setError("Impossible de charger l'école."))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  const submitEnroll = async () => {
    if (!enrollForm.nom_enfant.trim() || !enrollForm.telephone_parent.trim()) { setEnrollError("Nom de l'enfant et téléphone sont obligatoires."); return; }
    setEnrollError(""); setEnrollSending(true);
    try {
      const r = await fetch(`${API}/api/pro-public/school/${tenantCode}/enroll-request`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(enrollForm)
      });
      const d = await r.json();
      if (d.success) setEnrollSent(true);
      else setEnrollError(d.message || "Erreur lors de l'envoi.");
    } catch { setEnrollError("Impossible de joindre le serveur."); }
    finally { setEnrollSending(false); }
  };

  const isLoggedIn = !!localStorage.getItem("token");
  const couverture = photos.find(p => p.est_couverture) || photos[0];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "white" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid #bbf7bb`, borderTopColor: GREEN, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#334155", fontSize: 14, fontWeight: 600 }}>{tr("Chargement en cours...")}</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !school) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🏫</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>{tr("École introuvable")}</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{tr(error || "Cette école n'existe pas ou n'est pas disponible.")}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: GREEN, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>{tr("Retour à l'accueil")}</button>
      </div>
    </div>
  );

  const stats = data?.stats || {};
  const staff = data?.staff || [];
  const classrooms = data?.classrooms || [];
  const matieres: string[] = data?.matieres || [];
  const feeTypes = data?.feeTypes || [];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0f172a", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        .vn-link { color:#334155; font-weight:500; font-size:14px; cursor:pointer; padding:6px 4px; border:none; background:none; border-bottom:2px solid transparent; transition:all 0.2s; }
        .vn-link:hover { color:#0f172a; border-bottom-color:${GREEN}; }
        .staff-card:hover { transform:translateY(-3px); box-shadow:0 8px 24px rgba(0,0,0,0.1) !important; }
        .staff-card { transition: all 0.25s ease; }
        @media(max-width:768px){.hero-t{font-size:26px !important}.stats-g{grid-template-columns:1fr 1fr !important}.staff-g{grid-template-columns:1fr 1fr !important}}
        @media(max-width:480px){.staff-g{grid-template-columns:1fr !important}}
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: "#f8fafc", color: "#334155", fontSize: 12, padding: "6px 0", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {school.phone   && <span>📞 {school.phone}</span>}
            {school.email   && <span>✉ {school.email}</span>}
            {school.address && <span>📍 {school.address}</span>}
            {school.horaires && <span>🕐 {school.horaires}</span>}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {school.phone_urgence && (
              <a href={`tel:${school.phone_urgence}`} style={{ background: "#ef4444", color: "white", borderRadius: 6, padding: "3px 12px", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>{tr("🚨 Urgence")}</a>
            )}
          </div>
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={{ background: "white", borderBottom: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(15,23,42,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "white", border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogoEtablissement src={school.logo_url} name={school.name} fontSize={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a", lineHeight: 1.1 }}>{school.name}</div>
              <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>{tr("École")}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            {[["Accueil","hero"],...(photos.length ? [["Photos","photos"]] : []),["Enseignants","teachers"],["Inscription","enroll"],["Contact","contact"]].map(([lbl,id]) => (
              <button key={id} className="vn-link" onClick={() => scrollTo(id)}>{tr(lbl)}</button>
            ))}
          </div>
        </div>
      </nav>

      {/* PHOTO DE COUVERTURE (ajoutée depuis l'application de l'école) */}
      {couverture && (
        <div style={{ position: "relative", height: "clamp(220px, 45vw, 480px)", background: "#0f172a", overflow: "hidden" }}>
          <img src={getPhotoUrl(couverture.image_url) || ""} alt={couverture.legende || school.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          {couverture.legende && (
            <span style={{ position: "absolute", insetInline: 0, bottom: 0, padding: "40px 20px 14px", background: "linear-gradient(transparent, rgba(15,23,42,0.7))", color: "white", fontSize: 14, fontWeight: 600, textAlign: "center" }}>{couverture.legende}</span>
          )}
        </div>
      )}

      {/* HERO */}
      <section id="hero" style={{ background: "white", padding: "80px 20px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, background: "white", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <LogoEtablissement src={school.logo_url} name={school.name} fontSize={46} />
          </div>
          <h1 className="hero-t" style={{ fontSize: 40, fontWeight: 800, color: "#0f172a", margin: "0 0 16px", lineHeight: 1.2 }}>{school.name}</h1>
          <p style={{ fontSize: 17, color: "#334155", marginBottom: 36, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px" }}>
            {school.description || tr("Une école d'excellence dédiée à la réussite de chaque élève. Formation de qualité, environnement sûr et épanouissant.")}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("enroll")} style={{ background: GREEN, color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 14px rgba(15,23,42,0.12)" }}>
              {tr("Inscrire mon enfant")}
            </button>
            <button onClick={() => scrollTo("contact")} style={{ background: "white", color: GREEN, border: `1.5px solid ${GREEN}`, borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
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
            { icon: "👨‍🏫", val: `${stats.staff || 0}`, label: tr("Enseignants qualifiés") },
            { icon: "👨‍🎓", val: `${stats.students || 0}`, label: tr("Élèves inscrits") },
            { icon: "🏫", val: `${stats.classes || 0}`, label: tr("Classes") },
            reviewStats.total > 0
              ? { icon: "🌟", val: `${reviewStats.moyenne}/5`, label: tr("{n} avis parents", { n: reviewStats.total }) }
              : { icon: "📚", val: `${stats.niveaux || 0}`, label: tr("Niveaux proposés") },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: GREEN, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ENSEIGNANTS */}
      {staff.length > 0 && (
        <section id="teachers" style={{ background: "#f8fafc", padding: "60px 20px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <span style={{ background: `${GREEN}18`, color: GREEN, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{tr("L'équipe pédagogique")}</span>
              <h2 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 12px", color: "#0f172a" }}>{tr("Nos Enseignants")}</h2>
              <p style={{ color: "#64748b", fontSize: 15 }}>{tr("Des éducateurs passionnés dédiés à la réussite de vos enfants.")}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 230px), 1fr))", gap: 20 }}>
              {staff.map((s: any, i: number) => {
                const matieresProf = Array.from(new Set([s.matiere, s.specialite, ...(Array.isArray(s.matieres) ? s.matieres : [])].filter(Boolean))) as string[];
                return (
                  <div key={i} className="staff-card" style={{ background: "white", borderRadius: 18, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
                    {/* Photo de l'enseignant */}
                    <div style={{ aspectRatio: "1 / 1", background: `linear-gradient(135deg,${GREEN},${GREEN_LIGHT})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 48, fontWeight: 800 }}>
                      {s.photo_url
                        ? <img src={getPhotoUrl(s.photo_url) || ""} alt={`${s.prenom || ""} ${s.nom || ""}`.trim()} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        : <>{(s.prenom || "?").charAt(0)}{(s.nom || "").charAt(0)}</>}
                    </div>
                    <div style={{ padding: "16px 16px 18px", textAlign: "center" }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>{s.prenom} {s.nom}</div>
                      <div style={{ fontSize: 13, color: GREEN, fontWeight: 700, marginTop: 4 }}>
                        {[s.role && tr(s.role), ...matieresProf.map(m => tr(m))].filter(Boolean).join(" · ")}
                      </div>
                      {s.profil && <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.55, margin: "10px 0 0" }}>{s.profil}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* MATIÈRES ENSEIGNÉES (celles des fiches des enseignants) */}
      {matieres.length > 0 && (
        <section style={{ background: "white", padding: "60px 20px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h2 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{tr("Nos matières")}</h2>
              <p style={{ color: "#64748b", fontSize: 15 }}>{tr("Les matières enseignées par nos professeurs.")}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 160px), 1fr))", gap: 12 }}>
              {matieres.map((m: string) => (
                <div key={m} style={{ background: GREEN_BG, border: `1px solid ${GREEN}33`, borderRadius: 14, padding: "18px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>{iconeMatiere(m)}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: GREEN_DARK }}>{tr(m)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CLASSES PROPOSÉES */}
      {classrooms.length > 0 && (
        <section style={{ background: "#f8fafc", padding: "60px 20px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h2 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{tr("Nos Classes")}</h2>
              <p style={{ color: "#64748b", fontSize: 15 }}>{tr("{n} classe(s) proposée(s) par notre école.", { n: classrooms.length })}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))", gap: 16 }}>
              {classrooms.map((c: any, i: number) => (
                <div key={i} style={{ background: "white", borderRadius: 16, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                  {c.photo_url
                    ? <img src={getPhotoUrl(c.photo_url) || ""} alt={c.nom} loading="lazy" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block" }} />
                    : <div style={{ aspectRatio: "4 / 3", background: `linear-gradient(135deg, ${GREEN_BG}, ${GREEN}22)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>🏫</div>}
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{c.nom}</div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{[c.niveau && tr(c.niveau), c.capacite && tr("{n} places", { n: c.capacite })].filter(Boolean).join(" · ")}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FRAIS DE SCOLARITÉ */}
      {feeTypes.length > 0 && (
        <section style={{ background: "#f8fafc", padding: "60px 20px" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{tr("Frais de scolarité")}</h2>
              <p style={{ color: "#64748b", fontSize: 15 }}>{tr("Indicatifs — contactez-nous pour le détail complet.")}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 16 }}>
              {feeTypes.map((f: any, i: number) => (
                <div key={i} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "18px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{tr(f.type_frais)}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: GREEN }}>
                    {(+f.min_montant).toLocaleString(locale)}{f.max_montant !== f.min_montant ? ` - ${(+f.max_montant).toLocaleString(locale)}` : ""} {tr("GNF")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* AVIS PARENTS/ÉLÈVES */}
      {reviews.length > 0 && (
        <section style={{ background: "white", padding: "60px 20px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{tr("Avis de nos parents")}</h2>
              <p style={{ color: "#64748b", fontSize: 15 }}>{tr("Note moyenne : {moyenne}/5 sur {total} avis", { moyenne: reviewStats.moyenne, total: reviewStats.total })}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="staff-g">
              {reviews.slice(0, 6).map((r: any, i: number) => (
                <div key={i} style={{ background: "#f8fafc", borderRadius: 16, padding: "22px 20px", border: "1px solid #e2e8f0" }}>
                  <div style={{ color: "#f59e0b", fontSize: 15, marginBottom: 8 }}>{"★".repeat(r.note)}{"☆".repeat(5 - r.note)}</div>
                  {r.commentaire && <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: "0 0 10px" }}>{r.commentaire}</p>}
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{r.nom_auteur || tr("Parent")}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GALERIE */}
      <GaleriePhotosSite photos={photos} couleur={GREEN} />

      {/* POURQUOI NOUS */}
      <section style={{ background: "#f8fafc", padding: "60px 20px", color: "#0f172a" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 12, color: "#0f172a" }}>{tr("Pourquoi choisir notre école ?")}</h2>
          <p style={{ fontSize: 15, color: "#334155", marginBottom: 48, maxWidth: 500, margin: "0 auto 48px" }}>{tr("Un cadre d'apprentissage moderne pour préparer les leaders de demain.")}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 900, margin: "0 auto" }}>
            {[
              { icon: "📚", title: "Programme de qualité", desc: "Un curriculum complet et adapté aux standards nationaux avec des méthodes pédagogiques modernes." },
              { icon: "👨‍🏫", title: "Enseignants qualifiés", desc: "Une équipe pédagogique diplômée et expérimentée, passionnée par l'enseignement." },
              { icon: "🛡️", title: "Environnement sécurisé", desc: "Un cadre sûr et bienveillant où chaque élève peut s'épanouir librement." },
            ].map((item, i) => (
              <div key={i} style={{ background: "white", borderRadius: 16, padding: "28px 24px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#0f172a" }}>{tr(item.title)}</h3>
                <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, margin: 0 }}>{tr(item.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INSCRIPTION CTA */}
      <section id="enroll" style={{ background: "white", padding: "60px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>{tr("Inscrire votre enfant")}</h2>
          <p style={{ color: "#475569", fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
            {tr("Remplissez ce formulaire, l'école vous recontacte pour finaliser l'inscription — pas besoin de compte Moftal pour commencer.")}
          </p>
          <div style={{ background: "white", borderRadius: 16, border: `1px solid ${GREEN}33`, padding: "28px 28px", textAlign: "start" }}>
            {enrollSent ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <p style={{ fontSize: 14, color: GREEN_DARK, fontWeight: 700, margin: 0 }}>{tr("Demande envoyée !")}</p>
                <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{tr("L'école vous contactera au {tel}.", { tel: enrollForm.telephone_parent })}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <input placeholder={tr("Nom de l'enfant *")} value={enrollForm.nom_enfant} onChange={e => setEnrollForm(f => ({ ...f, nom_enfant: e.target.value }))}
                    style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none" }} />
                  <input type="date" placeholder={tr("Date de naissance")} value={enrollForm.date_naissance} onChange={e => setEnrollForm(f => ({ ...f, date_naissance: e.target.value }))}
                    style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none" }} />
                </div>
                <input placeholder={tr("Niveau souhaité (ex: CP1, 7ème année, Licence 1...)")} value={enrollForm.niveau_souhaite} onChange={e => setEnrollForm(f => ({ ...f, niveau_souhaite: e.target.value }))}
                  style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <input placeholder={tr("Nom du parent")} value={enrollForm.nom_parent} onChange={e => setEnrollForm(f => ({ ...f, nom_parent: e.target.value }))}
                    style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none" }} />
                  <input placeholder={tr("Téléphone du parent *")} value={enrollForm.telephone_parent} onChange={e => setEnrollForm(f => ({ ...f, telephone_parent: e.target.value }))}
                    style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none" }} />
                </div>
                {enrollError && <p style={{ color: "#ef4444", fontSize: 12, margin: 0 }}>{tr(enrollError)}</p>}
                <button onClick={submitEnroll} disabled={enrollSending}
                  style={{ background: enrollSending ? `${GREEN}88` : GREEN, color: "white", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, cursor: enrollSending ? "not-allowed" : "pointer" }}>
                  {enrollSending ? tr("Envoi...") : tr("Envoyer la demande de pré-inscription")}
                </button>
              </div>
            )}
          </div>
          {!isLoggedIn && (
            <p style={{ marginTop: 20, fontSize: 12, color: "#64748b" }}>
              {tr("Vous avez déjà un compte Moftal ?")} <button onClick={() => navigate("/login-membre")} style={{ color: GREEN_DARK, background: "none", border: "none", textDecoration: "underline", cursor: "pointer", fontSize: 12, padding: 0 }}>{tr("Connectez-vous")}</button> {tr("pour suivre l'inscription en ligne.")}
            </p>
          )}
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ background: "white", padding: "60px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{tr("Nous Contacter")}</h2>
            <p style={{ color: "#64748b", fontSize: 15 }}>{tr("Notre équipe est disponible pour répondre à toutes vos questions.")}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 780, margin: "0 auto" }}>
            {[
              { icon: "📞", label: tr("Téléphone"), val: school.phone || tr("Non renseigné") },
              { icon: "✉️", label: tr("Email"), val: school.email || tr("Non renseigné") },
              { icon: "📍", label: tr("Adresse"), val: school.address || tr("Non renseignée") },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", padding: "28px 20px", border: "1px solid #e2e8f0", borderRadius: 16, background: "#f8fafc" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{item.val}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
              <EcrireAuSite tenantCode={tenantCode!} nomEtablissement={school.name} couleur={GREEN} objet={tr("Demande d'information")}
                messageInitial={tr("Bonjour ! Je souhaite des informations sur l'école.")}
                style={{ background: GREEN, color: "white", border: "none", borderRadius: 12, padding: "14px 36px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                {tr("✉️ Nous écrire")}
              </EcrireAuSite>
            </div>
        </div>
      </section>

      <ProPublicationsWidget tenantCode={tenantCode!} accentColor="#16a34a" accentDark="#14532d" />

      {/* FOOTER */}
      <footer style={{ background: "#f8fafc", color: "#64748b", borderTop: "1px solid #e2e8f0", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "white", border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogoEtablissement src={school.logo_url} name={school.name} fontSize={18} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>{school.name}</span>
          </div>
          <p style={{ fontSize: 12, margin: "0 0 8px" }}>{tr("École")}</p>
          <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
            <button onClick={() => navigate("/")} style={{ marginInlineStart: 16, color: "#64748b", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>
              <img src="/logo-moftal.svg" alt="" style={{ width: 14, height: 14, verticalAlign: "middle", marginInlineEnd: 5, background: "white", borderRadius: 4, padding: 1 }} />{tr("Retour à la plateforme")}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import ProPublicationsWidget from "../components/ProPublicationsWidget";
import LogoEtablissement from "../components/LogoEtablissement";
import GaleriePhotosSite from "../components/ecole/GaleriePhotosSite";
import { usePhotosSite } from "../utils/photosSite";
import { getPhotoUrl } from "../utils/auth";

const API = (config.API_BASE_URL || "http://localhost:7777/api").replace(/\/api\/?$/, "");

const TEAL       = "#1a8f1a";
const TEAL_LIGHT = "#14b8a6";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

// Description des matières connues (les matières affichées sont celles des enseignants)
const MATIERES_MADRASA: { re: RegExp; icon: string; desc: string }[] = [
  { re: /coran|hifz|tajw/i, icon: "📖", desc: "Mémorisation et récitation du Saint Coran selon les règles de tajwid." },
  { re: /fiqh/i, icon: "📚", desc: "Jurisprudence islamique appliquée à la vie quotidienne." },
  { re: /aqid|tawhid/i, icon: "⭐", desc: "Fondements de la foi et de la croyance islamique." },
  { re: /hadith/i, icon: "📜", desc: "Étude des paroles et actes du Prophète ﷺ." },
  { re: /arabe/i, icon: "🌍", desc: "Apprentissage de la langue du Coran, lecture et expression." },
  { re: /sira|histoire/i, icon: "🕌", desc: "Biographie du Prophète Mohamed ﷺ et histoire islamique." },
];

export default function MadrasaVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [madrasa, setMadrasa] = useState<any>(null);
  const [data, setData]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const photos = usePhotosSite(tenantCode);

  useEffect(() => {
    const code = tenantCode!;
    Promise.all([
      fetch(`${API}/api/pro-public/madrasa/${code}`).then(r => r.json()),
      fetch(`${API}/api/pro-public/madrasa/${code}/data`).then(r => r.json()),
    ]).then(([t, d]) => {
      if (t.success) setMadrasa(t.tenant);
      else setError(t.message || "Madrasa introuvable");
      if (d.success) setData(d);
    }).catch(() => setError("Impossible de charger la madrasa."))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  const isLoggedIn = !!localStorage.getItem("token");
  const couverture = photos.find(p => p.est_couverture) || photos[0];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "white" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid #99f6e4`, borderTopColor: TEAL, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "#334155", fontSize: 14, fontWeight: 600 }}>Chargement en cours...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !madrasa) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🕌</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Madrasa introuvable</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{error}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: TEAL, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600 }}>Retour à l'accueil</button>
      </div>
    </div>
  );

  const stats = data?.stats || {};
  const staff = data?.staff || [];
  const halaqas = data?.halaqas || [];
  const matieres: string[] = data?.matieres || [];

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0f172a", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
        .vn-link{color:#334155;font-weight:500;font-size:14px;cursor:pointer;padding:6px 4px;border:none;background:none;border-bottom:2px solid transparent;transition:all 0.2s;}
        .vn-link:hover{color:#0f172a;border-bottom-color:${TEAL};}
        .staff-card{transition:all 0.25s ease;}
        .staff-card:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(0,0,0,0.1) !important;}
        @media(max-width:768px){.hero-t{font-size:26px !important}.stats-g{grid-template-columns:1fr 1fr !important}.staff-g{grid-template-columns:1fr 1fr !important}}
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: "#f8fafc", color: "#334155", fontSize: 12, padding: "6px 0", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {madrasa.phone   && <span>📞 {madrasa.phone}</span>}
            {madrasa.email   && <span>✉ {madrasa.email}</span>}
            {madrasa.address && <span>📍 {madrasa.address}</span>}
          </div>
        </div>
      </div>

      {/* NAVBAR */}
      <nav style={{ background: "white", borderBottom: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(15,23,42,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "white", border: "1px solid #e2e8f0", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogoEtablissement src={madrasa.logo_url} name={madrasa.name} fontSize={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a", lineHeight: 1.1 }}>{madrasa.name}</div>
              <div style={{ fontSize: 10, color: "#64748b", fontFamily: "monospace" }}>Madrasa</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            {[["Accueil","hero"],...(photos.length ? [["Photos","photos"]] : []),["Enseignants","teachers"],["Inscription","enroll"],["Contact","contact"]].map(([lbl,id]) => (
              <button key={id} className="vn-link" onClick={() => scrollTo(id)}>{lbl}</button>
            ))}
          </div>
        </div>
      </nav>

      {/* PHOTO DE COUVERTURE (ajoutée depuis l'application de la madrasa) */}
      {couverture && (
        <div style={{ position: "relative", height: "clamp(220px, 45vw, 480px)", background: "#0f172a", overflow: "hidden" }}>
          <img src={getPhotoUrl(couverture.image_url) || ""} alt={couverture.legende || madrasa.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          {couverture.legende && (
            <span style={{ position: "absolute", insetInline: 0, bottom: 0, padding: "40px 20px 14px", background: "linear-gradient(transparent, rgba(15,23,42,0.7))", color: "white", fontSize: 14, fontWeight: 600, textAlign: "center" }}>{couverture.legende}</span>
          )}
        </div>
      )}

      {/* HERO */}
      <section id="hero" style={{ background: "white", padding: "80px 20px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, background: "white", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <LogoEtablissement src={madrasa.logo_url} name={madrasa.name} fontSize={46} />
          </div>
          <div style={{ fontSize: 14, color: "#64748b", marginBottom: 8, letterSpacing: "0.1em" }}>بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</div>
          <h1 className="hero-t" style={{ fontSize: 40, fontWeight: 800, color: "#0f172a", margin: "0 0 16px", lineHeight: 1.2 }}>{madrasa.name}</h1>
          <p style={{ fontSize: 17, color: "#334155", marginBottom: 36, lineHeight: 1.65, maxWidth: 560, margin: "0 auto 36px" }}>
            {madrasa.description || "Un établissement d'enseignement islamique dédié à la transmission du Coran et des sciences islamiques dans un cadre bienveillant et rigoureux."}
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("enroll")} style={{ background: TEAL, color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 14px rgba(15,23,42,0.12)" }}>
              Inscrire mon enfant
            </button>
            <button onClick={() => scrollTo("contact")} style={{ background: "white", color: TEAL, border: `1.5px solid ${TEAL}`, borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
              Nous contacter
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
            { icon: "👨‍🏫", val: `${stats.staff || 0}`, label: "Enseignants islamiques" },
            { icon: "🎒", val: `${stats.students || 0}`, label: "Étudiants" },
            { icon: "📖", val: `${stats.halaqas || 0}`, label: "Halaqas (cercles)" },
            { icon: "📿", val: "Sunnah", label: "Méthode d'enseignement" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: TEAL, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MATIÈRES ENSEIGNÉES — celles des fiches des enseignants (réelles) */}
      {matieres.length > 0 && (
        <section style={{ background: "#f8fafc", padding: "60px 20px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <span style={{ background: `${TEAL}18`, color: TEAL, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Programme</span>
              <h2 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 12px", color: "#0f172a" }}>Matières Enseignées</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))", gap: 16 }}>
              {matieres.map((m: string) => {
                const connue = MATIERES_MADRASA.find(x => x.re.test(m));
                return (
                  <div key={m} style={{ background: "white", borderRadius: 16, padding: "22px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: `${TEAL}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 12 }}>{connue?.icon || "📘"}</div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>{m}</h3>
                    {connue && <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.6 }}>{connue.desc}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ENSEIGNANTS — photo, nom, matière, profil */}
      {staff.length > 0 && (
        <section id="teachers" style={{ background: "white", padding: "60px 20px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Nos Enseignants</h2>
              <p style={{ color: "#64748b", fontSize: 15 }}>Des enseignants qualifiés pour transmettre la science islamique.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 230px), 1fr))", gap: 20 }}>
              {staff.map((s: any, i: number) => (
                <div key={i} className="staff-card" style={{ background: "white", borderRadius: 18, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ aspectRatio: "1 / 1", background: `linear-gradient(135deg,${TEAL},${TEAL_LIGHT})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 48, fontWeight: 800 }}>
                    {s.photo_url
                      ? <img src={getPhotoUrl(s.photo_url) || ""} alt={`${s.prenom || ""} ${s.nom || ""}`.trim()} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <>{(s.prenom || "?").charAt(0)}{(s.nom || "").charAt(0)}</>}
                  </div>
                  <div style={{ padding: "16px 16px 18px", textAlign: "center" }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>{s.prenom} {s.nom}</div>
                    <div style={{ fontSize: 13, color: TEAL, fontWeight: 700, marginTop: 4 }}>{[s.role, s.specialite].filter(Boolean).join(" · ")}</div>
                    {s.profil && <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.55, margin: "10px 0 0" }}>{s.profil}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HALAQAS PROPOSÉES */}
      {halaqas.length > 0 && (
        <section style={{ background: "#f8fafc", padding: "60px 20px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h2 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Nos Halaqas</h2>
              <p style={{ color: "#64748b", fontSize: 15 }}>{halaqas.length} halaqa(s) proposée(s).</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))", gap: 16 }}>
              {halaqas.map((h: any, i: number) => (
                <div key={i} style={{ background: "white", borderRadius: 16, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                  {h.photo_url
                    ? <img src={getPhotoUrl(h.photo_url) || ""} alt={h.nom} loading="lazy" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block" }} />
                    : <div style={{ aspectRatio: "4 / 3", background: `linear-gradient(135deg, ${TEAL}12, ${TEAL}30)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>📖</div>}
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{h.nom}</div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>{[h.niveau, h.capacite && `${h.capacite} places`].filter(Boolean).join(" · ")}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GALERIE */}
      <GaleriePhotosSite photos={photos} couleur={TEAL} />

      {/* INSCRIPTION CTA */}
      <section id="enroll" style={{ background: "#f8fafc", padding: "60px 20px", color: "#0f172a", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12, color: "#0f172a" }}>Inscrire votre enfant</h2>
          <p style={{ fontSize: 15, color: "#334155", lineHeight: 1.7, marginBottom: 32 }}>
            Offrez à votre enfant une éducation islamique de qualité. Présentez-vous avec votre numéro Moftal pour démarrer l'inscription.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {isLoggedIn ? (
              <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 32px", fontSize: 14, color: "#334155", fontWeight: 600 }}>
                ✅ Vous êtes connecté — présentez-vous à la madrasa avec votre numéro Moftal.
              </div>
            ) : null}
            {isLoggedIn ? null : (
              <>
                <button onClick={() => navigate("/login-membre")} style={{ background: TEAL, color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                  Se connecter
                </button>
                <button onClick={() => navigate("/vivant")} style={{ background: "white", color: TEAL, border: `1.5px solid ${TEAL}`, borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                  Créer un compte Moftal
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" style={{ background: "white", padding: "60px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Nous Contacter</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 780, margin: "0 auto" }}>
            {[
              { icon: "📞", label: "Téléphone", val: madrasa.phone || "Non renseigné" },
              { icon: "✉️", label: "Email", val: madrasa.email || "Non renseigné" },
              { icon: "📍", label: "Adresse", val: madrasa.address || "Non renseignée" },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: "center", padding: "28px 20px", border: "1px solid #e2e8f0", borderRadius: 16, background: "#f8fafc" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProPublicationsWidget tenantCode={tenantCode!} accentColor="#0d9488" accentDark="#134e4a" />

      {/* FOOTER */}
      <footer style={{ background: "#f8fafc", color: "#64748b", borderTop: "1px solid #e2e8f0", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a", marginBottom: 8 }}>{madrasa.name}</div>
          <p style={{ fontSize: 12, margin: "0 0 8px" }}>Madrasa Islamique</p>
          <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
            <button onClick={() => navigate("/")} style={{ marginLeft: 16, color: "#64748b", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}><img src="/logo-moftal.svg" alt="" style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 5, background: "white", borderRadius: 4, padding: 1 }} />Retour à la plateforme</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

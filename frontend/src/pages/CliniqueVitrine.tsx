import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";

const API_BASE = config.API_BASE_URL || "http://localhost:7777/api";

const TEAL = "#0d9488";
const TEAL_DARK = "#0f766e";
const TEAL_LIGHT = "#14b8a6";

const SERVICES_ICONS: Record<string, string> = {
  "Médecine générale": "🩺",
  "Chirurgie": "🔪",
  "Maternité": "👶",
  "Pédiatrie": "🧒",
  "Ophtalmologie": "👁️",
  "Gynécologie": "💊",
  "Urgences": "🚨",
  "Radiologie": "🔬",
  "Cardiologie": "❤️",
  "Neurologie": "🧠",
  "Dermatologie": "🌿",
  "Orthopédie": "🦴",
  "Oncologie": "🎗️",
};

function getServiceIcon(service: string) {
  return SERVICES_ICONS[service] || "🏥";
}

function getInitials(nom: string, prenom: string) {
  return `${(prenom || "").charAt(0)}${(nom || "").charAt(0)}`.toUpperCase();
}

export default function CliniqueVitrine() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [clinic, setClinic] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPatient, setIsPatient] = useState<boolean | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLoggedIn = !!localStorage.getItem("token");

  useEffect(() => {
    const code = tenantCode!;
    Promise.all([
      fetch(`${API_BASE}/clinic-public/${code}`).then(r => r.json()),
      fetch(`${API_BASE}/clinic-public/${code}/staff`).then(r => r.json()),
      fetch(`${API_BASE}/clinic-public/${code}/services`).then(r => r.json()),
    ]).then(([c, s, sv]) => {
      if (c.success) setClinic(c.clinic);
      else setError(c.message || "Clinique introuvable");
      if (s.success) setStaff(s.staff);
      if (sv.success) setServices(sv.services);
    }).catch(() => setError("Impossible de charger la clinique."))
      .finally(() => setLoading(false));
  }, [tenantCode]);

  useEffect(() => {
    if (!isLoggedIn || !tenantCode) return;
    const token = localStorage.getItem("token");
    fetch(`${API_BASE}/clinic-public/${tenantCode}/my-portal`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(d => {
      setIsPatient(d.success === true);
    }).catch(() => setIsPatient(false));
  }, [isLoggedIn, tenantCode]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f0fdfa" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid #e2e8f0`, borderTopColor: TEAL, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: TEAL_DARK, fontSize: 14, fontWeight: 600 }}>Chargement en cours...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error || !clinic) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏥</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Clinique introuvable</h2>
        <p style={{ color: "#64748b", marginBottom: 24 }}>{error || "Cette clinique n'existe pas ou n'est pas disponible."}</p>
        <button onClick={() => navigate("/")} style={{ padding: "10px 24px", background: TEAL, color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
          Retour à l'accueil
        </button>
      </div>
    </div>
  );

  const doctors = staff.filter(s => s.role === "Médecin" || s.role === "Spécialiste");
  const otherStaff = staff.filter(s => s.role !== "Médecin" && s.role !== "Spécialiste");

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#0f172a", minHeight: "100vh" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
        .vitrine-nav-link { color: rgba(255,255,255,0.85); font-weight: 500; font-size: 14px; cursor: pointer; padding: 6px 4px; border-bottom: 2px solid transparent; transition: all 0.2s; background: none; border: none; }
        .vitrine-nav-link:hover { color: white; border-bottom-color: rgba(255,255,255,0.6); }
        .service-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(13,148,136,0.15) !important; }
        .doctor-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.1) !important; }
        .service-card, .doctor-card { transition: all 0.25s ease; }
        @media (max-width: 768px) {
          .hero-title { font-size: 28px !important; }
          .hero-subtitle { font-size: 15px !important; }
          .hero-buttons { flex-direction: column !important; align-items: center !important; }
          .services-grid { grid-template-columns: 1fr 1fr !important; }
          .doctors-grid { grid-template-columns: 1fr 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .services-grid { grid-template-columns: 1fr !important; }
          .doctors-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* ── BARRE TOP ─────────────────────────────────────────────────────────── */}
      <div style={{ background: TEAL_DARK, color: "rgba(255,255,255,0.8)", fontSize: 12, padding: "6px 0" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 20 }}>
            {clinic.phone && <span>📞 {clinic.phone}</span>}
            {clinic.email && <span>✉ {clinic.email}</span>}
            {clinic.address && <span>📍 {clinic.address}</span>}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {!isLoggedIn && (
              <button onClick={() => navigate("/login-membre", { state: { from: `/clinique/${tenantCode}/espace-patient` } })}
                style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, padding: "3px 12px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                Se connecter
              </button>
            )}
            <span style={{ opacity: 0.5 }}>Moftal · Plateforme de santé</span>
          </div>
        </div>
      </div>

      {/* ── NAVBAR PRINCIPALE ─────────────────────────────────────────────────── */}
      <nav style={{ background: TEAL, boxShadow: "0 2px 12px rgba(0,0,0,0.15)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          {/* Logo + Nom */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.2)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {clinic.logo_url
                ? <img src={clinic.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <span style={{ fontSize: 22 }}>✚</span>
              }
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17, color: "white", lineHeight: 1.1 }}>{clinic.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontFamily: "monospace" }}>Centre Médical · {tenantCode}</div>
            </div>
          </div>

          {/* Navigation desktop */}
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 20 }} className="nav-links">
              {[["Accueil", "hero"], ["Services", "services"], ["Médecins", "doctors"], ["Contact", "contact"]].map(([label, id]) => (
                <button key={id} className="vitrine-nav-link" onClick={() => scrollTo(id)}>{label}</button>
              ))}
            </div>
            {isLoggedIn && isPatient === true && (
              <button onClick={() => navigate(`/clinique/${tenantCode}/espace-patient`)}
                style={{ background: "white", color: TEAL, border: "none", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                Mon Espace Patient
              </button>
            )}
            {isLoggedIn && isPatient === false && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontStyle: "italic" }}>Non enregistré</div>
            )}
            {!isLoggedIn && (
              <button onClick={() => navigate("/login-membre", { state: { from: `/clinique/${tenantCode}/espace-patient` } })}
                style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 8, padding: "8px 18px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Espace Patient
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section id="hero" style={{ background: `linear-gradient(135deg, ${TEAL_DARK} 0%, ${TEAL} 50%, #0891b2 100%)`, padding: "80px 20px 100px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")", zIndex: 0 }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.6s ease" }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, background: "rgba(255,255,255,0.15)", margin: "0 auto 24px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "2px solid rgba(255,255,255,0.3)" }}>
            {clinic.logo_url
              ? <img src={clinic.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontSize: 42 }}>✚</span>
            }
          </div>
          <h1 className="hero-title" style={{ fontSize: 40, fontWeight: 800, color: "white", margin: "0 0 16px", textShadow: "0 2px 8px rgba(0,0,0,0.2)", lineHeight: 1.2 }}>
            {clinic.name}
          </h1>
          <p className="hero-subtitle" style={{ fontSize: 18, color: "rgba(255,255,255,0.85)", marginBottom: 32, lineHeight: 1.6 }}>
            {clinic.description || "Votre santé est notre priorité. Des soins de qualité avec une équipe médicale expérimentée."}
          </p>
          <div className="hero-buttons" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => scrollTo("services")}
              style={{ background: "white", color: TEAL_DARK, border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
              Nos Services
            </button>
            {isLoggedIn && isPatient === true ? (
              <button onClick={() => navigate(`/clinique/${tenantCode}/espace-patient`)}
                style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "2px solid rgba(255,255,255,0.5)", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                Mon Espace Patient
              </button>
            ) : (
              <button onClick={() => scrollTo("contact")}
                style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "2px solid rgba(255,255,255,0.5)", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                Nous Contacter
              </button>
            )}
          </div>
        </div>
        {/* Vague décorative */}
        <div style={{ position: "absolute", bottom: -1, left: 0, right: 0 }}>
          <svg viewBox="0 0 1440 60" fill="white" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 60 }}>
            <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" />
          </svg>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────────── */}
      <section style={{ background: "white", padding: "0 20px 48px" }}>
        <div className="stats-grid" style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, transform: "translateY(-30px)" }}>
          {[
            { icon: "👨‍⚕️", val: `${doctors.length}+`, label: "Médecins spécialistes" },
            { icon: "🏥", val: `${services.length}+`, label: "Services médicaux" },
            { icon: "⏰", val: "7j/7", label: "Disponibilité" },
            { icon: "🌟", val: "Excellence", label: "Soins de qualité" },
          ].map((s, i) => (
            <div key={i} style={{ background: "white", borderRadius: 14, padding: "20px 16px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: TEAL, marginBottom: 4 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SERVICES ──────────────────────────────────────────────────────────── */}
      <section id="services" style={{ background: "#f8fafc", padding: "60px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ background: `${TEAL}18`, color: TEAL, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Nos Spécialités</span>
            <h2 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 12px", color: "#0f172a" }}>Nos Services Médicaux</h2>
            <p style={{ color: "#64748b", fontSize: 15, maxWidth: 500, margin: "0 auto" }}>Une équipe pluridisciplinaire pour prendre soin de vous à chaque étape de votre vie.</p>
          </div>

          {services.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0", fontSize: 14 }}>Aucun service encore affiché. Revenez bientôt !</div>
          ) : (
            <div className="services-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {services.map((svc, i) => {
                const doctors_for_service = staff.filter(s => s.service === svc && (s.role === "Médecin" || s.role === "Spécialiste"));
                return (
                  <div key={i} className="service-card" style={{ background: "white", borderRadius: 16, padding: "28px 24px", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", cursor: "default" }}>
                    <div style={{ width: 56, height: 56, borderRadius: 14, background: `${TEAL}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 16 }}>
                      {getServiceIcon(svc)}
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>{svc}</h3>
                    {doctors_for_service.length > 0 && (
                      <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>
                        {doctors_for_service.map(d => `Dr. ${d.prenom} ${d.nom}`).join(", ")}
                      </p>
                    )}
                    <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 4, color: TEAL, fontSize: 12, fontWeight: 600 }}>
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      Disponible
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── MÉDECINS ──────────────────────────────────────────────────────────── */}
      {doctors.length > 0 && (
        <section id="doctors" style={{ background: "white", padding: "60px 20px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span style={{ background: `${TEAL}18`, color: TEAL, padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>L'équipe</span>
              <h2 style={{ fontSize: 32, fontWeight: 800, margin: "12px 0 12px", color: "#0f172a" }}>Nos Médecins</h2>
              <p style={{ color: "#64748b", fontSize: 15 }}>Des professionnels de santé qualifiés et dévoués à votre bien-être.</p>
            </div>
            <div className="doctors-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
              {doctors.map((d, i) => (
                <div key={i} className="doctor-card" style={{ background: "white", borderRadius: 16, padding: "28px 20px", textAlign: "center", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg,${TEAL},${TEAL_LIGHT})`, margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 24, fontWeight: 700 }}>
                    {getInitials(d.nom, d.prenom)}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>Dr. {d.prenom} {d.nom}</div>
                  <div style={{ fontSize: 12, color: TEAL, fontWeight: 600, marginBottom: 4 }}>{d.specialite || d.role}</div>
                  {d.service && <div style={{ fontSize: 11, color: "#94a3b8" }}>{d.service}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── PHARMACIE ─────────────────────────────────────────────────────────── */}
      <section style={{ background: "white", padding: "60px 20px", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", background: `linear-gradient(135deg,${TEAL_DARK},${TEAL})`, borderRadius: 20, padding: "36px 40px", color: "white" }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, flexShrink: 0 }}>💊</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Service inclus</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Pharmacie intégrée</h2>
              <p style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.6, margin: 0, maxWidth: 500 }}>
                Notre pharmacie dispose d'un stock complet de médicaments. Vos ordonnances sont traitées directement sur place — pas besoin de vous déplacer ailleurs.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
              {[
                "Médicaments prescrits disponibles sur place",
                "Traitement instantané de vos ordonnances",
                "Suivi en ligne de vos ordonnances",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <svg width="14" height="14" fill="none" stroke="white" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── POURQUOI NOUS ─────────────────────────────────────────────────────── */}
      <section style={{ background: `linear-gradient(135deg,${TEAL_DARK},${TEAL})`, padding: "60px 20px", color: "white" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 12 }}>Pourquoi nous choisir ?</h2>
          <p style={{ fontSize: 15, opacity: 0.85, marginBottom: 48, maxWidth: 500, margin: "0 auto 48px" }}>Nous combinons expertise médicale et technologie pour vous offrir les meilleurs soins.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 900, margin: "0 auto" }}>
            {[
              { icon: "🏆", title: "Expertise reconnue", desc: "Des médecins diplômés et expérimentés dans leurs domaines respectifs." },
              { icon: "⚡", title: "Prise en charge rapide", desc: "Des rendez-vous optimisés pour minimiser votre temps d'attente." },
              { icon: "🔒", title: "Confidentialité totale", desc: "Vos données médicales sont protégées et strictement confidentielles." },
            ].map((item, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.1)", borderRadius: 16, padding: "28px 24px", border: "1px solid rgba(255,255,255,0.2)" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{item.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ESPACE PATIENT CTA ────────────────────────────────────────────────── */}
      <section style={{ background: "#f0fdfa", padding: "60px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>Espace Patient Numérique</h2>
          <p style={{ color: "#475569", fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
            {isLoggedIn && isPatient === true
              ? `Bienvenue ! Consultez vos rendez-vous, ordonnances et dossiers médicaux directement en ligne.`
              : `Consultez vos rendez-vous, ordonnances et dossiers médicaux directement en ligne. Disponible pour les patients enregistrés à ${clinic.name}.`
            }
          </p>
          {isLoggedIn && isPatient === true && (
            <button onClick={() => navigate(`/clinique/${tenantCode}/espace-patient`)}
              style={{ background: TEAL, color: "white", border: "none", borderRadius: 12, padding: "14px 36px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: `0 4px 20px ${TEAL}44` }}>
              Accéder à mon espace →
            </button>
          )}
          {isLoggedIn && isPatient === false && (
            <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "16px 24px", fontSize: 14, color: "#92400e" }}>
              Vous n'êtes pas encore enregistré dans cette clinique. Présentez-vous à l'accueil avec votre numéro Moftal pour vous inscrire.
            </div>
          )}
          {!isLoggedIn && (
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => navigate("/login-membre", { state: { from: `/clinique/${tenantCode}/espace-patient` } })}
                style={{ background: TEAL, color: "white", border: "none", borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                Se connecter
              </button>
              <button onClick={() => navigate("/register")}
                style={{ background: "white", color: TEAL, border: `2px solid ${TEAL}`, borderRadius: 12, padding: "14px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                S'inscrire sur Moftal
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── CONTACT ───────────────────────────────────────────────────────────── */}
      <section id="contact" style={{ background: "white", padding: "60px 20px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Nous Contacter</h2>
            <p style={{ color: "#64748b", fontSize: 15 }}>Nos équipes sont disponibles pour répondre à vos questions.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, maxWidth: 800, margin: "0 auto" }}>
            {[
              { icon: "📞", label: "Téléphone", val: clinic.phone || "Non renseigné" },
              { icon: "✉️", label: "Email", val: clinic.email || "Non renseigné" },
              { icon: "📍", label: "Adresse", val: clinic.address || "Non renseignée" },
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

      {/* ── FOOTER ────────────────────────────────────────────────────────────── */}
      <footer style={{ background: TEAL_DARK, color: "rgba(255,255,255,0.7)", padding: "32px 20px", textAlign: "center" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.15)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {clinic.logo_url ? <img src={clinic.logo_url} alt="logo" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>✚</span>}
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "white" }}>{clinic.name}</span>
          </div>
          <p style={{ fontSize: 12, margin: "0 0 8px" }}>Centre Médical · {tenantCode}</p>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 16, paddingTop: 16, fontSize: 11 }}>
            Propulsé par <strong style={{ color: "white" }}>Moftal</strong> · Plateforme de santé numérique
            <button onClick={() => navigate("/")} style={{ marginLeft: 16, color: "rgba(255,255,255,0.6)", background: "none", border: "none", cursor: "pointer", fontSize: 11, textDecoration: "underline" }}>
              Retour à la plateforme
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

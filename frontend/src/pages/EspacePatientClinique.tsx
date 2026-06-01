import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";

const API_BASE = config.API_BASE_URL || "http://localhost:5002/api";
const TEAL = "#0d9488";
const TEAL_DARK = "#0f766e";
const TEAL_LIGHT = "#14b8a6";

type Tab = "appointments" | "prescriptions" | "records" | "rdv";

const SERVICES = ["Médecine générale", "Chirurgie", "Maternité", "Pédiatrie", "Ophtalmologie", "Gynécologie", "Urgences", "Radiologie", "Autre"];

function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function StatusBadge({ statut }: { statut: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    confirmed: { bg: "#f0fdf4", color: "#16a34a", label: "Confirmé" },
    done:      { bg: "#eff6ff", color: "#0369a1", label: "Terminé" },
    cancelled: { bg: "#fef2f2", color: "#ef4444", label: "Annulé" },
    pending:   { bg: "#fffbeb", color: "#d97706", label: "En attente" },
  };
  const s = map[statut] || map.pending;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
  );
}

export default function EspacePatientClinique() {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("appointments");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notRegistered, setNotRegistered] = useState(false);
  const [clinic, setClinic] = useState<any>(null);
  const [patient, setPatient] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [rdvForm, setRdvForm] = useState({ service: "", date_rdv: "", heure: "", motif: "" });
  const [rdvSaving, setRdvSaving] = useState(false);
  const [rdvSuccess, setRdvSuccess] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const token = localStorage.getItem("token");

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!token) {
      navigate("/login-membre", { state: { from: `/clinique/${tenantCode}/espace-patient` } });
      return;
    }
    fetch(`${API_BASE}/clinic-public/${tenantCode}/my-portal`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setClinic(d.clinic);
          setPatient(d.patient);
          setAppointments(d.appointments || []);
          setPrescriptions(d.prescriptions || []);
          setRecords(d.records || []);
        } else if (d.not_registered) {
          setNotRegistered(true);
          setError(d.message);
          fetch(`${API_BASE}/clinic-public/${tenantCode}`)
            .then(r => r.json())
            .then(c => c.success && setClinic(c.clinic))
            .catch(() => {});
        } else {
          setError(d.message || "Accès refusé.");
        }
      })
      .catch(() => setError("Impossible de joindre le serveur."))
      .finally(() => setLoading(false));
  }, [tenantCode, token, navigate]);

  const handleRdvSubmit = async () => {
    if (!rdvForm.date_rdv) { showToast("Veuillez choisir une date", false); return; }
    setRdvSaving(true);
    try {
      const r = await fetch(`${API_BASE}/clinic-public/${tenantCode}/request-appointment`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(rdvForm)
      });
      const d = await r.json();
      if (d.success) {
        setAppointments(prev => [d.appointment, ...prev]);
        setRdvForm({ service: "", date_rdv: "", heure: "", motif: "" });
        setRdvSuccess(true);
        showToast("Demande de rendez-vous envoyée !");
        setTimeout(() => { setRdvSuccess(false); setTab("appointments"); }, 2000);
      } else {
        showToast(d.message || "Erreur", false);
      }
    } catch {
      showToast("Erreur de connexion", false);
    } finally {
      setRdvSaving(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f0fdfa" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 44, height: 44, border: `3px solid #e2e8f0`, borderTopColor: TEAL, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: TEAL_DARK, fontSize: 14, fontWeight: 600 }}>Chargement de votre espace...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  // Non enregistré dans cette clinique
  if (notRegistered) return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {/* Header */}
      <div style={{ background: TEAL, padding: "16px 24px", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={() => navigate(`/clinique/${tenantCode}`)} style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Vitrine</button>
        {clinic && <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>{clinic.name}</span>}
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 480, textAlign: "center", background: "white", borderRadius: 20, padding: "48px 32px", boxShadow: "0 8px 40px rgba(0,0,0,0.1)" }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🏥</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>Non enregistré</h2>
          <p style={{ color: "#64748b", lineHeight: 1.7, marginBottom: 24, fontSize: 14 }}>
            {error || `Vous n'êtes pas encore enregistré comme patient de ${clinic?.name || "cette clinique"}.`}
          </p>
          <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 12, padding: "16px 20px", marginBottom: 24, textAlign: "left" }}>
            <div style={{ fontWeight: 700, color: TEAL_DARK, marginBottom: 6, fontSize: 13 }}>Comment s'inscrire ?</div>
            <ol style={{ margin: 0, paddingLeft: 20, color: "#475569", fontSize: 13, lineHeight: 2 }}>
              <li>Présentez-vous à l'accueil de la clinique</li>
              <li>Communiquez votre numéro Moftal (numéro H)</li>
              <li>Le personnel vous enregistre dans le système</li>
              <li>Accédez ensuite à votre espace en ligne</li>
            </ol>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => navigate(`/clinique/${tenantCode}`)}
              style={{ background: TEAL, color: "white", border: "none", borderRadius: 10, padding: "10px 24px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              Voir la clinique
            </button>
            <button onClick={() => navigate(-1 as any)}
              style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 24px", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
              Retour
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (error && !notRegistered) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Erreur d'accès</h2>
        <p style={{ color: "#64748b", marginBottom: 20 }}>{error}</p>
        <button onClick={() => navigate("/login-membre")} style={{ padding: "10px 24px", background: TEAL, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Se connecter</button>
      </div>
    </div>
  );

  const TABS: { id: Tab; label: string; icon: string; count?: number }[] = [
    { id: "appointments", label: "Mes RDV", icon: "📅", count: appointments.length },
    { id: "prescriptions", label: "Ordonnances", icon: "💊", count: prescriptions.length },
    { id: "records", label: "Consultations", icon: "📋", count: records.length },
    { id: "rdv", label: "Demander un RDV", icon: "➕" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 10, background: toast.ok ? TEAL : "#ef4444", color: "white", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", animation: "fadeIn 0.2s ease" }}>
          {toast.ok ? "✓ " : "⚠ "}{toast.msg}
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────────────────────────────────── */}
      <header style={{ background: `linear-gradient(135deg,${TEAL_DARK},${TEAL})`, padding: "0 24px", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => navigate(`/clinique/${tenantCode}`)}
              style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              ← Vitrine
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: "rgba(255,255,255,0.2)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {clinic?.logo_url ? <img src={clinic.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>✚</span>}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "white" }}>{clinic?.name}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>Espace Patient</div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "white" }}>{patient?.prenom} {patient?.nom}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: "monospace" }}>{patient?.numero_matricule}</div>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 14 }}>
              {patient?.prenom?.charAt(0)}{patient?.nom?.charAt(0)}
            </div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
        {/* Carte patient */}
        <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", marginBottom: 24, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg,${TEAL},${TEAL_LIGHT})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 20 }}>
              {patient?.prenom?.charAt(0)}{patient?.nom?.charAt(0)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: "#0f172a" }}>{patient?.prenom} {patient?.nom}</div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                {patient?.sexe && `${patient.sexe} · `}
                {patient?.date_naissance && `Né(e) le ${fmtDate(patient.date_naissance)} · `}
                {patient?.groupe_sanguin && <span style={{ background: "#fef2f2", color: "#ef4444", padding: "1px 7px", borderRadius: 12, fontWeight: 700 }}>{patient.groupe_sanguin}</span>}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginLeft: "auto" }}>
            {[
              { label: "Matricule", val: patient?.numero_matricule || "—", mono: true },
              { label: "Téléphone", val: patient?.telephone || "—" },
              { label: "Allergies", val: patient?.allergies || "Aucune connue" },
            ].map((item, i) => (
              <div key={i}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", fontFamily: item.mono ? "monospace" : "inherit" }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "white", borderRadius: 12, padding: 6, marginBottom: 24, border: "1px solid #e2e8f0", flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                flex: 1, minWidth: 120, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 14px",
                borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
                background: tab === t.id ? TEAL : "transparent",
                color: tab === t.id ? "white" : "#64748b",
                transition: "all 0.15s"
              }}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.count !== undefined && t.count > 0 && (
                <span style={{ background: tab === t.id ? "rgba(255,255,255,0.25)" : "#e2e8f0", color: tab === t.id ? "white" : "#64748b", fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 10 }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Mes Rendez-vous ──────────────────────────────────────────────────── */}
        {tab === "appointments" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {appointments.length === 0 ? (
              <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: "60px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>Aucun rendez-vous</div>
                <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 20 }}>Vous n'avez pas encore de rendez-vous dans cette clinique.</div>
                <button onClick={() => setTab("rdv")} style={{ background: TEAL, color: "white", border: "none", borderRadius: 10, padding: "10px 24px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
                  Demander un RDV
                </button>
              </div>
            ) : appointments.map(a => (
              <div key={a.id} style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: "18px 22px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: a.service === "Urgences" ? "#fef2f2" : "#f0fdfa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
                  {a.service === "Urgences" ? "🚨" : "📅"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", marginBottom: 3 }}>
                    {a.service || "Consultation"} {a.heure && `· ${a.heure}`}
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>
                    {fmtDate(a.date_rdv)}
                    {(a.s_prenom || a.s_nom) && ` · Dr. ${a.s_prenom || ""} ${a.s_nom || ""}`}
                  </div>
                  {a.motif && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3, fontStyle: "italic" }}>{a.motif}</div>}
                </div>
                <StatusBadge statut={a.statut} />
              </div>
            ))}
          </div>
        )}

        {/* ── Ordonnances ─────────────────────────────────────────────────────── */}
        {tab === "prescriptions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {prescriptions.length === 0 ? (
              <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: "60px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>💊</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>Aucune ordonnance</div>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>Vos ordonnances apparaîtront ici après vos consultations.</div>
              </div>
            ) : prescriptions.map(p => {
              const meds: any[] = Array.isArray(p.medicaments) ? p.medicaments : [];
              return (
                <div key={p.id} style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Ordonnance du {fmtDate(p.date_prescription || p.created_at)}</div>
                      {(p.s_prenom || p.s_nom) && <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>Dr. {p.s_prenom} {p.s_nom}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {p.pharma_statut === "dispense"
                        ? <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>✓ Dispensée</span>
                        : <span style={{ background: "#fffbeb", color: "#d97706", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>⏳ En attente pharmacie</span>
                      }
                      <span style={{ background: "#f0fdfa", color: TEAL_DARK, padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, fontFamily: "monospace" }}>N° {p.numero_ordo}</span>
                    </div>
                  </div>
                  {p.diagnostic && (
                    <div style={{ background: "#fffbeb", borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#78350f", borderLeft: "3px solid #fbbf24" }}>
                      <strong>Diagnostic :</strong> {p.diagnostic}
                    </div>
                  )}
                  {meds.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {meds.map((m: any, i: number) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#f8fafc", borderRadius: 8, borderLeft: `3px solid ${TEAL}`, fontSize: 13 }}>
                          <span style={{ color: TEAL }}>◆</span>
                          <span style={{ color: "#0f172a", fontWeight: 500 }}>{m.medicament || m}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {p.notes && <div style={{ marginTop: 10, fontSize: 12, color: "#64748b", fontStyle: "italic" }}>{p.notes}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Consultations / Dossier médical ─────────────────────────────────── */}
        {tab === "records" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {records.length === 0 ? (
              <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: "60px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>Aucune consultation</div>
                <div style={{ fontSize: 13, color: "#94a3b8" }}>Vos consultations et examens apparaîtront ici.</div>
              </div>
            ) : records.map(r => (
              <div key={r.id} style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{r.type_consultation || "Consultation"}</div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                      {fmtDate(r.date_visite || r.created_at)}
                      {(r.s_prenom || r.s_nom) && ` · Dr. ${r.s_prenom} ${r.s_nom}`}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {r.poids && <span style={{ background: "#f0fdfa", color: TEAL_DARK, padding: "3px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>⚖️ {r.poids} kg</span>}
                    {r.tension && <span style={{ background: "#fef2f2", color: "#b91c1c", padding: "3px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>❤️ {r.tension}</span>}
                    {r.temperature && <span style={{ background: "#fffbeb", color: "#92400e", padding: "3px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600 }}>🌡️ {r.temperature}°C</span>}
                  </div>
                </div>
                {r.diagnostic && (
                  <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", marginBottom: 8, fontSize: 13, borderLeft: `3px solid ${TEAL}` }}>
                    <strong style={{ color: "#475569" }}>Diagnostic : </strong>{r.diagnostic}
                  </div>
                )}
                {r.traitement && (
                  <div style={{ background: "#f0fdfa", borderRadius: 8, padding: "10px 14px", fontSize: 13, borderLeft: "3px solid #34d399" }}>
                    <strong style={{ color: "#065f46" }}>Traitement : </strong>{r.traitement}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Demander un RDV ─────────────────────────────────────────────────── */}
        {tab === "rdv" && (
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: "32px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Demander un rendez-vous</h2>
              <p style={{ margin: "0 0 28px", fontSize: 13, color: "#64748b" }}>Votre demande sera envoyée à {clinic?.name}. Le personnel vous confirmera par la suite.</p>

              {rdvSuccess ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "#16a34a", marginBottom: 8 }}>Demande envoyée !</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>Le personnel de la clinique va traiter votre demande.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Service *</label>
                    <select value={rdvForm.service} onChange={e => setRdvForm(f => ({ ...f, service: e.target.value }))}
                      style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#0f172a", outline: "none" }}>
                      <option value="">Choisir un service...</option>
                      {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Date *</label>
                      <input type="date" value={rdvForm.date_rdv} onChange={e => setRdvForm(f => ({ ...f, date_rdv: e.target.value }))}
                        min={new Date().toISOString().split("T")[0]}
                        style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Heure (optionnel)</label>
                      <input type="time" value={rdvForm.heure} onChange={e => setRdvForm(f => ({ ...f, heure: e.target.value }))}
                        style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Motif de consultation</label>
                    <textarea value={rdvForm.motif} onChange={e => setRdvForm(f => ({ ...f, motif: e.target.value }))} rows={3}
                      placeholder="Décrivez brièvement le motif de votre consultation..."
                      style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "#0f172a", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
                  </div>
                  <button onClick={handleRdvSubmit} disabled={rdvSaving}
                    style={{ background: rdvSaving ? "#94a3b8" : TEAL, color: "white", border: "none", borderRadius: 10, padding: "12px 24px", fontWeight: 700, fontSize: 14, cursor: rdvSaving ? "not-allowed" : "pointer", transition: "all 0.15s" }}>
                    {rdvSaving ? "Envoi en cours..." : "Envoyer la demande →"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

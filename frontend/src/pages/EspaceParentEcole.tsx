import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { config } from "../config/api";

interface Props { mode: "school" | "madrasa"; }

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }
function fmtMoney(n: number) { return (n || 0).toLocaleString("fr-FR") + " GNF"; }

export default function EspaceParentEcole({ mode }: Props) {
  const { tenantCode } = useParams<{ tenantCode: string }>();
  const navigate = useNavigate();
  const isMadrasa = mode === "madrasa";
  const apiName = isMadrasa ? "madrasa-mgmt" : "school-mgmt";
  const color = isMadrasa ? "#0891b2" : "#1a8f1a";
  const colorDark = isMadrasa ? "#0e7490" : "#156315";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"grades" | "attendance" | "fees" | "bulletins">("grades");
  const [payingFeeId, setPayingFeeId] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState("OM");
  const [payPhone, setPayPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    if (!localStorage.getItem("token")) { navigate("/login-membre", { state: { from: `/espace-parent-${mode}/${tenantCode}` } }); return; }
    fetch(`${config.API_BASE_URL}/${apiName}/${tenantCode}/my-access`, { headers: auth() })
      .then(r => r.json())
      .then(d => {
        if (d.success === false) { setError(d.message || "Accès refusé."); return; }
        setData(d);
      })
      .catch(e => setError("Impossible de joindre le serveur : " + (e?.message || e)))
      .finally(() => setLoading(false));
  }, [apiName, tenantCode, navigate, mode]);

  const payFee = async (feeId: number) => {
    if (!payPhone.trim()) { showToast("Numéro de téléphone requis", false); return; }
    setPaying(true); setPayMsg("");
    try {
      const r = await fetch(`${config.API_BASE_URL}/djomy/initiate`, {
        method: "POST", headers: auth(),
        body: JSON.stringify({ paymentMethod: payMethod, payerPhone: payPhone, purpose: "school_fee", relatedId: feeId, description: "Frais scolaire" })
      });
      const d = await r.json();
      if (!d.success) { showToast(d.message || "Erreur de paiement", false); setPaying(false); return; }
      setPayMsg("Confirmez le paiement sur votre téléphone...");
      const txId = d.transactionId;
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const sr = await fetch(`${config.API_BASE_URL}/djomy/status/${txId}`, { headers: auth() });
        const sd = await sr.json();
        const status = sd.status || sd.data?.status;
        if (status === "SUCCESS") {
          clearInterval(poll);
          setPaying(false); setPayingFeeId(null); setPayMsg("");
          setData((prev: any) => ({ ...prev, fees: prev.fees.map((f: any) => f.id === feeId ? { ...f, est_paye: true } : f) }));
          showToast("Paiement réussi !");
        } else if (attempts >= 20) {
          clearInterval(poll);
          setPaying(false);
          setPayMsg("Paiement non confirmé. Réessayez si besoin.");
        }
      }, 4000);
    } catch {
      showToast("Erreur de connexion", false);
      setPaying(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ width: 40, height: 40, border: "3px solid #e2e8f0", borderTopColor: color, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error || !data) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f8fafc" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: "0 24px" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Espace parent inaccessible</h2>
        <p style={{ fontSize: 13, color: "#ef4444", background: "#fef2f2", borderRadius: 8, padding: "10px 16px", marginBottom: 16 }}>{error || "Vous n'êtes pas encore relié(e) à un élève dans cet établissement. Contactez l'école pour vous inscrire."}</p>
        <button onClick={() => navigate("/compte")} style={{ padding: "8px 20px", background: color, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>← Retour</button>
      </div>
    </div>
  );

  const student = data.student;
  const grades = data.grades || [];
  const attendance = data.attendance || [];
  const fees = data.fees || [];
  const bulletins = data.bulletins || [];
  const presentCount = attendance.filter((a: any) => a.est_present !== false && a.statut !== "absent").length;
  const absentCount = attendance.length - presentCount;

  const TABS: { id: typeof tab; label: string; icon: string; count?: number }[] = [
    { id: "grades", label: "Notes", icon: "📊", count: grades.length },
    { id: "attendance", label: "Présences", icon: "📋", count: attendance.length },
    { id: "fees", label: "Frais", icon: "💰", count: fees.filter((f: any) => !f.est_paye).length },
    { id: "bulletins", label: "Bulletins", icon: "📄", count: bulletins.length },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 10, background: toast.ok ? color : "#ef4444", color: "white", fontSize: 13, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.15)", animation: "fadeIn 0.2s ease" }}>
          {toast.ok ? "✓ " : "⚠ "}{toast.msg}
        </div>
      )}
      <header style={{ background: color, color: "white", padding: "20px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{data.tenant?.name}</div>
          <h1 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800 }}>👪 Espace Parent</h1>
          {student && <p style={{ margin: "6px 0 0", fontSize: 14, opacity: 0.9 }}>{student.prenom} {student.nom} {student.niveau ? `· ${student.niveau}` : ""}{student.classe ? ` · ${student.classe}` : ""}</p>}
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>
        {!student ? (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "60px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p style={{ color: "#94a3b8", fontSize: 13 }}>Aucun élève relié à votre compte pour le moment.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 4, background: "white", borderRadius: 10, padding: 5, border: "1px solid #e2e8f0", marginBottom: 20, overflowX: "auto" }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, minWidth: 90, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 10px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: tab === t.id ? 700 : 500, background: tab === t.id ? color : "transparent", color: tab === t.id ? "white" : "#64748b", whiteSpace: "nowrap" }}>
                  {t.icon} {t.label}
                  {!!t.count && <span style={{ background: tab === t.id ? "rgba(255,255,255,0.25)" : "#ef4444", color: "white", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>{t.count}</span>}
                </button>
              ))}
            </div>

            {tab === "grades" && (
              <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                {grades.length === 0 ? <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucune note enregistrée</div> : (
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <tbody>
                      {grades.map((g: any) => (
                        <tr key={g.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                          <td style={{ padding: "11px 16px", fontWeight: 600, color: "#0f172a" }}>{g.matiere}</td>
                          <td style={{ padding: "11px 16px", color: "#64748b" }}>{g.periode}</td>
                          <td style={{ padding: "11px 16px", textAlign: "right", fontWeight: 800, color: color }}>{g.note}/{g.note_max}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tab === "attendance" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ background: "white", borderRadius: 10, border: "1px solid #e2e8f0", padding: "14px 16px", borderLeft: `3px solid ${color}` }}>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Présences</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color }}>{presentCount}</div>
                  </div>
                  <div style={{ background: "white", borderRadius: 10, border: "1px solid #e2e8f0", padding: "14px 16px", borderLeft: "3px solid #ef4444" }}>
                    <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Absences</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#ef4444" }}>{absentCount}</div>
                  </div>
                </div>
                <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  {attendance.length === 0 ? <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun historique de présence</div> : attendance.map((a: any) => {
                    const present = a.est_present !== false && a.statut !== "absent";
                    return (
                      <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid #f8fafc", fontSize: 13 }}>
                        <span style={{ color: "#475569" }}>{fmtDate(a.date_presence)}</span>
                        <span style={{ color: present ? color : "#ef4444", fontWeight: 700 }}>{present ? "✓ Présent" : "✗ Absent"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === "fees" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {fees.length === 0 ? (
                  <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun frais enregistré</div>
                ) : fees.map((f: any) => (
                  <div key={f.id} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{f.type_frais}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: colorDark, marginTop: 2 }}>{fmtMoney(f.montant)}</div>
                      </div>
                      {f.est_paye ? (
                        <span style={{ padding: "4px 12px", background: "#f0fdf0", color: "#1a8f1a", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>✓ Payé</span>
                      ) : (
                        <button onClick={() => { setPayingFeeId(payingFeeId === f.id ? null : f.id); setPayMsg(""); }} style={{ padding: "8px 16px", background: color, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                          💳 Payer en ligne
                        </button>
                      )}
                    </div>
                    {payingFeeId === f.id && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9", display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          {[{ id: "OM", label: "Orange Money" }, { id: "MOMO", label: "MTN MoMo" }].map(m => (
                            <button key={m.id} onClick={() => setPayMethod(m.id)} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1.5px solid ${payMethod === m.id ? color : "#e2e8f0"}`, background: payMethod === m.id ? `${color}11` : "white", color: payMethod === m.id ? colorDark : "#64748b", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{m.label}</button>
                          ))}
                        </div>
                        <input value={payPhone} onChange={e => setPayPhone(e.target.value)} placeholder="Numéro de téléphone (622 00 00 00)" style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px", fontSize: 13, outline: "none" }} />
                        {payMsg && <p style={{ fontSize: 12, color: "#d97706", margin: 0 }}>{payMsg}</p>}
                        <button onClick={() => payFee(f.id)} disabled={paying} style={{ padding: "10px", background: paying ? "#94a3b8" : color, color: "white", border: "none", borderRadius: 8, cursor: paying ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700 }}>
                          {paying ? "Traitement..." : `Payer ${fmtMoney(f.montant)}`}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === "bulletins" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {bulletins.length === 0 ? (
                  <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "40px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Aucun bulletin publié pour le moment</div>
                ) : bulletins.map((b: any, i: number) => (
                  <div key={i} style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{b.periode} — {b.annee_scolaire}</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{b.mention}</div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color }}>{b.moyenne_generale}/20</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

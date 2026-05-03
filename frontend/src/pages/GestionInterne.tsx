import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionUser, isAdmin } from "../utils/auth";
import { config } from "../config/api";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";

function getTypeInfo(type: string) {
  if (type === "clinic") return { label: "Clinique", path: "gestion-clinique", color: "#0d9488", bg: "#f0fdfa", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" };
  return                 { label: "École",    path: "gestion-ecole",   color: "#16a34a", bg: "#f0fdf4", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" };
}

export default function GestionInterne() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [adminTenants, setAdminTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const currentUser = getSessionUser();
  const userIsAdmin = isAdmin(currentUser);

  useEffect(() => {
    if (!currentUser) { navigate("/login"); return; }
    const token = localStorage.getItem("token");

    const myAccountsPromise = fetch(`${API}/api/professionals/my-accounts`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        const mgmt = (data.accounts || []).filter((a: any) =>
          ["clinic", "school"].includes(a.type) &&
          a.status === "approved" &&
          a.subscriptionStatus === "active" &&
          a.tenant_code
        );
        setAccounts(mgmt);
        if (!userIsAdmin && mgmt.length === 1) {
          const a = mgmt[0];
          navigate(a.type === "clinic" ? `/gestion-clinique/${a.tenant_code}` : `/gestion-ecole/${a.tenant_code}`);
        }
      })
      .catch(() => {});

    const adminTenantsPromise = userIsAdmin
      ? fetch(`${API}/api/professionals/admin/tenants`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(data => { if (data.success) setAdminTenants(data.tenants || []); })
          .catch(() => {})
      : Promise.resolve();

    Promise.all([myAccountsPromise, adminTenantsPromise]).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 300 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#16a34a", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!userIsAdmin && accounts.length === 0) return (
    <div style={{ maxWidth: 520, margin: "60px auto", padding: "0 24px", textAlign: "center" }}>
      <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <svg width="28" height="28" fill="none" stroke="#64748b" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Accès Gestion Interne</h2>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20, lineHeight: 1.6 }}>
        Ce module est réservé aux cliniques et écoles avec un abonnement actif (3 000 000 GNF — paiement unique, à vie).
      </p>
      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "16px 20px", textAlign: "left", marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>Conditions d'accès :</p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#78350f", lineHeight: 2 }}>
          <li>Avoir un compte professionnel approuvé (clinique ou école)</li>
          <li>Avoir souscrit à l'abonnement Gestion Interne (3 000 000 GNF)</li>
          <li>Que l'administrateur ait activé votre accès</li>
        </ul>
      </div>
      <button onClick={() => navigate("/mes-comptes-pro")} style={{ padding: "10px 24px", background: "#16a34a", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
        Voir mon espace professionnel
      </button>
    </div>
  );

  const allTenants = userIsAdmin ? adminTenants : accounts;
  const filtered = allTenants.filter(a =>
    !search || a.name?.toLowerCase().includes(search.toLowerCase()) || a.tenant_code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Bannière admin */}
      {userIsAdmin && (
        <div style={{ background: "linear-gradient(135deg, #0369a1, #0284c7)", borderRadius: 12, padding: "16px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" fill="none" stroke="white" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "white", fontSize: 14 }}>Mode Super Admin — Vue complète</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 }}>
              {allTenants.length} espace{allTenants.length > 1 ? "s" : ""} actif{allTenants.length > 1 ? "s" : ""} sur la plateforme · Actions en lecture seule recommandées
            </div>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
          {userIsAdmin ? "Tous les espaces de gestion" : "Choisissez votre espace"}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#94a3b8" }}>
          {userIsAdmin ? "Accédez à tous les établissements de la plateforme" : "Vos établissements avec abonnement actif"}
        </p>
      </div>

      {/* Recherche (si admin ou beaucoup de tenants) */}
      {(userIsAdmin || allTenants.length > 4) && (
        <div style={{ position: "relative", marginBottom: 20 }}>
          <svg style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" fill="none" stroke="#94a3b8" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom ou code..." style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "9px 12px 9px 34px", fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box" }} />
        </div>
      )}

      {/* Liste des espaces */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8", fontSize: 14 }}>
          {search ? "Aucun résultat pour cette recherche" : userIsAdmin ? "Aucun espace de gestion enregistré sur la plateforme." : "Aucun espace disponible."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((a: any, i: number) => {
            const info = getTypeInfo(a.type);
            return (
              <button key={a.tenant_code || a.id} onClick={() => navigate(`/${info.path}/${a.tenant_code}`)}
                style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", textAlign: "left", background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", cursor: "pointer", transition: "all 0.15s", animation: `fadeIn 0.2s ease ${i * 0.05}s both`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = info.color; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px rgba(0,0,0,0.1)`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"; }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: info.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `1px solid ${info.color}22` }}>
                  <svg width="20" height="20" fill="none" stroke={info.color} strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={info.icon} /></svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                    <span style={{ padding: "1px 8px", background: info.bg, color: info.color, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{info.label}</span>
                    {a.tenant_code && <span style={{ fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>{a.tenant_code}</span>}
                    {a.owner_numero_h && userIsAdmin && <span style={{ fontFamily: "monospace", fontSize: 10, background: "#f1f5f9", color: "#64748b", padding: "1px 6px", borderRadius: 4 }}>{a.owner_numero_h}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: info.color, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                  Ouvrir
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

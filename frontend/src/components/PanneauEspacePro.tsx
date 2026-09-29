import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getSessionUser } from "../utils/auth";
import { AddPersonModal } from "./AddPersonModal";
import ParametresEspacePro from "./ParametresEspacePro";
import {
  DEFAULT_PUB_FORM, getTypeInfo, PublierModal, ProfilModalComp,
  type PublishModal, type ProfilModal,
} from "./EspaceProModals";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5002").replace(/\/api\/?$/, "");

// Panneau « Espace Pro » ouvert depuis la gestion interne d'un établissement :
// site client, publications, profil public et clients — tout au même endroit,
// sans quitter la gestion interne. L'abonnement reste discret, tout en bas.
export default function PanneauEspacePro({ tenantCode, onClose }: { tenantCode: string; onClose: () => void }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Ces gestions ont leur page Paramètres, où se trouve l'abonnement
  const abonnementDansParametres = /^\/gestion-(clinique|commerce|ecole|ecole-v1|madrasa|madrasa-v2|mairie)\//.test(pathname);
  const [voirAbonnement, setVoirAbonnement] = useState(false);
  const token = localStorage.getItem("token") || "";
  const currentUser = getSessionUser();

  const [account, setAccount] = useState<any>(null);
  const [erreur, setErreur] = useState("");
  const [publishModal, setPublishModal] = useState<PublishModal | null>(null);
  const [profilModal, setProfilModal] = useState<ProfilModal | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);

  const auth = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/api/pro-vitrine/by-tenant/${tenantCode}/account`, { headers: auth })
      .then(r => r.json())
      .then(d => { if (d.success && d.account) setAccount(d.account); else setErreur(d.message || "Compte introuvable."); })
      .catch(() => setErreur("Erreur de connexion au serveur."));
  }, [tenantCode]);

  // ─── Publications ──────────────────────────────────────────────────────────

  async function fetchPubs(accountId: string): Promise<any[]> {
    try {
      const r = await fetch(`${API}/api/pro-vitrine/${accountId}/publications`);
      const d = await r.json();
      return d.publications || [];
    } catch { return []; }
  }

  async function ouvrirPublication() {
    setPublishModal({ accountId: account.id, tenantCode, name: account.name, form: { ...DEFAULT_PUB_FORM }, pubs: [], step: "loading" });
    const pubs = await fetchPubs(account.id);
    setPublishModal(prev => prev ? { ...prev, pubs, step: "ready" } : null);
  }

  async function publier() {
    if (!publishModal?.accountId || !publishModal.form.titre.trim()) return;
    setPublishModal(prev => prev ? { ...prev, step: "saving" } : null);
    try {
      const r = await fetch(`${API}/api/pro-vitrine/${publishModal.accountId}/publications`, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify(publishModal.form),
      });
      const d = await r.json();
      if (d.success) {
        const pubs = await fetchPubs(publishModal.accountId);
        setPublishModal(prev => prev ? { ...prev, step: "ready", form: { ...DEFAULT_PUB_FORM }, pubs } : null);
      } else {
        alert(d.message || "Erreur lors de la publication.");
        setPublishModal(prev => prev ? { ...prev, step: "ready" } : null);
      }
    } catch { alert("Erreur de connexion."); setPublishModal(prev => prev ? { ...prev, step: "ready" } : null); }
  }

  async function supprimerPublication(pubId: string) {
    if (!publishModal?.accountId) return;
    try {
      const r = await fetch(`${API}/api/pro-vitrine/${publishModal.accountId}/publications/${pubId}`, { method: "DELETE", headers: auth });
      const d = await r.json();
      if (d.success) setPublishModal(prev => prev ? { ...prev, pubs: prev.pubs.filter(p => p.id !== pubId) } : null);
      else alert(d.message || "Erreur lors de la suppression.");
    } catch { alert("Erreur de connexion."); }
  }

  // ─── Profil public ─────────────────────────────────────────────────────────

  function ouvrirProfil() {
    setProfilModal({
      accountId: account.id, tenantCode, name: account.name,
      form: {
        name: account.name || "", description: account.description || "", address: account.address || "",
        city: account.city || "", phone: account.phone || "", email: account.email || "", photo: account.photo || "",
      },
      step: "ready",
    });
  }

  async function enregistrerProfil() {
    if (!profilModal?.accountId) return;
    setProfilModal(prev => prev ? { ...prev, step: "saving" } : null);
    try {
      const r = await fetch(`${API}/api/pro-vitrine/${profilModal.accountId}/publish-info`, {
        method: "PUT",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify(profilModal.form),
      });
      const d = await r.json();
      if (d.success) {
        setAccount((a: any) => ({ ...a, ...profilModal.form }));
        setProfilModal(null);
      } else {
        alert(d.message || "Erreur lors de la mise à jour du profil.");
        setProfilModal(prev => prev ? { ...prev, step: "ready" } : null);
      }
    } catch { alert("Erreur de connexion."); setProfilModal(prev => prev ? { ...prev, step: "ready" } : null); }
  }

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  const info = account ? getTypeInfo(account.type) : null;
  const sousFenetre = publishModal || profilModal || connectOpen;

  const bouton = (label: string, onClick: () => void, style: React.CSSProperties) => (
    <button onClick={onClick}
      style={{ width: "100%", padding: "12px 14px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700, textAlign: "left", border: "none", ...style }}>
      {label}
    </button>
  );

  return (
    <>
      {!sousFenetre && (
        <div onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 8000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "white", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", borderRadius: "18px 18px 0 0", padding: "18px 16px 24px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Espace Pro</div>
                {account && <div style={{ fontSize: 13, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{account.name}</div>}
              </div>
              <button onClick={onClose} aria-label="Fermer"
                style={{ border: "none", background: "#f1f5f9", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 18, color: "#475569", flexShrink: 0 }}>✕</button>
            </div>

            {erreur && <p style={{ color: "#dc2626", fontSize: 13, margin: "0 0 12px" }}>{erreur}</p>}
            {!account && !erreur && <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 12px" }}>Chargement…</p>}

            {account && info && (
              <div style={{ display: "grid", gap: 8 }}>
                {info.vitrinePath && bouton("🌐  Voir le site client", () => { onClose(); navigate(`/${info.vitrinePath}/${tenantCode}`); }, { background: info.color, color: "white" })}
                {bouton("📢  Nouvelle publication", ouvrirPublication, { background: "#2563eb", color: "white" })}
                {bouton("✏️  Modifier le profil public", ouvrirProfil, { background: "#f0fdf4", color: "#059669", border: "1.5px solid #a7f3d0" })}
                {bouton("🤝  Connecter un client", () => setConnectOpen(true), { background: "#f8fafc", color: "#475569", border: "1.5px solid #e2e8f0" })}
              </div>
            )}

            {account && !abonnementDansParametres && (
              <div style={{ marginTop: 18, borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                <button onClick={() => setVoirAbonnement(v => !v)}
                  style={{ background: "none", border: "none", padding: "4px 0", cursor: "pointer", fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                  ⚙️ Paramètres · Application et abonnement {voirAbonnement ? "▴" : "▾"}
                </button>
                {voirAbonnement && <div style={{ marginTop: 8 }}><div style={{ display: "grid", gap: 12 }}><ParametresEspacePro /></div></div>}
              </div>
            )}
          </div>
        </div>
      )}

      {publishModal && (
        <PublierModal
          modal={publishModal}
          token={token}
          onChange={form => setPublishModal(prev => prev ? { ...prev, form } : null)}
          onSubmit={publier}
          onDelete={supprimerPublication}
          onClose={() => setPublishModal(null)}
        />
      )}
      {profilModal && (
        <ProfilModalComp
          modal={profilModal}
          onChange={form => setProfilModal(prev => prev ? { ...prev, form } : null)}
          onSubmit={enregistrerProfil}
          onClose={() => setProfilModal(null)}
        />
      )}
      {connectOpen && account && (
        <AddPersonModal
          title={`Connecter un client — ${account.name}`}
          onSelect={async (numeroH) => {
            try {
              const r = await fetch(`${API}/api/professionals/${account.id}/connect-client`, {
                method: "POST",
                headers: { ...auth, "Content-Type": "application/json" },
                body: JSON.stringify({ clientNumeroH: numeroH }),
              });
              const d = await r.json();
              alert(d.message || (d.success ? "Client connecté avec succès !" : "Erreur lors de la connexion."));
            } catch { alert("Erreur de connexion au serveur."); }
            setConnectOpen(false);
          }}
          onClose={() => setConnectOpen(false)}
          myNumeroH={currentUser?.numeroH}
          myPrenom={currentUser?.prenom}
          myNom={currentUser?.nomFamille}
        />
      )}
    </>
  );
}

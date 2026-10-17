import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getSessionUser } from "../utils/auth";
import { AddPersonModal } from "./AddPersonModal";
import ParametresEspacePro from "./ParametresEspacePro";
import { TenantCodeCard } from "./GestionBrand";
import { useTraduction } from "../i18n/traduction";
import {
  DEFAULT_PUB_FORM, getTypeInfo, PublierModal, ProfilModalComp,
  type PublishModal, type ProfilModal,
} from "./EspaceProModals";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5002").replace(/\/api\/?$/, "");

// Panneau « Espace Pro » ouvert depuis la gestion interne d'un établissement :
// site client, publications, profil public et clients — tout au même endroit,
// sans quitter la gestion interne. L'abonnement reste discret, tout en bas.
// Messages envoyés depuis le site de l'établissement (« Nous écrire », commande
// d'une boutique, devis…) : enregistrés en base, suivis ici.
function MessagesDuSite({ tenantCode, onRetour, onNombre }: { tenantCode: string; onRetour: () => void; onNombre: (n: number) => void }) {
  const { tr } = useTraduction();
  const [demandes, setDemandes] = useState<any[] | null>(null);
  const [erreur, setErreur] = useState("");
  const auth = { Authorization: `Bearer ${localStorage.getItem("token") || ""}`, "Content-Type": "application/json" };
  const charger = () => fetch(`${API}/api/site-mgmt/${encodeURIComponent(tenantCode)}/demandes`, { headers: auth })
    .then(r => r.json())
    .then(d => {
      if (!d.success) { setErreur(d.message || "Messages indisponibles."); return; }
      setDemandes(d.demandes || []);
      onNombre((d.demandes || []).filter((x: any) => x.statut === "nouveau").length);
    })
    .catch(() => setErreur("Connexion impossible : les messages n'ont pas pu être chargés."));
  useEffect(() => { charger(); }, [tenantCode]); // eslint-disable-line react-hooks/exhaustive-deps
  const changerStatut = async (id: number, statut: string) => {
    try {
      const r = await fetch(`${API}/api/site-mgmt/${encodeURIComponent(tenantCode)}/demandes/${id}`, { method: "PATCH", headers: auth, body: JSON.stringify({ statut }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) { alert(tr(d.message || "Le changement n'a pas été enregistré.")); return; }
      charger();
    } catch { alert(tr("Erreur de connexion.")); }
  };
  return (
    <div>
      <button onClick={onRetour} style={{ background: "none", border: "none", padding: "0 0 10px", cursor: "pointer", fontSize: 13, color: "#475569", fontWeight: 700 }}>‹ {tr("Retour")}</button>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>📩 {tr("Messages du site")}</div>
      {erreur && <p style={{ color: "#dc2626", fontSize: 13 }}>{tr(erreur)}</p>}
      {!demandes && !erreur && <p style={{ color: "#94a3b8", fontSize: 13 }}>{tr("Chargement…")}</p>}
      {demandes && demandes.length === 0 && <p style={{ color: "#94a3b8", fontSize: 13 }}>{tr("Aucun message reçu depuis le site pour le moment.")}</p>}
      <div style={{ display: "grid", gap: 8 }}>
        {(demandes || []).map(d => (
          <div key={d.id} style={{ border: `1.5px solid ${d.statut === "nouveau" ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 12, padding: "10px 12px", background: d.statut === "nouveau" ? "#fff7f7" : "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", minWidth: 0 }}>{d.objet || tr("Message")} · {d.nom}</div>
              <div style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{new Date(d.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
            </div>
            <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap", margin: "6px 0" }}>{d.message}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <a href={`tel:${d.telephone}`} style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8" }}>📞 {d.telephone}</a>
              <button onClick={() => changerStatut(d.id, d.statut === "nouveau" ? "traite" : "nouveau")}
                style={{ fontSize: 12, fontWeight: 700, padding: "6px 10px", borderRadius: 8, cursor: "pointer", border: "1px solid #e2e8f0", background: d.statut === "nouveau" ? "#0f172a" : "white", color: d.statut === "nouveau" ? "white" : "#475569" }}>
                {d.statut === "nouveau" ? tr("✓ Marquer traité") : tr("↺ Remettre en nouveau")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PanneauEspacePro({ tenantCode, onClose, vueInitiale }: { tenantCode: string; onClose: () => void; vueInitiale?: "messages" }) {
  const navigate = useNavigate();
  const { tr } = useTraduction();
  const { pathname } = useLocation();
  // Ces gestions ont leur page Paramètres, où se trouve l'abonnement
  const abonnementDansParametres = /^\/gestion-(clinique|commerce|ecole|ecole-v1|madrasa|madrasa-v2|mairie)\//.test(pathname);
  const [voirAbonnement, setVoirAbonnement] = useState(false);
  const [voirMessages, setVoirMessages] = useState(vueInitiale === "messages");
  const [nouveauxMessages, setNouveauxMessages] = useState(0);
  // Nombre de messages du site non traités, sur le bouton
  useEffect(() => {
    fetch(`${API}/api/site-mgmt/${encodeURIComponent(tenantCode)}/demandes`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setNouveauxMessages((d.demandes || []).filter((x: any) => x.statut === "nouveau").length); })
      .catch(() => {});
  }, [tenantCode]);
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
        alert(tr(d.message || "Erreur lors de la publication."));
        setPublishModal(prev => prev ? { ...prev, step: "ready" } : null);
      }
    } catch { alert(tr("Erreur de connexion.")); setPublishModal(prev => prev ? { ...prev, step: "ready" } : null); }
  }

  async function supprimerPublication(pubId: string) {
    if (!publishModal?.accountId) return;
    try {
      const r = await fetch(`${API}/api/pro-vitrine/${publishModal.accountId}/publications/${pubId}`, { method: "DELETE", headers: auth });
      const d = await r.json();
      if (d.success) setPublishModal(prev => prev ? { ...prev, pubs: prev.pubs.filter(p => p.id !== pubId) } : null);
      else alert(tr(d.message || "Erreur lors de la suppression."));
    } catch { alert(tr("Erreur de connexion.")); }
  }

  // ─── Profil public ─────────────────────────────────────────────────────────

  // Relit le compte avant d'ouvrir : si le logo a été changé ailleurs (Paramètres
  // de la gestion) depuis l'ouverture du panneau, on n'enregistre pas l'ancien.
  async function ouvrirProfil() {
    let acc = account;
    try {
      const d = await fetch(`${API}/api/pro-vitrine/by-tenant/${tenantCode}/account`, { headers: auth }).then(r => r.json());
      if (d.success && d.account) { acc = d.account; setAccount(d.account); }
    } catch { /* on garde le compte déjà chargé */ }
    setProfilModal({
      accountId: acc.id, tenantCode, name: acc.name,
      form: {
        name: acc.name || "", description: acc.description || "", address: acc.address || "",
        city: acc.city || "", phone: acc.phone || "", email: acc.email || "", photo: acc.photo || "",
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
        const logoChange = profilModal.form.photo !== (account?.photo || "");
        setAccount((a: any) => ({ ...a, ...profilModal.form }));
        setProfilModal(null);
        // Nouveau logo : on recharge pour qu'il soit le même partout dans la gestion
        if (logoChange) window.location.reload();
      } else {
        alert(tr(d.message || "Erreur lors de la mise à jour du profil."));
        setProfilModal(prev => prev ? { ...prev, step: "ready" } : null);
      }
    } catch { alert(tr("Erreur de connexion.")); setProfilModal(prev => prev ? { ...prev, step: "ready" } : null); }
  }

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  const info = account ? getTypeInfo(account.type) : null;
  const sousFenetre = publishModal || profilModal || connectOpen;

  const bouton = (label: string, onClick: () => void, style: React.CSSProperties) => (
    <button onClick={onClick}
      style={{ width: "100%", padding: "12px 14px", borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 700, textAlign: "start", border: "none", ...style }}>
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
                <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>{tr("Espace Pro")}</div>
                {account && <div style={{ fontSize: 13, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{account.name}</div>}
              </div>
              <button onClick={onClose} aria-label={tr("Fermer")}
                style={{ border: "none", background: "#f1f5f9", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 18, color: "#475569", flexShrink: 0 }}>✕</button>
            </div>

            {voirMessages ? (
              <MessagesDuSite tenantCode={tenantCode} onRetour={() => setVoirMessages(false)} onNombre={setNouveauxMessages} />
            ) : (<>
            {bouton(`${tr("📩  Messages du site")}${nouveauxMessages ? ` (${nouveauxMessages})` : ""}`, () => setVoirMessages(true),
              { background: nouveauxMessages ? "#b91c1c" : "#f8fafc", color: nouveauxMessages ? "white" : "#0f172a", border: nouveauxMessages ? "none" : "1.5px solid #e2e8f0", marginBottom: 8 })}

            {erreur && <p style={{ color: "#dc2626", fontSize: 13, margin: "0 0 12px" }}>{tr(erreur)}</p>}
            {!account && !erreur && <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 12px" }}>{tr("Chargement…")}</p>}

            {account && info && (
              <div style={{ display: "grid", gap: 8 }}>
                {info.vitrinePath && bouton(tr("🌐  Voir le site client"), () => { onClose(); navigate(`/${info.vitrinePath}/${tenantCode}`); }, { background: info.color, color: "white" })}
                {bouton(tr("📅  Demandes de rendez-vous"), () => { onClose(); navigate(`/espace-pro/${account.id}?rdv=1`); }, { background: "#0f172a", color: "white" })}
                {bouton(tr("📢  Nouvelle publication"), ouvrirPublication, { background: "#2563eb", color: "white" })}
                {bouton(tr("✏️  Modifier le profil public"), ouvrirProfil, { background: "#f0fdf4", color: "#059669", border: "1.5px solid #a7f3d0" })}
                {bouton(tr("🤝  Connecter un client"), () => setConnectOpen(true), { background: "#f8fafc", color: "#475569", border: "1.5px solid #e2e8f0" })}
              </div>
            )}

            {account && !abonnementDansParametres && (
              <div style={{ marginTop: 18, borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                <button onClick={() => setVoirAbonnement(v => !v)}
                  style={{ background: "none", border: "none", padding: "4px 0", cursor: "pointer", fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                  {tr("⚙️ Paramètres · Application et abonnement")} {voirAbonnement ? "▴" : "▾"}
                </button>
                {voirAbonnement && <div style={{ marginTop: 8 }}><div style={{ display: "grid", gap: 12 }}><TenantCodeCard code={tenantCode} /><ParametresEspacePro /></div></div>}
              </div>
            )}
            </>)}
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
          title={tr("Connecter un client — {nom}", { nom: account.name })}
          onSelect={async (numeroH) => {
            try {
              const r = await fetch(`${API}/api/professionals/${account.id}/connect-client`, {
                method: "POST",
                headers: { ...auth, "Content-Type": "application/json" },
                body: JSON.stringify({ clientNumeroH: numeroH }),
              });
              const d = await r.json();
              // Message du serveur (« Client connecté à <nom> avec succès. ») traduit avec le nom
              alert(d.success ? tr("Client connecté à {nom} avec succès.", { nom: account.name }) : tr(d.message || "Erreur lors de la connexion."));
            } catch { alert(tr("Erreur de connexion au serveur.")); }
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

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionUser } from "../utils/auth";
import { AddPersonModal } from "./AddPersonModal";
import PaymentModal from "./PaymentModal";
import {
  DEFAULT_PUB_FORM, getTypeInfo, PublierModal, ProfilModalComp, OffreGestionInterne,
  type PublishModal, type ProfilModal, type PeriodeGI,
} from "./EspaceProModals";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5002").replace(/\/api\/?$/, "");

const PURPOSE_GI: Record<PeriodeGI, string> = { mois: "gestion_mois", troisMois: "gestion_3mois", an: "gestion_an", vie: "gestion_interne_vie" };
const LIBELLE_GI: Record<PeriodeGI, string> = { mois: "mensuel", troisMois: "3 mois", an: "annuel", vie: "à vie" };

// Panneau « Espace Pro » ouvert depuis la gestion interne d'un établissement :
// abonnement, site client, publications, profil public et clients — tout au même
// endroit, sans quitter la gestion interne.
export default function PanneauEspacePro({ tenantCode, onClose }: { tenantCode: string; onClose: () => void }) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token") || "";
  const currentUser = getSessionUser();

  const [account, setAccount] = useState<any>(null);
  const [accesGI, setAccesGI] = useState<any>(null);
  const [erreur, setErreur] = useState("");
  const [showOffre, setShowOffre] = useState(false);
  const [periode, setPeriode] = useState<PeriodeGI | null>(null);
  const [publishModal, setPublishModal] = useState<PublishModal | null>(null);
  const [profilModal, setProfilModal] = useState<ProfilModal | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);

  const auth = { Authorization: `Bearer ${token}` };

  function chargerAcces() {
    fetch(`${API}/api/payment/acces-gestion-interne`, { headers: auth })
      .then(r => r.json()).then(d => { if (d.success) setAccesGI(d); }).catch(() => {});
  }

  useEffect(() => {
    fetch(`${API}/api/pro-vitrine/by-tenant/${tenantCode}/account`, { headers: auth })
      .then(r => r.json())
      .then(d => { if (d.success && d.account) setAccount(d.account); else setErreur(d.message || "Compte introuvable."); })
      .catch(() => setErreur("Erreur de connexion au serveur."));
    chargerAcces();
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
  const sousFenetre = publishModal || profilModal || connectOpen || periode;
  const pluriel = (n: number) => (n > 1 ? "s" : "");

  const statut = (() => {
    if (!accesGI) return null;
    if (accesGI.mode === "essai") return { icone: "⏳", titre: `Essai gratuit — ${accesGI.joursRestants} jour${pluriel(accesGI.joursRestants)} restant${pluriel(accesGI.joursRestants)}`, fond: "#eff6ff", bord: "#93c5fd", texte: "#1e40af" };
    if (accesGI.mode === "paye") return { icone: "✅", titre: `Gestion Interne active — ${accesGI.joursRestants} jour${pluriel(accesGI.joursRestants)} restant${pluriel(accesGI.joursRestants)}`, fond: "#f0fdf0", bord: "#86efac", texte: "#0f4b0f" };
    if (accesGI.mode === "vie") return { icone: "♾️", titre: "Gestion Interne à vie", fond: "#f0fdf0", bord: "#86efac", texte: "#0f4b0f" };
    return null;
  })();

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

            {statut && (
              <div style={{ background: statut.fond, border: `1px solid ${statut.bord}`, borderRadius: 10, padding: "10px 12px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: statut.texte, fontSize: 13, fontWeight: 700 }}>
                  <span style={{ fontSize: 18 }}>{statut.icone}</span>{statut.titre}
                </div>
                {accesGI.mode !== "vie" && (
                  <button onClick={() => setShowOffre(v => !v)}
                    style={{ padding: "7px 12px", background: "#2563eb", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                    {showOffre ? "Masquer les formules" : "Voir les formules"}
                  </button>
                )}
              </div>
            )}
            {showOffre && accesGI && (
              <OffreGestionInterne accesGI={accesGI} onChoisir={setPeriode}
                onVisibilite={() => { onClose(); navigate("/mes-comptes-pro"); }} />
            )}

            {account && info && (
              <div style={{ display: "grid", gap: 8 }}>
                {info.vitrinePath && bouton("🌐  Voir le site client", () => { onClose(); navigate(`/${info.vitrinePath}/${tenantCode}`); }, { background: info.color, color: "white" })}
                {bouton("📢  Nouvelle publication", ouvrirPublication, { background: "#2563eb", color: "white" })}
                {bouton("✏️  Modifier le profil public", ouvrirProfil, { background: "#f0fdf4", color: "#059669", border: "1.5px solid #a7f3d0" })}
                {bouton("🤝  Connecter un client", () => setConnectOpen(true), { background: "#f8fafc", color: "#475569", border: "1.5px solid #e2e8f0" })}
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
      {periode && accesGI && (
        <PaymentModal
          isOpen
          onClose={() => setPeriode(null)}
          onSuccess={() => { setPeriode(null); setShowOffre(false); chargerAcces(); }}
          amount={({ mois: accesGI.prixMois, troisMois: accesGI.prixTroisMois, an: accesGI.prixAn, vie: accesGI.prixVie } as Record<PeriodeGI, number>)[periode] || 0}
          currency="GNF"
          purpose={PURPOSE_GI[periode]}
          relatedId={accesGI.proId}
          description={`Gestion Interne ${LIBELLE_GI[periode]}`}
        />
      )}
    </>
  );
}

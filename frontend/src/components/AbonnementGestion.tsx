import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PaymentModal from "./PaymentModal";
import { getSessionUser, isAdmin } from "../utils/auth";
import { OffreGestionInterne, type PeriodeGI } from "./EspaceProModals";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5002").replace(/\/api\/?$/, "");

const PURPOSE_GI: Record<PeriodeGI, string> = { mois: "gestion_mois", troisMois: "gestion_3mois", an: "gestion_an", vie: "gestion_interne_vie" };
const LIBELLE_GI: Record<PeriodeGI, string> = { mois: "mensuel", troisMois: "3 mois", an: "annuel", vie: "à vie" };

// Abonnement de la Gestion Interne (essai gratuit, jours restants, formules et
// paiement). Sa place est dans les Paramètres : ce n'est pas un outil de tous les jours.
export default function AbonnementGestion() {
  const navigate = useNavigate();
  // Abonnement de l'établissement ouvert (un propriétaire peut en avoir plusieurs)
  const { tenantCode } = useParams<{ tenantCode?: string }>();
  const token = localStorage.getItem("token") || "";
  const estAdmin = isAdmin(getSessionUser());
  const [accesGI, setAccesGI] = useState<any>(null);
  const [showOffre, setShowOffre] = useState(false);
  const [periode, setPeriode] = useState<PeriodeGI | null>(null);

  function charger() {
    fetch(`${API}/api/payment/acces-gestion-interne${tenantCode ? `?tenantCode=${encodeURIComponent(tenantCode)}` : ""}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { if (d.success) setAccesGI(d); }).catch(() => {});
  }
  useEffect(() => { if (!estAdmin) charger(); }, []);

  if (estAdmin || !accesGI || !["essai", "paye", "vie"].includes(accesGI.mode)) return null;

  const n = accesGI.joursRestants;
  const s = n > 1 ? "s" : "";
  const statut =
    accesGI.mode === "essai" ? `Essai gratuit — ${n} jour${s} restant${s}` :
    accesGI.mode === "paye"  ? `Abonnement actif — ${n} jour${s} restant${s}` :
    "Gestion Interne à vie";

  return (
    <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Abonnement</h3>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: showOffre ? 14 : 0 }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#334155" }}>{statut}</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>Visibilité + Rendez-vous + Gestion complète</p>
        </div>
        {accesGI.mode !== "vie" && (
          <button onClick={() => setShowOffre(v => !v)}
            style={{ padding: "7px 12px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            {showOffre ? "Masquer les formules" : "Voir les formules"}
          </button>
        )}
      </div>
      {showOffre && (
        <OffreGestionInterne accesGI={accesGI} onChoisir={setPeriode} onVisibilite={() => navigate("/mes-comptes-pro")} />
      )}
      {periode && (
        <PaymentModal
          isOpen
          onClose={() => setPeriode(null)}
          onSuccess={() => { setPeriode(null); setShowOffre(false); charger(); }}
          amount={({ mois: accesGI.prixMois, troisMois: accesGI.prixTroisMois, an: accesGI.prixAn, vie: accesGI.prixVie } as Record<PeriodeGI, number>)[periode] || 0}
          currency="GNF"
          purpose={PURPOSE_GI[periode]}
          relatedId={accesGI.proId}
          description={`Gestion Interne ${LIBELLE_GI[periode]}`}
        />
      )}
    </div>
  );
}

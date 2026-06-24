import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSessionUser, isAdmin, isMasterAdmin } from "../utils/auth";
import { config } from "../config/api";

const API = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";

interface Demande {
  id: string;
  proAccountId: string;
  proAccountName: string;
  proAccountType: string;
  ownerNumeroH: string;
  ownerNom: string;
  montant: number;
  motif: string | null;
  coordonneesPaiement: string | null;
  statut: "en_attente" | "valide" | "rejete";
  raisonRejet: string | null;
  receiptRef: string;
  valideParNom: string | null;
  valideAt: string | null;
  creeLe: string;
}

export default function AdminRetraits() {
  const navigate  = useNavigate();
  const user      = getSessionUser();
  const token     = localStorage.getItem("token");

  const [demandes, setDemandes]         = useState<Demande[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filtre, setFiltre]             = useState<"tous" | "en_attente" | "valide" | "rejete">("en_attente");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [modalRejet, setModalRejet]     = useState<Demande | null>(null);
  const [raisonRejet, setRaisonRejet]   = useState("");
  const [message, setMessage]           = useState<{ type: "ok" | "err"; texte: string } | null>(null);

  useEffect(() => {
    if (!user || (!isAdmin(user) && !isMasterAdmin(user))) {
      navigate("/");
      return;
    }
    charger();
  }, []);

  async function charger() {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/withdrawal-requests/admin/toutes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setDemandes(data.demandes);
    } catch { /* silencieux */ }
    setLoading(false);
  }

  async function approuver(demande: Demande) {
    if (!confirm(`Approuver le retrait de ${demande.montant.toLocaleString()} GNF pour ${demande.proAccountName} ?`)) return;
    setActionLoading(demande.id);
    try {
      const res  = await fetch(`${API}/api/withdrawal-requests/admin/${demande.id}/valider`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "ok", texte: data.message });
        charger();
      } else {
        setMessage({ type: "err", texte: data.message || "Erreur lors de la validation." });
      }
    } catch {
      setMessage({ type: "err", texte: "Erreur réseau." });
    }
    setActionLoading(null);
  }

  async function rejeter() {
    if (!modalRejet) return;
    setActionLoading(modalRejet.id);
    try {
      const res  = await fetch(`${API}/api/withdrawal-requests/admin/${modalRejet.id}/rejeter`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:   JSON.stringify({ raisonRejet })
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "ok", texte: data.message });
        setModalRejet(null);
        setRaisonRejet("");
        charger();
      } else {
        setMessage({ type: "err", texte: data.message || "Erreur." });
      }
    } catch {
      setMessage({ type: "err", texte: "Erreur réseau." });
    }
    setActionLoading(null);
  }

  const filtrees = demandes.filter(d => filtre === "tous" ? true : d.statut === filtre);
  const nbAttente = demandes.filter(d => d.statut === "en_attente").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-500 text-white px-4 py-5">
        <button onClick={() => navigate(-1)} className="text-white/80 text-sm mb-3 flex items-center gap-1">
          ← Retour
        </button>
        <h1 className="text-2xl font-bold">Demandes de retrait</h1>
        <p className="text-emerald-100 text-sm mt-1">Cliniques uniquement — tu dois approuver avant que l'argent parte</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">

        {/* MESSAGE */}
        {message && (
          <div className={`mb-4 p-4 rounded-xl text-sm font-medium ${message.type === "ok" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {message.texte}
            <button onClick={() => setMessage(null)} className="ml-3 underline">OK</button>
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border">
            <div className="text-2xl font-bold text-orange-500">{nbAttente}</div>
            <div className="text-xs text-gray-500 mt-1">En attente</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border">
            <div className="text-2xl font-bold text-emerald-600">{demandes.filter(d => d.statut === "valide").length}</div>
            <div className="text-xs text-gray-500 mt-1">Approuvés</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-sm border">
            <div className="text-2xl font-bold text-red-500">{demandes.filter(d => d.statut === "rejete").length}</div>
            <div className="text-xs text-gray-500 mt-1">Refusés</div>
          </div>
        </div>

        {/* FILTRES */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {(["en_attente", "tous", "valide", "rejete"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filtre === f ? "bg-emerald-600 text-white" : "bg-white text-gray-600 border"}`}
            >
              {f === "en_attente" ? `En attente${nbAttente > 0 ? ` (${nbAttente})` : ""}` : f === "tous" ? "Tous" : f === "valide" ? "Approuvés" : "Refusés"}
            </button>
          ))}
        </div>

        {/* LISTE */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement...</div>
        ) : filtrees.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {filtre === "en_attente" ? "Aucune demande en attente" : "Aucune demande"}
          </div>
        ) : (
          <div className="space-y-4">
            {filtrees.map(d => (
              <div key={d.id} className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                {/* Badge statut */}
                <div className={`px-4 py-2 text-xs font-bold ${d.statut === "en_attente" ? "bg-orange-50 text-orange-600" : d.statut === "valide" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                  {d.statut === "en_attente" ? "EN ATTENTE DE TON AUTORISATION" : d.statut === "valide" ? "APPROUVÉ ET PAYÉ" : "REFUSÉ"}
                </div>

                <div className="p-4">
                  {/* Infos clinique */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="font-bold text-gray-800 text-lg">{d.proAccountName}</div>
                      <div className="text-sm text-gray-500">{d.ownerNom} · {d.ownerNumeroH}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-700">{d.montant.toLocaleString()}</div>
                      <div className="text-xs text-gray-400">GNF</div>
                    </div>
                  </div>

                  {/* Détails */}
                  <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Orange Money</span>
                      <span className="font-medium">{d.coordonneesPaiement || "Non renseigné"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Motif</span>
                      <span className="font-medium">{d.motif || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Réf.</span>
                      <span className="font-mono text-xs">{d.receiptRef}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Demandé le</span>
                      <span>{new Date(d.creeLe).toLocaleDateString("fr-FR")}</span>
                    </div>
                    {d.statut === "valide" && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Approuvé par</span>
                        <span>{d.valideParNom} · {d.valideAt ? new Date(d.valideAt).toLocaleDateString("fr-FR") : ""}</span>
                      </div>
                    )}
                    {d.statut === "rejete" && d.raisonRejet && (
                      <div className="flex justify-between text-red-600">
                        <span>Raison du refus</span>
                        <span>{d.raisonRejet}</span>
                      </div>
                    )}
                  </div>

                  {/* Boutons action */}
                  {d.statut === "en_attente" && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => approuver(d)}
                        disabled={actionLoading === d.id}
                        className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform"
                      >
                        {actionLoading === d.id ? "..." : "Approuver et payer"}
                      </button>
                      <button
                        onClick={() => { setModalRejet(d); setRaisonRejet(""); }}
                        disabled={actionLoading === d.id}
                        className="flex-1 bg-red-50 text-red-600 border border-red-200 py-3 rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform"
                      >
                        Refuser
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL REFUS */}
      {modalRejet && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setModalRejet(null)}>
          <div className="bg-white w-full rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">Refuser la demande</h3>
            <p className="text-sm text-gray-500 mb-4">{modalRejet.proAccountName} — {modalRejet.montant.toLocaleString()} GNF</p>
            <textarea
              value={raisonRejet}
              onChange={e => setRaisonRejet(e.target.value)}
              placeholder="Raison du refus (facultatif)..."
              rows={3}
              className="w-full border rounded-xl p-3 text-sm resize-none mb-4 focus:outline-none focus:ring-2 focus:ring-red-300"
            />
            <div className="flex gap-3">
              <button onClick={() => setModalRejet(null)} className="flex-1 py-3 border rounded-xl text-gray-600 font-medium">Annuler</button>
              <button
                onClick={rejeter}
                disabled={actionLoading === modalRejet.id}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {actionLoading === modalRejet.id ? "..." : "Confirmer le refus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

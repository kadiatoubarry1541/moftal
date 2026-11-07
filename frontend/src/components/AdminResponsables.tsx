import { useCallback, useEffect, useState } from "react";
import { config } from "../config/api";
import PhotoProfil from "./PhotoProfil";

/**
 * Administration : chefs de quartier, maires, préfets… qui demandent à être
 * validés pour leur localité (routes/responsables.js). Valider = droit de
 * publier pour la localité ; un chef de quartier devient aussi l'un des
 * 3 responsables de la caisse du quartier.
 */
interface Demande {
  id: number; numeroH: string; nom: string | null; role: string; roleLibelle: string; scope: string;
  location: string; locationName: string | null; statut: string; motifRefus: string | null; createdAt: string;
  photo: string | null; tel1: string | null; activite1: string | null; activite2: string | null; activite3: string | null;
}

const NIVEAUX: Record<string, string> = { quartier: "Quartier", "sous-prefecture": "Commune", prefecture: "Préfecture", region: "Région" };
const entetes = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

export default function AdminResponsables() {
  const [statut, setStatut] = useState<"en_attente" | "approuve" | "refuse">("en_attente");
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState("");
  const [enCours, setEnCours] = useState<number | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const r = await fetch(`${config.API_BASE_URL}/responsables/admin?statut=${statut}`, { headers: entetes() });
      const d = await r.json();
      if (d.success) setDemandes(d.demandes || []);
      else setMessage(d.message || "Erreur.");
    } catch {
      setMessage("Le serveur ne répond pas.");
    } finally { setChargement(false); }
  }, [statut]);

  useEffect(() => { void charger(); }, [charger]);

  const decider = async (d: Demande, action: "approuver" | "refuser") => {
    let motif = "";
    if (action === "refuser") {
      const reponse = window.prompt(`Refuser ${d.nom || d.numeroH} ? Raison (facultatif) :`);
      if (reponse === null) return;
      motif = reponse;
    } else if (!window.confirm(`Valider ${d.nom || d.numeroH} comme ${d.roleLibelle} — ${d.locationName || d.location} ?`)) return;
    setEnCours(d.id); setMessage("");
    try {
      const r = await fetch(`${config.API_BASE_URL}/responsables/admin/${d.id}/${action}`, {
        method: "POST", headers: entetes(), body: JSON.stringify({ motif }),
      });
      const res = await r.json().catch((): null => null);
      setMessage(res?.message || (r.ok ? "Fait." : "Erreur."));
      if (res?.success) await charger();
    } catch {
      setMessage("Connexion coupée : rien n'a été enregistré.");
    } finally { setEnCours(null); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">👑 Chefs de quartier, maires…</h2>
        <p className="text-sm text-gray-500 mt-1">
          Vérifiez la personne avant de valider. Validé : elle publie pour sa localité ; un chef de quartier
          devient l'un des 3 responsables du quartier (caisse et liste des membres).
        </p>
      </div>
      <div className="flex gap-2">
        {([["en_attente", "⏳ En attente"], ["approuve", "✅ Validés"], ["refuse", "❌ Refusés"]] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setStatut(id)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold ${statut === id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}>
            {label}
          </button>
        ))}
      </div>
      {message && <p className="text-sm bg-blue-50 text-blue-800 rounded-lg px-3 py-2">{message}</p>}
      {chargement ? <p className="text-sm text-gray-500">Chargement…</p> : demandes.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white rounded-xl border p-6 text-center">Aucune demande.</p>
      ) : (
        <div className="space-y-3">
          {demandes.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <PhotoProfil photo={d.photo || undefined} prenom={d.nom || ""} className="w-12 h-12 text-lg flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate">{d.nom || d.numeroH}</p>
                  <p className="text-xs text-gray-500 font-mono truncate">{d.numeroH}{d.tel1 ? ` · ${d.tel1}` : ""}</p>
                  <p className="text-sm text-amber-800 font-semibold">{d.roleLibelle} — {NIVEAUX[d.scope] || d.scope} : {d.locationName || d.location}</p>
                  <p className="text-xs text-gray-400 truncate">Activités : {[d.activite1, d.activite2, d.activite3].filter(Boolean).join(", ") || "—"}</p>
                  {d.motifRefus && <p className="text-xs text-red-600">Raison : {d.motifRefus}</p>}
                </div>
              </div>
              {d.statut === "en_attente" && (
                <div className="flex gap-2 flex-shrink-0">
                  <button type="button" disabled={enCours === d.id} onClick={() => void decider(d, "approuver")}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold disabled:opacity-50">Valider</button>
                  <button type="button" disabled={enCours === d.id} onClick={() => void decider(d, "refuser")}
                    className="px-4 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm font-bold disabled:opacity-50">Refuser</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

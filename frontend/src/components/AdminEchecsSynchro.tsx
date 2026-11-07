import { useEffect, useState } from "react";
import { config } from "../config/api";

// Opérations faites hors connexion dans une gestion interne, puis refusées par
// le serveur à leur envoi (backend/src/middleware/echecsSynchro.js). Elles
// restent sur l'appareil de la personne, qui peut les corriger et les réessayer.
interface Echec {
  id: number;
  tenant_code: string;
  etablissement: string | null;
  numero_h: string | null;
  prenom: string | null;
  nom_famille: string | null;
  tel1: string | null;
  operation: string;
  statut_http: number | null;
  raison: string | null;
  created_at: string;
}

export default function AdminEchecsSynchro() {
  const [echecs, setEchecs] = useState<Echec[] | null>(null);
  const [erreur, setErreur] = useState("");

  const charger = () => {
    setErreur("");
    fetch(`${config.API_BASE_URL}/admin/echecs-synchro`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setEchecs(d.echecs); else setErreur(d.message || "Impossible de charger la liste."); })
      .catch(() => setErreur("Impossible de joindre le serveur."));
  };
  useEffect(charger, []);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-800">⚠️ Échecs des envois hors ligne</h2>
          <p className="text-sm text-gray-500 mt-1">
            Opérations faites sans connexion dans une gestion (clinique, école…) et refusées par le serveur au retour de la connexion.
            Rien n'est perdu : elles restent sur l'appareil de la personne, qui a été prévenue, tout comme le responsable de l'établissement.
          </p>
        </div>
        <button onClick={charger} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-semibold">Actualiser</button>
      </div>
      {erreur && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{erreur}</div>}
      {echecs === null && !erreur && <div className="text-gray-500 text-sm">Chargement…</div>}
      {echecs?.length === 0 && <div className="p-6 rounded-xl bg-green-50 text-green-700 text-sm font-semibold">✅ Aucun échec : toutes les opérations faites hors connexion sont bien arrivées.</div>}
      {!!echecs?.length && (
        <div className="space-y-2">
          {echecs.map((e) => (
            <div key={e.id} className="bg-white border border-red-200 rounded-xl p-4">
              <div className="flex justify-between gap-2 flex-wrap">
                <div className="font-bold text-gray-900">{e.etablissement || e.tenant_code}</div>
                <div className="text-xs text-gray-500">{new Date(e.created_at).toLocaleString("fr-FR")}</div>
              </div>
              <div className="text-sm text-gray-700 mt-1">
                {e.operation} · par {[e.prenom, e.nom_famille].filter(Boolean).join(" ") || e.numero_h || "inconnu"}{e.tel1 ? ` (${e.tel1})` : ""}
              </div>
              <div className="text-sm text-red-700 mt-1">{e.raison}</div>
              <div className="text-xs text-gray-400 mt-1 font-mono">{e.tenant_code}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { config } from "../config/api";
import PhotoProfil from "./PhotoProfil";

/**
 * Administration : bloquer l'activité d'une personne qui se déclare
 * « Président de la République », « Maire »… sans l'être. L'activité est
 * retirée de son profil, ne peut plus être choisie, et les droits qu'elle
 * donnait sont retirés (routes/responsables.js).
 */
interface Personne { numeroH: string; nom: string; photo: string | null; activites: string[] }
interface Bloquee { numeroH?: string; nom?: string | null; photo?: string | null; activite: string; raison: string | null; createdAt: string }

const entetes = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

export default function AdminActivitesBloquees() {
  const [numeroH, setNumeroH] = useState("");
  const [personne, setPersonne] = useState<Personne | null>(null);
  const [sesBloquees, setSesBloquees] = useState<Bloquee[]>([]);
  const [toutes, setToutes] = useState<Bloquee[]>([]);
  const [autre, setAutre] = useState("");
  const [message, setMessage] = useState("");
  const [enCours, setEnCours] = useState(false);

  const chargerToutes = useCallback(async () => {
    try {
      const r = await fetch(`${config.API_BASE_URL}/responsables/admin/bloquees`, { headers: entetes() });
      const d = await r.json();
      if (d.success) setToutes(d.bloquees || []);
    } catch { /* message affiché lors d'une action */ }
  }, []);

  useEffect(() => { void chargerToutes(); }, [chargerToutes]);

  const chercher = async (nh = numeroH) => {
    if (!nh.trim()) return;
    setMessage(""); setEnCours(true);
    try {
      const r = await fetch(`${config.API_BASE_URL}/responsables/admin/personne/${encodeURIComponent(nh.trim())}`, { headers: entetes() });
      const d = await r.json();
      if (d.success) { setPersonne(d.personne); setSesBloquees(d.bloquees || []); }
      else { setPersonne(null); setMessage(d.message || "Introuvable."); }
    } catch {
      setMessage("Le serveur ne répond pas.");
    } finally { setEnCours(false); }
  };

  const action = async (type: "bloquer" | "debloquer", nh: string, activite: string) => {
    let raison = "";
    if (type === "bloquer") {
      const rep = window.prompt(`Bloquer « ${activite} » pour ${nh} ?\nRaison (facultatif) :`);
      if (rep === null) return;
      raison = rep;
    } else if (!window.confirm(`Débloquer « ${activite} » pour ${nh} ?`)) return;
    setEnCours(true); setMessage("");
    try {
      const r = await fetch(`${config.API_BASE_URL}/responsables/admin/${type}`, {
        method: "POST", headers: entetes(), body: JSON.stringify({ numeroH: nh, activite, raison }),
      });
      const d = await r.json().catch((): null => null);
      setMessage(d?.message || (r.ok ? "Fait." : "Erreur."));
      if (d?.success) {
        await chargerToutes();
        if (personne && personne.numeroH === nh) await chercher(nh);
      }
    } catch {
      setMessage("Connexion coupée : rien n'a été enregistré.");
    } finally { setEnCours(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">🚫 Bloquer une activité</h2>
        <p className="text-sm text-gray-500 mt-1">
          Pour une personne qui a choisi une activité qui n'est pas la sienne (Président, Ministre, Maire…).
          L'activité est retirée de son profil, elle ne peut plus la choisir, et ses droits (publier, caisse du quartier) sont retirés.
        </p>
      </div>

      <div className="flex gap-2">
        <input value={numeroH} onChange={(e) => setNumeroH(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void chercher(); }}
          placeholder="NuméroH de la personne" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
        <button type="button" onClick={() => void chercher()} disabled={enCours}
          className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-bold disabled:opacity-50">Chercher</button>
      </div>

      {message && <p className="text-sm bg-blue-50 text-blue-800 rounded-lg px-3 py-2">{message}</p>}

      {personne && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <PhotoProfil photo={personne.photo || undefined} prenom={personne.nom} className="w-12 h-12 text-lg flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-gray-900 truncate">{personne.nom || personne.numeroH}</p>
              <p className="text-xs text-gray-500 font-mono">{personne.numeroH}</p>
            </div>
          </div>
          <p className="text-xs font-bold text-gray-600">Ses activités</p>
          {personne.activites.length === 0 && <p className="text-sm text-gray-400">Aucune activité.</p>}
          {personne.activites.map((a) => (
            <div key={a} className="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-sm font-semibold text-gray-800">{a}</span>
              <button type="button" disabled={enCours} onClick={() => void action("bloquer", personne.numeroH, a)}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-50">🚫 Bloquer</button>
            </div>
          ))}
          {/* Bloquer d'avance une activité qu'elle n'a pas encore choisie */}
          <div className="flex gap-2">
            <input value={autre} onChange={(e) => setAutre(e.target.value)} placeholder="Autre activité à bloquer (ex. Président de la République)"
              className="flex-1 border rounded-lg px-3 py-2 text-sm" />
            <button type="button" disabled={enCours || !autre.trim()} onClick={() => { void action("bloquer", personne.numeroH, autre.trim()); setAutre(""); }}
              className="px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-bold disabled:opacity-50">🚫 Bloquer</button>
          </div>
          {sesBloquees.length > 0 && (
            <>
              <p className="text-xs font-bold text-gray-600">Déjà bloquées</p>
              {sesBloquees.map((b) => (
                <div key={b.activite} className="flex items-center justify-between gap-2 bg-red-50 rounded-lg px-3 py-2">
                  <span className="text-sm text-red-800">🚫 {b.activite}{b.raison ? ` — ${b.raison}` : ""}</span>
                  <button type="button" disabled={enCours} onClick={() => void action("debloquer", personne.numeroH, b.activite)}
                    className="px-3 py-1.5 rounded-lg bg-white border text-xs font-bold text-gray-700 disabled:opacity-50">Débloquer</button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border p-4 space-y-2">
        <p className="text-sm font-bold text-gray-800">Toutes les activités bloquées ({toutes.length})</p>
        {toutes.length === 0 && <p className="text-sm text-gray-400">Aucune pour le moment.</p>}
        {toutes.map((b) => (
          <div key={`${b.numeroH}-${b.activite}`} className="flex items-center justify-between gap-2 border-b last:border-0 py-2">
            <button type="button" onClick={() => { setNumeroH(b.numeroH || ""); void chercher(b.numeroH || ""); }} className="text-left min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{b.nom || b.numeroH}</p>
              <p className="text-xs text-red-700 truncate">🚫 {b.activite}{b.raison ? ` — ${b.raison}` : ""}</p>
            </button>
            <button type="button" disabled={enCours} onClick={() => void action("debloquer", b.numeroH || "", b.activite)}
              className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-bold text-gray-700 flex-shrink-0 disabled:opacity-50">Débloquer</button>
          </div>
        ))}
      </div>
    </div>
  );
}

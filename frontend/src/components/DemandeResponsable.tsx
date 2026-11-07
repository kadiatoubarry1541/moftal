import { useCallback, useEffect, useState } from "react";
import { config } from "../config/api";

/**
 * « Je suis chef de quartier / maire… » : une personne dont le profil porte une
 * activité de responsable demande à être validée pour sa localité. L'admin de
 * Moftal vérifie et valide (routes/responsables.js). Rien ne s'affiche si le
 * profil n'a aucune de ces activités.
 */
export interface LieuResponsable { scope: string; location: string; locationName: string }

interface RolePossible { id: string; libelle: string; scope: string }
interface Demande { id: number; role: string; scope: string; location: string; locationName: string | null; statut: "en_attente" | "approuve" | "refuse"; motifRefus: string | null }

const entetes = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" });

export default function DemandeResponsable({ lieux }: { lieux: LieuResponsable[] }) {
  const [roles, setRoles] = useState<RolePossible[]>([]);
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const charger = useCallback(async () => {
    try {
      const r = await fetch(`${config.API_BASE_URL}/responsables/moi`, { headers: entetes() });
      const d = await r.json();
      if (d.success) { setRoles(d.rolesPossibles || []); setDemandes(d.demandes || []); }
    } catch { /* sans connexion : rien à proposer */ }
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  if (roles.length === 0) return null;

  const lieuDe = (scope: string) => lieux.find((l) => l.scope === scope && l.location);
  const demandeDe = (role: string, lieu?: LieuResponsable) =>
    demandes.find((d) => d.role === role && lieu && d.location.toLowerCase() === lieu.location.toLowerCase());

  const demander = async (role: RolePossible) => {
    const lieu = lieuDe(role.scope);
    if (!lieu) { setMessage("Complétez d'abord votre lieu de résidence dans votre profil."); return; }
    setEnvoi(role.id); setMessage("");
    try {
      const r = await fetch(`${config.API_BASE_URL}/responsables/demande`, {
        method: "POST", headers: entetes(),
        body: JSON.stringify({ role: role.id, location: lieu.location, locationName: lieu.locationName }),
      });
      const d = await r.json().catch((): null => null);
      setMessage(d?.message || (r.ok ? "Demande envoyée." : "Erreur. Réessayez."));
      if (d?.success) await charger();
    } catch {
      setMessage("Connexion coupée : rien n'a été envoyé. Réessayez.");
    } finally { setEnvoi(null); }
  };

  return (
    <>
      <button type="button" onClick={() => setOuvert(true)}
        className="w-full flex items-center justify-between gap-3 p-4 bg-white rounded-xl shadow border border-amber-200">
        <span className="flex items-center gap-3 font-bold text-amber-800 text-sm">👑 Je suis {roles.map((r) => r.libelle.toLowerCase()).join(" / ")}</span>
        <span className="text-gray-400">›</span>
      </button>

      {ouvert && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setOuvert(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h2 className="font-black text-base">👑 Responsable de ma localité</h2>
              <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer" className="text-gray-400 text-xl leading-none">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-gray-500">
                L'administrateur de Moftal vérifie votre rôle. Une fois validé, vous publiez pour votre localité
                et, pour un chef de quartier, vous voyez la caisse et la liste des membres.
              </p>
              {roles.map((role) => {
                const lieu = lieuDe(role.scope);
                const d = demandeDe(role.id, lieu);
                return (
                  <div key={role.id} className="border rounded-xl p-3 space-y-2">
                    <p className="font-bold text-sm text-gray-900">{role.libelle}</p>
                    <p className="text-xs text-gray-500">📍 {lieu ? lieu.locationName : "Lieu non renseigné dans votre profil"}</p>
                    {d?.statut === "approuve" && <p className="text-sm font-bold text-green-700 bg-green-50 rounded-lg px-3 py-2">✅ Validé</p>}
                    {d?.statut === "en_attente" && <p className="text-sm font-bold text-amber-700 bg-amber-50 rounded-lg px-3 py-2">⏳ En attente de l'administrateur</p>}
                    {(!d || d.statut === "refuse") && (
                      <>
                        {d?.statut === "refuse" && (
                          <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">❌ Refusée{d.motifRefus ? ` : ${d.motifRefus}` : ""}</p>
                        )}
                        <button type="button" disabled={!lieu || envoi === role.id} onClick={() => void demander(role)}
                          className="w-full py-2.5 rounded-xl bg-amber-600 text-white text-sm font-bold disabled:opacity-50">
                          {envoi === role.id ? "Envoi…" : "Demander la validation"}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
              {message && <p className="text-sm bg-gray-50 rounded-lg px-3 py-2 text-gray-700">{message}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

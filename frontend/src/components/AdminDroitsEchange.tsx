import { useState } from "react";
import { SECTEURS_ECHANGE } from "../utils/secteursEchange";
import { config } from "../config/api";

// Admin : donner à un professionnel du commerce le droit de publier dans la
// page Échange, secteur par secteur (enregistré en base, voir
// backend/src/utils/droitsEchange.js). Aucune case cochée = droit retiré.

const API_BASE = (config.API_BASE_URL || "").replace(/\/api\/?$/, "") || "http://localhost:5002";

export default function AdminDroitsEchange({ pro, secteurs, onClose, onSaved }: {
  pro: { id: string; name: string };
  secteurs: string[];
  onClose: () => void;
  onSaved: (secteurs: string[]) => void;
}) {
  const [choix, setChoix] = useState<string[]>(secteurs);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  const basculer = (id: string) => setChoix((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const enregistrer = async () => {
    setEnvoi(true); setErreur("");
    try {
      const res = await fetch(`${API_BASE}/api/professionals/admin/${pro.id}/droits-echange`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ secteurs: choix }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) { setErreur(data.message || "Le droit n'a pas pu être enregistré."); return; }
      onSaved(data.secteurs || []);
      onClose();
    } catch {
      setErreur("Connexion impossible : rien n'a été enregistré. Réessayez.");
    } finally { setEnvoi(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-900">🛒 Publier dans Échange</h3>
        <p className="text-sm text-gray-600 mt-1">
          Choisissez les secteurs où <strong>{pro.name}</strong> peut publier ses produits dans la page Échange.
        </p>
        <div className="mt-4 space-y-2">
          {SECTEURS_ECHANGE.map((s) => (
            <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${choix.includes(s.id) ? "border-emerald-500 bg-emerald-50" : "border-gray-200"}`}>
              <input type="checkbox" checked={choix.includes(s.id)} onChange={() => basculer(s.id)} className="w-4 h-4" />
              <span className="text-sm font-medium text-gray-800">{s.label}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={() => setChoix(SECTEURS_ECHANGE.map((s) => s.id))} className="text-xs font-semibold text-emerald-700 hover:underline">Tout cocher</button>
          <button type="button" onClick={() => setChoix([])} className="text-xs font-semibold text-gray-500 hover:underline">Tout décocher</button>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Sans compte vendeur ni abonnement vendeur en plus. Le droit s'arrête si le compte commerce est suspendu ou désactivé.
        </p>
        {erreur && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 mt-3">{erreur}</p>}
        <div className="flex gap-2 mt-5">
          <button type="button" disabled={envoi} onClick={enregistrer}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl">
            {envoi ? "Enregistrement…" : choix.length ? "Enregistrer" : "Retirer le droit"}
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2.5 bg-gray-100 text-sm rounded-xl">Annuler</button>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { getPhotoUrl } from "../utils/auth";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5002";
const PAR_PAGE = 20;

interface Suggestion {
  ref: string;
  prenom: string;
  nomFamille: string;
  photo: string | null;
  activite1: string | null;
  raison: string | null;
}

// « Personnes que vous pourriez connaître » : les membres inscrits se voient dans
// Amitié et s'invitent d'un clic (comme Facebook). La recherche par NuméroH,
// e-mail ou téléphone reste disponible avec le bouton « Ajouter ».
export default function SuggestionsAmis() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [envoyees, setEnvoyees] = useState<Record<string, "envoi" | "ok" | string>>({});

  const charger = useCallback(async (offset: number) => {
    setChargement(true);
    setErreur("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/friends/suggestions?limit=${PAR_PAGE}&offset=${offset}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || "Erreur");
      setSuggestions((prev) => (offset === 0 ? data.suggestions : [...prev, ...data.suggestions]));
      setHasMore(Boolean(data.hasMore));
    } catch {
      setErreur("Impossible de charger les membres. Vérifiez votre connexion.");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => { charger(0); }, [charger]);

  const inviter = async (s: Suggestion) => {
    setEnvoyees((e) => ({ ...e, [s.ref]: "envoi" }));
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/friends/send-request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ref: s.ref }),
      });
      const data = await res.json().catch(() => ({}));
      setEnvoyees((e) => ({ ...e, [s.ref]: res.ok ? "ok" : data.message || "Erreur lors de l'envoi" }));
    } catch {
      setEnvoyees((e) => ({ ...e, [s.ref]: "Erreur de connexion" }));
    }
  };

  if (!chargement && !erreur && suggestions.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">👥 Personnes que vous pourriez connaître</h2>
        <p className="text-xs text-gray-500 mt-1 mb-4">Membres de Moftal : invitez-les d'un clic.</p>

        {erreur && (
          <div className="text-sm text-red-600 mb-3">
            {erreur}{" "}
            <button type="button" onClick={() => charger(0)} className="underline font-semibold">Réessayer</button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {suggestions.map((s) => {
            const etat = envoyees[s.ref];
            const photo = getPhotoUrl(s.photo);
            return (
              <div key={s.ref} className="border border-gray-100 rounded-xl overflow-hidden flex flex-col">
                <div className="aspect-square bg-emerald-50 flex items-center justify-center">
                  {photo ? (
                    <img src={photo} alt={`${s.prenom} ${s.nomFamille}`} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="text-4xl font-bold text-emerald-600">{(s.prenom || "?").charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="p-2 flex-1 flex flex-col">
                  <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{s.prenom} {s.nomFamille}</p>
                  {(s.raison || s.activite1) && (
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">{s.raison || s.activite1}</p>
                  )}
                  <div className="mt-auto pt-2">
                    {etat === "ok" ? (
                      <p className="text-center text-xs font-semibold text-emerald-700 py-2">✓ Demande envoyée</p>
                    ) : (
                      <button
                        type="button"
                        disabled={etat === "envoi"}
                        onClick={() => inviter(s)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold py-2 rounded-lg"
                      >
                        {etat === "envoi" ? "Envoi…" : "➕ Ajouter"}
                      </button>
                    )}
                    {etat && etat !== "ok" && etat !== "envoi" && (
                      <p className="text-[11px] text-red-600 mt-1 text-center">{etat}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {chargement && <p className="text-center text-sm text-gray-400 py-4">Chargement…</p>}
        {!chargement && hasMore && (
          <button
            type="button"
            // Les personnes invitées sortent de la liste côté serveur : on décale d'autant
            onClick={() => charger(suggestions.length - Object.values(envoyees).filter((e) => e === "ok").length)}
            className="mt-4 w-full py-2.5 rounded-lg border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-50"
          >
            Voir plus de membres
          </button>
        )}
      </div>
    </div>
  );
}

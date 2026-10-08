import { useEffect, useRef, useState } from "react";
import PhotoProfil from "./PhotoProfil";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5002";

interface Personne { numeroH: string; prenom: string; nomFamille?: string; photo?: string | null }

/**
 * Champ unique pour désigner un membre de la famille : NuméroH, numéro de
 * téléphone OU e-mail. Moftal retrouve le compte et affiche son nom et sa photo
 * pour confirmer ; `onChange` reçoit alors son NuméroH (vide tant que personne
 * n'est trouvé).
 *
 * `onPasDeCompte` : lien « Cette personne n'a pas de compte (enfant) ? » qui
 * ouvre la fiche enfant sans compte (extrait de naissance).
 */
export default function ChampPersonne({ value, onChange, onPasDeCompte, className = "" }: {
  value: string;
  onChange: (numeroH: string) => void;
  onPasDeCompte?: () => void;
  className?: string;
}) {
  const [saisie, setSaisie] = useState(value || "");
  const [trouve, setTrouve] = useState<Personne | null>(null);
  const [etat, setEtat] = useState<"" | "recherche" | "introuvable">("");
  const [message, setMessage] = useState("");
  const dernierTrouve = useRef("");

  // Valeur choisie ailleurs (ex. bouton « Chercher ») : on l'affiche dans le champ
  useEffect(() => {
    if (value && value !== dernierTrouve.current) setSaisie(value);
    if (!value && dernierTrouve.current) { dernierTrouve.current = ""; setTrouve(null); }
  }, [value]);

  useEffect(() => {
    const q = saisie.trim();
    if (q.length < 3) { setTrouve(null); setEtat(""); if (dernierTrouve.current) { dernierTrouve.current = ""; onChange(""); } return; }
    if (trouve && (q === trouve.numeroH || q === dernierTrouve.current)) return;
    setEtat("recherche");
    const ctrl = new AbortController();
    const minuterie = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/friends/trouver-personne?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          signal: ctrl.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success && data.user) {
          setTrouve(data.user);
          setEtat("");
          dernierTrouve.current = data.user.numeroH;
          onChange(data.user.numeroH);
        } else {
          setTrouve(null);
          setEtat("introuvable");
          setMessage(data.message || "Aucun compte trouvé");
          dernierTrouve.current = "";
          onChange("");
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setTrouve(null);
        setEtat("introuvable");
        setMessage("Erreur de connexion. Réessayez.");
        onChange("");
      }
    }, 600);
    return () => { clearTimeout(minuterie); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saisie]);

  return (
    <div className={className}>
      <input
        type="text"
        value={saisie}
        onChange={(e) => { setSaisie(e.target.value); if (trouve) setTrouve(null); }}
        placeholder="NuméroH, téléphone ou e-mail"
        autoComplete="off"
        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      {etat === "recherche" && <p className="text-xs text-slate-500 mt-1.5">Recherche…</p>}
      {trouve && (
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <PhotoProfil photo={trouve.photo} prenom={trouve.prenom} nomFamille={trouve.nomFamille} className="w-10 h-10 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-900 truncate">✓ {trouve.prenom} {trouve.nomFamille}</p>
            <p className="text-xs text-emerald-700">Compte Moftal trouvé</p>
          </div>
        </div>
      )}
      {etat === "introuvable" && <p className="text-xs text-red-600 mt-1.5">{message}</p>}
      {onPasDeCompte && (
        <button type="button" onClick={onPasDeCompte} className="mt-2 text-sm font-semibold text-emerald-700 underline text-left">
          👶 Cette personne n'a pas de compte (enfant) ? Ajoutez-la ici
        </button>
      )}
    </div>
  );
}

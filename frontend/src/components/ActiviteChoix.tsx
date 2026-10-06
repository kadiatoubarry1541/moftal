import { useEffect, useState } from "react";
import { ACTIVITES_PROFIL } from "../utils/activitesProfil";

const TOUTES = new Set(ACTIVITES_PROFIL.flatMap((g) => g.activites));
const AUTRE = "__autre__";

// Choix d'une activité : liste par groupes + « Autre » qui ouvre un champ
// où l'on écrit soi-même son activité. La valeur reçue/renvoyée est toujours
// l'activité finale (jamais le mot « Autre »).
export default function ActiviteChoix({
  value,
  onChange,
  placeholder = "Sélectionner une activité",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const v = value === "Autre" ? "" : value || "";
  const [autre, setAutre] = useState(value === "Autre" || (!!v && !TOUTES.has(v)));
  useEffect(() => { if (v) setAutre(!TOUTES.has(v)); }, [v]);

  return (
    <>
      <select
        value={autre ? AUTRE : v}
        onChange={(e) => {
          const choix = e.target.value;
          if (choix === AUTRE) { setAutre(true); onChange(""); }
          else { setAutre(false); onChange(choix); }
        }}
        className={className}
      >
        <option value="">{placeholder}</option>
        {ACTIVITES_PROFIL.map((g) => (
          <optgroup key={g.groupe} label={g.groupe}>
            {g.activites.map((a) => <option key={a} value={a}>{a}</option>)}
          </optgroup>
        ))}
        <option value={AUTRE}>✏️ Autre (j'écris mon activité)</option>
      </select>
      {autre && (
        <input
          type="text"
          autoFocus={!v}
          value={v}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Écrivez votre activité (ex. Chef de quartier, Imam, Enseignant…)"
          className={`mt-2 ${className || ""}`}
        />
      )}
    </>
  );
}

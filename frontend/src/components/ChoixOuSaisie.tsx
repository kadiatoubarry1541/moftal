import { useState } from "react";

// Liste de choix + « ✏️ Autre (saisir) » : si ce qu'on cherche n'est pas dans la
// liste, on l'écrit soi-même. Une valeur déjà saisie hors liste reste affichée.
type Groupe = { cycle: string; niveaux: string[] };

export default function ChoixOuSaisie({ value, onChange, options, groupes, defaut, placeholder, className, style }: {
  value: string | undefined;
  onChange: (v: string) => void;
  options?: string[];
  groupes?: Groupe[];
  /** Choix affiché tant que rien n'est choisi (doit être celui enregistré par défaut) */
  defaut?: string;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const toutes = groupes ? groupes.flatMap(g => g.niveaux) : (options || []);
  value = value || "";
  const [saisie, setSaisie] = useState(() => !!value && !toutes.includes(value));

  if (saisie) {
    return (
      <div style={{ display: "flex", gap: 6 }}>
        <input autoFocus value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || "Écrivez ici"}
          className={className} style={{ ...style, flex: 1, minWidth: 0 }} />
        {toutes.length > 0 && (
          <button type="button" title="Revenir à la liste" onClick={() => { setSaisie(false); onChange(defaut || toutes[0]); }}
            style={{ border: "1px solid #e2e8f0", background: "#f8fafc", borderRadius: 8, padding: "0 10px", cursor: "pointer", fontSize: 12 }}>
            ☰
          </button>
        )}
      </div>
    );
  }
  return (
    <select value={toutes.includes(value) ? value : (defaut || toutes[0] || "")}
      onChange={e => { if (e.target.value === "__autre__") { setSaisie(true); onChange(""); } else onChange(e.target.value); }}
      className={className} style={style}>
      {groupes
        ? groupes.map(g => g.cycle
          ? <optgroup key={g.cycle} label={g.cycle}>{g.niveaux.map(n => <option key={n}>{n}</option>)}</optgroup>
          : g.niveaux.map(n => <option key={n}>{n}</option>))
        : toutes.map(o => <option key={o}>{o}</option>)}
      <option value="__autre__">✏️ Autre (saisir)…</option>
    </select>
  );
}

// Barre de recherche des listes de gestion interne (nom, téléphone, numéro…)
import { useTraduction } from "../i18n/traduction";


export default function BarreRecherche({ valeur, onChange }: { valeur: string; onChange: (v: string) => void }) {
  const { tr } = useTraduction();
  return (
    <div style={{ position: "relative", marginBottom: 12 }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#94a3b8" }}>🔍</span>
      <input
        type="search"
        value={valeur}
        onChange={e => onChange(e.target.value)}
        placeholder={tr("Rechercher (nom, téléphone, numéro…)")}
        style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", background: "white" }}
      />
    </div>
  );
}

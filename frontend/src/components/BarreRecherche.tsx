// Barre de recherche des listes de gestion interne (nom, téléphone, numéro…)

// Toutes les valeurs lisibles d'une fiche, y compris dans ses détails
// (articles d'une commande, médicaments d'une ordonnance…).
function valeursTexte(v: unknown, prof = 0): string[] {
  if (v == null || prof > 3) return [];
  if (typeof v === "string" && /^[[{]/.test(v.trim())) {
    try { return valeursTexte(JSON.parse(v), prof + 1); } catch { return [v]; }
  }
  if (typeof v !== "object") return [String(v)];
  return Object.values(v as Record<string, unknown>).flatMap(x => valeursTexte(x, prof + 1));
}
export function filtrer<T>(liste: T[] | null | undefined, recherche: string): T[] {
  const items = liste || [];
  const q = recherche.trim().toLowerCase();
  if (!q) return items;
  const mots = q.split(/\s+/);
  return items.filter(x => {
    const texte = valeursTexte(x).join(" ").toLowerCase();
    return mots.every(m => texte.includes(m));
  });
}

export default function BarreRecherche({ valeur, onChange }: { valeur: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: "relative", marginBottom: 12 }}>
      <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#94a3b8" }}>🔍</span>
      <input
        type="search"
        value={valeur}
        onChange={e => onChange(e.target.value)}
        placeholder="Rechercher (nom, téléphone, numéro…)"
        style={{ width: "100%", padding: "10px 12px 10px 36px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", background: "white" }}
      />
    </div>
  );
}

import { useTraduction } from "../i18n/traduction";

// Choix de la langue dans les pages de l'école : français ou arabe (de droite à gauche).
// Préférence de l'utilisateur, gardée dans le téléphone (comme le thème).
export default function ChoixLangueEcole({ sombre = false, compact = false }: { sombre?: boolean; compact?: boolean }) {
  const { lang, setLang, tr } = useTraduction();
  const options: { code: "fr" | "ar"; label: string }[] = [
    { code: "fr", label: "Français" },
    { code: "ar", label: "العربية" },
  ];
  return (
    <div role="group" aria-label={tr("Langue")} style={{ display: "inline-flex", gap: 2, padding: 2, borderRadius: 8, background: sombre ? "rgba(255,255,255,0.12)" : "#f1f5f9", border: sombre ? "1px solid rgba(255,255,255,0.18)" : "1px solid #e2e8f0" }}>
      {options.map(o => {
        const actif = (lang === "ar" ? "ar" : "fr") === o.code;
        return (
          <button key={o.code} type="button" onClick={() => setLang(o.code)} aria-pressed={actif}
            style={{ border: "none", cursor: "pointer", borderRadius: 6, padding: compact ? "4px 8px" : "6px 12px", fontSize: compact ? 11 : 12, fontWeight: actif ? 700 : 500,
              background: actif ? (sombre ? "white" : "#0f172a") : "transparent",
              color: actif ? (sombre ? "#0f172a" : "white") : (sombre ? "rgba(255,255,255,0.85)" : "#475569") }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

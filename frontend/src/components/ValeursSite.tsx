import { useEffect, useState } from "react";
import { config } from "../config/api";
import { useTraduction } from "../i18n/traduction";

// « Nos valeurs » : trois points au plus que le responsable écrit lui-même
// (ce qui rend son établissement différent). Le site les montre à la place du
// texte général « Pourquoi nous choisir ? ». Enregistré sur le serveur.
interface Valeur { titre: string; texte: string }
const VIDE: Valeur = { titre: "", texte: "" };

export default function ValeursSite({ tenantCode, couleur }: { tenantCode: string; couleur: string }) {
  const { tr } = useTraduction();
  const base = `${config.API_BASE_URL}/site-mgmt/${encodeURIComponent(tenantCode)}/valeurs`;
  const entetes = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}`, "Content-Type": "application/json" });
  const [valeurs, setValeurs] = useState<Valeur[] | null>(null);
  const [etat, setEtat] = useState<"" | "envoi" | "publie">("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    fetch(base, { headers: entetes() })
      .then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .then(({ ok, d }) => {
        if (!ok || !d.success) { setErreur(d.message || tr("Impossible de charger vos valeurs.")); return; }
        const l: Valeur[] = Array.isArray(d.valeurs) ? d.valeurs : [];
        setValeurs([0, 1, 2].map(i => l[i] || VIDE));
      })
      .catch(() => setErreur(tr("Erreur de connexion. Réessayez.")));
  }, [base]); // eslint-disable-line react-hooks/exhaustive-deps

  const publier = async () => {
    if (!valeurs || etat === "envoi") return;
    setEtat("envoi"); setErreur("");
    try {
      const r = await fetch(base, { method: "PUT", headers: entetes(), body: JSON.stringify({ valeurs }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.message || tr("Rien n'a été enregistré. Réessayez."));
      setEtat("publie"); setTimeout(() => setEtat(""), 3000);
    } catch (e) { setErreur((e as Error).message); setEtat(""); }
  };

  const champ = { width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", fontSize: 13, boxSizing: "border-box" as const, fontFamily: "inherit" };
  return (
    <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 16 }}>
      <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{tr("⭐ Nos valeurs")}</p>
      <p style={{ margin: "4px 0 12px", fontSize: 12, color: "#64748b" }}>{tr("Ce qui rend votre établissement différent (3 points au plus). Votre site les montre dans « Pourquoi nous choisir ? ».")}</p>
      {!valeurs ? <p style={{ fontSize: 13, color: erreur ? "#dc2626" : "#94a3b8" }}>{erreur || tr("Chargement…")}</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {valeurs.map((v, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, padding: 10, background: "#f8fafc", borderRadius: 10 }}>
              <input value={v.titre} maxLength={80} placeholder={tr(["Ex : Enseignement bilingue", "Ex : Suivi de chaque apprenant", "Ex : Discipline et respect"][i])} style={{ ...champ, fontWeight: 700 }}
                onChange={e => setValeurs(l => l && l.map((x, j) => j === i ? { ...x, titre: e.target.value } : x))} />
              <textarea value={v.texte} maxLength={300} rows={2} placeholder={tr("Expliquez en une ou deux phrases.")} style={{ ...champ, resize: "vertical" }}
                onChange={e => setValeurs(l => l && l.map((x, j) => j === i ? { ...x, texte: e.target.value } : x))} />
            </div>
          ))}
          {erreur && <p style={{ margin: 0, fontSize: 12, color: "#dc2626" }}>{erreur}</p>}
          <button onClick={publier} disabled={etat === "envoi"}
            style={{ alignSelf: "flex-start", padding: "9px 18px", border: "none", borderRadius: 8, background: couleur, color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {etat === "envoi" ? "…" : etat === "publie" ? tr("✅ Publié sur votre site") : tr("Publier sur mon site")}
          </button>
        </div>
      )}
    </div>
  );
}

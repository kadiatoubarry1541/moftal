import { useEffect, useState } from "react";
import { config } from "../config/api";
import { useTraduction } from "../i18n/traduction";

// « Coordonnées du site » : le responsable écrit ce que son site affiche
// (présentation, téléphone, e-mail, adresse, horaires) et le publie d'un clic.
// Enregistré sur le serveur ; si l'envoi échoue, on le dit.

const CHAMPS: { cle: string; label: string; aide: string; type?: string; long?: boolean }[] = [
  { cle: "description", label: "Présentation", aide: "Qui vous êtes, ce que vous proposez, ce qui vous rend différent.", long: true },
  { cle: "phone", label: "Téléphone", aide: "Ex. +224 6XX XX XX XX", type: "tel" },
  { cle: "email", label: "E-mail", aide: "Ex. contact@monetablissement.com", type: "email" },
  { cle: "address", label: "Adresse", aide: "Quartier, commune, ville — pour qu'on vous trouve." },
  { cle: "horaires", label: "Horaires", aide: "Ex. Lun-Ven 7h30-17h, Sam 8h-12h" },
];

export default function CoordonneesSite({ tenantCode, couleur, lienSite }: { tenantCode: string; couleur: string; lienSite?: string }) {
  const { tr } = useTraduction();
  const base = `${config.API_BASE_URL}/site-mgmt/${encodeURIComponent(tenantCode)}/coordonnees`;
  const entetes = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}`, "Content-Type": "application/json" });
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [etat, setEtat] = useState<"" | "envoi" | "publie">("");
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    fetch(base, { headers: entetes() })
      .then(async r => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .then(({ ok, d }) => {
        if (!ok || !d.success) { setErreur(d.message || tr("Impossible de charger vos coordonnées.")); return; }
        const c = d.coordonnees || {};
        setForm(Object.fromEntries(CHAMPS.map(ch => [ch.cle, c[ch.cle] || ""])));
      })
      .catch(() => setErreur(tr("Erreur de connexion. Réessayez.")));
  }, [base]); // eslint-disable-line react-hooks/exhaustive-deps

  const publier = async () => {
    if (!form || etat === "envoi") return;
    setEtat("envoi"); setErreur("");
    try {
      const r = await fetch(base, { method: "PUT", headers: entetes(), body: JSON.stringify(form) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) { setErreur(d.message || tr("Rien n'a été publié. Réessayez.")); setEtat(""); return; }
      setEtat("publie");
      setTimeout(() => setEtat(""), 4000);
    } catch { setErreur(tr("Pas de connexion : rien n'a été publié. Réessayez.")); setEtat(""); }
  };

  const champ = { width: "100%", boxSizing: "border-box", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", background: "white" } as const;

  return (
    <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: 16 }}>
      <p style={{ margin: "0 0 4px", fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{tr("📍 Coordonnées affichées sur votre site")}</p>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: "#64748b" }}>{tr("C'est vous qui remplissez votre site : écrivez vos informations puis appuyez sur « Publier sur le site ».")}</p>
      {!form && !erreur && <p style={{ fontSize: 13, color: "#94a3b8" }}>{tr("Chargement…")}</p>}
      {form && (
        <div style={{ display: "grid", gap: 12 }}>
          {CHAMPS.map(ch => (
            <label key={ch.cle} style={{ display: "block" }}>
              <span style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>{tr(ch.label)}</span>
              {ch.long ? (
                <textarea value={form[ch.cle]} rows={4} maxLength={2000} placeholder={tr(ch.aide)}
                  onChange={e => setForm(f => ({ ...f!, [ch.cle]: e.target.value }))} style={{ ...champ, resize: "vertical" }} />
              ) : (
                <input value={form[ch.cle]} type={ch.type || "text"} placeholder={tr(ch.aide)}
                  onChange={e => setForm(f => ({ ...f!, [ch.cle]: e.target.value }))} style={champ} />
              )}
            </label>
          ))}
        </div>
      )}
      {erreur && <p style={{ margin: "12px 0 0", fontSize: 13, color: "#b91c1c", fontWeight: 600 }}>{tr(erreur)}</p>}
      {form && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 14 }}>
          <button type="button" onClick={publier} disabled={etat === "envoi"}
            style={{ background: couleur, color: "white", border: "none", borderRadius: 10, padding: "11px 18px", fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: etat === "envoi" ? 0.7 : 1 }}>
            {etat === "envoi" ? tr("⏳ Publication…") : tr("📢 Publier sur le site")}
          </button>
          {etat === "publie" && <span style={{ fontSize: 13, fontWeight: 700, color: "#166534" }}>{tr("✅ Publié : votre site est à jour.")}</span>}
          {lienSite && <a href={lienSite} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: couleur, fontWeight: 700 }}>{tr("🌐 Voir mon site")}</a>}
        </div>
      )}
    </div>
  );
}

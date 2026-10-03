import { useEffect, useState } from "react";

// « 📊 Rapport du mois » des gestions internes : recettes, dépenses et
// bénéfice du mois choisi, comparés au mois précédent, avec impression.
// Les chiffres viennent du serveur (GET <base>/rapport?mois=AAAA-MM).

const gnf = (n: number) => `${Math.round(n || 0).toLocaleString("fr-FR")} GNF`;
const nomMois = (m: string) => {
  const [a, mo] = m.split("-").map(Number);
  return new Date(a, (mo || 1) - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
};

type Ligne = { label: string; total: number; n: number };
type Rapport = {
  mois: string; recettes: Ligne[]; depenses: Ligne[]; totalRecettes: number; totalDepenses: number; benefice: number;
  precedent: { mois: string; totalRecettes: number; totalDepenses: number; benefice: number };
};

function evolution(actuel: number, avant: number) {
  if (!avant) return null;
  const p = Math.round(((actuel - avant) / Math.abs(avant)) * 100);
  return { p, txt: `${p > 0 ? "+" : ""}${p} % par rapport à ${""}` };
}

export function BoutonRapport({ base, etablissement, couleur = "#1a8f1a" }: {
  base: string; etablissement?: { name?: string; logo_url?: string | null }; couleur?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", margin: "0 0 10px" }}>
        <button onClick={() => setOuvert(true)}
          style={{ padding: "8px 14px", background: "white", color: couleur, border: `1.5px solid ${couleur}`, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          📊 Rapport du mois
        </button>
      </div>
      {ouvert && <RapportMois base={base} etablissement={etablissement} couleur={couleur} onClose={() => setOuvert(false)} />}
    </>
  );
}

export default function RapportMois({ base, etablissement, couleur = "#1a8f1a", onClose }: {
  base: string; etablissement?: { name?: string; logo_url?: string | null }; couleur?: string; onClose: () => void;
}) {
  const [mois, setMois] = useState(() => new Date().toISOString().slice(0, 7));
  const [r, setR] = useState<Rapport | null>(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    let annule = false;
    setR(null); setErreur("");
    fetch(`${base}/rapport?mois=${mois}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
      .then(x => x.json())
      .then(d => { if (annule) return; if (d.success) setR(d); else setErreur(d.message || "Rapport indisponible."); })
      .catch(() => { if (!annule) setErreur("Connexion impossible : le rapport n'a pas pu être chargé."); });
    return () => { annule = true; };
  }, [base, mois]);

  const imprimer = () => {
    if (!r) return;
    const w = window.open("", "_blank");
    if (!w) return;
    const lignes = (t: Ligne[]) => t.map(l => `<tr><td>${l.label}</td><td class="c">${l.n}</td><td class="r">${gnf(l.total)}</td></tr>`).join("");
    const logo = etablissement?.logo_url ? `<img src="${/^(data:|https?:)/.test(etablissement.logo_url) ? etablissement.logo_url : window.location.origin + etablissement.logo_url}" style="width:60px;height:60px;object-fit:contain">` : "";
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Rapport ${nomMois(r.mois)}</title><style>
      body{font-family:'Segoe UI',Arial,sans-serif;padding:28px;color:#0f172a;max-width:720px;margin:auto}
      .h{display:flex;gap:14px;align-items:center;border-bottom:3px solid ${couleur};padding-bottom:14px;margin-bottom:18px}
      h1{font-size:20px;margin:0}h2{font-size:15px;color:${couleur};margin:18px 0 6px}
      table{width:100%;border-collapse:collapse}td,th{padding:7px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:left}
      .c{text-align:center}.r{text-align:right}.t{font-weight:800;font-size:16px}
    </style></head><body>
      <div class="h">${logo}<div><h1>${etablissement?.name || ""}</h1><div>Rapport du mois — ${nomMois(r.mois)}</div></div></div>
      <h2>Recettes</h2><table><tr><th>Source</th><th class="c">Nombre</th><th class="r">Montant</th></tr>${lignes(r.recettes)}
      <tr><td class="t">Total recettes</td><td></td><td class="r t">${gnf(r.totalRecettes)}</td></tr></table>
      ${r.depenses.length ? `<h2>Dépenses</h2><table><tr><th>Source</th><th class="c">Nombre</th><th class="r">Montant</th></tr>${lignes(r.depenses)}
      <tr><td class="t">Total dépenses</td><td></td><td class="r t">${gnf(r.totalDepenses)}</td></tr></table>` : ""}
      <h2>Résultat</h2><table><tr><td class="t">${r.benefice >= 0 ? "Bénéfice" : "Perte"}</td><td class="r t" style="color:${r.benefice >= 0 ? "#15803d" : "#dc2626"}">${gnf(r.benefice)}</td></tr>
      <tr><td>Mois précédent (${nomMois(r.precedent.mois)})</td><td class="r">${gnf(r.precedent.benefice)}</td></tr></table>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>`);
    w.document.close();
  };

  const carte = (titre: string, valeur: number, avant: number, rouge = false) => {
    const ev = evolution(valeur, avant);
    return (
      <div style={{ flex: "1 1 140px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{titre}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: rouge ? "#dc2626" : "#0f172a", marginTop: 2 }}>{gnf(valeur)}</div>
        {ev && <div style={{ fontSize: 11, color: ev.p >= 0 ? "#15803d" : "#dc2626", marginTop: 2 }}>{ev.p > 0 ? "▲" : ev.p < 0 ? "▼" : "="} {Math.abs(ev.p)} % vs mois précédent</div>}
      </div>
    );
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10050, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "white", borderRadius: 16, padding: 20, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>📊 Rapport du mois</h3>
          <input type="month" value={mois} onChange={e => e.target.value && setMois(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14 }} />
        </div>
        {erreur && <p style={{ color: "#dc2626", fontSize: 14 }}>{erreur}</p>}
        {!r && !erreur && <p style={{ color: "#64748b", fontSize: 14 }}>Calcul en cours…</p>}
        {r && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {carte("Recettes", r.totalRecettes, r.precedent.totalRecettes)}
              {r.depenses.length > 0 && carte("Dépenses", r.totalDepenses, r.precedent.totalDepenses)}
              {r.depenses.length > 0 && carte(r.benefice >= 0 ? "Bénéfice" : "Perte", r.benefice, r.precedent.benefice, r.benefice < 0)}
            </div>
            {[["Recettes", r.recettes], ["Dépenses", r.depenses]].map(([titre, lignes]) => (lignes as Ligne[]).length > 0 && (
              <div key={titre as string} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: couleur, marginBottom: 4 }}>{titre as string}</div>
                {(lignes as Ligne[]).map(l => (
                  <div key={l.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f1f5f9", fontSize: 14 }}>
                    <span>{l.label} <span style={{ color: "#94a3b8", fontSize: 12 }}>({l.n})</span></span>
                    <b>{gnf(l.total)}</b>
                  </div>
                ))}
              </div>
            ))}
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "6px 0 0" }}>Mois de {nomMois(r.mois)} · comparé à {nomMois(r.precedent.mois)}</p>
          </>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, background: "#f1f5f9", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>Fermer</button>
          <button onClick={imprimer} disabled={!r} style={{ flex: 1, padding: 11, background: couleur, color: "white", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", opacity: r ? 1 : 0.6 }}>🖨 Imprimer</button>
        </div>
      </div>
    </div>
  );
}

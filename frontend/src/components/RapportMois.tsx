import { useEffect, useState } from "react";
import AccesEmployes from "./AccesEmployes";
import { useTraduction } from "../i18n/traduction";
import { echap } from "../utils/echapperHtml";

// « 📊 Rapport du mois » des gestions internes : recettes, dépenses et
// bénéfice du mois choisi, comparés au mois précédent, avec impression.
// Les chiffres viennent du serveur (GET <base>/rapport?mois=AAAA-MM).

const gnf = (n: number, locale = "fr-FR") => `${Math.round(n || 0).toLocaleString(locale)} GNF`;
const nomMois = (m: string, locale = "fr-FR") => {
  const [a, mo] = m.split("-").map(Number);
  return new Date(a, (mo || 1) - 1, 1).toLocaleDateString(locale, { month: "long", year: "numeric" });
};

type Ligne = { label: string; total: number; n: number };
type Rapport = {
  mois: string; recettes: Ligne[]; depenses: Ligne[]; totalRecettes: number; totalDepenses: number; benefice: number;
  precedent: { mois: string; totalRecettes: number; totalDepenses: number; benefice: number };
};

function evolution(actuel: number, avant: number) {
  if (!avant) return null;
  const p = Math.round(((actuel - avant) / Math.abs(avant)) * 100);
  return { p };
}

// Barre d'outils en tête du tableau de bord : « 📊 Rapport du mois » et
// « 👥 Employés » (propriétaire seulement). Un employé voit son niveau d'accès.
// onEmployes : l'établissement a sa propre liste (école / madrasa : le Personnel
// est la liste des employés), le bouton y mène au lieu d'ouvrir une 2e liste.
export function BoutonRapport({ base, etablissement, couleur = "#1a8f1a", rapport = true, onEmployes }: {
  base: string; etablissement?: { name?: string; logo_url?: string | null; acces_employe?: string }; couleur?: string; rapport?: boolean; onEmployes?: () => void;
}) {
  const { tr } = useTraduction();
  const [ouvert, setOuvert] = useState(false);
  const [employes, setEmployes] = useState(false);
  // Un co-responsable (« total ») a les mêmes boutons que le propriétaire
  const employe = etablissement?.acces_employe === "total" ? undefined : etablissement?.acces_employe;
  const bouton = { padding: "8px 14px", background: "white", color: couleur, border: `1.5px solid ${couleur}`, borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" } as const;
  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "0 0 10px" }}>
        {employe ? (
          <span style={{ padding: "6px 12px", background: "#f1f5f9", color: "#334155", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            👤 {tr("Accès employé")} · {employe === "complet" ? tr("complet") : tr("limité")}
          </span>
        ) : (
          <button onClick={() => onEmployes ? onEmployes() : setEmployes(true)} style={bouton}>{tr("👥 Employés")}</button>
        )}
        {rapport && employe !== "limite" && <button onClick={() => setOuvert(true)} style={bouton}>{tr("📊 Rapport du mois")}</button>}
      </div>
      {ouvert && <RapportMois base={base} etablissement={etablissement} couleur={couleur} onClose={() => setOuvert(false)} />}
      {employes && <AccesEmployes base={base} couleur={couleur} nomEtablissement={etablissement?.name} onClose={() => setEmployes(false)} />}
    </>
  );
}

export default function RapportMois({ base, etablissement, couleur = "#1a8f1a", onClose }: {
  base: string; etablissement?: { name?: string; logo_url?: string | null }; couleur?: string; onClose: () => void;
}) {
  const { tr, isAr, locale } = useTraduction();
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
    // Impression dans la langue choisie (arabe : document de droite à gauche)
    const g = (n: number) => gnf(n, locale);
    const nm = (m: string) => nomMois(m, locale);
    const debut = isAr ? "right" : "left", fin = isAr ? "left" : "right";
    const lignes = (t: Ligne[]) => t.map(l => `<tr><td>${echap(tr(l.label))}</td><td class="c">${echap(l.n)}</td><td class="r">${g(l.total)}</td></tr>`).join("");
    const entete = `<tr><th>${tr("Source")}</th><th class="c">${tr("Nombre")}</th><th class="r">${tr("Montant")}</th></tr>`;
    const logo = etablissement?.logo_url ? `<img src="${echap(/^(data:|https?:)/.test(etablissement.logo_url) ? etablissement.logo_url : window.location.origin + etablissement.logo_url)}" style="width:60px;height:60px;object-fit:contain">` : "";
    w.document.write(`<!doctype html><html lang="${isAr ? "ar" : "fr"}" dir="${isAr ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${tr("Rapport {mois}", { mois: nm(r.mois) })}</title><style>
      body{font-family:'Segoe UI',Arial,sans-serif;padding:28px;color:#0f172a;max-width:720px;margin:auto}
      .h{display:flex;gap:14px;align-items:center;border-bottom:3px solid ${couleur};padding-bottom:14px;margin-bottom:18px}
      h1{font-size:20px;margin:0}h2{font-size:15px;color:${couleur};margin:18px 0 6px}
      table{width:100%;border-collapse:collapse}td,th{padding:7px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:${debut}}
      .c{text-align:center}.r{text-align:${fin}}.t{font-weight:800;font-size:16px}
    </style></head><body>
      <div class="h">${logo}<div><h1>${echap(etablissement?.name)}</h1><div>${tr("Rapport du mois — {mois}", { mois: nm(r.mois) })}</div></div></div>
      <h2>${tr("Recettes")}</h2><table>${entete}${lignes(r.recettes)}
      <tr><td class="t">${tr("Total recettes")}</td><td></td><td class="r t">${g(r.totalRecettes)}</td></tr></table>
      ${r.depenses.length ? `<h2>${tr("Dépenses")}</h2><table>${entete}${lignes(r.depenses)}
      <tr><td class="t">${tr("Total dépenses")}</td><td></td><td class="r t">${g(r.totalDepenses)}</td></tr></table>` : ""}
      <h2>${tr("Résultat")}</h2><table><tr><td class="t">${r.benefice >= 0 ? tr("Bénéfice") : tr("Perte")}</td><td class="r t" style="color:${r.benefice >= 0 ? "#15803d" : "#dc2626"}">${g(r.benefice)}</td></tr>
      <tr><td>${tr("Mois précédent ({mois})", { mois: nm(r.precedent.mois) })}</td><td class="r">${g(r.precedent.benefice)}</td></tr></table>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script></body></html>`);
    w.document.close();
  };

  const carte = (titre: string, valeur: number, avant: number, rouge = false) => {
    const ev = evolution(valeur, avant);
    return (
      <div style={{ flex: "1 1 140px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{tr(titre)}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: rouge ? "#dc2626" : "#0f172a", marginTop: 2 }}>{gnf(valeur, locale)}</div>
        {ev && <div style={{ fontSize: 11, color: ev.p >= 0 ? "#15803d" : "#dc2626", marginTop: 2 }}>{ev.p > 0 ? "▲" : ev.p < 0 ? "▼" : "="} {tr("{p} % vs mois précédent", { p: Math.abs(ev.p) })}</div>}
      </div>
    );
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10050, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "white", borderRadius: 16, padding: 20, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{tr("📊 Rapport du mois")}</h3>
          <input type="month" value={mois} onChange={e => e.target.value && setMois(e.target.value)}
            style={{ padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14 }} />
        </div>
        {erreur && <p style={{ color: "#dc2626", fontSize: 14 }}>{tr(erreur)}</p>}
        {!r && !erreur && <p style={{ color: "#64748b", fontSize: 14 }}>{tr("Calcul en cours…")}</p>}
        {r && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {carte("Recettes", r.totalRecettes, r.precedent.totalRecettes)}
              {r.depenses.length > 0 && carte("Dépenses", r.totalDepenses, r.precedent.totalDepenses)}
              {r.depenses.length > 0 && carte(r.benefice >= 0 ? "Bénéfice" : "Perte", r.benefice, r.precedent.benefice, r.benefice < 0)}
            </div>
            {[["Recettes", r.recettes], ["Dépenses", r.depenses]].map(([titre, lignes]) => (lignes as Ligne[]).length > 0 && (
              <div key={titre as string} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: couleur, marginBottom: 4 }}>{tr(titre as string)}</div>
                {(lignes as Ligne[]).map(l => (
                  <div key={l.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #f1f5f9", fontSize: 14 }}>
                    <span>{tr(l.label)} <span style={{ color: "#94a3b8", fontSize: 12 }}>({l.n})</span></span>
                    <b>{gnf(l.total, locale)}</b>
                  </div>
                ))}
              </div>
            ))}
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "6px 0 0" }}>{tr("Mois de {mois} · comparé à {avant}", { mois: nomMois(r.mois, locale), avant: nomMois(r.precedent.mois, locale) })}</p>
          </>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, background: "#f1f5f9", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>{tr("Fermer")}</button>
          <button onClick={imprimer} disabled={!r} style={{ flex: 1, padding: 11, background: couleur, color: "white", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer", opacity: r ? 1 : 0.6 }}>{tr("🖨 Imprimer")}</button>
        </div>
      </div>
    </div>
  );
}

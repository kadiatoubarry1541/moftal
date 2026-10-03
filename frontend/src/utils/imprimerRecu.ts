// Reçu imprimable commun à toutes les gestions internes : logo et nom de
// l'établissement (jamais le logo Moftal), numéro, date, client, détail,
// total, montant payé et reste à payer. S'ouvre dans une fenêtre et lance
// l'impression (ou « Enregistrer en PDF » sur le téléphone).

export interface LigneRecu {
  libelle: string;
  quantite?: number | string;
  prixUnitaire?: number | string;
  montant: number | string;
}

export interface Recu {
  titre: string;                 // « Reçu de vente », « Quittance de loyer »…
  numero: string | number;
  date?: string | Date | null;
  etablissement: { name?: string; logo_url?: string | null; address?: string | null; phone?: string | null; email?: string | null };
  client?: string | null;
  clientTelephone?: string | null;
  lignes: LigneRecu[];
  remise?: number | string | null;
  total: number | string;
  paye?: number | string | null;  // montant déjà payé
  modePaiement?: string | null;
  details?: { label: string; valeur: string }[]; // infos en plus (période, bien loué…)
  note?: string | null;
  couleur?: string;
}

const echap = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const gnf = (n: unknown) => `${(Number(n) || 0).toLocaleString("fr-FR")} GNF`;

function fmtDate(d: unknown) {
  const x = d ? new Date(d as string) : new Date();
  return isNaN(x.getTime()) ? "" : x.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function absolu(url?: string | null) {
  if (!url) return "";
  if (/^(data:|https?:|blob:)/.test(url)) return url;
  return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function imprimerRecu(r: Recu) {
  const w = window.open("", "_blank");
  if (!w) { alert("Autorisez l'ouverture des fenêtres pour imprimer le reçu."); return; }
  const c = r.couleur || "#1a8f1a";
  const e = r.etablissement || {};
  const total = Number(r.total) || 0;
  const paye = r.paye == null || r.paye === "" ? null : Number(r.paye) || 0;
  const reste = paye == null ? 0 : Math.max(0, total - paye);
  const avecQte = r.lignes.some(l => l.quantite != null && l.quantite !== "");
  const lignes = r.lignes.map(l => `<tr>
      <td>${echap(l.libelle)}</td>
      ${avecQte ? `<td class="c">${echap(l.quantite ?? "")}</td><td class="r">${l.prixUnitaire != null && l.prixUnitaire !== "" ? gnf(l.prixUnitaire) : ""}</td>` : ""}
      <td class="r">${gnf(l.montant)}</td></tr>`).join("");
  const logo = absolu(e.logo_url);

  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${echap(r.titre)} n° ${echap(r.numero)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;padding:28px;max-width:720px;margin:auto;background:#fff}
.head{display:flex;gap:16px;align-items:center;border-bottom:3px solid ${c};padding-bottom:16px}
.logo{width:72px;height:72px;object-fit:contain;flex-shrink:0}
.org{font-size:20px;font-weight:800}
.coord{font-size:12px;color:#475569;margin-top:3px;line-height:1.5}
.titre{display:flex;justify-content:space-between;align-items:flex-end;margin:20px 0 14px}
.titre h1{font-size:18px;color:${c};text-transform:uppercase;letter-spacing:.5px}
.titre div{font-size:12px;color:#475569;text-align:right;line-height:1.6}
.box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px;font-size:13px;line-height:1.7;margin-bottom:12px}
table{width:100%;border-collapse:collapse;margin-top:6px}
th{background:${c};color:#fff;font-size:12px;text-align:left;padding:8px}
td{padding:8px;border-bottom:1px solid #e2e8f0;font-size:13px}
.c{text-align:center}.r{text-align:right}
.tot{margin-top:14px;margin-left:auto;width:290px;font-size:13px}
.tot div{display:flex;justify-content:space-between;padding:4px 0}
.tot .grand{font-size:17px;font-weight:800;color:${c};border-top:2px solid ${c};margin-top:4px;padding-top:8px}
.reste{color:#dc2626;font-weight:700}
.pied{margin-top:36px;display:flex;justify-content:space-between;font-size:12px;color:#64748b}
.sign{border-top:1px solid #94a3b8;width:200px;text-align:center;padding-top:6px}
.merci{text-align:center;margin-top:24px;font-size:12px;color:#94a3b8}
@media print{body{padding:0}@page{margin:16mm}}
</style></head><body>
<div class="head">
  ${logo ? `<img class="logo" src="${echap(logo)}" alt="">` : ""}
  <div><div class="org">${echap(e.name || "")}</div>
  <div class="coord">${[e.address, e.phone && `Tél. ${e.phone}`, e.email].filter(Boolean).map(echap).join(" · ")}</div></div>
</div>
<div class="titre"><h1>${echap(r.titre)}</h1><div>N° <b>${echap(r.numero)}</b><br>${fmtDate(r.date)}</div></div>
${r.client || r.clientTelephone || r.details?.length ? `<div class="box">
  ${r.client ? `<div>Client : <b>${echap(r.client)}</b>${r.clientTelephone ? ` · ${echap(r.clientTelephone)}` : ""}</div>` : ""}
  ${(r.details || []).map(d => `<div>${echap(d.label)} : <b>${echap(d.valeur)}</b></div>`).join("")}
</div>` : ""}
<table><thead><tr><th>Désignation</th>${avecQte ? `<th class="c">Qté</th><th class="r">Prix unitaire</th>` : ""}<th class="r">Montant</th></tr></thead><tbody>${lignes}</tbody></table>
<div class="tot">
  ${Number(r.remise) > 0 ? `<div><span>Remise</span><span>- ${gnf(r.remise)}</span></div>` : ""}
  <div class="grand"><span>Total</span><span>${gnf(total)}</span></div>
  ${paye != null ? `<div><span>Payé</span><span>${gnf(paye)}</span></div>` : ""}
  ${reste > 0 ? `<div class="reste"><span>Reste à payer</span><span>${gnf(reste)}</span></div>` : ""}
  ${r.modePaiement ? `<div><span>Mode de paiement</span><span>${echap(r.modePaiement)}</span></div>` : ""}
</div>
${r.note ? `<div class="box" style="margin-top:14px">${echap(r.note)}</div>` : ""}
<div class="pied"><div>Fait le ${fmtDate(new Date())}</div><div class="sign">Signature et cachet</div></div>
<div class="merci">Merci de votre confiance</div>
<script>window.onload=function(){setTimeout(function(){window.print()},400)}</script>
</body></html>`);
  w.document.close();
}

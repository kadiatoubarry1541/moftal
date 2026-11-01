// Document à imprimer ou à télécharger en PDF (reçu, ordonnance, facture,
// bulletin, carte patient, rapport, certificat…).
//
// Il s'ouvre DANS l'application (plein écran), jamais dans une nouvelle
// fenêtre : dans l'application installée sur un téléphone, une nouvelle
// fenêtre s'ouvre mal ou ne revient pas. Trois boutons : Imprimer,
// Télécharger en PDF (fichier enregistré directement sur l'appareil), Fermer.

import { trHors as tr, langueCourante } from "../i18n/traduction";

/** Nom de fichier propre : lettres, chiffres et tirets (« Reçu n° 12 » → « recu-n-12 »). */
export function nomFichier(texte: string) {
  return String(texte || "document")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 60) || "document";
}

/** Le document sans ses scripts (l'ancienne impression automatique ne doit plus partir seule). */
const sansScripts = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, "");

/**
 * PDF A4 du document : rendu dans un cadre caché à la largeur d'une page A4
 * (styles du document seuls, jamais ceux de l'application), photographié puis
 * découpé en pages.
 */
async function telechargerPdf(html: string, fichier: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const cadre = document.createElement("iframe");
  cadre.setAttribute("aria-hidden", "true");
  cadre.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:none;background:#fff";
  document.body.appendChild(cadre);
  try {
    await new Promise<void>((ok) => { cadre.onload = () => ok(); cadre.srcdoc = sansScripts(html); });
    const doc = cadre.contentDocument!;
    // Attendre les images (logo, photo) avant la photo de la page
    await Promise.all([...doc.images].map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })));
    await new Promise(r => setTimeout(r, 150));
    const toile = await html2canvas(doc.documentElement, {
      scale: 2, useCORS: true, backgroundColor: "#ffffff",
      width: 794, windowWidth: 794, height: doc.documentElement.scrollHeight, windowHeight: doc.documentElement.scrollHeight,
    });
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const largeur = 210, hauteurPage = 297;
    const hauteurImage = (toile.height * largeur) / toile.width;
    const image = toile.toDataURL("image/jpeg", 0.92);
    // Une ou plusieurs pages : on décale la même image vers le haut
    for (let y = 0, page = 0; y < hauteurImage - 1; y += hauteurPage, page++) {
      if (page > 0) pdf.addPage();
      pdf.addImage(image, "JPEG", 0, -y, largeur, hauteurImage);
    }
    pdf.save(`${fichier}.pdf`);
  } finally {
    cadre.remove();
  }
}

/**
 * Ouvre le document (page HTML complète) avec Imprimer / Télécharger en PDF / Fermer.
 * `fichier` : nom du PDF téléchargé, sans « .pdf ».
 */
export function ouvrirDocument(html: string, fichier: string) {
  document.getElementById("doc-imprimable")?.remove();
  const ar = langueCourante() === "ar";
  const fond = document.createElement("div");
  fond.id = "doc-imprimable";
  fond.dir = ar ? "rtl" : "ltr";
  fond.style.cssText = "position:fixed;inset:0;z-index:100000;background:#0f172a;display:flex;flex-direction:column";

  const barre = document.createElement("div");
  barre.style.cssText = "display:flex;gap:8px;align-items:center;padding:10px 12px;background:#0f172a;flex-wrap:wrap";
  const bouton = (texte: string, couleur: string, texteCouleur = "#fff") => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = texte;
    b.style.cssText = `flex:1;min-width:120px;padding:12px 14px;border:none;border-radius:12px;font:700 15px system-ui,Arial,sans-serif;background:${couleur};color:${texteCouleur};cursor:pointer`;
    return b;
  };
  const imprimer = bouton(tr("🖨️ Imprimer"), "#ffffff", "#0f172a");
  const pdf = bouton(tr("⬇️ Télécharger en PDF"), "#16a34a");
  const fermer = bouton("✕", "#334155");
  fermer.style.flex = "0 0 auto";
  fermer.style.minWidth = "52px";
  fermer.setAttribute("aria-label", tr("Fermer"));
  barre.append(imprimer, pdf, fermer);

  const iframe = document.createElement("iframe");
  iframe.title = fichier;
  iframe.style.cssText = "flex:1;width:100%;border:none;background:#fff";
  iframe.srcdoc = sansScripts(html);

  fond.append(barre, iframe);
  document.body.appendChild(fond);

  const fin = () => { fond.remove(); document.removeEventListener("keydown", echap); };
  const echap = (e: KeyboardEvent) => { if (e.key === "Escape") fin(); };
  document.addEventListener("keydown", echap);
  fermer.onclick = fin;
  imprimer.onclick = () => { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); };
  pdf.onclick = async () => {
    const texte = pdf.textContent;
    pdf.disabled = true;
    pdf.textContent = tr("⏳ Préparation du PDF…");
    try {
      await telechargerPdf(html, nomFichier(fichier));
      pdf.textContent = tr("✅ PDF téléchargé");
    } catch {
      alert(tr("Le PDF n'a pas pu être créé. Utilisez « Imprimer », puis « Enregistrer en PDF »."));
      pdf.textContent = texte;
    } finally {
      pdf.disabled = false;
      setTimeout(() => { if (pdf.isConnected) pdf.textContent = texte; }, 2500);
    }
  };
}

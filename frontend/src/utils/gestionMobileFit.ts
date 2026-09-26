// Gestions internes (mobile) : les numéros de téléphone, dates et montants
// ne sont jamais coupés sur plusieurs lignes. Si un tableau dépasse la largeur
// de l'écran, sa taille de texte est réduite jusqu'à ce qu'il tienne.
// Idem pour un chiffre clé qui dépasse de sa carte.
// Voir aussi styles/gestion-mobile.css.

const MOBILE = window.matchMedia("(max-width: 768px)");
const TABLE_FS_MAX = 10.5;
const TABLE_FS_MIN = 7;

// Téléphone, date, heure, nombre ou montant : "+224 622 00 00 00", "12/03/2014", "12 500 000 GNF"
const INSECABLE = /^[+(]?\d[\d\s.,:/()+-]*(\s?(GNF|FCFA|F|%|€|\$))?$/i;

function marquerCellules(root: ParentNode) {
  root.querySelectorAll<HTMLElement>(".gestion-page td, .gestion-page th").forEach(c => {
    const t = (c.textContent || "").trim();
    c.classList.toggle("gestion-nowrap", t.length > 0 && t.length <= 32 && INSECABLE.test(t));
  });
}

function ajusterTableaux() {
  document.querySelectorAll<HTMLTableElement>(".gestion-page table").forEach(tb => {
    tb.style.removeProperty("--gestion-table-fs");
    const box = tb.parentElement;
    if (!MOBILE.matches || !box) return;
    let fs = TABLE_FS_MAX;
    while (tb.offsetWidth > box.clientWidth + 0.5 && fs > TABLE_FS_MIN) {
      fs -= 0.5;
      tb.style.setProperty("--gestion-table-fs", `${fs}px`);
    }
  });
}

// Hors tableaux : un chiffre/montant/téléphone seul dans son bloc reste sur une
// ligne ; s'il dépasse de sa carte, sa taille est réduite jusqu'à ce qu'il tienne.
function ajusterNombres() {
  document.querySelectorAll<HTMLElement>(".gestion-page div, .gestion-page p, .gestion-page span").forEach(el => {
    if (el.children.length || el.closest("table")) return;
    const t = (el.textContent || "").trim();
    const nombre = MOBILE.matches && t.length > 0 && t.length <= 32 && INSECABLE.test(t);
    el.classList.toggle("gestion-nowrap", nombre);
    el.classList.remove("gestion-fit");
    el.style.removeProperty("--gestion-fit-fs");
    if (!nombre || !el.clientWidth || el.scrollWidth <= el.clientWidth) return;
    let fs = parseFloat(getComputedStyle(el).fontSize);
    el.classList.add("gestion-fit");
    while (el.scrollWidth > el.clientWidth && fs > TABLE_FS_MIN) {
      fs -= 0.5;
      el.style.setProperty("--gestion-fit-fs", `${fs}px`);
    }
  });
}

let prevu = 0;
function planifier() {
  if (prevu) return;
  prevu = requestAnimationFrame(() => {
    prevu = 0;
    if (!document.querySelector(".gestion-page")) return;
    marquerCellules(document);
    ajusterTableaux();
    ajusterNombres();
  });
}

// Seuls les changements de contenu sont observés (pas les attributs),
// pour ne pas se relancer sur nos propres réglages de style.
new MutationObserver(planifier).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
window.addEventListener("resize", planifier);
MOBILE.addEventListener?.("change", planifier);
planifier();

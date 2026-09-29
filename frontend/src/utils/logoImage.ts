// Tout logo choisi (photo du téléphone, logo de la galerie en SVG, image très
// lourde…) est converti en une image PNG carrée de 512 px. Ainsi il s'affiche
// partout — aperçu, gestion, site client — et sert d'icône d'application
// (les téléphones n'acceptent pas les icônes SVG, et les photos de plusieurs Mo
// étaient refusées ou trop lourdes).

import { ouvrirImage } from "./imageLisible";

const TAILLE = 512;

export const MESSAGE_LOGO_ILLISIBLE =
  "Cette image est abîmée ou n'est pas une image. Choisissez une autre photo du logo.";

/** Convertit un fichier image ou une data URL (PNG, JPG, SVG…) en PNG 512×512. */
export async function normaliserLogo(source: File | string): Promise<string> {
  try {
    const img = await ouvrirImage(source).catch(() => { throw new Error(MESSAGE_LOGO_ILLISIBLE); });
    const w = img.naturalWidth || TAILLE;
    const h = img.naturalHeight || TAILLE;
    if (!w || !h) throw new Error(MESSAGE_LOGO_ILLISIBLE);
    const canvas = document.createElement("canvas");
    canvas.width = TAILLE;
    canvas.height = TAILLE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error(MESSAGE_LOGO_ILLISIBLE);
    // L'image entière tient dans le carré (rien n'est coupé), centrée
    const echelle = Math.min(TAILLE / w, TAILLE / h);
    const dw = w * echelle, dh = h * echelle;
    ctx.drawImage(img, (TAILLE - dw) / 2, (TAILLE - dh) / 2, dw, dh);
    return canvas.toDataURL("image/png");
  } finally { /* rien à libérer */ }
}

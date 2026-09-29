// Tout logo choisi (photo du téléphone, logo de la galerie en SVG, image très
// lourde…) est converti en une image PNG carrée de 512 px. Ainsi il s'affiche
// partout — aperçu, gestion, site client — et sert d'icône d'application
// (les téléphones n'acceptent pas les icônes SVG, et les photos de plusieurs Mo
// étaient refusées ou trop lourdes).

const TAILLE = 512;

export const MESSAGE_LOGO_ILLISIBLE =
  "Ce format d'image ne peut pas être lu. Choisissez une image JPG ou PNG (ou faites une capture d'écran du logo).";

function chargerImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(MESSAGE_LOGO_ILLISIBLE));
    img.src = src;
  });
}

/** Convertit un fichier image ou une data URL (PNG, JPG, SVG…) en PNG 512×512. */
export async function normaliserLogo(source: File | string): Promise<string> {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const img = await chargerImage(url);
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
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(url);
  }
}

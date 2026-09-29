import { config } from "../config/api";

// Toute image du téléphone est acceptée : JPG, PNG, WEBP, GIF, SVG, mais aussi
// HEIC/HEIF (photos iPhone et de nombreux Android), BMP, TIFF… Si le navigateur
// ne sait pas l'ouvrir, le serveur la convertit, sans rien changer à l'image.
// Les grosses photos sont réduites automatiquement au lieu d'être refusées.

export const ACCEPT_IMAGES = "image/*,.heic,.heif,.avif,.bmp,.tif,.tiff";

export const MESSAGE_IMAGE_ILLISIBLE = "Cette image est abîmée ou n'est pas une image. Choisissez une autre photo.";

function charger(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(MESSAGE_IMAGE_ILLISIBLE));
    img.src = src;
  });
}

/** Ouvre l'image ; si le navigateur ne connaît pas son format, le serveur la convertit. */
export async function ouvrirImage(source: File | Blob | string): Promise<HTMLImageElement> {
  if (typeof source === "string") return charger(source);
  const url = URL.createObjectURL(source);
  try {
    return await charger(url);
  } catch {
    const r = await fetch(`${config.API_BASE_URL}/images/convertir`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}`, "Content-Type": source.type || "application/octet-stream" },
      body: source,
    }).catch(() => null);
    const d = r ? await r.json().catch(() => null) : null;
    if (!d?.dataUrl) throw new Error(d?.message || MESSAGE_IMAGE_ILLISIBLE);
    return charger(d.dataUrl);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * Image → data URL légère, prête à enregistrer (plus grand côté ≤ `max` px).
 * PNG si l'image peut avoir de la transparence (PNG, GIF, SVG, WEBP), sinon JPEG.
 */
export async function imageEnDataUrl(file: File | Blob, max = 1600): Promise<string> {
  const img = await ouvrirImage(file);
  const w = img.naturalWidth || max, h = img.naturalHeight || max;
  const k = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * k));
  canvas.height = Math.max(1, Math.round(h * k));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(MESSAGE_IMAGE_ILLISIBLE);
  const transparente = /png|gif|svg|webp/i.test(file.type);
  if (!transparente) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return transparente ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85);
}

/** Vrai si le fichier est une image (même quand le téléphone ne donne pas son type). */
export function estImage(file: File): boolean {
  return file.type.startsWith("image/") || /\.(heic|heif|hif|avif|bmp|tiff?|jfif|jpe?g|png|gif|webp|svg)$/i.test(file.name);
}

import { config } from "../config/api";

// Icône d'application de la gestion : une vraie image PNG 512×512 (les téléphones
// refusent le SVG comme icône d'app installée). Dessinée ici à partir du logo de
// l'établissement (jamais une icône inventée à sa place) — puis enregistrée en base ; le manifest de l'app la donne au téléphone.

function empreinte(texte: string): string {
  let h = 5381;
  for (let i = 0; i < texte.length; i++) h = ((h << 5) + h + texte.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function chargerImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function dessinerIcone(nom: string, logoUrl: string | undefined, couleur: string): Promise<string> {
  const T = 512;
  const canvas = document.createElement("canvas");
  canvas.width = T; canvas.height = T;
  const ctx = canvas.getContext("2d")!;
  if (logoUrl) {
    const img = await chargerImage(logoUrl);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, T, T);
    // Logo entier dans les 76 % du centre : visible même quand le téléphone
    // arrondit ou découpe l'icône (icônes « maskable » d'Android)
    const zone = T * 0.76;
    const w = img.naturalWidth || zone, h = img.naturalHeight || zone;
    const k = Math.min(zone / w, zone / h);
    ctx.drawImage(img, (T - w * k) / 2, (T - h * k) / 2, w * k, h * k);
  }
  return canvas.toDataURL("image/png");
}

const enCours = new Set<string>();

/** Met à jour l'icône PNG de l'app si le logo (ou le nom / la couleur) a changé. */
export async function synchroniserIconeApp(tenantCode: string, nom?: string, logoUrl?: string, couleur?: string) {
  const token = localStorage.getItem("token");
  // Seulement le logo du propriétaire : aucune icône n'est inventée à sa place
  if (!token || !tenantCode || !logoUrl) return;
  const source = `logo:${empreinte(logoUrl)}`;
  const cle = `${tenantCode}|${source}`;
  if (enCours.has(cle)) return;
  enCours.add(cle);
  try {
    const base = `${config.API_BASE_URL}/professionals/tenant-icon-png/${encodeURIComponent(tenantCode)}`;
    const actuelle = await fetch(`${base}/source`).then(r => r.json()).catch(() => null);
    if (actuelle?.source === source) return;
    const png = await dessinerIcone(nom || "", logoUrl, couleur || "#1a8f1a");
    await fetch(base, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ png, source }),
    });
  } catch {
    // Logo illisible : l'icône sera redessinée au prochain changement de logo
  } finally {
    enCours.delete(cle);
  }
}

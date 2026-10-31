import type { IconEntry } from "./iconLibrary";

export type LogoTemplateId = "icon" | "icon_text" | "icon_side_text" | "banner" | "outline";
export type FontId = "sans" | "serif" | "rounded" | "elegant" | "impact";

export const TEMPLATES: { id: LogoTemplateId; label: string }[] = [
  { id: "icon",           label: "Icône seule" },
  { id: "icon_text",      label: "Icône + nom" },
  { id: "icon_side_text", label: "Icône à côté" },
  { id: "banner",         label: "Bandeau" },
  { id: "outline",        label: "Contour" },
];

export const FONTS: { id: FontId; label: string; stack: string }[] = [
  { id: "sans",    label: "Classique", stack: "Arial,Helvetica,sans-serif" },
  { id: "serif",   label: "Élégante",  stack: "Georgia,'Times New Roman',serif" },
  { id: "rounded", label: "Ronde",     stack: "Verdana,Tahoma,sans-serif" },
  { id: "elegant", label: "Raffinée",  stack: "'Trebuchet MS','Century Gothic',sans-serif" },
  { id: "impact",  label: "Impact",    stack: "Impact,'Arial Black',sans-serif" },
];

function escapeXml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function fitFontSize(text: string, maxWidth: number, baseSize: number) {
  const len = Math.max(text.length, 1);
  const estWidth = len * baseSize * 0.6;
  if (estWidth <= maxWidth) return baseSize;
  return Math.max(22, Math.floor(baseSize * (maxWidth / estWidth)));
}

// Coupe un texte en 2 lignes équilibrées, au niveau de l'espace le plus proche du milieu
function splitTwoLines(text: string): [string, string] | null {
  const spaces: number[] = [];
  for (let i = 0; i < text.length; i++) if (text[i] === " ") spaces.push(i);
  if (spaces.length === 0) return null;
  const mid = text.length / 2;
  const best = spaces.reduce((a, b) => (Math.abs(b - mid) < Math.abs(a - mid) ? b : a));
  return [text.slice(0, best).trim(), text.slice(best + 1).trim()];
}

function textOrTspans(text: string, x: number, y: number, fs: number, fontFamily: string, fill: string, anchor: string, twoLines: boolean): string {
  const lines = twoLines ? splitTwoLines(text) : null;
  if (!lines) {
    return `<text x="${x}" y="${y}" font-size="${fs}" font-family="${fontFamily}" font-weight="700" fill="${fill}" text-anchor="${anchor}">${text}</text>`;
  }
  const lineFs = Math.round(fs * 0.85);
  return `<text x="${x}" y="${y - lineFs * 0.55}" font-size="${lineFs}" font-family="${fontFamily}" font-weight="700" fill="${fill}" text-anchor="${anchor}">${lines[0]}</text>
    <text x="${x}" y="${y + lineFs * 0.85}" font-size="${lineFs}" font-family="${fontFamily}" font-weight="700" fill="${fill}" text-anchor="${anchor}">${lines[1]}</text>`;
}

// Icône vectorielle (Material Symbols, libre de droits) positionnée dans un carré size×size, coin haut-gauche (x,y)
function glyph(icon: IconEntry | undefined, x: number, y: number, size: number, fill: string): string {
  if (!icon) return "";
  const paths = icon.paths.map(p => `<path d="${p}" fill="${fill}"/>`).join("");
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${icon.viewBox}">${paths}</svg>`;
}

export interface BuildLogoOptions {
  icon: IconEntry | undefined;
  color: string;
  textColor?: string;
  text: string;
  scale?: number;
  transparent?: boolean;
  useGradient?: boolean;
  gradientColor?: string;
  fontFamily?: string;
  twoLines?: boolean;
  strokeWidth?: number;
  shadow?: boolean;
  iconOffsetX?: number;
  iconOffsetY?: number;
  textOffsetX?: number;
  textOffsetY?: number;
}

const SHADOW_FILTER = `<filter id="ds" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-opacity="0.35"/></filter>`;

export function buildLogoSvg(tpl: LogoTemplateId, opts: BuildLogoOptions): string {
  const { icon, color } = opts;
  const scale = opts.scale ?? 1;
  const transparent = opts.transparent ?? false;
  const fontFamily = opts.fontFamily || "Arial,Helvetica,sans-serif";
  const twoLines = opts.twoLines ?? false;
  const strokeWidth = opts.strokeWidth ?? 14;
  const shadow = opts.shadow ?? false;
  const ix = opts.iconOffsetX ?? 0, iy = opts.iconOffsetY ?? 0;
  const tx = opts.textOffsetX ?? 0, ty = opts.textOffsetY ?? 0;
  const text = escapeXml(opts.text.trim());

  const fillRef = opts.useGradient && opts.gradientColor ? "url(#lg)" : color;
  let defs = opts.useGradient && opts.gradientColor
    ? `<linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${opts.gradientColor}"/></linearGradient>`
    : "";
  if (shadow) defs += SHADOW_FILTER;

  const wrapStart = shadow ? `<g filter="url(#ds)">` : "";
  const wrapEnd = shadow ? `</g>` : "";

  let inner = "";
  switch (tpl) {
    case "icon": {
      const size = Math.round(260 * scale);
      const iconFill = opts.textColor || (transparent ? color : "#ffffff");
      inner = `${transparent ? "" : `<rect width="512" height="512" rx="96" fill="${fillRef}"/>`}
        ${wrapStart}${glyph(icon, (512 - size) / 2 + ix, (512 - size) / 2 + iy, size, iconFill)}${wrapEnd}`;
      break;
    }
    case "icon_text": {
      const txtColor = opts.textColor || (transparent ? color : "#ffffff");
      const fs = fitFontSize(text, 420, 56);
      const size = Math.round(180 * scale);
      inner = `${transparent ? "" : `<rect width="512" height="512" rx="96" fill="${fillRef}"/>`}
        ${wrapStart}${glyph(icon, (512 - size) / 2 + ix, 90 + iy, size, txtColor)}
        ${textOrTspans(text, 256 + tx, 360 + ty, fs, fontFamily, txtColor, "middle", twoLines)}${wrapEnd}`;
      break;
    }
    case "icon_side_text": {
      const txtColor = opts.textColor || color;
      const fs = fitFontSize(text, 260, 44);
      const size = Math.round(150 * scale);
      inner = `${transparent ? "" : `<rect width="512" height="512" rx="48" fill="#ffffff"/>`}
        <circle cx="150" cy="256" r="100" fill="${fillRef}"/>
        ${wrapStart}${glyph(icon, 150 - size / 2 + ix, 256 - size / 2 + iy, size, "#ffffff")}
        ${textOrTspans(text, 270 + tx, 270 + ty, fs, fontFamily, txtColor, "start", twoLines)}${wrapEnd}`;
      break;
    }
    case "banner": {
      const txtColor = opts.textColor || "#ffffff";
      const fs = fitFontSize(text, 460, 48);
      const size = Math.round(200 * scale);
      inner = `${transparent ? "" : `<rect width="512" height="512" fill="#ffffff"/>`}
        ${wrapStart}${glyph(icon, (512 - size) / 2 + ix, 80 + iy, size, color)}
        <rect x="0" y="380" width="512" height="90" fill="${fillRef}"/>
        <text x="${256 + tx}" y="${432 + ty}" font-size="${fs}" font-family="${fontFamily}" font-weight="700" fill="${txtColor}" text-anchor="middle" dominant-baseline="middle">${text}</text>${wrapEnd}`;
      break;
    }
    case "outline": {
      const txtColor = opts.textColor || color;
      const fs = fitFontSize(text, 420, 46);
      const size = Math.round(190 * scale);
      inner = `<rect width="512" height="512" rx="64" fill="${transparent ? "none" : "#ffffff"}" stroke="${fillRef}" stroke-width="${strokeWidth}"/>
        ${wrapStart}${glyph(icon, (512 - size) / 2 + ix, 80 + iy, size, color)}
        ${textOrTspans(text, 256 + tx, 360 + ty, fs, fontFamily, txtColor, "middle", twoLines)}${wrapEnd}`;
      break;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${defs ? `<defs>${defs}</defs>` : ""}${inner}</svg>`;
}

// Palette de couleurs professionnelles proposées en plus de la couleur du secteur
export const COLOR_SWATCHES = [
  "#1a8f1a", "#0891b2", "#d97706", "#dc2626", "#7c3aed", "#db2777",
  "#1d4ed8", "#059669", "#475569", "#000000",
];

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

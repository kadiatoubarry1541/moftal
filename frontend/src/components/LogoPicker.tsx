import { useEffect, useMemo, useRef, useState } from "react";
import { SECTOR_ICONS } from "./sectorIcons";
import type { IconEntry } from "./iconLibrary";
import { guessIconName } from "./logoKeywords";

export type LogoTemplateId = "icon" | "icon_text" | "icon_side_text" | "banner" | "outline";
export type FontId = "sans" | "serif" | "rounded" | "elegant" | "impact";

const TEMPLATES: { id: LogoTemplateId; label: string }[] = [
  { id: "icon",           label: "Icône seule" },
  { id: "icon_text",      label: "Icône + nom" },
  { id: "icon_side_text", label: "Icône à côté" },
  { id: "banner",         label: "Bandeau" },
  { id: "outline",        label: "Contour" },
];

const FONTS: { id: FontId; label: string; stack: string }[] = [
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

// ── Contrôle de lisibilité (contraste couleur texte / fond) ──────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const n = parseInt(v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function relativeLuminance([r, g, b]: [number, number, number]) {
  const c = [r, g, b].map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── Téléchargement du logo en PNG ─────────────────────────────────────────
function downloadLogoPng(dataUrl: string, filename: string) {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, 512, 512);
    const pngUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = pngUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  img.src = dataUrl;
}

// ── Téléchargement du logo en SVG (vectoriel, pour impression grand format) ─
function downloadLogoSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const MAX_SEARCH_RESULTS = 48;
const MAX_DRAFTS = 3;

interface EditorState {
  tpl: LogoTemplateId;
  text: string;
  scale: number;
  brandColor: string;
  textColor: string | null;
  customIconName: string | null;
  fontFamily: FontId;
  transparent: boolean;
  useGradient: boolean;
  gradientColor: string;
  twoLines: boolean;
  strokeWidth: number;
  shadow: boolean;
  iconOffsetX: number;
  iconOffsetY: number;
  textOffsetX: number;
  textOffsetY: number;
}

interface Draft {
  id: number;
  dataUrl: string;
}

export default function LogoPicker({
  typeId, color, defaultText, matchText, onCancel, onConfirm,
}: {
  typeId: string;
  color: string;
  defaultText: string;
  /** Texte additionnel (ex: description) utilisé pour deviner une icône adaptée au métier */
  matchText?: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const [tpl, setTpl] = useState<LogoTemplateId>("icon_text");
  const [text, setText] = useState(defaultText);
  const [scale, setScale] = useState(1);
  const [brandColor, setBrandColor] = useState(color);
  const [textColor, setTextColor] = useState<string | null>(null);
  const [customIconName, setCustomIconName] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState<FontId>("sans");
  const [transparent, setTransparent] = useState(false);
  const [useGradient, setUseGradient] = useState(false);
  const [gradientColor, setGradientColor] = useState("#1a8f1a");
  const [twoLines, setTwoLines] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(14);
  const [shadow, setShadow] = useState(false);
  const [iconOffsetX, setIconOffsetX] = useState(0);
  const [iconOffsetY, setIconOffsetY] = useState(0);
  const [textOffsetX, setTextOffsetX] = useState(0);
  const [textOffsetY, setTextOffsetY] = useState(0);
  const [darkPreview, setDarkPreview] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [autoMatched, setAutoMatched] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [search, setSearch] = useState("");
  const [library, setLibrary] = useState<Record<string, IconEntry> | null>(null);
  const [loadingLibrary, setLoadingLibrary] = useState(true);

  const initialState = useRef<EditorState | null>(null);

  // L'IA charge la bibliothèque et devine tout de suite une icône adaptée au métier
  // (à partir du nom / de la description saisis), sans action de l'utilisateur.
  useEffect(() => {
    import("./iconLibrary").then(mod => {
      setLibrary(mod.ICON_LIBRARY);
      setLoadingLibrary(false);
      const guess = guessIconName(`${defaultText} ${matchText || ""}`);
      const iconName = guess && mod.ICON_LIBRARY[guess] ? guess : null;
      if (iconName) {
        setCustomIconName(iconName);
        setAutoMatched(true);
      }
      initialState.current = {
        tpl: "icon_text", text: defaultText, scale: 1, brandColor: color, textColor: null,
        customIconName: iconName, fontFamily: "sans", transparent: false, useGradient: false,
        gradientColor: "#1a8f1a", twoLines: false, strokeWidth: 14, shadow: false,
        iconOffsetX: 0, iconOffsetY: 0, textOffsetX: 0, textOffsetY: 0,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suggestFromText = () => {
    if (!library) return;
    const guess = guessIconName(`${text} ${matchText || ""}`);
    if (guess && library[guess]) {
      setCustomIconName(guess);
      setAutoMatched(true);
    }
  };

  const resetToAiSuggestion = () => {
    const init = initialState.current;
    if (!init) return;
    setTpl(init.tpl);
    setText(init.text);
    setScale(init.scale);
    setBrandColor(init.brandColor);
    setTextColor(init.textColor);
    setCustomIconName(init.customIconName);
    setFontFamily(init.fontFamily);
    setTransparent(init.transparent);
    setUseGradient(init.useGradient);
    setGradientColor(init.gradientColor);
    setTwoLines(init.twoLines);
    setStrokeWidth(init.strokeWidth);
    setShadow(init.shadow);
    setIconOffsetX(init.iconOffsetX);
    setIconOffsetY(init.iconOffsetY);
    setTextOffsetX(init.textOffsetX);
    setTextOffsetY(init.textOffsetY);
    setAutoMatched(!!init.customIconName);
  };

  const saveDraft = () => {
    setDrafts(prev => {
      const next = [...prev, { id: Date.now(), dataUrl: preview }];
      return next.slice(-MAX_DRAFTS);
    });
  };

  const removeDraft = (id: number) => setDrafts(prev => prev.filter(d => d.id !== id));

  const openBrowser = () => {
    setShowBrowser(true);
    setAutoMatched(false);
  };

  const currentIcon: IconEntry | undefined = customIconName
    ? library?.[customIconName]
    : SECTOR_ICONS[typeId];

  const effectiveText = text || defaultText || "?";
  const fontStack = FONTS.find(f => f.id === fontFamily)?.stack || FONTS[0].stack;

  const buildOpts: BuildLogoOptions = {
    icon: currentIcon, color: brandColor, textColor: textColor || undefined,
    text: effectiveText, scale, transparent, useGradient, gradientColor, fontFamily: fontStack, twoLines,
    strokeWidth, shadow, iconOffsetX, iconOffsetY, textOffsetX, textOffsetY,
  };

  const previewSvg = useMemo(
    () => buildLogoSvg(tpl, buildOpts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tpl, currentIcon, brandColor, textColor, effectiveText, scale, transparent, useGradient, gradientColor,
     fontFamily, twoLines, strokeWidth, shadow, iconOffsetX, iconOffsetY, textOffsetX, textOffsetY]
  );
  const preview = useMemo(() => svgToDataUrl(previewSvg), [previewSvg]);

  const surfaceColor = tpl === "icon" || tpl === "icon_text" || tpl === "banner" ? brandColor : "#ffffff";
  const effectiveTextColor = textColor || (tpl === "icon" || tpl === "icon_text" || tpl === "banner" ? "#ffffff" : brandColor);
  const lowContrast = !transparent && contrastRatio(surfaceColor, effectiveTextColor) < 2.2;

  const searchResults = useMemo(() => {
    if (!library) return [];
    const q = search.trim().toLowerCase();
    const names = Object.keys(library);
    const matched = q ? names.filter(n => n.includes(q.replace(/\s+/g, "_"))) : names;
    return matched.slice(0, MAX_SEARCH_RESULTS);
  }, [library, search]);

  return (
    <div className="mt-3 p-4 rounded-xl border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-900/10 dark:border-orange-800">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">🤖 Logos proposés automatiquement pour votre activité</p>
        <button type="button" onClick={resetToAiSuggestion} disabled={!initialState.current}
          className="text-[11px] font-semibold text-gray-500 hover:text-orange-600 disabled:opacity-30 whitespace-nowrap flex-shrink-0">
          ↺ Réinitialiser
        </button>
      </div>
      {autoMatched && (
        <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-2">
          ✨ Icône choisie automatiquement d'après le nom saisi — modifiable ci-dessous.
        </p>
      )}
      {loadingLibrary && (
        <p className="text-xs text-gray-400 mb-2">Génération en cours...</p>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Choisissez le style qui vous plaît, ou laissez tel quel.</p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {TEMPLATES.map(t => {
          const thumb = svgToDataUrl(buildLogoSvg(t.id, { ...buildOpts, scale: 1 }));
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTpl(t.id)}
              className={`rounded-lg overflow-hidden border-2 transition-all ${tpl === t.id ? "border-orange-500 ring-2 ring-orange-300" : "border-gray-200 hover:border-orange-300"} ${transparent ? "bg-[repeating-conic-gradient(#e5e7eb_0%_25%,white_0%_50%)] bg-[length:12px_12px]" : "bg-white"}`}
              title={t.label}
            >
              <img src={thumb} alt={t.label} className="w-full aspect-square object-cover" />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div
            className={`w-24 h-24 rounded-xl overflow-hidden border-2 border-orange-300 ${darkPreview ? "bg-gray-800" : transparent ? "bg-[repeating-conic-gradient(#e5e7eb_0%_25%,white_0%_50%)] bg-[length:14px_14px]" : "bg-white"}`}
          >
            <img src={preview} alt="Aperçu" className="w-full h-full object-contain" />
          </div>
          <button type="button" onClick={() => setDarkPreview(v => !v)} className="text-[9px] text-gray-400 hover:text-orange-600">
            {darkPreview ? "🌙 Fond sombre" : "☀️ Fond clair"}
          </button>
        </div>
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div
            className={`w-20 h-20 overflow-hidden border-2 border-orange-300 shadow-md ${darkPreview ? "bg-gray-800" : transparent ? "bg-[repeating-conic-gradient(#e5e7eb_0%_25%,white_0%_50%)] bg-[length:14px_14px]" : "bg-white"}`}
            style={{ borderRadius: "22%" }}
          >
            <img src={preview} alt="Aperçu icône app" className="w-full h-full object-contain" />
          </div>
          <span className="text-[9px] text-gray-400">Icône app</span>
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <div>
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Texte sur le logo</label>
              <button type="button" onClick={suggestFromText} disabled={!library}
                className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-40 whitespace-nowrap">
                🤖 Re-suggérer une icône
              </button>
            </div>
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              maxLength={40}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600"
              placeholder="Nom de votre établissement"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Taille de l'icône ({Math.round(scale * 100)}%)</label>
            <input
              type="range" min={0.6} max={1.3} step={0.05}
              value={scale} onChange={e => setScale(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {lowContrast && (
        <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-3 -mt-2">
          ⚠️ Ces couleurs sont peu lisibles ensemble. Essayez un contraste plus fort entre la couleur principale et celle du texte.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">Couleur principale</label>
          <div className="flex items-center gap-1.5 flex-wrap">
            {COLOR_SWATCHES.map(c => (
              <button key={c} type="button" onClick={() => setBrandColor(c)}
                className={`w-6 h-6 rounded-full border-2 ${brandColor === c ? "border-gray-800 dark:border-white" : "border-transparent"}`}
                style={{ backgroundColor: c }} title={c} />
            ))}
            <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
              className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 cursor-pointer p-0 bg-transparent" title="Autre couleur" />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">Couleur du texte</label>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button type="button" onClick={() => setTextColor(null)}
              className={`px-2 h-6 rounded-full border-2 text-[10px] font-semibold ${textColor === null ? "border-gray-800 dark:border-white" : "border-gray-300"}`}>
              Auto
            </button>
            {["#ffffff", "#000000"].map(c => (
              <button key={c} type="button" onClick={() => setTextColor(c)}
                className={`w-6 h-6 rounded-full border-2 ${textColor === c ? "border-gray-800 dark:border-white" : "border-gray-300"}`}
                style={{ backgroundColor: c }} title={c} />
            ))}
            <input type="color" value={textColor || "#000000"} onChange={e => setTextColor(e.target.value)}
              className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 cursor-pointer p-0 bg-transparent" title="Autre couleur" />
          </div>
        </div>
      </div>

      <div className="mb-3">
        <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">Police d'écriture</label>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FONTS.map(f => (
            <button key={f.id} type="button" onClick={() => setFontFamily(f.id)}
              className={`px-2.5 py-1 rounded-lg border-2 text-[11px] font-semibold ${fontFamily === f.id ? "border-orange-500 bg-orange-100 text-orange-700" : "border-gray-200 text-gray-600"}`}
              style={{ fontFamily: f.stack }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={transparent} onChange={e => setTransparent(e.target.checked)} />
          Fond transparent
        </label>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={useGradient} onChange={e => setUseGradient(e.target.checked)} disabled={transparent && tpl !== "outline"} />
          Dégradé
        </label>
        {useGradient && (
          <input type="color" value={gradientColor} onChange={e => setGradientColor(e.target.value)}
            className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 cursor-pointer p-0 bg-transparent" title="2e couleur du dégradé" />
        )}
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={twoLines} onChange={e => setTwoLines(e.target.checked)} disabled={tpl === "icon"} />
          Texte sur 2 lignes
        </label>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={shadow} onChange={e => setShadow(e.target.checked)} />
          Ombre portée
        </label>
      </div>

      <details className="mb-4">
        <summary className="text-xs font-semibold text-gray-600 dark:text-gray-300 cursor-pointer select-none">
          ⚙️ Réglages avancés (position, contour)
        </summary>
        <div className="mt-3 space-y-3 pl-1">
          {(tpl === "outline" || tpl === "icon_side_text") && (
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Épaisseur du contour ({strokeWidth}px)</label>
              <input type="range" min={4} max={30} step={1} value={strokeWidth}
                onChange={e => setStrokeWidth(Number(e.target.value))} className="w-full" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Icône ↔ horizontal</label>
              <input type="range" min={-60} max={60} step={2} value={iconOffsetX}
                onChange={e => setIconOffsetX(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Icône ↕ vertical</label>
              <input type="range" min={-60} max={60} step={2} value={iconOffsetY}
                onChange={e => setIconOffsetY(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Texte ↔ horizontal</label>
              <input type="range" min={-60} max={60} step={2} value={textOffsetX}
                onChange={e => setTextOffsetX(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Texte ↕ vertical</label>
              <input type="range" min={-60} max={60} step={2} value={textOffsetY}
                onChange={e => setTextOffsetY(Number(e.target.value))} className="w-full" />
            </div>
          </div>
        </div>
      </details>

      {!showBrowser ? (
        <button type="button" onClick={openBrowser}
          className="w-full mb-4 min-h-[40px] px-4 py-2 rounded-lg border-2 border-dashed border-orange-300 text-orange-700 text-sm font-semibold hover:bg-orange-100 transition-colors">
          🔍 Choisir une autre icône (plus de 1000 disponibles)
        </button>
      ) : (
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une icône (ex: car, food, tool, phone...)"
            className="w-full mb-2 px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600"
          />
          {loadingLibrary && <p className="text-xs text-gray-500">Chargement de la bibliothèque d'icônes...</p>}
          {library && (
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-56 overflow-y-auto p-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {searchResults.map(name => {
                const icon = library[name];
                const thumb = svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="${icon.viewBox}">${icon.paths.map(p => `<path d="${p}" fill="${brandColor}"/>`).join("")}</svg>`);
                return (
                  <button
                    key={name}
                    type="button"
                    title={name.replace(/_/g, " ")}
                    onClick={() => setCustomIconName(name)}
                    className={`aspect-square rounded-md border-2 p-1 flex items-center justify-center ${customIconName === name ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-orange-300"}`}
                  >
                    <img src={thumb} alt={name} className="w-full h-full object-contain" />
                  </button>
                );
              })}
              {searchResults.length === 0 && (
                <p className="col-span-full text-xs text-gray-400 p-2">Aucune icône trouvée, essayez un autre mot.</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Comparer plusieurs essais ({drafts.length}/{MAX_DRAFTS})</label>
          <button type="button" onClick={saveDraft} disabled={drafts.length >= MAX_DRAFTS}
            className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-40 whitespace-nowrap">
            💾 Sauvegarder cet essai
          </button>
        </div>
        {drafts.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {drafts.map(d => (
              <div key={d.id} className="relative w-14 h-14 rounded-lg border-2 border-gray-200 overflow-hidden bg-white group">
                <img src={d.dataUrl} alt="Essai" className="w-full h-full object-contain" />
                <button type="button" onClick={() => onConfirm(d.dataUrl)}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                  Choisir
                </button>
                <button type="button" onClick={() => removeDraft(d.id)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gray-700 text-white text-[9px] flex items-center justify-center">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => onConfirm(preview)}
          className="flex-1 min-h-[40px] px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors">
          ✅ Utiliser ce logo
        </button>
        <button type="button" onClick={() => downloadLogoPng(preview, `${(text || "logo").trim().replace(/\s+/g, "_")}.png`)}
          className="min-h-[40px] px-3 py-2 rounded-lg border-2 border-orange-300 text-orange-700 text-sm font-semibold hover:bg-orange-100">
          ⬇️ PNG
        </button>
        <button type="button" onClick={() => downloadLogoSvg(previewSvg, `${(text || "logo").trim().replace(/\s+/g, "_")}.svg`)}
          className="min-h-[40px] px-3 py-2 rounded-lg border-2 border-orange-300 text-orange-700 text-sm font-semibold hover:bg-orange-100">
          ⬇️ SVG
        </button>
        <button type="button" onClick={onCancel}
          className="min-h-[40px] px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-100">
          Annuler
        </button>
      </div>
    </div>
  );
}

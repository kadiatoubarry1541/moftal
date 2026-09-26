import { useMemo, useState } from "react";
import { SECTOR_ICONS } from "./sectorIcons";

export type LogoTemplateId = "icon" | "icon_text" | "icon_side_text" | "banner" | "outline";

const TEMPLATES: { id: LogoTemplateId; label: string }[] = [
  { id: "icon",           label: "Icône seule" },
  { id: "icon_text",      label: "Icône + nom" },
  { id: "icon_side_text", label: "Icône à côté" },
  { id: "banner",         label: "Bandeau" },
  { id: "outline",        label: "Contour" },
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

// Icône vectorielle (Material Symbols, libre de droits) positionnée dans un carré size×size, coin haut-gauche (x,y)
function glyph(typeId: string, x: number, y: number, size: number, fill: string): string {
  const icon = SECTOR_ICONS[typeId];
  if (!icon) return "";
  const paths = icon.paths.map(p => `<path d="${p}" fill="${fill}"/>`).join("");
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${icon.viewBox}">${paths}</svg>`;
}

export function buildLogoSvg(tpl: LogoTemplateId, opts: { typeId: string; color: string; text: string; scale?: number }): string {
  const { typeId, color } = opts;
  const scale = opts.scale ?? 1;
  const text = escapeXml(opts.text.trim());
  let inner = "";
  switch (tpl) {
    case "icon": {
      const size = Math.round(260 * scale);
      inner = `<rect width="512" height="512" rx="96" fill="${color}"/>
        ${glyph(typeId, (512 - size) / 2, (512 - size) / 2, size, "#ffffff")}`;
      break;
    }
    case "icon_text": {
      const fs = fitFontSize(text, 420, 56);
      const size = Math.round(180 * scale);
      inner = `<rect width="512" height="512" rx="96" fill="${color}"/>
        ${glyph(typeId, (512 - size) / 2, 90, size, "#ffffff")}
        <text x="256" y="360" font-size="${fs}" font-family="Arial,Helvetica,sans-serif" font-weight="700" fill="#ffffff" text-anchor="middle">${text}</text>`;
      break;
    }
    case "icon_side_text": {
      const fs = fitFontSize(text, 260, 44);
      const size = Math.round(150 * scale);
      inner = `<rect width="512" height="512" rx="48" fill="#ffffff" stroke="${color}" stroke-width="10"/>
        <circle cx="150" cy="256" r="100" fill="${color}"/>
        ${glyph(typeId, 150 - size / 2, 256 - size / 2, size, "#ffffff")}
        <text x="270" y="270" font-size="${fs}" font-family="Arial,Helvetica,sans-serif" font-weight="700" fill="${color}" text-anchor="start">${text}</text>`;
      break;
    }
    case "banner": {
      const fs = fitFontSize(text, 460, 48);
      const size = Math.round(200 * scale);
      inner = `<rect width="512" height="512" fill="#ffffff"/>
        ${glyph(typeId, (512 - size) / 2, 80, size, color)}
        <rect x="0" y="380" width="512" height="90" fill="${color}"/>
        <text x="256" y="432" font-size="${fs}" font-family="Arial,Helvetica,sans-serif" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${text}</text>`;
      break;
    }
    case "outline": {
      const fs = fitFontSize(text, 420, 46);
      const size = Math.round(190 * scale);
      inner = `<rect width="512" height="512" rx="64" fill="#ffffff" stroke="${color}" stroke-width="14"/>
        ${glyph(typeId, (512 - size) / 2, 80, size, color)}
        <text x="256" y="360" font-size="${fs}" font-family="Arial,Helvetica,sans-serif" font-weight="700" fill="${color}" text-anchor="middle">${text}</text>`;
      break;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${inner}</svg>`;
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export default function LogoPicker({
  typeId, color, defaultText, onCancel, onConfirm,
}: {
  typeId: string;
  color: string;
  defaultText: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const [tpl, setTpl] = useState<LogoTemplateId>("icon_text");
  const [text, setText] = useState(defaultText);
  const [scale, setScale] = useState(1);

  const effectiveText = text || defaultText || "?";

  const preview = useMemo(
    () => svgToDataUrl(buildLogoSvg(tpl, { typeId, color, text: effectiveText, scale })),
    [tpl, typeId, color, effectiveText, scale]
  );

  return (
    <div className="mt-3 p-4 rounded-xl border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-900/10 dark:border-orange-800">
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">🎨 Choisissez un modèle de logo</p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {TEMPLATES.map(t => {
          const thumb = svgToDataUrl(buildLogoSvg(t.id, { typeId, color, text: effectiveText, scale: 1 }));
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTpl(t.id)}
              className={`rounded-lg overflow-hidden border-2 transition-all ${tpl === t.id ? "border-orange-500 ring-2 ring-orange-300" : "border-gray-200 hover:border-orange-300"}`}
              title={t.label}
            >
              <img src={thumb} alt={t.label} className="w-full aspect-square object-cover bg-white" />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-orange-300 bg-white flex-shrink-0">
          <img src={preview} alt="Aperçu" className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Texte sur le logo</label>
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

      <div className="flex gap-2">
        <button type="button" onClick={() => onConfirm(preview)}
          className="flex-1 min-h-[40px] px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors">
          ✅ Utiliser ce logo
        </button>
        <button type="button" onClick={onCancel}
          className="min-h-[40px] px-4 py-2 rounded-lg border border-gray-300 text-gray-600 text-sm font-semibold hover:bg-gray-100">
          Annuler
        </button>
      </div>
    </div>
  );
}

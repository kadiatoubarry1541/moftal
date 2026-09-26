import { useEffect, useMemo, useState } from "react";
import { SECTOR_ICONS } from "./sectorIcons";
import type { IconEntry } from "./iconLibrary";

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
function glyph(icon: IconEntry | undefined, x: number, y: number, size: number, fill: string): string {
  if (!icon) return "";
  const paths = icon.paths.map(p => `<path d="${p}" fill="${fill}"/>`).join("");
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${icon.viewBox}">${paths}</svg>`;
}

export function buildLogoSvg(tpl: LogoTemplateId, opts: { icon: IconEntry | undefined; color: string; text: string; scale?: number }): string {
  const { icon, color } = opts;
  const scale = opts.scale ?? 1;
  const text = escapeXml(opts.text.trim());
  let inner = "";
  switch (tpl) {
    case "icon": {
      const size = Math.round(260 * scale);
      inner = `<rect width="512" height="512" rx="96" fill="${color}"/>
        ${glyph(icon, (512 - size) / 2, (512 - size) / 2, size, "#ffffff")}`;
      break;
    }
    case "icon_text": {
      const fs = fitFontSize(text, 420, 56);
      const size = Math.round(180 * scale);
      inner = `<rect width="512" height="512" rx="96" fill="${color}"/>
        ${glyph(icon, (512 - size) / 2, 90, size, "#ffffff")}
        <text x="256" y="360" font-size="${fs}" font-family="Arial,Helvetica,sans-serif" font-weight="700" fill="#ffffff" text-anchor="middle">${text}</text>`;
      break;
    }
    case "icon_side_text": {
      const fs = fitFontSize(text, 260, 44);
      const size = Math.round(150 * scale);
      inner = `<rect width="512" height="512" rx="48" fill="#ffffff" stroke="${color}" stroke-width="10"/>
        <circle cx="150" cy="256" r="100" fill="${color}"/>
        ${glyph(icon, 150 - size / 2, 256 - size / 2, size, "#ffffff")}
        <text x="270" y="270" font-size="${fs}" font-family="Arial,Helvetica,sans-serif" font-weight="700" fill="${color}" text-anchor="start">${text}</text>`;
      break;
    }
    case "banner": {
      const fs = fitFontSize(text, 460, 48);
      const size = Math.round(200 * scale);
      inner = `<rect width="512" height="512" fill="#ffffff"/>
        ${glyph(icon, (512 - size) / 2, 80, size, color)}
        <rect x="0" y="380" width="512" height="90" fill="${color}"/>
        <text x="256" y="432" font-size="${fs}" font-family="Arial,Helvetica,sans-serif" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${text}</text>`;
      break;
    }
    case "outline": {
      const fs = fitFontSize(text, 420, 46);
      const size = Math.round(190 * scale);
      inner = `<rect width="512" height="512" rx="64" fill="#ffffff" stroke="${color}" stroke-width="14"/>
        ${glyph(icon, (512 - size) / 2, 80, size, color)}
        <text x="256" y="360" font-size="${fs}" font-family="Arial,Helvetica,sans-serif" font-weight="700" fill="${color}" text-anchor="middle">${text}</text>`;
      break;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${inner}</svg>`;
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const MAX_SEARCH_RESULTS = 48;

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
  const [customIconName, setCustomIconName] = useState<string | null>(null);
  const [showBrowser, setShowBrowser] = useState(false);
  const [search, setSearch] = useState("");
  const [library, setLibrary] = useState<Record<string, IconEntry> | null>(null);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  const openBrowser = () => {
    setShowBrowser(true);
    if (!library && !loadingLibrary) {
      setLoadingLibrary(true);
      import("./iconLibrary").then(mod => {
        setLibrary(mod.ICON_LIBRARY);
        setLoadingLibrary(false);
      });
    }
  };

  const currentIcon: IconEntry | undefined = customIconName
    ? library?.[customIconName]
    : SECTOR_ICONS[typeId];

  const effectiveText = text || defaultText || "?";

  const preview = useMemo(
    () => svgToDataUrl(buildLogoSvg(tpl, { icon: currentIcon, color, text: effectiveText, scale })),
    [tpl, currentIcon, color, effectiveText, scale]
  );

  const searchResults = useMemo(() => {
    if (!library) return [];
    const q = search.trim().toLowerCase();
    const names = Object.keys(library);
    const matched = q ? names.filter(n => n.includes(q.replace(/\s+/g, "_"))) : names;
    return matched.slice(0, MAX_SEARCH_RESULTS);
  }, [library, search]);

  return (
    <div className="mt-3 p-4 rounded-xl border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-900/10 dark:border-orange-800">
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">🎨 Choisissez un modèle de logo</p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {TEMPLATES.map(t => {
          const thumb = svgToDataUrl(buildLogoSvg(t.id, { icon: currentIcon, color, text: effectiveText, scale: 1 }));
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
                const thumb = svgToDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="${icon.viewBox}">${icon.paths.map(p => `<path d="${p}" fill="${color}"/>`).join("")}</svg>`);
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

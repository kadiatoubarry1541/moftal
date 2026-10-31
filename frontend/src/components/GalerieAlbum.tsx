import { useEffect, useRef, useState } from "react";
import { useTraduction } from "../i18n/traduction";

/**
 * Galerie d'un album, comme celle d'un téléphone :
 * - un appui sur une photo ou une vidéo l'ouvre en grand, avec ‹ › (ou en
 *   glissant le doigt) pour passer à la suivante ;
 * - supprimer ne se fait jamais par erreur : « Sélectionner » (ou un appui long
 *   sur une de ses photos), on coche, puis un seul bouton 🗑 Supprimer en bas.
 */
export interface ElementGalerie {
  cle: string;
  url: string;
  video: boolean;
  auteur?: string | null;
  /** La personne connectée peut-elle le supprimer ? */
  supprimable?: boolean;
}

interface Props {
  elements: ElementGalerie[];
  /** Supprime les éléments choisis (déjà confirmés) */
  onSupprimer?: (cles: string[]) => Promise<void>;
  vide?: React.ReactNode;
  colonnes?: string;
}

export default function GalerieAlbum({ elements, onSupprimer, vide, colonnes = "grid-cols-3 sm:grid-cols-4" }: Props) {
  const { tr } = useTraduction();
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [selection, setSelection] = useState<Set<string> | null>(null);
  const [suppression, setSuppression] = useState(false);
  const appuiLong = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appuiLongFait = useRef(false);
  const debutGlisse = useRef<number | null>(null);

  const aSupprimables = !!onSupprimer && elements.some((e) => e.supprimable);

  // L'album change (ajout, suppression) : on referme ce qui n'existe plus
  useEffect(() => {
    if (ouvert !== null && ouvert >= elements.length) setOuvert(elements.length ? elements.length - 1 : null);
  }, [elements.length, ouvert]);

  // Clavier dans la visionneuse
  useEffect(() => {
    if (ouvert === null) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(null);
      if (e.key === "ArrowRight") setOuvert((i) => (i === null ? i : Math.min(elements.length - 1, i + 1)));
      if (e.key === "ArrowLeft") setOuvert((i) => (i === null ? i : Math.max(0, i - 1)));
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [ouvert, elements.length]);

  const basculer = (cle: string) => setSelection((s) => {
    const n = new Set(s || []);
    if (n.has(cle)) n.delete(cle); else n.add(cle);
    return n;
  });

  const surAppui = (i: number) => {
    if (appuiLongFait.current) { appuiLongFait.current = false; return; }
    const e = elements[i];
    if (selection) { if (e.supprimable) basculer(e.cle); return; }
    setOuvert(i);
  };

  const debutAppui = (i: number) => {
    const e = elements[i];
    if (!onSupprimer || !e.supprimable || selection) return;
    appuiLong.current = setTimeout(() => {
      appuiLongFait.current = true;
      setSelection(new Set([e.cle]));
      if (navigator.vibrate) navigator.vibrate(30);
    }, 500);
  };
  const finAppui = () => { if (appuiLong.current) clearTimeout(appuiLong.current); appuiLong.current = null; };

  const supprimer = async () => {
    if (!onSupprimer || !selection?.size) return;
    const n = selection.size;
    if (!confirm(n > 1 ? tr("Supprimer ces {n} éléments ? C'est définitif.", { n }) : tr("Supprimer cet élément ? C'est définitif."))) return;
    setSuppression(true);
    try { await onSupprimer([...selection]); setSelection(null); }
    finally { setSuppression(false); }
  };

  if (!elements.length) return <>{vide}</>;
  const courant = ouvert !== null ? elements[ouvert] : null;

  return (
    <div className="relative">
      {aSupprimables && (
        <div className="flex justify-end mb-2">
          {selection ? (
            <button type="button" onClick={() => setSelection(null)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-200 text-gray-700">{tr("Annuler")}</button>
          ) : (
            <button type="button" onClick={() => setSelection(new Set())}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-white border border-gray-200 text-gray-700 shadow-sm">☑️ {tr("Sélectionner")}</button>
          )}
        </div>
      )}

      <div className={`grid ${colonnes} gap-1`}>
        {elements.map((e, i) => {
          const choisi = !!selection?.has(e.cle);
          const grise = !!selection && !e.supprimable;
          return (
            <button type="button" key={e.cle}
              onClick={() => surAppui(i)}
              onTouchStart={() => debutAppui(i)} onTouchEnd={finAppui} onTouchMove={finAppui}
              onMouseDown={() => debutAppui(i)} onMouseUp={finAppui} onMouseLeave={finAppui}
              onContextMenu={(ev) => ev.preventDefault()}
              className={`relative aspect-square overflow-hidden rounded-md bg-slate-200 select-none ${grise ? "opacity-40" : ""} ${choisi ? "ring-4 ring-blue-500" : ""}`}>
              {e.video
                ? <video src={e.url} className="w-full h-full object-cover pointer-events-none" muted playsInline preload="metadata" />
                : <img src={e.url} alt="" loading="lazy" draggable={false} className="w-full h-full object-cover pointer-events-none" />}
              {e.video && <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full pointer-events-none">▶</span>}
              {selection && e.supprimable && (
                <span className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold pointer-events-none ${choisi ? "bg-blue-500 text-white" : "bg-black/30"}`}>
                  {choisi ? "✓" : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Barre de suppression : seulement en mode sélection */}
      {selection && (
        <div className="sticky bottom-0 mt-3 flex items-center gap-2 bg-white/95 backdrop-blur border border-gray-200 rounded-xl p-2 shadow-lg">
          <span className="flex-1 text-sm text-gray-600 px-2">
            {selection.size ? tr("{n} sélectionné(s)", { n: selection.size }) : tr("Touchez vos photos pour les choisir")}
          </span>
          <button type="button" disabled={!selection.size || suppression} onClick={supprimer}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold disabled:opacity-40">
            {suppression ? "…" : `🗑 ${tr("Supprimer")}`}
          </button>
        </div>
      )}

      {/* Visionneuse plein écran */}
      {courant && ouvert !== null && (
        <div className="fixed inset-0 z-[70] bg-black flex flex-col"
          onTouchStart={(ev) => { debutGlisse.current = ev.touches[0].clientX; }}
          onTouchEnd={(ev) => {
            if (debutGlisse.current === null) return;
            const dx = ev.changedTouches[0].clientX - debutGlisse.current;
            debutGlisse.current = null;
            if (dx < -50) setOuvert((i) => (i === null ? i : Math.min(elements.length - 1, i + 1)));
            if (dx > 50) setOuvert((i) => (i === null ? i : Math.max(0, i - 1)));
          }}>
          <div className="flex items-center justify-between p-3 text-white">
            <button type="button" onClick={() => setOuvert(null)} aria-label={tr("Fermer")}
              className="w-10 h-10 rounded-full bg-white/10 text-xl">←</button>
            <span className="text-sm font-semibold">{ouvert + 1} / {elements.length}</span>
            <span className="w-10" />
          </div>
          <div className="flex-1 flex items-center justify-center relative min-h-0">
            {courant.video
              ? <video key={courant.cle} src={courant.url} controls autoPlay playsInline className="max-w-full max-h-full" />
              : <img key={courant.cle} src={courant.url} alt="" className="max-w-full max-h-full object-contain" />}
            {ouvert > 0 && (
              <button type="button" onClick={() => setOuvert(ouvert - 1)} aria-label={tr("Précédent")}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 text-white text-2xl">‹</button>
            )}
            {ouvert < elements.length - 1 && (
              <button type="button" onClick={() => setOuvert(ouvert + 1)} aria-label={tr("Suivant")}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 text-white text-2xl">›</button>
            )}
          </div>
          {courant.auteur && <p className="text-center text-white/70 text-xs p-3">{courant.auteur}</p>}
        </div>
      )}
    </div>
  );
}

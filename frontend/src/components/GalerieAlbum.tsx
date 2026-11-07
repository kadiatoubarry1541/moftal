import { useEffect, useRef, useState } from "react";
import { useTraduction } from "../i18n/traduction";

/**
 * Galerie d'un album, comme celle d'un téléphone :
 * - les photos et vidéos en grille, sur toute la largeur ;
 * - un appui ouvre en plein écran ; on glisse le doigt (ou ‹ ›) pour passer
 *   à la suivante, ← pour ressortir ;
 * - Supprimer n'est jamais affiché dans la grille : il se trouve dans le menu
 *   « ⋮ » de la photo ouverte (seulement pour ses propres photos), ou par un
 *   appui long pour en choisir plusieurs.
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

export default function GalerieAlbum({ elements, onSupprimer, vide, colonnes = "grid-cols-3 sm:grid-cols-4 md:grid-cols-5" }: Props) {
  const { tr } = useTraduction();
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [selection, setSelection] = useState<Set<string> | null>(null);
  const [suppression, setSuppression] = useState(false);
  const [menu, setMenu] = useState(false);
  // Glisser du doigt : l'image suit le doigt, puis passe à la suivante
  const [decalage, setDecalage] = useState(0);
  const appuiLong = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appuiLongFait = useRef(false);
  const debutGlisse = useRef<{ x: number; y: number } | null>(null);

  // L'album change (ajout, suppression) : on referme ce qui n'existe plus
  useEffect(() => {
    if (ouvert !== null && ouvert >= elements.length) setOuvert(elements.length ? elements.length - 1 : null);
  }, [elements.length, ouvert]);

  const aller = (i: number) => { setMenu(false); setDecalage(0); setOuvert(Math.max(0, Math.min(elements.length - 1, i))); };
  const fermer = () => { setMenu(false); setDecalage(0); setOuvert(null); };

  // Clavier dans la visionneuse
  useEffect(() => {
    if (ouvert === null) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
      if (e.key === "ArrowRight") setOuvert((i) => (i === null ? i : Math.min(elements.length - 1, i + 1)));
      if (e.key === "ArrowLeft") setOuvert((i) => (i === null ? i : Math.max(0, i - 1)));
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [ouvert, elements.length]);

  // Visionneuse ouverte : la page derrière ne défile plus
  useEffect(() => {
    if (ouvert === null) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = avant; };
  }, [ouvert]);

  const basculer = (cle: string) => setSelection((s) => {
    const n = new Set(s || []);
    if (n.has(cle)) n.delete(cle); else n.add(cle);
    return n;
  });

  const surAppui = (i: number) => {
    if (appuiLongFait.current) { appuiLongFait.current = false; return; }
    const e = elements[i];
    if (selection) { if (e.supprimable) basculer(e.cle); return; }
    aller(i);
  };

  // Appui long sur une de ses photos : choisir plusieurs photos à supprimer
  const debutAppui = (i: number) => {
    const e = elements[i];
    if (!onSupprimer || !e.supprimable || selection) return;
    appuiLong.current = setTimeout(() => {
      appuiLongFait.current = true;
      setSelection(new Set([e.cle]));
      if (navigator.vibrate) navigator.vibrate(30);
    }, 550);
  };
  const finAppui = () => { if (appuiLong.current) clearTimeout(appuiLong.current); appuiLong.current = null; };

  const supprimer = async (cles: string[]) => {
    if (!onSupprimer || !cles.length) return false;
    const n = cles.length;
    if (!confirm(n > 1 ? tr("Supprimer ces {n} éléments ? C'est définitif.", { n }) : tr("Supprimer cet élément ? C'est définitif."))) return false;
    setSuppression(true);
    try { await onSupprimer(cles); return true; }
    finally { setSuppression(false); }
  };

  if (!elements.length) return <>{vide}</>;
  const courant = ouvert !== null ? elements[ouvert] : null;

  return (
    <div className="relative">
      <div className={`grid ${colonnes} gap-0.5`}>
        {elements.map((e, i) => {
          const choisi = !!selection?.has(e.cle);
          const grise = !!selection && !e.supprimable;
          return (
            <button type="button" key={e.cle} data-vignette
              onClick={() => surAppui(i)}
              onTouchStart={() => debutAppui(i)} onTouchEnd={finAppui} onTouchMove={finAppui}
              onMouseDown={() => debutAppui(i)} onMouseUp={finAppui} onMouseLeave={finAppui}
              onContextMenu={(ev) => ev.preventDefault()}
              className={`relative aspect-square overflow-hidden bg-slate-200 select-none ${grise ? "opacity-40" : ""} ${choisi ? "ring-4 ring-inset ring-blue-500" : ""}`}>
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

      {/* Choix de plusieurs photos (après un appui long) */}
      {selection && (
        <div className="sticky bottom-0 mt-3 flex items-center gap-2 bg-white/95 backdrop-blur border border-gray-200 rounded-xl p-2 shadow-lg">
          <button type="button" onClick={() => setSelection(null)}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700">{tr("Annuler")}</button>
          <span className="flex-1 text-sm text-gray-600 px-1">
            {selection.size ? tr("{n} sélectionné(s)", { n: selection.size }) : tr("Touchez vos photos pour les choisir")}
          </span>
          <button type="button" disabled={!selection.size || suppression}
            onClick={async () => { if (await supprimer([...selection])) setSelection(null); }}
            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold disabled:opacity-40">
            {suppression ? "…" : `🗑 ${tr("Supprimer")}`}
          </button>
        </div>
      )}

      {/* Visionneuse plein écran */}
      {courant && ouvert !== null && (
        <div data-visionneuse className="fixed inset-0 z-[80] bg-black flex flex-col select-none"
          onTouchStart={(ev) => { debutGlisse.current = { x: ev.touches[0].clientX, y: ev.touches[0].clientY }; }}
          onTouchMove={(ev) => {
            if (!debutGlisse.current) return;
            const dx = ev.touches[0].clientX - debutGlisse.current.x;
            const dy = ev.touches[0].clientY - debutGlisse.current.y;
            if (Math.abs(dx) > Math.abs(dy)) setDecalage(dx);
          }}
          onTouchEnd={(ev) => {
            if (!debutGlisse.current) return;
            const dx = ev.changedTouches[0].clientX - debutGlisse.current.x;
            const dy = ev.changedTouches[0].clientY - debutGlisse.current.y;
            debutGlisse.current = null;
            setDecalage(0);
            if (Math.abs(dx) > Math.abs(dy)) {
              if (dx < -60 && ouvert < elements.length - 1) aller(ouvert + 1);
              else if (dx > 60 && ouvert > 0) aller(ouvert - 1);
            } else if (dy > 120) fermer(); // glisser vers le bas : on ressort
          }}>
          <div className="flex items-center justify-between p-3 text-white" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
            <button type="button" onClick={fermer} aria-label={tr("Fermer")}
              className="w-11 h-11 rounded-full bg-white/10 text-xl">←</button>
            <span className="text-sm font-semibold">{ouvert + 1} / {elements.length}</span>
            {onSupprimer && courant.supprimable ? (
              <div className="relative">
                <button type="button" onClick={() => setMenu((m) => !m)} aria-label={tr("Plus d'options")}
                  className="w-11 h-11 rounded-full bg-white/10 text-2xl leading-none">⋮</button>
                {menu && (
                  <div className="absolute right-0 top-12 bg-white rounded-xl shadow-xl overflow-hidden text-gray-900" style={{ width: 200, maxWidth: "none" }}>
                    <button type="button" disabled={suppression}
                      onClick={async () => { setMenu(false); await supprimer([courant.cle]); }}
                      className="w-full text-left px-4 py-3 text-base font-semibold text-red-600 whitespace-nowrap hover:bg-red-50 disabled:opacity-50">
                      🗑 {tr("Supprimer")}
                    </button>
                  </div>
                )}
              </div>
            ) : <span className="w-11" />}
          </div>
          <div className="flex-1 flex items-center justify-center relative min-h-0 overflow-hidden" onClick={() => setMenu(false)}>
            <div className="w-full h-full flex items-center justify-center"
              style={{ transform: `translateX(${decalage}px)`, transition: decalage ? "none" : "transform 0.2s ease-out" }}>
              {courant.video
                ? <video key={courant.cle} src={courant.url} controls autoPlay playsInline className="max-w-full max-h-full" />
                : <img key={courant.cle} src={courant.url} alt="" draggable={false} className="max-w-full max-h-full object-contain" />}
            </div>
            {ouvert > 0 && (
              <button type="button" onClick={() => aller(ouvert - 1)} aria-label={tr("Précédent")}
                className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/45 text-white text-3xl shadow">‹</button>
            )}
            {ouvert < elements.length - 1 && (
              <button type="button" onClick={() => aller(ouvert + 1)} aria-label={tr("Suivant")}
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/45 text-white text-3xl shadow">›</button>
            )}
          </div>
          <p className="text-center text-white/70 text-xs p-3 min-h-[40px]" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
            {courant.auteur ? `📷 ${courant.auteur}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}

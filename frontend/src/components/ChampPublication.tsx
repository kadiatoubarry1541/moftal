import { useEffect, useMemo, useRef, useState } from "react";
import { AudioRecorder } from "./AudioRecorder";
import { useTraduction } from "../i18n/traduction";
import type { Medias } from "../utils/medias";

/**
 * Publier un produit dans un seul champ, comme une barre de message :
 * - 📎 on prend une photo ou une vidéo dans son appareil (ou avec l'appareil photo) ;
 * - on écrit le nom, puis le prix ;
 * - avec une PHOTO, on peut aussi dire le prix (ou présenter le produit) en
 *   vocal 🎤 — jusqu'à 1 minute ; le prix écrit devient alors facultatif ;
 * - avec une VIDÉO, pas de vocal : la vidéo a déjà son propre son.
 * Un vocal seul ne se publie jamais : le 🎤 n'apparaît qu'après une photo.
 */

interface Props {
  medias: Medias;
  onMedias: (m: Medias) => void;
  nom: string;
  onNom: (v: string) => void;
  prix: string;
  onPrix: (v: string) => void;
  devise: string;
  maxImages?: number;
  /** Durée maximum de la vidéo, en secondes */
  dureeVideo?: number;
  /** Durée maximum du vocal, en secondes */
  dureeVocal?: number;
  desactive?: boolean;
  erreurs?: { medias?: string; nom?: string; prix?: string };
}

const dureeVideoFichier = (f: File) =>
  new Promise<number>((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration); };
    v.onerror = () => { URL.revokeObjectURL(v.src); resolve(0); };
    v.src = URL.createObjectURL(f);
  });

export default function ChampPublication({
  medias, onMedias, nom, onNom, prix, onPrix, devise,
  maxImages = 8, dureeVideo = 30, dureeVocal = 60, desactive, erreurs = {},
}: Props) {
  const { tr } = useTraduction();
  const fichierRef = useRef<HTMLInputElement>(null);
  const [enregistre, setEnregistre] = useState(false);
  const [message, setMessage] = useState("");

  const video = medias.videos[0] || null;
  const aPhotos = medias.images.length > 0;
  const vocal = medias.audios[0] || null;
  const rien = !aPhotos && !video;

  const apercus = useMemo(() => ({
    images: medias.images.map((f) => URL.createObjectURL(f)),
    video: video ? URL.createObjectURL(video) : null,
    vocal: vocal ? URL.createObjectURL(vocal) : null,
  }), [medias.images, video, vocal]);
  useEffect(() => () => {
    [...apercus.images, apercus.video, apercus.vocal].forEach((u) => u && URL.revokeObjectURL(u));
  }, [apercus]);

  const choisir = async (fichiers: File[]) => {
    setMessage("");
    const videos = fichiers.filter((f) => f.type.startsWith("video/"));
    const images = fichiers.filter((f) => f.type.startsWith("image/"));
    if (videos.length) {
      // Une vidéo remplace les photos (et le vocal : la vidéo a son propre son)
      const v = videos[0];
      if (await dureeVideoFichier(v) > dureeVideo + 1) {
        setMessage(tr("La vidéo est trop longue : {n} secondes au maximum.", { n: dureeVideo }));
        return;
      }
      if ((aPhotos || vocal) && !confirm(tr("Remplacer les photos et le vocal par cette vidéo ?"))) return;
      setEnregistre(false);
      onMedias({ images: [], videos: [v], audios: [] });
      return;
    }
    if (!images.length) return;
    if (video && !confirm(tr("Remplacer la vidéo par cette photo ?"))) return;
    const toutes = [...(video ? [] : medias.images), ...images];
    if (toutes.length > maxImages) setMessage(tr("Nombre maximum atteint : retirez un élément pour en ajouter un autre."));
    onMedias({ images: toutes.slice(0, maxImages), videos: [], audios: video ? [] : medias.audios });
  };

  const retirerPhoto = (i: number) => {
    const images = medias.images.filter((_, j) => j !== i);
    // Plus de photo : le vocal n'a plus de support, il part aussi
    onMedias({ images, videos: [], audios: images.length ? medias.audios : [] });
    if (!images.length) setEnregistre(false);
  };

  const croix = "absolute -top-1.5 -right-1.5 w-7 h-7 bg-red-500 text-white rounded-full text-base font-bold flex items-center justify-center shadow";
  const champ = (erreur?: string) =>
    `w-full min-w-0 px-4 py-3 rounded-full text-base bg-white border-2 focus:outline-none focus:ring-2 ${erreur ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:ring-emerald-200 focus:border-emerald-400"}`;

  return (
    <div className="rounded-3xl border-2 border-emerald-100 bg-emerald-50/40 p-3 space-y-3">
      <input ref={fichierRef} type="file" accept="image/*,video/*" multiple className="hidden"
        onChange={(e) => { const f = Array.from(e.target.files || []); e.target.value = ""; if (f.length) void choisir(f); }} />

      {/* ── Ce qu'on montre : photo(s) ou vidéo ── */}
      {rien ? (
        <button type="button" disabled={desactive} onClick={() => fichierRef.current?.click()}
          className={`w-full py-8 rounded-2xl border-2 border-dashed bg-white flex flex-col items-center gap-2 ${erreurs.medias ? "border-red-400" : "border-emerald-300"} hover:bg-emerald-50 disabled:opacity-50`}>
          <span className="text-5xl">📷 🎥</span>
          <span className="text-base font-bold text-emerald-700">{tr("Photo ou vidéo du produit")}</span>
          <span className="text-xs text-gray-500">{tr("Prenez-la maintenant ou choisissez-la dans votre appareil")}</span>
        </button>
      ) : video ? (
        <div className="relative">
          <video src={apercus.video || undefined} controls playsInline className="w-full max-h-72 rounded-2xl bg-black" />
          <button type="button" onClick={() => onMedias({ images: [], videos: [], audios: [] })} aria-label={tr("Retirer")} className={croix}>×</button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {apercus.images.map((u, i) => (
            <div key={u} className="relative">
              <img src={u} alt="" className="w-24 h-24 object-cover rounded-2xl border border-gray-200" />
              <button type="button" onClick={() => retirerPhoto(i)} aria-label={tr("Retirer")} className={croix}>×</button>
            </div>
          ))}
          {medias.images.length < maxImages && (
            <button type="button" disabled={desactive} onClick={() => fichierRef.current?.click()} aria-label={tr("Ajouter une photo")}
              className="w-24 h-24 rounded-2xl border-2 border-dashed border-emerald-300 bg-white text-3xl text-emerald-600">＋</button>
          )}
        </div>
      )}
      {(message || erreurs.medias) && <p className="text-xs font-semibold text-red-600 px-1">{message || erreurs.medias}</p>}

      {/* ── Le nom ── */}
      <div>
        <input type="text" value={nom} onChange={(e) => onNom(e.target.value)} disabled={desactive}
          placeholder={tr("✏️ Nom du produit")} className={champ(erreurs.nom)} />
        {erreurs.nom && <p className="mt-1 text-xs text-red-500 px-2">{erreurs.nom}</p>}
      </div>

      {/* ── Le prix : écrit, ou dit en vocal (avec une photo seulement) ── */}
      <div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <input type="number" inputMode="numeric" value={prix} onChange={(e) => onPrix(e.target.value)} disabled={desactive}
              placeholder={vocal ? tr("💰 Prix (facultatif)") : tr("💰 Prix")}
              className={`${champ(erreurs.prix)} pr-14`} />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500">{devise}</span>
          </div>
          {/* Le micro : seulement avec une photo, et tant qu'il n'y a pas déjà un vocal */}
          {aPhotos && !vocal && !enregistre && (
            <button type="button" disabled={desactive} onClick={() => setEnregistre(true)} title={tr("Dire le prix en vocal")}
              className="w-12 h-12 flex-shrink-0 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-2xl flex items-center justify-center shadow disabled:opacity-50">🎤</button>
          )}
        </div>
        {erreurs.prix && <p className="mt-1 text-xs text-red-500 px-2">{erreurs.prix}</p>}
        {aPhotos && !vocal && !enregistre && (
          <p className="mt-1 text-xs text-gray-500 px-2">{tr("Écrivez le prix, ou touchez 🎤 pour le dire (1 minute au maximum).")}</p>
        )}
      </div>
      {vocal ? (
        <div className="flex items-center gap-2 p-2 rounded-full bg-amber-50 border-2 border-amber-200">
          <span className="text-xl pl-1">🎤</span>
          <audio src={apercus.vocal || undefined} controls className="flex-1 h-9 min-w-0" />
          <button type="button" onClick={() => onMedias({ ...medias, audios: [] })} aria-label={tr("Retirer")}
            className="w-8 h-8 flex-shrink-0 bg-red-500 text-white rounded-full text-base font-bold">×</button>
        </div>
      ) : enregistre ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <AudioRecorder compact autoStart maxDuration={dureeVocal} onAudioRecorded={(blob) => {
              const f = new File([blob], `vocal-${Date.now()}.webm`, { type: blob.type || "audio/webm" });
              onMedias({ ...medias, audios: [f] });
              setEnregistre(false);
            }} />
          </div>
          <button type="button" onClick={() => setEnregistre(false)} aria-label={tr("Annuler")} className="text-gray-400 text-xl px-2">✕</button>
        </div>
      ) : null}

    </div>
  );
}

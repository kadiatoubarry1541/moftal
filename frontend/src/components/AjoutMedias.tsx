import { useEffect, useMemo, useRef, useState } from "react";
import { AudioRecorder } from "./AudioRecorder";
import { useTraduction } from "../i18n/traduction";
import type { Medias } from "../utils/medias";

/**
 * Ajout de médias en un seul endroit, pensé pour tous (y compris les personnes
 * qui lisent peu) : quatre grands boutons à icône — Photo, Galerie, Vidéo,
 * Vocal — puis tout ce qui a été choisi s'affiche juste en dessous, avec une
 * croix pour le retirer. Aucun choix de « méthode » à faire avant.
 */

interface Props {
  valeur: Medias;
  onChange: (m: Medias) => void;
  maxImages?: number;
  maxVideos?: number;
  /** Durée maximum d'une vidéo, en secondes */
  dureeVideo?: number;
  /** Durée maximum d'un message vocal, en secondes */
  dureeVocal?: number;
  desactive?: boolean;
}

const dureeVideoFichier = (f: File) =>
  new Promise<number>((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => { URL.revokeObjectURL(v.src); resolve(v.duration); };
    v.onerror = () => { URL.revokeObjectURL(v.src); resolve(0); };
    v.src = URL.createObjectURL(f);
  });

export default function AjoutMedias({ valeur, onChange, maxImages = 8, maxVideos = 2, dureeVideo = 30, dureeVocal = 30, desactive }: Props) {
  const { tr } = useTraduction();
  const photoRef = useRef<HTMLInputElement>(null);
  const galerieRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [vocalOuvert, setVocalOuvert] = useState(false);
  const [message, setMessage] = useState("");

  // Aperçus (libérés quand les fichiers changent)
  const apercus = useMemo(() => ({
    images: valeur.images.map((f) => URL.createObjectURL(f)),
    videos: valeur.videos.map((f) => URL.createObjectURL(f)),
    audios: valeur.audios.map((f) => URL.createObjectURL(f)),
  }), [valeur]);
  useEffect(() => () => {
    [...apercus.images, ...apercus.videos, ...apercus.audios].forEach((u) => URL.revokeObjectURL(u));
  }, [apercus]);

  const ajouterFichiers = async (fichiers: File[]) => {
    setMessage("");
    const images = [...valeur.images];
    const videos = [...valeur.videos];
    const audios = [...valeur.audios];
    let trop = false;
    for (const f of fichiers) {
      if (f.type.startsWith("image/")) {
        if (images.length < maxImages) images.push(f); else trop = true;
      } else if (f.type.startsWith("video/")) {
        if (videos.length >= maxVideos) { trop = true; continue; }
        const d = await dureeVideoFichier(f);
        if (d > dureeVideo + 1) { setMessage(tr("La vidéo est trop longue : {n} secondes au maximum.", { n: dureeVideo })); continue; }
        videos.push(f);
      } else if (f.type.startsWith("audio/")) {
        audios.splice(0, audios.length, f);
      }
    }
    if (trop) setMessage(tr("Nombre maximum atteint : retirez un élément pour en ajouter un autre."));
    onChange({ images, videos, audios });
  };

  const surChoix = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichiers = Array.from(e.target.files || []);
    e.target.value = "";
    if (fichiers.length) void ajouterFichiers(fichiers);
  };

  const retirer = (genre: keyof Medias, i: number) =>
    onChange({ ...valeur, [genre]: valeur[genre].filter((_, j) => j !== i) });

  const bouton = "flex flex-col items-center justify-center gap-1 py-3 rounded-2xl border-2 text-xs font-semibold transition-colors disabled:opacity-50";
  const rien = !valeur.images.length && !valeur.videos.length && !valeur.audios.length;

  return (
    <div className="space-y-3">
      <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={surChoix} />
      <input ref={galerieRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={surChoix} />
      <input ref={videoRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={surChoix} />

      <div className="grid grid-cols-4 gap-2">
        <button type="button" disabled={desactive} onClick={() => photoRef.current?.click()}
          className={`${bouton} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>
          <span className="text-3xl">📷</span>{tr("Photo")}
        </button>
        <button type="button" disabled={desactive} onClick={() => galerieRef.current?.click()}
          className={`${bouton} border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100`}>
          <span className="text-3xl">🖼️</span>{tr("Galerie")}
        </button>
        <button type="button" disabled={desactive} onClick={() => videoRef.current?.click()}
          className={`${bouton} border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100`}>
          <span className="text-3xl">🎥</span>{tr("Vidéo")}
        </button>
        <button type="button" disabled={desactive} onClick={() => setVocalOuvert((o) => !o)}
          className={`${bouton} ${vocalOuvert ? "border-amber-500 bg-amber-100" : "border-amber-200 bg-amber-50"} text-amber-700 hover:bg-amber-100`}>
          <span className="text-3xl">🎤</span>{tr("Vocal")}
        </button>
      </div>

      {vocalOuvert && (
        <AudioRecorder maxDuration={dureeVocal} onAudioRecorded={(blob) => {
          const f = new File([blob], `vocal-${Date.now()}.webm`, { type: blob.type || "audio/webm" });
          onChange({ ...valeur, audios: [f] });
          setVocalOuvert(false);
        }} />
      )}

      {message && <p className="text-xs font-semibold text-red-600">{message}</p>}

      {rien ? (
        <p className="text-center text-xs text-gray-400">{tr("Ajoutez une photo, une vidéo ou un message vocal.")}</p>
      ) : (
        <div className="space-y-2">
          {(valeur.images.length > 0 || valeur.videos.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {apercus.images.map((u, i) => (
                <div key={u} className="relative">
                  <img src={u} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-200" />
                  <button type="button" onClick={() => retirer("images", i)} aria-label={tr("Retirer")}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-full text-sm font-bold flex items-center justify-center shadow">×</button>
                </div>
              ))}
              {apercus.videos.map((u, i) => (
                <div key={u} className="relative">
                  <video src={u} className="w-20 h-20 object-cover rounded-xl border border-gray-200 bg-black" muted playsInline />
                  <span className="absolute inset-0 flex items-center justify-center text-white text-2xl pointer-events-none">▶</span>
                  <button type="button" onClick={() => retirer("videos", i)} aria-label={tr("Retirer")}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-full text-sm font-bold flex items-center justify-center shadow">×</button>
                </div>
              ))}
            </div>
          )}
          {apercus.audios.map((u, i) => (
            <div key={u} className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-xl">🎤</span>
              <audio src={u} controls className="flex-1 h-9 min-w-0" />
              <button type="button" onClick={() => retirer("audios", i)} aria-label={tr("Retirer")}
                className="w-7 h-7 bg-red-500 text-white rounded-full text-sm font-bold flex items-center justify-center shadow">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

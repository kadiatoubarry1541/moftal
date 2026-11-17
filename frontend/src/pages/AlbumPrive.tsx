import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { config } from "../config/api";
import { getPhotoUrl } from "../utils/auth";
import { lireDureeMedia } from "../utils/dureesMedias";
import { useTraduction } from "../i18n/traduction";
import { BarreQuota, type QuotaGalerie } from "../components/QuotaGalerie";

// Album privé : chaque personne a le sien, que personne d'autre ne voit.
// 5 photos + 2 vidéos gratuites (vidéos de 5 secondes au plus), 1 photo offerte
// chaque mois et 1 vidéo tous les 6 mois ; au-delà on paie en points.
// Retirer un fichier libère sa place. Tout est enregistré sur le serveur (/api/album-prive).

const API = `${config.API_BASE_URL}/album-prive`;
const jeton = () => localStorage.getItem("token") || "";

interface Element { id: string; type: "photo" | "video"; url: string; duree?: number | null; createdAt: string }

export default function AlbumPrive() {
  const { tr } = useTraduction();
  const navigate = useNavigate();
  const [elements, setElements] = useState<Element[]>([]);
  const [quota, setQuota] = useState<QuotaGalerie | null>(null);
  const [dureeMaxVideo, setDureeMaxVideo] = useState(5);
  const [besoinPoints, setBesoinPoints] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [ouvert, setOuvert] = useState<Element | null>(null);
  const champPhoto = useRef<HTMLInputElement>(null);
  const champVideo = useRef<HTMLInputElement>(null);

  const appliquer = (d: { elements?: Element[]; quota?: QuotaGalerie; dureeMaxVideo?: number }) => {
    setElements(d.elements || []);
    if (d.quota) setQuota(d.quota);
    if (d.dureeMaxVideo) setDureeMaxVideo(d.dureeMaxVideo);
  };

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur("");
    try {
      const r = await fetch(API, { headers: { Authorization: `Bearer ${jeton()}` } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.message || tr("Votre album n'a pas pu être chargé."));
      appliquer(d);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setChargement(false);
    }
  }, [tr]);

  useEffect(() => { charger(); }, [charger]);

  const photos = elements.filter((e) => e.type === "photo");
  const videos = elements.filter((e) => e.type === "video");

  const ajouter = async (fichier: File | undefined) => {
    if (!fichier) return;
    setErreur("");
    setBesoinPoints(false);
    const estVideo = fichier.type.startsWith("video/");
    let duree: number | null = null;
    if (estVideo) {
      duree = await lireDureeMedia(fichier);
      if (!Number.isFinite(duree)) { setErreur(tr("La durée de cette vidéo n'a pas pu être lue. Essayez une autre vidéo.")); return; }
      if (duree > dureeMaxVideo + 0.5) {
        setErreur(tr("Cette vidéo dure {d} secondes. Dans l'album privé, une vidéo dure {max} secondes au maximum.", { d: Math.round(duree), max: dureeMaxVideo }));
        return;
      }
    }
    setEnvoi(true);
    try {
      const fd = new FormData();
      fd.append("fichier", fichier);
      if (duree !== null) fd.append("duree", String(duree));
      const r = await fetch(API, { method: "POST", headers: { Authorization: `Bearer ${jeton()}` }, body: fd });
      const d = await r.json().catch(() => ({}));
      if (d.code === "QUOTA_EXCEEDED") setBesoinPoints(true);
      if (!r.ok || !d.success) throw new Error(d.message || tr("Le fichier n'a pas pu être enregistré. Réessayez."));
      appliquer(d);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnvoi(false);
    }
  };

  const retirer = async (el: Element) => {
    if (!window.confirm(el.type === "photo" ? tr("Retirer cette photo de votre album ?") : tr("Retirer cette vidéo de votre album ?"))) return;
    setErreur("");
    try {
      const r = await fetch(`${API}/${encodeURIComponent(el.id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${jeton()}` } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.message || tr("Le fichier n'a pas pu être retiré. Réessayez."));
      appliquer(d);
      setOuvert(null);
    } catch (e) {
      setErreur((e as Error).message);
    }
  };

  const Case = ({ el }: { el: Element }) => (
    <button type="button" onClick={() => setOuvert(el)} className="relative aspect-square rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-700 shadow-sm">
      {el.type === "photo"
        ? <img src={getPhotoUrl(el.url) || el.url} alt="" className="w-full h-full object-cover" loading="lazy" />
        : <>
            <video src={getPhotoUrl(el.url) || el.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center text-3xl text-white drop-shadow">▶</span>
          </>}
    </button>
  );

  const CaseVide = ({ libelle, onClick, desactive }: { libelle: string; onClick: () => void; desactive: boolean }) => (
    <button type="button" onClick={onClick} disabled={desactive}
      className="aspect-square rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 flex flex-col items-center justify-center gap-1 text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-50">
      <span className="text-2xl leading-none">+</span>
      {libelle}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-900">
      <div className="sticky top-0 z-10 flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-3 py-3 shadow">
        <button type="button" onClick={() => navigate(-1)} className="text-3xl leading-none px-2" aria-label={tr("Retour")}>‹</button>
        <div className="min-w-0">
          <p className="font-bold truncate">🔒 {tr("Mon album privé")}</p>
          <p className="text-xs text-emerald-100">{tr("Vous seul voyez cet album")}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-5 space-y-6">
        <p className="rounded-xl bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-900/40 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
          {tr("Gardez ici vos plus beaux souvenirs. Personne d'autre ne les voit. Pour changer une photo, retirez-en une et mettez-en une autre.")}
        </p>

        {quota && <BarreQuota quota={quota} />}

        {erreur && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            <p>{erreur}</p>
            {besoinPoints && <Link to="/acheter-points" className="mt-2 inline-block rounded-lg bg-amber-500 px-3 py-1.5 font-semibold text-white">🪙 {tr("Acheter des points")}</Link>}
          </div>
        )}
        {envoi && <p className="text-sm font-semibold text-emerald-700">{tr("Enregistrement en cours…")}</p>}

        {chargement ? (
          <p className="py-10 text-center text-emerald-600">{tr("Chargement de votre album…")}</p>
        ) : (
          <>
            <section>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                📷 {tr("Photos")} <span className="font-normal text-gray-500">({photos.length})</span>
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {photos.map((el) => <Case key={el.id} el={el} />)}
                <CaseVide libelle={tr("Ajouter une photo")} onClick={() => champPhoto.current?.click()} desactive={envoi} />
              </div>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                🎬 {tr("Vidéos")} <span className="font-normal text-gray-500">({videos.length} · {tr("{s} s maximum", { s: dureeMaxVideo })})</span>
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {videos.map((el) => <Case key={el.id} el={el} />)}
                <CaseVide libelle={tr("Ajouter une vidéo")} onClick={() => champVideo.current?.click()} desactive={envoi} />
              </div>
            </section>
          </>
        )}
      </div>

      <input ref={champPhoto} type="file" accept="image/*" className="hidden"
        onChange={(e) => { ajouter(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={champVideo} type="file" accept="video/*" className="hidden" data-duree-max-video={dureeMaxVideo}
        onChange={(e) => { ajouter(e.target.files?.[0]); e.target.value = ""; }} />

      {ouvert && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4" onClick={() => setOuvert(null)}>
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            {ouvert.type === "photo"
              ? <img src={getPhotoUrl(ouvert.url) || ouvert.url} alt="" className="w-full max-h-[75vh] object-contain rounded-xl" />
              : <video src={getPhotoUrl(ouvert.url) || ouvert.url} controls autoPlay playsInline className="w-full max-h-[75vh] rounded-xl bg-black" />}
            <div className="mt-4 flex gap-3">
              <button type="button" onClick={() => retirer(ouvert)} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold">🗑️ {tr("Retirer")}</button>
              <button type="button" onClick={() => setOuvert(null)} className="flex-1 py-3 rounded-xl bg-white/20 text-white font-semibold">{tr("Fermer")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


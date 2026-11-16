import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { distanceAuChemin, distanceMetres, libelleDistance, libelleDuree } from "../utils/distance";

const CarteLibre = lazy(() => import("./CarteLibre"));
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5002";

/**
 * Lieu d'un rendez-vous accepté et guidage pas à pas, entièrement dans Moftal :
 * le point de l'établissement (vert), ma position en direct (bleu), le chemin,
 * la consigne en cours (« Dans 50 m, tournez à gauche »), la voix, un nouveau
 * chemin si l'on s'écarte, l'arrivée. Le repère et la photo de la façade
 * guident les derniers mètres.
 */
export interface PositionPro {
  latitude: number;
  longitude: number;
  repere?: string | null;
  photoFacade?: string | null;
}

interface Etape {
  consigne: string;
  distance: number;
  position: { latitude: number; longitude: number };
  type: string;
  direction: string;
}
interface Itineraire {
  distance: number;
  duree: number;
  trace: [number, number][];
  etapes: Etape[];
}
type Mode = "pied" | "voiture";

const REGLAGES = {
  pied: { annonce: 40, passage: 15, ecart: 40, arrivee: 25 },
  voiture: { annonce: 150, passage: 30, ecart: 70, arrivee: 40 },
};

function fleche(e?: Etape): string {
  if (!e) return "⬆️";
  if (e.type === "arrive") return "🏁";
  if (e.type === "roundabout" || e.type === "rotary") return "🔄";
  if (e.direction.includes("uturn")) return "↩️";
  if (e.direction.includes("left")) return "⬅️";
  if (e.direction.includes("right")) return "➡️";
  return "⬆️";
}

function parler(texte: string) {
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = "fr-FR";
    window.speechSynthesis.speak(u);
  } catch { /* voix indisponible : l'écran suffit */ }
}

/** « Tournez à gauche » → « tournez à gauche » (après « Dans 50 m, ») */
const minuscule = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

export default function LieuRendezVous({ rdvId, nom, position }: { rdvId: string; nom: string; position: PositionPro }) {
  const [moi, setMoi] = useState<{ latitude: number; longitude: number } | null>(null);
  const [erreurGps, setErreurGps] = useState("");
  const [mode, setMode] = useState<Mode>("pied");
  const [itineraire, setItineraire] = useState<Itineraire | null>(null);
  const [guidage, setGuidage] = useState(false);
  const [idx, setIdx] = useState(1);
  const [voix, setVoix] = useState(true);
  const [calcul, setCalcul] = useState(false);
  const [info, setInfo] = useState("");
  const [arrive, setArrive] = useState(false);
  const dernierCalcul = useRef(0);
  const annonces = useRef(new Set<number>());
  const voixRef = useRef(voix);
  voixRef.current = voix;
  const dire = useCallback((t: string) => { if (voixRef.current) parler(t); }, []);

  // Ma position, suivie tant que l'écran est ouvert
  useEffect(() => {
    if (!navigator.geolocation) { setErreurGps("Ce téléphone ne permet pas de se localiser."); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => { setMoi({ latitude: p.coords.latitude, longitude: p.coords.longitude }); setErreurGps(""); },
      (e) => setErreurGps(e.code === 1
        ? "📍 Autorisez la position pour Moftal pour être guidé(e) jusqu'au lieu."
        : "Votre position n'est pas encore trouvée…"),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 30000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // L'écran reste allumé pendant le guidage
  useEffect(() => {
    if (!guidage) return;
    let verrou: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((v) => { verrou = v; }).catch(() => {});
    return () => { verrou?.release().catch(() => {}); };
  }, [guidage]);

  const calculer = useCallback(async (depart: { latitude: number; longitude: number }, modeChoisi: Mode, recalcul = false) => {
    setCalcul(true);
    dernierCalcul.current = Date.now();
    try {
      const r = await fetch(`${API_BASE}/api/itineraire/rendez-vous/${rdvId}?lat=${depart.latitude}&lng=${depart.longitude}&mode=${modeChoisi}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.message || "Le chemin n'a pas pu être calculé.");
      const iti: Itineraire = d.itineraire;
      setItineraire(iti);
      setIdx(1);
      annonces.current = new Set();
      setInfo(recalcul ? "Nouveau chemin calculé." : "");
      if (iti.etapes[0]) dire(recalcul ? `Nouveau chemin. ${iti.etapes[0].consigne}` : iti.etapes[0].consigne);
      return true;
    } catch (e) {
      setInfo((e as Error).message);
      return false;
    } finally {
      setCalcul(false);
    }
  }, [rdvId, dire]);

  const demarrer = async () => {
    if (!moi) { setInfo("Votre position n'est pas encore trouvée. Patientez un instant."); return; }
    setArrive(false);
    if (await calculer(moi, mode)) setGuidage(true);
  };

  const arreter = () => {
    setGuidage(false);
    try { window.speechSynthesis?.cancel(); } catch { /* */ }
  };

  // À chaque nouvelle position : arrivée, écart du chemin, prochaine consigne
  useEffect(() => {
    if (!guidage || !itineraire || !moi) return;
    const reg = REGLAGES[mode];
    if (distanceMetres(moi, position) <= reg.arrivee) {
      setArrive(true);
      setGuidage(false);
      dire(`Vous êtes arrivé. ${position.repere ? `Repère : ${position.repere}` : ""}`);
      return;
    }
    if (distanceAuChemin(moi, itineraire.trace) > reg.ecart && Date.now() - dernierCalcul.current > 15000 && !calcul) {
      void calculer(moi, mode, true);
      return;
    }
    const etape = itineraire.etapes[idx];
    if (!etape) return;
    const d = distanceMetres(moi, etape.position);
    if (d <= reg.passage) {
      setIdx(idx + 1);
      return;
    }
    if (d <= reg.annonce && !annonces.current.has(idx)) {
      annonces.current.add(idx);
      dire(etape.type === "arrive" ? `Dans ${libelleDistance(d)}, vous êtes arrivé` : `Dans ${libelleDistance(d)}, ${minuscule(etape.consigne)}`);
    }
  }, [moi, guidage, itineraire, idx, mode, position, calcul, calculer, dire]);

  const prochaine = itineraire?.etapes[idx];
  const distProchaine = prochaine && moi ? distanceMetres(moi, prochaine.position) : null;
  const restant = itineraire && distProchaine != null
    ? distProchaine + itineraire.etapes.slice(idx).reduce((s, e) => s + e.distance, 0)
    : null;
  const vitesse = itineraire && itineraire.duree > 0 ? itineraire.distance / itineraire.duree : 1.3;

  const points = useMemo(() => {
    const liste = [{ id: "lieu", latitude: position.latitude, longitude: position.longitude, couleur: "#059669" }];
    if (moi) liste.push({ id: "moi", latitude: moi.latitude, longitude: moi.longitude, couleur: "#2563eb" });
    return liste;
  }, [position.latitude, position.longitude, moi]);

  const distanceDirecte = moi ? distanceMetres(moi, position) : null;

  return (
    <div className="mt-3 space-y-2">
      {/* Consigne en cours (guidage) */}
      {guidage && prochaine && (
        <div className="rounded-xl bg-blue-700 text-white px-4 py-3 flex items-center gap-3 shadow">
          <span className="text-3xl leading-none">{fleche(prochaine)}</span>
          <div className="flex-1 min-w-0">
            {distProchaine != null && <div className="text-2xl font-extrabold leading-tight">{libelleDistance(distProchaine)}</div>}
            <div className="text-sm font-semibold leading-snug">{prochaine.consigne}</div>
          </div>
        </div>
      )}

      <Suspense fallback={<div className="h-[300px] rounded-xl bg-gray-100 animate-pulse" />}>
        <CarteLibre points={points} hauteur={guidage ? 360 : 280} trace={itineraire?.trace} suivre={guidage ? "moi" : undefined} />
      </Suspense>

      <div className="flex items-center gap-3 text-xs text-gray-600">
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600 mr-1" />{nom}</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600 mr-1" />Vous</span>
        {guidage && restant != null && (
          <span className="ml-auto font-semibold text-gray-800">{libelleDistance(restant)} · {libelleDuree(restant / vitesse)}</span>
        )}
      </div>

      {arrive && (
        <p className="text-base font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">✅ Vous êtes arrivé(e) chez {nom} !</p>
      )}

      {!guidage ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {(["pied", "voiture"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setMode(m)}
                className={`py-2 rounded-lg text-sm font-semibold border-2 ${mode === m ? "border-blue-600 bg-blue-50 text-blue-800" : "border-gray-200 text-gray-600"}`}>
                {m === "pied" ? "🚶 À pied" : "🚗 Voiture / moto"}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => void demarrer()} disabled={calcul || !moi}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-60">
            {calcul ? "Calcul du chemin…" : !moi ? "Recherche de votre position…" : "🧭 Me guider jusqu'au lieu"}
          </button>
          {distanceDirecte != null && !arrive && (
            <p className="text-xs text-gray-500">À vol d'oiseau : {libelleDistance(distanceDirecte)}.</p>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <button type="button" onClick={() => setVoix((v) => !v)} className="flex-1 py-2.5 rounded-lg bg-gray-100 text-sm font-semibold">
            {voix ? "🔊 Voix activée" : "🔇 Voix coupée"}
          </button>
          <button type="button" onClick={arreter} className="flex-1 py-2.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm font-semibold">
            ✕ Arrêter le guidage
          </button>
        </div>
      )}

      {info && <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{info}</p>}
      {erreurGps && <p className="text-xs text-amber-700">{erreurGps}</p>}

      {position.repere && (
        <p className="text-sm text-gray-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">🧭 <strong>Repère :</strong> {position.repere}</p>
      )}
      {position.photoFacade && (
        <figure>
          <img src={position.photoFacade} alt={`Façade de ${nom}`} className="w-full max-h-56 object-cover rounded-xl border border-gray-200" />
          <figcaption className="text-xs text-gray-500 mt-1">La façade de l'établissement</figcaption>
        </figure>
      )}
    </div>
  );
}

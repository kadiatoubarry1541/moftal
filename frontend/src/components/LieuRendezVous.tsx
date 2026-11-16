import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { distanceMetres, libelleDistance } from "../utils/distance";

const CarteLibre = lazy(() => import("./CarteLibre"));

/**
 * Lieu d'un rendez-vous accepté : le point de l'établissement (vert), ma position
 * en direct (bleu), la distance, le repère et la photo de la façade.
 * Tout reste dans Moftal (jamais de lien vers une autre application de cartes).
 */
export interface PositionPro {
  latitude: number;
  longitude: number;
  repere?: string | null;
  photoFacade?: string | null;
}

export default function LieuRendezVous({ nom, position }: { nom: string; position: PositionPro }) {
  const [moi, setMoi] = useState<{ latitude: number; longitude: number } | null>(null);
  const [erreur, setErreur] = useState("");

  // Ma position, suivie tant que l'écran est ouvert
  useEffect(() => {
    if (!navigator.geolocation) { setErreur("Ce téléphone ne permet pas de se localiser."); return; }
    const id = navigator.geolocation.watchPosition(
      (p) => { setMoi({ latitude: p.coords.latitude, longitude: p.coords.longitude }); setErreur(""); },
      (e) => setErreur(e.code === 1
        ? "📍 Autorisez la position pour Moftal pour voir où vous êtes par rapport au lieu."
        : "Votre position n'est pas encore trouvée…"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const points = useMemo(() => {
    const liste = [{ id: "lieu", latitude: position.latitude, longitude: position.longitude, couleur: "#059669" }];
    if (moi) liste.push({ id: "moi", latitude: moi.latitude, longitude: moi.longitude, couleur: "#2563eb" });
    return liste;
  }, [position.latitude, position.longitude, moi]);

  const distance = moi ? distanceMetres(moi, position) : null;
  const arrive = distance != null && distance < 40;

  return (
    <div className="mt-3 space-y-2">
      <Suspense fallback={<div className="h-[260px] rounded-xl bg-gray-100 animate-pulse" />}>
        <CarteLibre points={points} hauteur={260} />
      </Suspense>
      <div className="flex items-center gap-3 text-xs text-gray-600">
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600 mr-1" />{nom}</span>
        <span><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600 mr-1" />Vous</span>
      </div>
      {distance != null && (
        <p className={`text-sm font-semibold ${arrive ? "text-emerald-700" : "text-gray-800"}`}>
          {arrive ? "✅ Vous êtes arrivé(e) !" : `📏 Vous êtes à ${libelleDistance(distance)} (à vol d'oiseau).`}
        </p>
      )}
      {erreur && <p className="text-xs text-amber-700">{erreur}</p>}
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

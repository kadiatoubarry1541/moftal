import { lazy, Suspense, useMemo, useState } from "react";
import { compressImage } from "../utils/compressImage";

const CarteLibre = lazy(() => import("./CarteLibre"));
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5002";

/**
 * Le pro pose la position de son établissement : sur place (« Je suis dans mon
 * établissement ») ou en touchant la carte, puis un repère écrit et une photo
 * de la façade. Enregistré en base ; montré seulement au client dont le
 * rendez-vous est accepté. Le quartier du GPS est comparé à l'adresse déclarée.
 */
export interface ComptePosition {
  id: string;
  address?: string;
  city?: string;
  latitude?: number | null;
  longitude?: number | null;
  repere?: string | null;
  photoFacade?: string | null;
  positionAVerifier?: boolean;
}

function lireFichier(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** Quartier du point, d'après la carte OpenStreetMap (vide si introuvable). */
async function quartierDuPoint(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=16`, {
      headers: { "Accept-Language": "fr" },
    });
    const d = await r.json();
    const a = d.address || {};
    return a.neighbourhood || a.suburb || a.quarter || a.city_district || a.village || a.town || "";
  } catch {
    return "";
  }
}

export default function PositionEtablissement({ compte, onEnregistre }: { compte: ComptePosition; onEnregistre?: (c: ComptePosition) => void }) {
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(
    compte.latitude != null && compte.longitude != null ? { latitude: Number(compte.latitude), longitude: Number(compte.longitude) } : null,
  );
  const [precision, setPrecision] = useState<number | null>(null);
  const [repere, setRepere] = useState(compte.repere || "");
  const [photo, setPhoto] = useState<string | null>(null);
  const [apercu, setApercu] = useState<string | null>(compte.photoFacade || null);
  const [gps, setGps] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(
    compte.positionAVerifier ? { ok: false, texte: "Votre position est en cours de vérification par l'administrateur (quartier différent de votre adresse)." } : null,
  );

  const points = useMemo(() => (point ? [{ id: "etablissement", ...point, deplacable: true }] : []), [point]);

  const localiser = () => {
    setMessage(null);
    if (!navigator.geolocation) {
      setMessage({ ok: false, texte: "Ce téléphone ne permet pas de se localiser. Touchez la carte à l'endroit de votre établissement." });
      return;
    }
    setGps(true);
    // On écoute la position quelques secondes et on garde la plus précise :
    // la première mesure d'un téléphone est souvent approximative.
    let meilleure: GeolocationPosition | null = null;
    let fini = false;
    const terminer = () => {
      if (fini) return;
      fini = true;
      navigator.geolocation.clearWatch(id);
      clearTimeout(minuteur);
      setGps(false);
      if (meilleure) {
        setPoint({ latitude: meilleure.coords.latitude, longitude: meilleure.coords.longitude });
        setPrecision(Math.round(meilleure.coords.accuracy));
      }
    };
    const id = navigator.geolocation.watchPosition(
      (p) => {
        if (!meilleure || p.coords.accuracy < meilleure.coords.accuracy) meilleure = p;
        // Assez précis : on s'arrête tout de suite
        if (p.coords.accuracy <= 20) terminer();
      },
      (e) => {
        if (meilleure) return terminer();
        fini = true;
        navigator.geolocation.clearWatch(id);
        clearTimeout(minuteur);
        setGps(false);
        setMessage({ ok: false, texte: e.code === 1
          ? "📍 Localisation refusée. Autorisez la position pour Moftal dans les réglages du téléphone, ou touchez la carte à l'endroit de votre établissement."
          : "Position introuvable pour le moment. Sortez devant votre établissement et réessayez, ou touchez la carte." });
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
    );
    const minuteur = setTimeout(() => {
      if (meilleure) terminer();
      else {
        fini = true;
        navigator.geolocation.clearWatch(id);
        setGps(false);
        setMessage({ ok: false, texte: "Position introuvable pour le moment. Sortez devant votre établissement et réessayez, ou touchez la carte." });
      }
    }, 15000);
  };

  const choisirPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const data = await lireFichier(await compressImage(f, 1200, 0.82));
      setPhoto(data);
      setApercu(data);
    } catch {
      setMessage({ ok: false, texte: "Impossible de lire cette photo. Essayez une autre image." });
    }
  };

  const enregistrer = async () => {
    setMessage(null);
    if (!point) return setMessage({ ok: false, texte: "Touchez « Je suis dans mon établissement » ou placez le point sur la carte." });
    if (repere.trim().length < 5) return setMessage({ ok: false, texte: "Écrivez un repère pour vos clients (ex : portail bleu en face de la mosquée)." });
    setEnvoi(true);
    try {
      const quartierGps = await quartierDuPoint(point.latitude, point.longitude);
      const res = await fetch(`${API_BASE}/api/professionals/${compte.id}/position`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ ...point, repere: repere.trim(), quartierGps, ...(photo ? { photoFacade: photo } : {}) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.message || "La position n'a pas pu être enregistrée. Réessayez.");
      setMessage({ ok: !d.aVerifier, texte: d.message });
      setPhoto(null);
      onEnregistre?.({ ...compte, ...point, repere: repere.trim(), photoFacade: d.account?.photoFacade ?? apercu, positionAVerifier: !!d.aVerifier });
    } catch (e) {
      setMessage({ ok: false, texte: (e as Error).message });
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4">
      <h3 className="font-bold text-gray-900 mb-1">📍 Position de mon établissement</h3>
      <p className="text-xs text-gray-500 mb-3">
        Vos clients verront ce point, le repère et la photo <strong>seulement après un rendez-vous accepté</strong>, pour arriver jusqu'à votre porte.
      </p>

      <button type="button" onClick={localiser} disabled={gps}
        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-60 mb-2">
        {gps ? "Recherche de votre position…" : "📍 Je suis dans mon établissement"}
      </button>
      {precision != null && (
        <p className={`text-xs mb-2 ${precision > 50 ? "text-amber-700" : "text-emerald-700"}`}>
          Précision : environ {precision} m.{precision > 50 ? " Sortez devant l'entrée et réessayez, ou faites glisser le point." : ""}
        </p>
      )}

      <Suspense fallback={<div className="h-[260px] rounded-xl bg-gray-100 animate-pulse" />}>
        <CarteLibre
          points={points}
          hauteur={260}
          idPointAuToucher="etablissement"
          onDeplacer={(_, latitude, longitude) => { setPoint({ latitude, longitude }); setPrecision(null); }}
        />
      </Suspense>
      <p className="text-[11px] text-gray-400 mt-1 mb-3">Vous pouvez aussi toucher la carte ou faire glisser le point pour l'ajuster.</p>

      <label className="block text-xs font-semibold text-gray-700 mb-1">Repère pour vos clients *</label>
      <textarea value={repere} onChange={(e) => setRepere(e.target.value)} rows={2} maxLength={300}
        placeholder="Ex : portail bleu en face de la grande mosquée, 2e boutique à gauche"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />

      <label className="block text-xs font-semibold text-gray-700 mb-1">Photo de la façade</label>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-24 h-16 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center text-xl">
          {apercu ? <img src={apercu} alt="Façade" className="w-full h-full object-cover" /> : "🏠"}
        </div>
        <label className="text-sm font-semibold text-emerald-700 cursor-pointer">
          {apercu ? "Changer la photo" : "📷 Ajouter une photo"}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={choisirPhoto} />
        </label>
      </div>

      {message && <p className={`text-sm rounded-lg px-3 py-2 mb-3 ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{message.texte}</p>}
      <button type="button" onClick={() => void enregistrer()} disabled={envoi}
        className="w-full py-3 rounded-xl bg-gray-900 hover:bg-black text-white font-bold disabled:opacity-60">
        {envoi ? "Enregistrement…" : "✓ Enregistrer la position"}
      </button>
    </div>
  );
}

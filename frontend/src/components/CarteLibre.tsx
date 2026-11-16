import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as CarteMapLibre, Marker as MarqueurMapLibre, StyleSpecification } from "maplibre-gl";

/**
 * Carte 100 % gratuite de Moftal : données OpenStreetMap, affichage OpenFreeMap
 * (sans clé, sans limite). Si OpenFreeMap ne répond pas, on bascule tout seul
 * sur les images de carte OpenStreetMap. Jamais de lien vers une autre application.
 *
 * Chargée à la demande (la bibliothèque de carte est lourde) : n'importer ce
 * composant que via React.lazy.
 */

export interface PointCarte {
  id: string;
  latitude: number;
  longitude: number;
  couleur?: string;
  /** Le pro peut faire glisser son point pour l'ajuster */
  deplacable?: boolean;
}

interface Props {
  points: PointCarte[];
  /** Centre si aucun point (Conakry par défaut) */
  centre?: { latitude: number; longitude: number };
  zoom?: number;
  hauteur?: number | string;
  /** Point déplacé (glissé) ou carte touchée : nouvelle position */
  onDeplacer?: (id: string, latitude: number, longitude: number) => void;
  /** Toucher la carte place le point « id » à cet endroit */
  idPointAuToucher?: string;
  /** Chemin à dessiner : liste de [longitude, latitude] */
  trace?: [number, number][];
  /** Guidage : la carte suit ce point (au lieu de tout cadrer) */
  suivre?: string;
}

// Dessine (ou met à jour) le chemin. À refaire après un changement de style.
function dessinerTrace(c: CarteMapLibre, trace: [number, number][] | undefined): boolean {
  const donnees = {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "LineString" as const, coordinates: trace && trace.length > 1 ? trace : [] },
  };
  const source = c.getSource("trace") as { setData?: (d: unknown) => void } | undefined;
  try {
    if (source?.setData) {
      source.setData(donnees);
      return true;
    }
    c.addSource("trace", { type: "geojson", data: donnees });
    c.addLayer({ id: "trace-bord", type: "line", source: "trace", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#ffffff", "line-width": 9 } });
    c.addLayer({ id: "trace", type: "line", source: "trace", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#2563eb", "line-width": 5 } });
    return true;
  } catch {
    // Style pas encore prêt : on réessaiera à l'événement « styledata »
    return false;
  }
}

const STYLE_OPENFREEMAP = "https://tiles.openfreemap.org/styles/liberty";
const CONAKRY = { latitude: 9.6412, longitude: -13.5784 };

// Secours : images de carte OpenStreetMap (si OpenFreeMap est indisponible)
const STYLE_SECOURS: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap",
      maxzoom: 19,
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export default function CarteLibre({ points, centre, zoom = 16, hauteur = 280, onDeplacer, idPointAuToucher, trace, suivre }: Props) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<CarteMapLibre | null>(null);
  const marqueurs = useRef<Map<string, MarqueurMapLibre>>(new Map());
  const lib = useRef<typeof import("maplibre-gl") | null>(null);
  const rappel = useRef(onDeplacer);
  rappel.current = onDeplacer;
  const traceRef = useRef(trace);
  traceRef.current = trace;
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState(false);

  // Création de la carte (une seule fois)
  useEffect(() => {
    let annule = false;
    let secoursFait = false;
    const listeMarqueurs = marqueurs.current;
    import("maplibre-gl").then((m) => {
      if (annule || !conteneur.current) return;
      lib.current = m;
      const premier = points[0] || centre || CONAKRY;
      try {
        const c = new m.Map({
          container: conteneur.current,
          style: STYLE_OPENFREEMAP,
          center: [premier.longitude, premier.latitude],
          zoom,
          attributionControl: { compact: true },
        });
        carte.current = c;
        c.addControl(new m.NavigationControl({ showCompass: false }), "top-right");
        c.on("load", () => { if (!annule) setPret(true); });
        // Le chemin disparaît quand le style change (passage au secours) : on le redessine
        c.on("styledata", () => { if (traceRef.current?.length) dessinerTrace(c, traceRef.current); });
        c.on("error", () => {
          // Style OpenFreeMap injoignable : on passe une fois sur le secours
          if (!secoursFait && !c.isStyleLoaded()) {
            secoursFait = true;
            c.setStyle(STYLE_SECOURS);
          }
        });
        c.on("click", (e) => {
          if (idPointAuToucher && rappel.current) rappel.current(idPointAuToucher, e.lngLat.lat, e.lngLat.lng);
        });
        setPret(true);
      } catch {
        setErreur(true);
      }
    }).catch(() => { if (!annule) setErreur(true); });
    return () => {
      annule = true;
      carte.current?.remove();
      carte.current = null;
      listeMarqueurs.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- la carte est créée une seule fois
  }, []);

  // Points : ajout, déplacement, retrait
  useEffect(() => {
    const c = carte.current;
    const m = lib.current;
    if (!pret || !c || !m) return;
    const vus = new Set<string>();
    for (const p of points) {
      vus.add(p.id);
      let mk = marqueurs.current.get(p.id);
      if (!mk) {
        mk = new m.Marker({ color: p.couleur || "#059669", draggable: !!p.deplacable })
          .setLngLat([p.longitude, p.latitude])
          .addTo(c);
        if (p.deplacable) {
          const id = p.id;
          const marqueur = mk;
          mk.on("dragend", () => {
            const ll = marqueur.getLngLat();
            rappel.current?.(id, ll.lat, ll.lng);
          });
        }
        marqueurs.current.set(p.id, mk);
      } else {
        mk.setLngLat([p.longitude, p.latitude]);
      }
    }
    for (const [id, mk] of marqueurs.current) {
      if (!vus.has(id)) { mk.remove(); marqueurs.current.delete(id); }
    }
    // Guidage : on suit la personne. Sinon : un point → centré ; plusieurs → tous visibles
    const suivi = suivre ? points.find((p) => p.id === suivre) : undefined;
    if (suivi) {
      c.easeTo({ center: [suivi.longitude, suivi.latitude], zoom: Math.max(c.getZoom(), 17) });
    } else if (points.length === 1) {
      c.easeTo({ center: [points[0].longitude, points[0].latitude] });
    } else if (points.length > 1) {
      const lons = points.map((p) => p.longitude);
      const lats = points.map((p) => p.latitude);
      c.fitBounds([[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]], { padding: 50, maxZoom: 17 });
    }
  }, [points, pret, suivre]);

  // Chemin du guidage
  useEffect(() => {
    const c = carte.current;
    if (!pret || !c) return;
    if (!dessinerTrace(c, trace)) c.once("styledata", () => dessinerTrace(c, traceRef.current));
  }, [trace, pret]);

  if (erreur) {
    return (
      <div className="w-full rounded-xl bg-gray-100 text-gray-500 text-sm flex items-center justify-center text-center p-4" style={{ height: hauteur }}>
        La carte n'a pas pu s'afficher sur cet appareil. Le repère et la photo restent disponibles.
      </div>
    );
  }
  return <div ref={conteneur} className="w-full rounded-xl overflow-hidden border border-gray-200" style={{ height: hauteur }} />;
}

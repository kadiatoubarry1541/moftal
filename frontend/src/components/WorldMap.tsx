import { useState, useEffect, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';

export interface MapPosition {
  lat: number;
  lng: number;
}

interface SearchResult {
  lat: number;
  lng: number;
  displayName: string;
  neighbourhood?: string;
}

interface ClickedPoint {
  lat: number;
  lng: number;
  address: string;
}

interface WorldMapProps {
  /** Appelé quand l'utilisateur clique sur la carte */
  onLocationSelect?: (lat: number, lng: number) => void;
  /** Afficher le bouton "Ma position" */
  showMyPositionButton?: boolean;
  /** Position initiale optionnelle */
  initialPosition?: MapPosition | null;
}

/** Géocodage inversé : coordonnées → adresse complète (quartier inclus) */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'fr', 'User-Agent': 'LesEnfantsAdam/1.0' } }
    );
    const data = await res.json();
    const a = data.address || {};
    const parts = [
      a.road || a.pedestrian || a.footway,
      a.house_number,
      a.neighbourhood || a.suburb || a.quarter || a.hamlet || a.city_district,
      a.city || a.town || a.village || a.municipality,
      a.state,
      a.country,
    ].filter(Boolean);
    return parts.join(', ') || data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export default function WorldMap({
  onLocationSelect,
  showMyPositionButton = true,
  initialPosition = null,
}: WorldMapProps) {
  const [mapOpen, setMapOpen] = useState(false);
  const [userPosition, setUserPosition] = useState<MapPosition | null>(initialPosition ?? null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [resetWorldView, setResetWorldView] = useState(0);
  const [clickedPoint, setClickedPoint] = useState<ClickedPoint | null>(null);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{
    className?: string;
    userPosition: MapPosition | null;
    searchResult: SearchResult | null;
    clickedPoint: ClickedPoint | null;
    resetWorldView: number;
    onMapClick?: (lat: number, lng: number) => void;
  }> | null>(null);

  useEffect(() => {
    if (initialPosition) {
      setUserPosition(initialPosition);
      setUserAddress(null);
    }
  }, [initialPosition?.lat, initialPosition?.lng]);

  const askForMyPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }
    setGeoError(null);
    setGeoLoading(true);
    setUserAddress(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserPosition(pos);
        setGeoLoading(false);
        const address = await reverseGeocode(pos.lat, pos.lng);
        setUserAddress(address);
      },
      (err) => {
        setGeoError(err.message || 'Impossible d\'obtenir votre position.');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    onLocationSelect?.(lat, lng);
    setClickedPoint({ lat, lng, address: 'Chargement…' });
    const address = await reverseGeocode(lat, lng);
    setClickedPoint({ lat, lng, address });
  }, [onLocationSelect]);

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchError('Entrez un lieu à rechercher.');
      return;
    }
    setSearchError(null);
    setSearchLoading(true);
    try {
      const params = new URLSearchParams({
        q,
        format: 'json',
        limit: '1',
        addressdetails: '1',
      });
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers: { 'Accept-Language': 'fr', 'User-Agent': 'LesEnfantsAdam/1.0' } }
      );
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setSearchError('Lieu non trouvé. Essayez une autre recherche (ville, quartier, adresse).');
        setSearchResult(null);
      } else {
        const first = data[0];
        const a = first.address || {};
        const neighbourhood =
          a.neighbourhood || a.suburb || a.quarter || a.hamlet || a.city_district || null;
        setSearchResult({
          lat: parseFloat(first.lat),
          lng: parseFloat(first.lon),
          displayName: first.display_name || q,
          neighbourhood,
        });
      }
    } catch {
      setSearchError('Recherche impossible. Vérifiez votre connexion.');
      setSearchResult(null);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  const goToWorldView = useCallback(() => {
    setResetWorldView((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      const {
        MapContainer,
        TileLayer,
        Marker,
        Popup,
        useMap,
        useMapEvents,
        ZoomControl,
      } = await import('react-leaflet');

      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (cancelled) return;

      function FlyToPosition({ position }: { position: MapPosition | null }) {
        const map = useMap();
        useEffect(() => {
          if (position) map.flyTo([position.lat, position.lng], 16, { duration: 1.5 });
        }, [position?.lat, position?.lng, map]);
        return null;
      }

      function FlyToSearch({ result }: { result: SearchResult | null }) {
        const map = useMap();
        useEffect(() => {
          if (result) map.flyTo([result.lat, result.lng], 17, { duration: 1.5 });
        }, [result?.lat, result?.lng, map]);
        return null;
      }

      function ResetWorldView({ trigger }: { trigger: number }) {
        const map = useMap();
        useEffect(() => {
          if (trigger > 0) map.flyTo([20, 0], 2, { duration: 1 });
        }, [trigger, map]);
        return null;
      }

      function MapClickHandler({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
        useMapEvents({
          click(e) {
            onMapClick?.(e.latlng.lat, e.latlng.lng);
          },
        });
        return null;
      }

      function InnerMap({
        className = '',
        userPosition: pos,
        searchResult: searchRes,
        clickedPoint: clicked,
        resetWorldView: resetTrigger,
        onMapClick,
      }: {
        className?: string;
        userPosition: MapPosition | null;
        searchResult: SearchResult | null;
        clickedPoint: ClickedPoint | null;
        resetWorldView: number;
        onMapClick?: (lat: number, lng: number) => void;
      }) {
        return (
          <MapContainer
            center={[20, 0]}
            zoom={2}
            minZoom={1}
            maxZoom={19}
            className={className}
            style={{ height: '100%', width: '100%', minHeight: 400 }}
            scrollWheelZoom={true}
            attributionControl={true}
            zoomControl={false}
          >
            <ZoomControl position="topright" />
            {/* Couche principale OpenStreetMap — affiche les quartiers au zoom 14+ */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              maxNativeZoom={19}
            />
            <FlyToPosition position={pos} />
            <FlyToSearch result={searchRes} />
            <ResetWorldView trigger={resetTrigger} />
            <MapClickHandler onMapClick={onMapClick} />

            {/* Marqueur GPS */}
            {pos && (
              <Marker position={[pos.lat, pos.lng]}>
                <Popup>
                  <strong>📍 Ma position</strong>
                </Popup>
              </Marker>
            )}

            {/* Marqueur résultat de recherche */}
            {searchRes && (
              <Marker position={[searchRes.lat, searchRes.lng]}>
                <Popup>
                  <strong>🔍 {searchRes.neighbourhood ?? searchRes.displayName.split(',')[0]}</strong>
                  <br />
                  <span style={{ fontSize: '0.8em', color: '#555' }}>{searchRes.displayName}</span>
                </Popup>
              </Marker>
            )}

            {/* Marqueur clic — avec adresse/quartier */}
            {clicked && (
              <Marker position={[clicked.lat, clicked.lng]}>
                <Popup autoPan>
                  <strong>📌 Lieu sélectionné</strong>
                  <br />
                  <span style={{ fontSize: '0.85em' }}>{clicked.address}</span>
                  <br />
                  <span style={{ fontSize: '0.75em', color: '#888' }}>
                    {clicked.lat.toFixed(5)}, {clicked.lng.toFixed(5)}
                  </span>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        );
      }

      setMapComponent(() => InnerMap);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="securite-worldmap-block">
      {/* Bouton pour ouvrir/fermer la carte */}
      <button
        type="button"
        onClick={() => setMapOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
      >
        🗺️ {mapOpen ? 'Fermer la carte' : 'Vérifier sur la carte'}
        <span className="text-xs">{mapOpen ? '▲' : '▼'}</span>
      </button>

      {/* Tout le contenu de la carte — visible seulement si mapOpen */}
      {mapOpen && (
        <div className="mt-3">
          {!MapComponent ? (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center min-h-[300px]">
              <p className="text-gray-500 dark:text-gray-400">Chargement de la carte…</p>
            </div>
          ) : (
            <>
              {/* Barre de recherche */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                <div className="flex-1 min-w-[200px] flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Ville, quartier, rue, adresse..."
                    className="flex-1 min-w-[140px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    aria-label="Rechercher un lieu"
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={searchLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                  >
                    {searchLoading ? (
                      <><span className="animate-spin">⏳</span> Recherche…</>
                    ) : (
                      <><span>🔍</span> Rechercher</>
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={goToWorldView}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  title="Revenir à la vue monde"
                >
                  🌍 Vue monde
                </button>
                {showMyPositionButton && (
                  <button
                    type="button"
                    onClick={askForMyPosition}
                    disabled={geoLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {geoLoading ? (
                      <><span className="animate-spin">⏳</span> Localisation…</>
                    ) : (
                      <><span>📍</span> Ma position</>
                    )}
                  </button>
                )}
              </div>

              {/* Infos position GPS */}
              {userPosition && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span className="font-medium">GPS :</span>{' '}
                  {userAddress ?? `${userPosition.lat.toFixed(5)}, ${userPosition.lng.toFixed(5)}`}
                </div>
              )}

              {/* Résultat recherche */}
              {searchResult && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span className="font-medium">Trouvé :</span>{' '}
                  {searchResult.neighbourhood
                    ? <><strong>{searchResult.neighbourhood}</strong> — {searchResult.displayName}</>
                    : searchResult.displayName}
                </div>
              )}

              {/* Lieu cliqué */}
              {clickedPoint && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span className="font-medium">Sélectionné :</span> {clickedPoint.address}
                </div>
              )}

              {/* Erreurs */}
              {searchError && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-2" role="alert">{searchError}</p>
              )}
              {geoError && (
                <p className="text-sm text-red-600 dark:text-red-400 mb-2" role="alert">{geoError}</p>
              )}

              {/* Astuce zoom */}
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                Zoomez pour voir les quartiers et les rues en détail.
              </p>

              <div className="securite-worldmap-wrapper rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg min-h-[400px]">
                <MapComponent
                  className="securite-worldmap"
                  userPosition={userPosition}
                  searchResult={searchResult}
                  clickedPoint={clickedPoint}
                  resetWorldView={resetWorldView}
                  onMapClick={handleMapClick}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

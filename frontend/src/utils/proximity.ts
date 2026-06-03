// ═══════════════════════════════════════════════════════════════
//  Système de tri par proximité géographique — Moftal
//  Principe : ce qui est près de toi apparaît EN PREMIER
//  Niveau 1 : même quartier/ville → Niveau 2 : même région
//  Niveau 3 : même pays         → Niveau 4 : reste du monde
// ═══════════════════════════════════════════════════════════════

export interface GeoCoords {
  lat: number;
  lng: number;
}

export interface UserGeoContext {
  coords?: GeoCoords;       // GPS si accordé
  city?: string;            // ville actuelle (lieuResidence3 ou 2)
  region?: string;          // région (lieuResidence2 ou 1)
  country?: string;         // pays
}

// ─── Distance Haversine (km) entre deux coordonnées GPS ─────────
export function haversineKm(a: GeoCoords, b: GeoCoords): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
    Math.cos((b.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

// ─── Récupère le contexte géographique de l'utilisateur connecté ─
export function getUserGeoContext(): UserGeoContext {
  try {
    const raw = localStorage.getItem("session_user") || localStorage.getItem("user");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const u = parsed.userData || parsed;

    // lieuResidence3 = plus précis (ville/quartier actuel)
    // lieuResidence2 = région
    // lieuResidence1 = pays/continent
    const city    = u.lieuResidence3 || u.lieuResidence2 || u.ville || "";
    const region  = u.lieuResidence2 || u.lieuResidence1 || u.regionOrigine || "";
    const country = u.lieuResidence1 || u.pays || u.country || "";

    return {
      city:    city?.toLowerCase().trim(),
      region:  region?.toLowerCase().trim(),
      country: country?.toLowerCase().trim(),
    };
  } catch {
    return {};
  }
}

// ─── Score de proximité (0 = très proche, 999 = très loin) ──────
export function proximityScore(
  item: { city?: string; country?: string; coordinates?: GeoCoords },
  user: UserGeoContext
): number {
  // Priorité GPS si disponible
  if (user.coords && item.coordinates) {
    return haversineKm(user.coords, item.coordinates);
  }

  const itemCity    = (item.city    || "").toLowerCase().trim();
  const itemCountry = (item.country || "").toLowerCase().trim();

  if (!itemCity && !itemCountry) return 500;

  // Même ville / quartier → score très faible (proche)
  if (user.city && itemCity && (
    itemCity.includes(user.city) || user.city.includes(itemCity)
  )) return 1;

  // Même région (lieuResidence2 contient souvent la ville)
  if (user.region && itemCity && (
    itemCity.includes(user.region) || user.region.includes(itemCity)
  )) return 10;

  // Même pays
  if (user.country && itemCountry && (
    itemCountry.includes(user.country) || user.country.includes(itemCountry)
  )) return 100;

  // Même pays via ville (ex: "Conakry" → Guinée)
  if (user.country && itemCity && (
    itemCity.includes(user.country) || user.country.includes(itemCity)
  )) return 150;

  return 999;
}

// ─── Tri d'un tableau par proximité ─────────────────────────────
export function sortByProximity<T extends { city?: string; country?: string; coordinates?: GeoCoords }>(
  items: T[],
  user: UserGeoContext
): T[] {
  if (!user.city && !user.region && !user.country && !user.coords) {
    return items; // pas de contexte → ordre original
  }
  return [...items].sort(
    (a, b) => proximityScore(a, user) - proximityScore(b, user)
  );
}

// ─── Hook : demande la position GPS au navigateur ────────────────
export function requestGPS(): Promise<GeoCoords | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 }
    );
  });
}

// ─── Badge de proximité affiché sur chaque carte ────────────────
export function proximityLabel(
  item: { city?: string; country?: string },
  user: UserGeoContext
): { text: string; color: string } | null {
  const score = proximityScore(item, user);
  if (score <= 1)   return { text: "📍 Près de vous",      color: "#16a34a" };
  if (score <= 10)  return { text: "🗺️ Dans votre région", color: "#2563eb" };
  if (score <= 150) return { text: "🌍 Même pays",         color: "#d97706" };
  return null;
}

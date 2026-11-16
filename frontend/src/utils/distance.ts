// Distances pour la carte (sans charger la bibliothèque de carte).

/** Distance à vol d'oiseau, en mètres. */
export function distanceMetres(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function libelleDistance(m: number): string {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

type Pt = { latitude: number; longitude: number };

/** Distance (m) d'un point au segment [a, b] — projection locale, précise sur quelques km. */
function distanceAuSegment(p: Pt, a: Pt, b: Pt): number {
  const kx = 111320 * Math.cos((p.latitude * Math.PI) / 180);
  const ky = 110540;
  const ax = (a.longitude - p.longitude) * kx, ay = (a.latitude - p.latitude) * ky;
  const bx = (b.longitude - p.longitude) * kx, by = (b.latitude - p.latitude) * ky;
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/** Distance (m) d'un point au chemin (liste de [longitude, latitude]). */
export function distanceAuChemin(p: Pt, chemin: [number, number][]): number {
  if (!chemin.length) return Infinity;
  if (chemin.length === 1) return distanceMetres(p, { longitude: chemin[0][0], latitude: chemin[0][1] });
  let min = Infinity;
  for (let i = 1; i < chemin.length; i++) {
    const a = { longitude: chemin[i - 1][0], latitude: chemin[i - 1][1] };
    const b = { longitude: chemin[i][0], latitude: chemin[i][1] };
    min = Math.min(min, distanceAuSegment(p, a, b));
  }
  return min;
}

/** « 5 min », « 1 h 10 » */
export function libelleDuree(secondes: number): string {
  const min = Math.max(1, Math.round(secondes / 60));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const reste = min % 60;
  return reste ? `${h} h ${String(reste).padStart(2, "0")}` : `${h} h`;
}

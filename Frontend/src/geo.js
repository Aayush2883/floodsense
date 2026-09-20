const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;

export function haversine(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function pathLength(coords) {
  let d = 0;
  for (let i = 0; i < coords.length - 1; i++) d += haversine(coords[i], coords[i + 1]);
  return d;
}

// metres from point p to segment a-b (flat-earth approximation, fine at city scale)
export function distToSegment(p, a, b) {
  const kx = 111320 * Math.cos(rad(p.lat));
  const ky = 110540;
  const ax = (a.lng - p.lng) * kx, ay = (a.lat - p.lat) * ky;
  const bx = (b.lng - p.lng) * kx, by = (b.lat - p.lat) * ky;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? -(ax * dx + ay * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const x = ax + t * dx, y = ay + t * dy;
  return Math.sqrt(x * x + y * y);
}

export function pathHitsZone(coords, zone) {
  for (let i = 0; i < coords.length - 1; i++) {
    if (distToSegment(zone, coords[i], coords[i + 1]) < zone.radiusM) return true;
  }
  return false;
}

export function fmtDistance(m) {
  if (m == null || Number.isNaN(m)) return '–';
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

export const walkMinutes = (m) => Math.max(1, Math.round(m / 70));

export function timeAgo(ts, lang = 'en') {
  const t = typeof ts === 'number' ? ts : Date.parse(ts);
  if (!t) return '';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  const hi = lang === 'hi';
  if (s < 60) return hi ? 'अभी' : 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return hi ? `${m} मिनट पहले` : `${m} min ago`;
  const h = Math.round(m / 60);
  return hi ? `${h} घंटे पहले` : `${h} h ago`;
}

// same key trick as server/public/map.html: match route steps to flooded road segments
const key = (aLat, aLng, bLat, bLng) =>
  [`${(+aLat).toFixed(5)},${(+aLng).toFixed(5)}`, `${(+bLat).toFixed(5)},${(+bLng).toFixed(5)}`].sort().join('|');

export function countFloodedCrossings(coords, segments) {
  if (!coords?.length || !segments?.length) return 0;
  const set = new Set(segments.map((s) => key(s.aLat, s.aLng, s.bLat, s.bLng)));
  let n = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    if (set.has(key(coords[i].lat, coords[i].lng, coords[i + 1].lat, coords[i + 1].lng))) n++;
  }
  return n;
}

export function sameRoute(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((p, i) => Math.abs(p.lat - b[i].lat) < 1e-6 && Math.abs(p.lng - b[i].lng) < 1e-6);
}

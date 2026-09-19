// Talks to the real FloodSense server (server/src). Every method returns the
// same shape as api/mock.js so screens don't care which one they use.
import { CAMPS, PIN_CODES } from '../data/places';
import { SEVERITY } from '../theme';

const SENSOR_AREAS = { 'sensor-01': 'Gandhi Maidan', 'sensor-02': 'Rajendra Nagar', 'sensor-03': 'Danapur' };

export function createLiveApi(baseUrl, getToken) {
  async function req(path, { method = 'GET', body, auth = false, timeoutMs = 20000 } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const headers = { 'content-type': 'application/json' };
    const token = getToken();
    if (auth || token) headers.Authorization = `Bearer ${token}`;
    try {
      const res = await fetch(`${baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: ctrl.signal });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = { error: text.slice(0, 120) }; }
      if (!res.ok) {
        const err = new Error(data?.error || `HTTP ${res.status}`);
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  const q = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

  // alerts router is mounted at /api (GET /api/alerts, /api/sensors); older servers used /api/alerts/*
  async function getWithFallback(path, oldPath) {
    try { return await req(path); } catch (e) {
      if (e.status === 404) return req(oldPath);
      throw e;
    }
  }

  function normRoute(data, dest) {
    const blocked = data?.shelterInPlace || data?.status === 'no-safe-route' || !data?.coords?.length;
    const d = data?.camp || data?.destination || dest;
    const destN = d ? { name: d.name, lat: d.lat, lng: d.lng, kind: dest?.kind || (data?.camp ? 'camp' : 'safeplace') } : dest;
    if (blocked) return { kind: 'shelter', dest: destN, message: data?.message || 'No flood-free route exists.' };
    return { kind: 'ok', dest: destN, coords: data.coords, distanceM: data.distanceM ?? data.distanceMeters ?? null, hops: data.hops };
  }

  return {
    async health() {
      const d = await req('/api/health', { timeoutMs: 3000 });
      return !!d?.ok;
    },

    signup: (b) => req('/api/auth/signup', { method: 'POST', body: b }),
    login: (b) => req('/api/auth/login', { method: 'POST', body: b }),
    // the server needs a token for routing, so a guest gets a throwaway account (same as map.html)
    guest: () => req('/api/auth/signup', { method: 'POST', body: { email: `guest${Date.now()}@floodsense.local`, password: `g${Math.random().toString(36).slice(2)}`, name: 'Guest' } }),

    async getFloods() {
      const d = await req('/api/route/floods?lat=25.61&lng=85.14&radiusM=10000');
      const segments = d?.segments || [];
      return { segments, zones: [], segmentCount: d?.count ?? segments.length };
    },

    async getReports() {
      const d = await req('/api/reports');
      return (d?.reports || []).sort((a, b) => b.createdAt - a.createdAt);
    },

    async sendReport({ text, lang, lat, lng }) {
      return req('/api/reports/text', { method: 'POST', auth: true, body: { text, lang, lat, lng }, timeoutMs: 45000 });
    },

    async routeToCamp(from) {
      const d = await req(`/api/route/camp?${q({ lat: from.lat, lng: from.lng })}`, { auth: true });
      return normRoute(d, null);
    },

    async routeTo(from, dest, { avoid = true } = {}) {
      const d = await req(`/api/route/safe?${q({ fromLat: from.lat, fromLng: from.lng, toLat: dest.lat, toLng: dest.lng, avoid: avoid ? 'true' : 'false' })}`, { auth: true });
      return normRoute(d, dest);
    },

    async routeToSafePlace(from) {
      const d = await req(`/api/route/safeplace?${q({ lat: from.lat, lng: from.lng })}`, { auth: true });
      return normRoute(d, { kind: 'safeplace' });
    },

    async getAlerts() {
      const d = await getWithFallback('/api/alerts', '/api/alerts/alerts');
      return (d?.alerts || []).map((a) => ({
        id: a.alertId, kind: a.source === 'sensor' ? 'sensor' : 'report', severity: a.severity || 'DANGER',
        sensorId: a.sensorId, lat: a.lat, lng: a.lng, waterLevelCm: a.waterLevelCm, roadsFlooded: a.roadsFlooded,
        place: SENSOR_AREAS[a.sensorId] || a.regionCode, timestamp: a.timestamp, message: a.message,
      }));
    },

    async getSensors() {
      const d = await getWithFallback('/api/sensors', '/api/alerts/sensors');
      return (d?.sensors || []).map((s) => ({ ...s, area: SENSOR_AREAS[s.sensorId] || s.regionCode }));
    },

    async geocodePin(pinCode) { return PIN_CODES[pinCode] || null; },
    async addFamily(c) {
      const d = await req('/api/family', { method: 'POST', auth: true, body: c });
      const x = d?.contact;
      return x && (x.lat ?? x.location?.lat) ? { lat: x.lat ?? x.location.lat, lng: x.lng ?? x.location.lng } : null;
    },
    async removeFamily(id) { return req(`/api/family/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true }); },

    async getSafePlaces(near) {
      const d = await req(`/api/safeplaces/nearby?${q({ lat: near.lat, lng: near.lng, radiusM: 10000 })}`);
      return (d?.safePlaces || []).map((p) => ({ ...p, kind: 'safeplace', isFull: false }));
    },
    addSafePlace: (p) => req('/api/safeplaces', { method: 'POST', auth: true, body: p }),
    markFull: (id) => req(`/api/safeplaces/${encodeURIComponent(id)}/full`, { method: 'PATCH', auth: true }),

    async getHeatmap() {
      const d = await req('/api/admin/heatmap');
      return d?.points || [];
    },

    clearFloods: () => req('/api/route/floods/clear', { method: 'POST', auth: true }),

    async simulateSensorDanger() {
      throw new Error('In live mode, run: python iot-simulator/simulator.py --sensor-id sensor-02 --scenario flash-flood');
    },
  };
}

// flood halos for the map and for "danger X km away", built from alerts + reports
export function zonesFrom(alerts, reports) {
  const cutoff = Date.now() - 6 * 3600e3;
  const z = [];
  for (const a of alerts) {
    if (a.lat && a.lng && Date.parse(a.timestamp) > cutoff) {
      z.push({ id: `za_${a.id}`, lat: a.lat, lng: a.lng, radiusM: 450, severity: a.severity || 'DANGER', label: a.place, source: 'sensor', ts: Date.parse(a.timestamp) });
    }
  }
  for (const r of reports) {
    const sev = r.extracted?.severity;
    const radiusM = SEVERITY[sev]?.radiusM ?? 0;
    if (radiusM && r.lat && r.lng && r.createdAt > cutoff) {
      z.push({ id: `zr_${r.reportId}`, lat: r.lat, lng: r.lng, radiusM, severity: sev, label: r.extracted?.locationText || r.geocodedLabel, source: 'report', ts: r.createdAt });
    }
  }
  return z;
}

export const campsAsPlaces = () => CAMPS.map((c) => ({ ...c, kind: 'camp' }));

// In-browser stand-in for the FloodSense server. Used when the server is not
// reachable (or "Demo data" is switched on) so the app always works in a demo.
import { CAMPS, KNOWN_PLACES, PIN_CODES } from '../data/places';
import { haversine, pathHitsZone, pathLength } from '../geo';
import { SEVERITY } from '../theme';

const now = Date.now();
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();
const uid = (p) => `${p}_${Math.random().toString(36).slice(2, 9)}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const state = {
  zones: [
    { id: 'z_sensor01', lat: 25.6107, lng: 85.1416, radiusM: 450, severity: 'DANGER', label: 'Gandhi Maidan', source: 'sensor', ts: now - 2 * 60e3 },
    { id: 'z_rep_rn', lat: 25.6045, lng: 85.1585, radiusM: 350, severity: 'HIGH', label: 'Rajendra Nagar', source: 'report', ts: now - 9 * 60e3 },
  ],
  sensors: [
    { sensorId: 'sensor-01', area: 'Gandhi Maidan', lat: 25.6107, lng: 85.1416, waterLevelCm: 162, alert: 'DANGER', timestamp: iso(4e3) },
    { sensorId: 'sensor-02', area: 'Rajendra Nagar', lat: 25.6025, lng: 85.1585, waterLevelCm: 96, alert: 'WARNING', timestamp: iso(3e3) },
    { sensorId: 'sensor-03', area: 'Danapur', lat: 25.6210, lng: 85.0450, waterLevelCm: 35, alert: 'SAFE', timestamp: iso(2e3) },
  ],
  alerts: [
    {
      id: 'a1', kind: 'sensor', severity: 'DANGER', sensorId: 'sensor-01', lat: 25.6107, lng: 85.1416,
      waterLevelCm: 162, roadsFlooded: 38, place: 'Gandhi Maidan', timestamp: iso(2 * 60e3),
      message: 'Water at 162cm near Gandhi Maidan. 38 road segments closed. Move to higher ground.',
    },
  ],
  reports: [
    {
      reportId: 'r1', createdAt: now - 9 * 60e3, lat: 25.6045, lng: 85.1585, geocodedLabel: 'Rajendra Nagar, Patna 800016',
      text: 'Rajendra Nagar mein paani kamar tak, gaadiyan phas gayi hain', lang: 'hi-IN', roadsFlooded: 22,
      extracted: { severity: 'HIGH', waterLevelEstimate: 'waist', hazardType: 'road-blocked', casualtiesMentioned: false, locationText: 'Rajendra Nagar', summary: 'Waist-deep water in Rajendra Nagar, vehicles stuck.' },
    },
    {
      reportId: 'r2', createdAt: now - 26 * 60e3, lat: 25.6112, lng: 85.1365, geocodedLabel: 'Fraser Road, Patna 800001',
      text: 'Fraser Road pe ghutne tak paani', lang: 'hi-IN', roadsFlooded: 0,
      extracted: { severity: 'MEDIUM', waterLevelEstimate: 'knee', hazardType: 'waterlogging', casualtiesMentioned: false, locationText: 'Fraser Road', summary: 'Knee-deep water on Fraser Road.' },
    },
  ],
  safePlaces: [
    { nodeId: 'safe_demo_1', name: 'Krishna Temple Terrace', type: 'temple', capacity: 40, contact: '+91-98XXXXXXXX', notes: '3rd-floor terrace, stairs from the back gate', lat: 25.6040, lng: 85.1310, isFull: false },
    { nodeId: 'safe_demo_2', name: 'St. Xavier’s School Hall (1st floor)', type: 'school', capacity: 120, contact: '', notes: 'Enter from the side gate', lat: 25.6178, lng: 85.1335, isFull: false },
    { nodeId: 'safe_demo_3', name: 'Shiv Mandir Roof', type: 'terrace', capacity: 25, contact: '', notes: '', lat: 25.5990, lng: 85.1480, isFull: true },
  ],
  campsFull: new Set(),
};

const segCountFor = (radiusM) => Math.round(radiusM / 16);

function blockingZones() {
  return state.zones.filter((z) => z.radiusM > 0 && (z.severity === 'DANGER' || z.severity === 'HIGH' || z.severity === 'MEDIUM'));
}

function insideZone(p) {
  return blockingZones().find((z) => haversine(p, z) < z.radiusM);
}

function clear(path) {
  return !blockingZones().some((z) => pathHitsZone(path, z));
}

// grid-like path: go along streets (north-south, then east-west) and detour around flood zones
function planPath(from, to) {
  const tries = [
    [from, { lat: from.lat, lng: to.lng }, to],
    [from, { lat: to.lat, lng: from.lng }, to],
  ];
  for (const z of blockingZones()) {
    const off = (z.radiusM + 260) / 110540;
    for (const lat of [z.lat - off, z.lat + off]) {
      tries.push([from, { lat, lng: from.lng }, { lat, lng: to.lng }, to]);
    }
    const offLng = (z.radiusM + 260) / (111320 * Math.cos((z.lat * Math.PI) / 180));
    for (const lng of [z.lng - offLng, z.lng + offLng]) {
      tries.push([from, { lat: from.lat, lng }, { lat: to.lat, lng }, to]);
    }
  }
  const ok = tries.filter(clear).sort((a, b) => pathLength(a) - pathLength(b));
  return ok[0] || null;
}

function crossingsFor(path) {
  return blockingZones().filter((z) => pathHitsZone(path, z)).reduce((n, z) => n + Math.max(2, Math.round(z.radiusM / 75)), 0);
}

function routeResult(from, dest) {
  const zHere = insideZone(from);
  if (zHere && zHere.severity === 'DANGER') {
    return { kind: 'shelter', dest, message: 'You are inside a flooded area. Every road out is under water.' };
  }
  if (insideZone(dest)) return { kind: 'shelter', dest, message: 'The roads to this place are flooded.' };
  const path = planPath(from, dest);
  if (!path) return { kind: 'shelter', dest, message: 'All roads to the nearest safe place are flooded.' };
  return { kind: 'ok', dest, coords: path, distanceM: Math.round(pathLength(path) * 1.12) };
}

function campsAvailable() {
  return CAMPS.filter((c) => !state.campsFull.has(c.id)).map((c) => ({ ...c, kind: 'camp' }));
}

// ---- report understanding (demo stand-in for the Bedrock extractor) ----
const has = (t, words) => words.some((w) => t.includes(w));

export function mockExtract(text, pickedDepth) {
  const t = text.toLowerCase();
  let water = 'unknown';
  if (has(t, ['head', 'sir tak', 'sar tak', 'सिर', 'gardan', 'neck', 'गर्दन', 'doob', 'डूब', 'drown'])) water = 'above-head';
  else if (has(t, ['chest', 'chhati', 'chati', 'chhaati', 'seene', 'seena', 'छाती', 'सीने'])) water = 'chest';
  else if (has(t, ['kamar', 'waist', 'कमर'])) water = 'waist';
  else if (has(t, ['ghutne', 'ghutno', 'knee', 'घुटने', 'घुटनों'])) water = 'knee';
  else if (has(t, ['takhne', 'ankle', 'टखने', 'pair tak', 'पैर'])) water = 'ankle';
  else if (has(t, ['puddle', 'thoda', 'halka', 'small', 'minor', 'थोड़ा'])) water = 'ankle';
  if (pickedDepth) water = pickedDepth === 'head' ? 'above-head' : pickedDepth;

  const casualties = has(t, ['stuck', 'phase', 'phas', 'फँसे', 'फंसे', 'trapped', 'roof', 'chhat', 'छत', 'missing', 'laapata', 'लापता', 'injured', 'ghayal', 'घायल']);
  let severity = { 'above-head': 'DANGER', chest: 'DANGER', waist: 'HIGH', knee: 'HIGH', ankle: 'MEDIUM', unknown: 'LOW' }[water];
  if (has(t, ['puddle', 'nothing serious', 'minor', 'halka'])) severity = 'LOW';
  if (casualties && severity === 'MEDIUM') severity = 'HIGH';

  let hazardType = 'waterlogging';
  if (has(t, ['missing', 'laapata', 'लापता'])) hazardType = 'missing-person';
  else if (has(t, ['gir', 'collapse', 'building', 'deewar', 'दीवार'])) hazardType = 'building-damage';
  else if (has(t, ['gaadi', 'gaadiyan', 'vehicle', 'road block', 'road band', 'sadak band', 'सड़क बंद', 'गाड़ी', 'blocked'])) hazardType = 'road-blocked';

  const place = KNOWN_PLACES.find((p) => p.names.some((n) => t.includes(n)));
  const depthWord = { 'above-head': 'Over-head-deep', chest: 'Chest-deep', waist: 'Waist-deep', knee: 'Knee-deep', ankle: 'Ankle-deep', unknown: 'Some' }[water];
  const summary = `${depthWord} water${place ? ` near ${place.label.split(',')[0]}` : ''}${casualties ? ', people stuck' : ''}.`;

  return {
    extracted: {
      locationText: place ? place.label.split(',')[0] : '',
      severity, hazardType, waterLevelEstimate: water, casualtiesMentioned: casualties, summary,
    },
    geocoded: place ? { lat: place.lat, lng: place.lng, label: place.label } : null,
  };
}

// ---- the mock API (same shape as api/live.js) ----
export const mockApi = {
  async health() { return true; },
  async ensureRegion(lat, lng) {
    await wait(300);
    const rLat = Math.floor(Number(lat) * 10) / 10;
    const rLng = Math.floor(Number(lng) * 10) / 10;
    return { status: 'ready', cached: true, regionCode: `${rLat}_${rLng}` };
  },

  async signup({ email, name }) { await wait(300); return { token: 'demo-token', user: { id: 'demo', email, name } }; },
  async login({ email }) { await wait(300); return { token: 'demo-token', user: { id: 'demo', email, name: email.split('@')[0] } }; },
  async guest() { return { token: 'demo-token', user: { id: 'guest', email: '', name: '' } }; },

  async getFloods() {
    return { segments: [], zones: state.zones.map((z) => ({ ...z })), segmentCount: state.zones.reduce((n, z) => n + segCountFor(z.radiusM), 0) };
  },

  async getReports() { return [...state.reports].sort((a, b) => b.createdAt - a.createdAt); },

  async sendReport({ text, lat, lng, lang, depth }) {
    const t0 = Date.now();
    await wait(1400);
    const { extracted, geocoded } = mockExtract(text, depth);
    const at = geocoded || { lat, lng };
    const radiusM = SEVERITY[extracted.severity]?.radiusM ?? 0;
    const roadsFlooded = radiusM ? segCountFor(radiusM) : 0;
    if (radiusM) {
      state.zones.push({ id: uid('z'), lat: at.lat, lng: at.lng, radiusM, severity: extracted.severity, label: extracted.locationText || 'Reported area', source: 'report', ts: Date.now() });
    }
    const report = { reportId: uid('r'), createdAt: Date.now(), lat: at.lat, lng: at.lng, geocodedLabel: geocoded?.label ?? null, text, lang, extracted, roadsFlooded };
    state.reports.push(report);
    return { ok: true, reportId: report.reportId, extracted, geocoded, roadsFlooded, latencyMs: Date.now() - t0 };
  },

  async routeToCamp(from) {
    await wait(500);
    const camps = campsAvailable().sort((a, b) => haversine(from, a) - haversine(from, b));
    let first = null;
    for (const c of camps) {
      const r = routeResult(from, c);
      if (!first) first = r;
      if (r.kind === 'ok') return r;
    }
    return first && first.kind === 'shelter' ? first : { kind: 'shelter', dest: camps[0], message: 'No camp can be reached right now.' };
  },

  async routeTo(from, dest, { avoid = true } = {}) {
    await wait(300);
    if (!avoid) {
      // the usual route ignores floods: straight along the streets, east-west first
      const path = [from, { lat: from.lat, lng: dest.lng }, dest];
      return { kind: 'ok', dest, coords: path, distanceM: Math.round(pathLength(path) * 1.12), crossings: crossingsFor(path) };
    }
    return routeResult(from, dest);
  },

  async routeToSafePlace(from) {
    const places = state.safePlaces.filter((p) => !p.isFull).sort((a, b) => haversine(from, a) - haversine(from, b));
    if (!places.length) return { kind: 'shelter', dest: null, message: 'No safe place found nearby.' };
    return routeResult(from, { ...places[0], kind: 'safeplace' });
  },

  async getAlerts() { return [...state.alerts].sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))); },

  async getSensors() {
    // gentle live wobble so the numbers look alive
    state.sensors = state.sensors.map((s) => {
      // small random wobble; danger sensors hover around 160-172 cm so a long demo stays believable
      const drift = s.alert === 'DANGER' ? (s.waterLevelCm > 172 ? -1 : s.waterLevelCm < 158 ? 1 : (Math.random() - 0.4) * 1.2) : (Math.random() - 0.5) * 1.4;
      const lvl = Math.round((s.waterLevelCm + drift) * 10) / 10;
      return { ...s, waterLevelCm: lvl, alert: lvl >= 150 ? 'DANGER' : lvl >= 90 ? 'WARNING' : 'SAFE', timestamp: new Date().toISOString() };
    });
    return state.sensors.map((s) => ({ ...s }));
  },

  async geocodePin(pinCode) { await wait(250); return PIN_CODES[pinCode] || null; },
  async addFamily() { return null; },
  async removeFamily() { return null; },

  async getSafePlaces() { return state.safePlaces.map((p) => ({ ...p, kind: 'safeplace' })); },
  async addSafePlace(p) {
    await wait(400);
    const place = { nodeId: uid('safe'), isFull: false, ...p };
    state.safePlaces.push(place);
    return place;
  },
  async markFull(id) { const p = state.safePlaces.find((x) => x.nodeId === id); if (p) p.isFull = true; },

  async getHeatmap() {
    return [
      ...state.reports.map((r) => ({ lat: r.lat, lng: r.lng, severity: r.extracted.severity })),
      ...state.alerts.map((a) => ({ lat: a.lat, lng: a.lng, severity: a.severity })),
    ];
  },

  async clearFloods() { state.zones = []; state.alerts = []; },

  // demo helper: sensor-01 crosses 150 cm, the watcher would raise this alert
  async simulateSensorDanger() {
    const s = state.sensors[1];
    s.waterLevelCm = 158; s.alert = 'DANGER';
    const alert = {
      id: uid('a'), kind: 'sensor', severity: 'DANGER', sensorId: s.sensorId, lat: s.lat, lng: s.lng,
      waterLevelCm: 158, roadsFlooded: segCountFor(450), place: s.area, timestamp: new Date().toISOString(),
      message: `Water at 158cm near ${s.area}. ${segCountFor(450)} road segments closed. Move to higher ground.`,
    };
    state.alerts.push(alert);
    const z = state.zones.find((x) => x.label === 'Rajendra Nagar');
    if (z) { z.severity = 'DANGER'; z.radiusM = 450; z.source = 'sensor'; z.ts = Date.now(); }
    else state.zones.push({ id: uid('z'), lat: s.lat, lng: s.lng, radiusM: 450, severity: 'DANGER', label: s.area, source: 'sensor', ts: Date.now() });
    return alert;
  },
};

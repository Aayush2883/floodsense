import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { io } from 'socket.io-client';
import { createLiveApi, zonesFrom } from '../api/live';
import { mockApi } from '../api/mock';
import { DEMO_ME } from '../data/places';
import { haversine } from '../geo';
import { translate } from '../i18n';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);
export const useT = () => {
  const { lang } = useApp();
  return useCallback((k, v) => translate(lang, k, v), [lang]);
};

function defaultBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:4000`;
  // Expo Go on a phone: the server runs on the same computer as Metro, so reuse that address
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:4000`;
  return 'http://localhost:4000';
}

const load = async (k, fallback) => {
  try { const v = await AsyncStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
};
const save = (k, v) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});

const DEMO_FAMILY = [
  { id: 'fam_papa', name: 'Papa', relation: 'Father', pinCode: '800001', phone: '+919000000001', lat: 25.6100, lng: 85.1400, label: 'Patna GPO, Bihar' },
  { id: 'fam_didi', name: 'Didi', relation: 'Sister', pinCode: '110001', phone: '+919000000002', lat: 28.6328, lng: 77.2197, label: 'Connaught Place, New Delhi' },
  { id: 'fam_nani', name: 'Nani', relation: 'Grandmother', pinCode: '800020', phone: '+919000000003', lat: 25.5941, lng: 85.1621, label: 'Kankarbagh, Patna' },
];

export function AppProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState('en');
  const [session, setSession] = useState(null); // { token, user, guest }
  const [forceDemo, setForceDemo] = useState(false);
  const [serverUp, setServerUp] = useState(null); // null = checking
  const [baseUrl] = useState(defaultBaseUrl);
  const [me, setMe] = useState(DEMO_ME);
  const [floods, setFloods] = useState({ segments: [], zones: [], segmentCount: 0 });
  const [alerts, setAlerts] = useState([]);
  const [reports, setReports] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [safePlaces, setSafePlaces] = useState([]);
  const [family, setFamily] = useState([]);
  const [banner, setBanner] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [lastReport, setLastReport] = useState(null);

  const tokenRef = useRef(null);
  tokenRef.current = session?.token ?? null;

  const mode = forceDemo || serverUp === false ? 'demo' : serverUp ? 'live' : 'checking';
  const api = useMemo(() => (mode === 'live' ? createLiveApi(baseUrl, () => tokenRef.current) : mockApi), [mode, baseUrl]);

  // ---- boot: restore saved settings, check the server ----
  useEffect(() => {
    (async () => {
      setLangState(await load('fs_lang', 'en'));
      setSession(await load('fs_session', null));
      setForceDemo(await load('fs_demo', false));
      setFamily(await load('fs_family', DEMO_FAMILY));
      setReady(true);
      try { setServerUp(await createLiveApi(baseUrl, () => null).health()); } catch { setServerUp(false); }
    })();
  }, [baseUrl]);

  const setLang = (l) => { setLangState(l); save('fs_lang', l); };
  const setDemo = (v) => { setForceDemo(v); save('fs_demo', v); };
  const saveSession = (s) => { setSession(s); save('fs_session', s); };
  const saveFamily = (f) => { setFamily(f); save('fs_family', f); };

  // demo tokens don't work on the real server and vice versa
  const ensureAuth = useCallback(async () => {
    const isDemoToken = session?.token === 'demo-token';
    if (session?.token && (mode === 'demo') === isDemoToken) return session.token;
    const r = await api.guest();
    const s = { token: r.token, user: r.user, guest: true };
    tokenRef.current = r.token;
    saveSession(s);
    return r.token;
  }, [api, mode, session]);

  // ---- data ----
  const refresh = useCallback(async () => {
    if (mode === 'checking') return;
    const [f, a, r, s, p] = await Promise.allSettled([
      api.getFloods(), api.getAlerts(), api.getReports(), api.getSensors(), api.getSafePlaces(me),
    ]);
    const al = a.status === 'fulfilled' ? a.value : [];
    const rp = r.status === 'fulfilled' ? r.value : [];
    if (f.status === 'fulfilled') {
      const zones = mode === 'live' ? zonesFrom(al, rp) : f.value.zones;
      setFloods({ ...f.value, zones });
    }
    if (a.status === 'fulfilled') setAlerts(al);
    if (r.status === 'fulfilled') setReports(rp);
    if (s.status === 'fulfilled') setSensors(s.value);
    if (p.status === 'fulfilled') setSafePlaces(p.value);
    setUpdatedAt(Date.now());
  }, [api, mode, me]);

  useEffect(() => { refresh(); }, [refresh]);

  // sensors every 3 s, everything else every 15 s
  useEffect(() => {
    if (mode === 'checking') return undefined;
    const s = setInterval(() => api.getSensors().then(setSensors).catch(() => {}), 3000);
    const all = setInterval(refresh, 15000);
    return () => { clearInterval(s); clearInterval(all); };
  }, [api, mode, refresh]);

  // live updates from the server (same events as server/src/services/sensorWatcher.js)
  useEffect(() => {
    if (mode !== 'live') return undefined;
    const socket = io(baseUrl, { transports: ['websocket', 'polling'] });
    socket.on('graph:updated', () => refresh());
    socket.on('report:new', () => refresh());
    socket.on('alert:new', (a) => {
      refresh();
      setBanner({ severity: a.severity || 'DANGER', message: a.message, lat: a.lat, lng: a.lng, ts: Date.now() });
    });
    return () => socket.disconnect();
  }, [mode, baseUrl, refresh]);

  const simulateSensor = useCallback(async () => {
    const a = await api.simulateSensorDanger();
    await refresh();
    setBanner({ severity: 'DANGER', message: a.message, lat: a.lat, lng: a.lng, ts: Date.now() });
  }, [api, refresh]);

  // ---- derived: how close is the nearest flood to me / my family ----
  const nearestDanger = useMemo(() => {
    let best = null;
    for (const z of floods.zones) {
      if (z.severity !== 'DANGER' && z.severity !== 'HIGH') continue;
      const d = haversine(me, z) - z.radiusM;
      if (!best || d < best.distanceM) best = { zone: z, distanceM: Math.max(0, d), inside: d <= 0 };
    }
    return best;
  }, [floods.zones, me]);

  const familyStatus = useMemo(() => family.map((c) => {
    if (c.lat == null) return { ...c, status: 'UNKNOWN' };
    const hit = floods.zones.find((z) => (z.severity === 'DANGER' || z.severity === 'HIGH') && haversine(c, z) < z.radiusM + 800);
    return { ...c, status: hit ? 'DANGER' : 'SAFE', zone: hit || null };
  }).sort((a, b) => (a.status === 'DANGER' ? -1 : 0) - (b.status === 'DANGER' ? -1 : 0)), [family, floods.zones]);

  const value = {
    ready, lang, setLang, session, saveSession, ensureAuth, mode, forceDemo, setDemo, serverUp, baseUrl, api,
    me, setMe, floods, alerts, reports, sensors, safePlaces, family, saveFamily, familyStatus, nearestDanger,
    refresh, updatedAt, banner, setBanner, simulateSensor, lastReport, setLastReport,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

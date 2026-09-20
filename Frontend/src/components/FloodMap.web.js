import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { C, SEVERITY } from '../theme';
import { PATNA_CENTER } from '../data/places';

// ── Icons ─────────────────────────────────────────────────────────────────────

const tentSvg = '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 4 3 20h18z" fill="#fff"/></svg>';

const campIcon = (full, big) => L.divIcon({
  className: '',
  iconSize: big ? [30, 30] : [22, 22],
  iconAnchor: big ? [15, 15] : [11, 11],
  html: `<div style="width:100%;height:100%;border-radius:${big ? 9 : 7}px;background:${full ? C.grey : C.river};border:2px solid #fff;display:grid;place-items:center;box-shadow:0 2px 6px rgba(15,30,36,.35)">${tentSvg}</div>`,
});

const safeIcon = (full, big) => L.divIcon({
  className: '',
  iconSize: big ? [26, 26] : [18, 18],
  iconAnchor: big ? [13, 13] : [9, 9],
  html: `<div style="width:100%;height:100%;transform:rotate(45deg);border-radius:4px;background:${full ? C.grey : C.safe};border:2px solid #fff;box-shadow:0 2px 6px rgba(15,30,36,.35)"></div>`,
});

const sensorIcon = (s) => {
  const col = SEVERITY[s.alert]?.color || C.grey;
  const glow = s.alert === 'DANGER' ? `box-shadow:0 0 0 6px ${col}33;` : '';
  return L.divIcon({
    className: '',
    iconSize: [70, 22],
    iconAnchor: [8, 11],
    html: `<div style="display:flex;align-items:center;gap:3px">
      <span style="width:14px;height:14px;border-radius:50%;background:${col};border:2px solid #fff;flex-shrink:0;${glow}"></span>
      <span style="background:${col};color:#fff;font:600 10px ui-monospace,monospace;padding:2px 5px;border-radius:4px;white-space:nowrap">${Math.round(s.waterLevelCm)} cm</span>
    </div>`,
  });
};

const meIcon = () => L.divIcon({
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#2B6CD1;display:grid;place-items:center"><div style="width:13px;height:13px;border-radius:50%;background:${C.me};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div></div>`,
});

const pinIcon = () => L.divIcon({
  className: '',
  iconSize: [28, 36],
  iconAnchor: [14, 34],
  html: `<svg viewBox="0 0 24 30" width="28" height="36"><path d="M12 29s-9-9-9-16a9 9 0 0 1 18 0c0 7-9 16-9 16z" fill="${C.safe}" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="3.5" fill="#fff"/></svg>`,
});

const destIcon = () => L.divIcon({
  className: '',
  iconSize: [32, 40],
  iconAnchor: [16, 38],
  html: `<svg viewBox="0 0 24 30" width="32" height="40"><path d="M12 29s-9-9-9-16a9 9 0 0 1 18 0c0 7-9 16-9 16z" fill="${C.me}" stroke="#fff" stroke-width="2.5"/><circle cx="12" cy="12" r="3.5" fill="#fff"/></svg>`,
});

// ── Component ──────────────────────────────────────────────────────────────────

export default function FloodMap({
  style,
  center = PATNA_CENTER,
  zoom = 14,
  me,
  segments = [],
  zones = [],
  camps = [],
  safePlaces = [],
  sensors = [],
  route,
  naive,
  dest,
  heat,
  pin,
  onPress,
  fitTo,
  fitPadding = { top: 60, bottom: 60 },
  interactive = true,
  locateMeTrigger,   // increment from outside to fly map to `me`
}) {
  const hostRef   = useRef(null);
  const mapRef    = useRef(null);
  const layerRef  = useRef(null);
  const pressRef  = useRef(onPress);
  pressRef.current = onPress;

  // ── Init map ONCE ────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = L.map(hostRef.current, {
      zoomControl: false,
      attributionControl: true,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      keyboard: interactive,
    }).setView([center.lat, center.lng], zoom);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
      className: 'fs-tiles',
    }).addTo(map);

    // Soften OSM tile colours so flood markers stand out
    if (!document.getElementById('fs-tile-style')) {
      const el = document.createElement('style');
      el.id = 'fs-tile-style';
      el.textContent = '.fs-tiles { filter: saturate(.55) brightness(1.04) contrast(.92); }';
      document.head.appendChild(el);
    }

    map.attributionControl.setPrefix(false);
    layerRef.current = L.layerGroup().addTo(map);
    map.on('click', (e) => pressRef.current?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
    mapRef.current = map;

    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(hostRef.current);

    return () => { ro.disconnect(); map.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Redraw all data layers when props change (no map reload) ─────────────────
  useEffect(() => {
    const g = layerRef.current;
    if (!g) return;
    g.clearLayers();

    // Heat halos
    for (const h of heat || []) {
      const col = SEVERITY[h.severity]?.color || C.high;
      L.circle([h.lat, h.lng], { radius: 520, stroke: false, fillColor: col, fillOpacity: 0.14 }).addTo(g);
      L.circle([h.lat, h.lng], { radius: 260, stroke: false, fillColor: col, fillOpacity: 0.2 }).addTo(g);
    }

    // Flood zone halos
    for (const z of zones) {
      const col = SEVERITY[z.severity]?.color || C.danger;
      L.circle([z.lat, z.lng], { radius: z.radiusM, color: col, weight: 1.5, dashArray: '5 5', fillColor: col, fillOpacity: 0.13 }).addTo(g);
    }

    // Flooded road segments (red)
    for (const s of segments) {
      L.polyline([[s.aLat, s.aLng], [s.bLat, s.bLng]], { color: C.danger, weight: 5, opacity: 0.9, lineCap: 'round' }).addTo(g);
    }

    // Naive comparison route (grey dashed)
    if (naive?.length) {
      L.polyline(naive.map((c) => [c.lat, c.lng]), { color: '#5E6F72', weight: 4, dashArray: '7 7', opacity: 0.85 }).addTo(g);
    }

    // Safe evacuation route (green)
    if (route?.length) {
      const ll = route.map((c) => [c.lat, c.lng]);
      L.polyline(ll, { color: '#fff', weight: 10, opacity: 1, lineJoin: 'round' }).addTo(g);
      L.polyline(ll, { color: C.safe, weight: 6, opacity: 1, lineJoin: 'round', lineCap: 'round' }).addTo(g);
    }

    // Relief camps
    for (const c of camps) {
      L.marker([c.lat, c.lng], { icon: campIcon(c.isFull, false), keyboard: false })
        .bindTooltip(c.name, { direction: 'top', offset: [0, -10] }).addTo(g);
    }

    // Safe places
    for (const p of safePlaces) {
      L.marker([p.lat, p.lng], { icon: safeIcon(p.isFull, false), keyboard: false })
        .bindTooltip(p.name, { direction: 'top', offset: [0, -8] }).addTo(g);
    }

    // Sensors
    for (const s of sensors) {
      if (s.lat && s.lng) {
        L.marker([s.lat, s.lng], { icon: sensorIcon(s), keyboard: false, interactive: false }).addTo(g);
      }
    }

    // Destination marker
    if (dest) {
      L.marker([dest.lat, dest.lng], {
        icon: destIcon(),
        zIndexOffset: 500,
      }).addTo(g);
    }

    // Pin marker
    if (pin) L.marker([pin.lat, pin.lng], { icon: pinIcon(), zIndexOffset: 800 }).addTo(g);

    // "Me" location dot
    if (me) L.marker([me.lat, me.lng], { icon: meIcon(), zIndexOffset: 1000, interactive: false }).addTo(g);

  }, [segments, zones, camps, safePlaces, sensors, route, naive, dest, heat, pin, me]);

  // ── Auto-fit bounds when fitTo changes ───────────────────────────────────────
  const fitKey = fitTo ? fitTo.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(';') : '';
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitTo?.length) return;
    map.fitBounds(
      L.latLngBounds(fitTo.map((p) => [p.lat, p.lng])),
      { paddingTopLeft: [40, fitPadding.top], paddingBottomRight: [40, fitPadding.bottom], maxZoom: 16, animate: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  // ── Locate-me: fly to `me` when locateMeTrigger increments ──────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !locateMeTrigger || !me?.lat) return;
    map.flyTo([me.lat, me.lng], 15, { animate: true, duration: 1.0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locateMeTrigger]);

  return (
    <View style={[{ flex: 1, width: '100%', height: '100%', minHeight: '100vh', overflow: 'hidden', backgroundColor: '#E6EAE3' }, style]}>
      <div
        ref={hostRef}
        style={{ width: '100%', height: '100%', minHeight: '100vh', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, cursor: onPress ? 'crosshair' : 'grab' }}
      />
    </View>
  );
}

import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { C, alpha, severityColor, severitySymbol, severityText } from '../theme';
import { PATNA_CENTER } from '../data/places';

const tentSvg = `<svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 4 3 20h18z" fill="${C.white}"/></svg>`;

const campIcon = (full, big) => L.divIcon({
  className: '',
  iconSize: big ? [30, 30] : [22, 22],
  iconAnchor: big ? [15, 15] : [11, 11],
  html: `<div style="width:100%;height:100%;border-radius:${big ? 9 : 7}px;background:${full ? C.inactive : C.action};border:2px solid ${C.white};display:grid;place-items:center;box-shadow:0 2px 6px ${alpha(C.shadow, 0.35)}">${tentSvg}</div>`,
});

const safeIcon = (full, big) => L.divIcon({
  className: '',
  iconSize: big ? [26, 26] : [18, 18],
  iconAnchor: big ? [13, 13] : [9, 9],
  html: `<div style="width:100%;height:100%;transform:rotate(45deg);border-radius:4px;background:${full ? C.inactive : C.safeMarker};border:2px solid ${C.white};box-shadow:0 2px 6px ${alpha(C.shadow, 0.35)}"></div>`,
});

const sensorIcon = (s) => {
  const col = severityColor(s.alert);
  const fg = severityText(s.alert); // dark text on amber, white on red/green
  return L.divIcon({
    className: '',
    iconSize: [70, 22],
    iconAnchor: [8, 11],
    html: `<div style="display:flex;align-items:center;gap:3px">
      <span style="width:14px;height:14px;border-radius:50%;background:${col};border:2px solid ${C.white};box-shadow:0 0 0 ${s.alert === 'DANGER' ? 6 : 0}px ${alpha(col, 0.2)}"></span>
      <span style="background:${col};color:${fg};font:600 10px 'IBMPlexMono_500Medium',ui-monospace,monospace;padding:2px 5px;border-radius:4px;white-space:nowrap">${severitySymbol(s.alert)}${Math.round(s.waterLevelCm)} cm</span></div>`,
  });
};

const meIcon = L.divIcon({
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  html: `<div style="width:22px;height:22px;border-radius:50%;background:${alpha(C.location, 0.2)};display:grid;place-items:center"><div style="width:13px;height:13px;border-radius:50%;background:${C.location};border:2.5px solid ${C.white};box-shadow:0 1px 4px ${alpha(C.shadow, 0.35)}"></div></div>`,
});

const pinIcon = L.divIcon({
  className: '',
  iconSize: [28, 36],
  iconAnchor: [14, 34],
  html: `<svg viewBox="0 0 24 30" width="28" height="36"><path d="M12 29s-9-9-9-16a9 9 0 0 1 18 0c0 7-9 16-9 16z" fill="${C.safeMarker}" stroke="${C.white}" stroke-width="2"/><circle cx="12" cy="12" r="3.5" fill="${C.white}"/></svg>`,
});

export default function FloodMap({
  style, center = PATNA_CENTER, zoom = 14, me, segments = [], zones = [], camps = [], safePlaces = [],
  sensors = [], route, naive, dest, heat, pin, onPress, fitTo, fitPadding = { top: 60, bottom: 60 }, interactive = true,
}) {
  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const pressRef = useRef(onPress);
  pressRef.current = onPress;

  useEffect(() => {
    const map = L.map(hostRef.current, {
      zoomControl: false, attributionControl: true, dragging: interactive, scrollWheelZoom: interactive,
      doubleClickZoom: interactive, touchZoom: interactive, keyboard: interactive,
    }).setView([center.lat, center.lng], zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
      className: 'fs-tiles',
    }).addTo(map);
    if (!document.getElementById('fs-tile-style')) {
      const el = document.createElement('style');
      el.id = 'fs-tile-style';
      // soften the default OSM colours so flood lines and markers stand out
      el.textContent = '.fs-tiles{filter:saturate(.55) brightness(1.04) contrast(.92)}';
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

  // redraw everything on the map when data changes
  useEffect(() => {
    const g = layerRef.current;
    if (!g) return;
    g.clearLayers();

    for (const h of heat || []) {
      const col = severityColor(h.severity);
      L.circle([h.lat, h.lng], { radius: 520, stroke: false, fillColor: col, fillOpacity: 0.14 }).addTo(g);
      L.circle([h.lat, h.lng], { radius: 260, stroke: false, fillColor: col, fillOpacity: 0.2 }).addTo(g);
    }
    for (const z of zones) {
      const col = severityColor(z.severity);
      L.circle([z.lat, z.lng], { radius: z.radiusM, color: col, weight: 1.5, dashArray: '5 5', fillColor: col, fillOpacity: 0.13 }).addTo(g);
    }
    for (const sgm of segments) {
      L.polyline([[sgm.aLat, sgm.aLng], [sgm.bLat, sgm.bLng]], { color: C.danger, weight: 5, opacity: 0.9, lineCap: 'round' }).addTo(g);
    }
    if (naive?.length) {
      L.polyline(naive.map((c) => [c.lat, c.lng]), { color: C.textSecondary, weight: 4, dashArray: '7 7', opacity: 0.85 }).addTo(g);
    }
    if (route?.length) {
      const ll = route.map((c) => [c.lat, c.lng]);
      L.polyline(ll, { color: C.white, weight: 10, opacity: 1, lineJoin: 'round' }).addTo(g);
      L.polyline(ll, { color: C.safe, weight: 6, opacity: 1, lineJoin: 'round', lineCap: 'round' }).addTo(g);
    }
    for (const c of camps) {
      L.marker([c.lat, c.lng], { icon: campIcon(c.isFull, false), keyboard: false }).bindTooltip(c.name, { direction: 'top', offset: [0, -10] }).addTo(g);
    }
    for (const p of safePlaces) {
      L.marker([p.lat, p.lng], { icon: safeIcon(p.isFull, false), keyboard: false }).bindTooltip(p.name, { direction: 'top', offset: [0, -8] }).addTo(g);
    }
    for (const s of sensors) {
      if (s.lat && s.lng) L.marker([s.lat, s.lng], { icon: sensorIcon(s), keyboard: false, interactive: false }).addTo(g);
    }
    if (dest) {
      L.marker([dest.lat, dest.lng], { icon: dest.kind === 'safeplace' ? safeIcon(false, true) : campIcon(false, true), zIndexOffset: 500 }).addTo(g);
    }
    if (pin) L.marker([pin.lat, pin.lng], { icon: pinIcon, zIndexOffset: 800 }).addTo(g);
    if (me) L.marker([me.lat, me.lng], { icon: meIcon, zIndexOffset: 1000, interactive: false }).addTo(g);
  }, [segments, zones, camps, safePlaces, sensors, route, naive, dest, heat, pin, me]);

  // zoom to show a route / points
  const fitKey = fitTo ? fitTo.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(';') : '';
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !fitTo?.length) return;
    const b = L.latLngBounds(fitTo.map((p) => [p.lat, p.lng]));
    map.fitBounds(b, { paddingTopLeft: [40, fitPadding.top], paddingBottomRight: [40, fitPadding.bottom], maxZoom: 16, animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  return (
    <View style={[{ flex: 1, overflow: 'hidden', backgroundColor: C.mapBackground }, style]}>
      <div ref={hostRef} style={{ position: 'absolute', inset: 0, cursor: onPress ? 'crosshair' : 'grab' }} />
    </View>
  );
}

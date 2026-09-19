import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { C, SEVERITY } from '../theme';
import { PATNA_CENTER } from '../data/places';

export default function FloodMap({
  style,
  center = PATNA_CENTER,
  zoom = 14,
  me,
  segments = [],
  zones = [],
  route = [],
  naive,
  camps = [],
  safePlaces = [],
  sensors = [],
  dest,
  pin,
  heat,
  onPress,
  fitTo,
  locateMeTrigger,   // increment this from outside to fly the map to `me`
}) {
  const webViewRef = useRef(null);
  // Freeze the initial center on first render – panning must never reset on data changes
  const initialCenterRef = useRef(center);

  const sevColorMap = useMemo(
    () => Object.fromEntries(Object.entries(SEVERITY).map(([k, v]) => [k, v.color])),
    []
  );

  // ─── STEP 1: Build the HTML shell ONCE (initial center/zoom only) ────────────
  // This string NEVER changes after mount, so the WebView never reloads.
  const initialHtml = useMemo(() => {
    const ic = initialCenterRef.current;
    return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
      html, body, #map { margin:0; padding:0; width:100%; height:100%; background:#E6EAE3; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      var map = L.map('map', { zoomControl: false }).setView([${ic.lat}, ${ic.lng}], ${zoom});
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      var layerGroup = L.layerGroup().addTo(map);

      // Tap → postMessage bridge
      map.on('click', function(e) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ lat: e.latlng.lat, lng: e.latlng.lng }));
        }
      });

      // Called via injectJavaScript whenever props change – NO WebView reload
      window.updateMapData = function(data) {
        layerGroup.clearLayers();
        var sc = data.sevColors || {};

        // Flood halos (zones)
        for (var z of data.zones || []) {
          var zCol = sc[z.severity] || '#C62A3A';
          L.circle([z.lat, z.lng], { radius: z.radiusM, color: zCol, weight: 1.5,
            dashArray: '5 5', fillColor: zCol, fillOpacity: 0.13 }).addTo(layerGroup);
        }

        // Flooded road segments (red)
        for (var s of data.segments || []) {
          L.polyline([[s.aLat, s.aLng], [s.bLat, s.bLng]], {
            color: '#C62A3A', weight: 5, opacity: 0.9 }).addTo(layerGroup);
        }

        // Naive comparison route (grey dashed)
        if (data.naive && data.naive.length > 0) {
          L.polyline(data.naive.map(function(p){ return [p.lat, p.lng]; }), {
            color: '#5E6F72', weight: 4, dashArray: '7 7', opacity: 0.85 }).addTo(layerGroup);
        }

        // Safe route (green)
        if (data.route && data.route.length > 0) {
          var pts = data.route.map(function(p){ return [p.lat, p.lng]; });
          L.polyline(pts, { color: '#ffffff', weight: 10, opacity: 1 }).addTo(layerGroup);
          L.polyline(pts, { color: '#17824A', weight: 6, opacity: 1 }).addTo(layerGroup);
        }

        // Relief camps
        for (var c of data.camps || []) {
          L.circleMarker([c.lat, c.lng], { radius: 9, color: '#0B5C66',
            fillColor: '#0B5C66', fillOpacity: 0.9 }).addTo(layerGroup).bindPopup(c.name || 'Camp');
        }

        // Safe places (diamond)
        for (var p of data.safePlaces || []) {
          var spIcon = L.divIcon({ className: '', iconSize: [18, 18], iconAnchor: [9, 9],
            html: '<div style="width:100%;height:100%;transform:rotate(45deg);border-radius:3px;background:#17824A;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>' });
          L.marker([p.lat, p.lng], { icon: spIcon }).addTo(layerGroup).bindPopup(p.name || 'Safe Place');
        }

        // Sensors (coloured dot + cm label)
        for (var sensor of data.sensors || []) {
          if (!sensor.lat || !sensor.lng) continue;
          var sCol = sc[sensor.alert] || '#8C9A9C';
          var sIcon = L.divIcon({ className: '', iconSize: [70, 22], iconAnchor: [8, 11],
            html: '<div style="display:flex;align-items:center;gap:3px">'
              + '<span style="width:14px;height:14px;border-radius:50%;background:' + sCol + ';border:2px solid #fff;flex-shrink:0"></span>'
              + '<span style="background:' + sCol + ';color:#fff;font:600 10px monospace;padding:2px 5px;border-radius:4px;white-space:nowrap">'
              + Math.round(sensor.waterLevelCm || 0) + ' cm</span></div>' });
          L.marker([sensor.lat, sensor.lng], { icon: sIcon, interactive: false }).addTo(layerGroup);
        }

        // Destination marker
        if (data.dest && data.dest.lat) {
          L.circleMarker([data.dest.lat, data.dest.lng], { radius: 11, color: '#17824A',
            fillColor: '#17824A', fillOpacity: 1, weight: 2 })
            .addTo(layerGroup).bindPopup(data.dest.name || 'Destination');
        }

        // "Me" location dot (blue)
        if (data.me && data.me.lat) {
          var meIcon = L.divIcon({ className: '', iconSize: [22, 22], iconAnchor: [11, 11],
            html: '<div style="width:22px;height:22px;border-radius:50%;background:#2B6CD133;display:grid;place-items:center">'
              + '<div style="width:13px;height:13px;border-radius:50%;background:#2B6CD1;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>'
              + '</div>' });
          L.marker([data.me.lat, data.me.lng], { icon: meIcon, interactive: false }).addTo(layerGroup);
        }

        // fitTo – only zoom when explicitly requested (route screens)
        if (data.fitTo && data.fitTo.length > 0) {
          map.fitBounds(data.fitTo.map(function(p){ return [p.lat, p.lng]; }),
            { padding: [40, 40], maxZoom: 16, animate: true });
        } else if (data.route && data.route.length > 0 && !data._ranFit) {
          map.fitBounds(data.route.map(function(p){ return [p.lat, p.lng]; }),
            { padding: [30, 30], animate: true });
        }
      };

      // Called by the "locate me" button in React Native
      window.flyToMe = function(lat, lng) {
        map.flyTo([lat, lng], 15, { animate: true, duration: 1.0 });
      };
    </script>
  </body>
</html>`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // <-- empty deps: HTML is generated ONCE, map never reloads

  // ─── STEP 2: Push data changes via injectJavaScript (no reload) ──────────────
  useEffect(() => {
    const wv = webViewRef.current;
    if (!wv) return;
    const payload = JSON.stringify({
      segments, zones, camps, safePlaces, sensors,
      route: route || [],
      naive: naive || [],
      dest: dest || null,
      me: me || null,
      fitTo: fitTo || null,
      sevColors: sevColorMap,
    });
    wv.injectJavaScript(
      `if (window.updateMapData) { window.updateMapData(${payload}); } true;`
    );
  }, [segments, zones, camps, safePlaces, sensors, route, naive, dest, me, fitTo, sevColorMap]);

  // ─── STEP 3: Fly to "me" when locateMeTrigger increments ─────────────────────
  useEffect(() => {
    if (!locateMeTrigger || !me?.lat || !webViewRef.current) return;
    webViewRef.current.injectJavaScript(
      `if (window.flyToMe) { window.flyToMe(${me.lat}, ${me.lng}); } true;`
    );
  }, [locateMeTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={[{ flex: 1, width: '100%', height: '100%' }, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: initialHtml }}
        style={StyleSheet.absoluteFillObject}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        scrollEnabled={false}
        onMessage={
          onPress
            ? (e) => {
                try {
                  const d = JSON.parse(e.nativeEvent.data);
                  onPress(d);
                } catch {}
              }
            : undefined
        }
      />
    </View>
  );
}

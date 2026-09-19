import React, { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import MapView, { Circle, Marker, Polyline } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C, F, SEVERITY } from '../theme';
import { PATNA_CENTER } from '../data/places';

const Camp = ({ full, big }) => (
  <View style={{ width: big ? 30 : 22, height: big ? 30 : 22, borderRadius: big ? 9 : 7, backgroundColor: full ? C.grey : C.river, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
    <MaterialCommunityIcons name="tent" size={big ? 16 : 12} color="#fff" />
  </View>
);

const Safe = ({ full, big }) => (
  <View style={{ width: big ? 24 : 16, height: big ? 24 : 16, borderRadius: 4, transform: [{ rotate: '45deg' }], backgroundColor: full ? C.grey : C.safe, borderWidth: 2, borderColor: '#fff' }} />
);

const zoomToDelta = (z) => 0.03 * 2 ** (14 - z);

export default function FloodMap({
  style, center = PATNA_CENTER, zoom = 14, me, segments = [], zones = [], camps = [], safePlaces = [],
  sensors = [], route, naive, dest, heat, pin, onPress, fitTo, fitPadding = { top: 60, bottom: 60 }, interactive = true,
}) {
  const ref = useRef(null);
  const fitKey = fitTo ? fitTo.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(';') : '';

  useEffect(() => {
    if (!fitTo?.length || !ref.current) return;
    ref.current.fitToCoordinates(fitTo.map((p) => ({ latitude: p.lat, longitude: p.lng })), {
      edgePadding: { top: fitPadding.top, bottom: fitPadding.bottom, left: 40, right: 40 }, animated: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  const d = zoomToDelta(zoom);
  const ll = (p) => ({ latitude: p.lat, longitude: p.lng });

  return (
    <View style={[{ flex: 1 }, style]}>
      <MapView
        ref={ref}
        style={{ flex: 1 }}
        initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: d, longitudeDelta: d }}
        onPress={(e) => onPress?.({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude })}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
      >
        {(heat || []).map((h, i) => (
          <Circle key={`h${i}`} center={ll(h)} radius={420} strokeWidth={0} fillColor={`${SEVERITY[h.severity]?.color || C.high}33`} />
        ))}
        {zones.map((z) => (
          <Circle key={z.id} center={ll(z)} radius={z.radiusM} strokeColor={SEVERITY[z.severity]?.color || C.danger} strokeWidth={1.5} lineDashPattern={[5, 5]} fillColor={`${SEVERITY[z.severity]?.color || C.danger}22`} />
        ))}
        {segments.map((sg, i) => (
          <Polyline key={`s${i}`} coordinates={[{ latitude: sg.aLat, longitude: sg.aLng }, { latitude: sg.bLat, longitude: sg.bLng }]} strokeColor={C.danger} strokeWidth={5} />
        ))}
        {naive?.length ? <Polyline coordinates={naive.map(ll)} strokeColor="#5E6F72" strokeWidth={4} lineDashPattern={[7, 7]} /> : null}
        {route?.length ? <Polyline coordinates={route.map(ll)} strokeColor="#fff" strokeWidth={10} /> : null}
        {route?.length ? <Polyline coordinates={route.map(ll)} strokeColor={C.safe} strokeWidth={6} /> : null}
        {camps.map((c) => (
          <Marker key={c.id} coordinate={ll(c)} title={c.name} tracksViewChanges={false}><Camp full={c.isFull} /></Marker>
        ))}
        {safePlaces.map((p) => (
          <Marker key={p.nodeId} coordinate={ll(p)} title={p.name} tracksViewChanges={false}><Safe full={p.isFull} /></Marker>
        ))}
        {sensors.filter((s) => s.lat && s.lng).map((s) => (
          <Marker key={s.sensorId} coordinate={ll(s)} anchor={{ x: 0.1, y: 0.5 }} tracksViewChanges={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: SEVERITY[s.alert]?.color || C.grey, borderWidth: 2, borderColor: '#fff' }} />
              <Text style={{ backgroundColor: SEVERITY[s.alert]?.color || C.grey, color: '#fff', fontFamily: F.monoBold, fontSize: 10, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' }}>{Math.round(s.waterLevelCm)} cm</Text>
            </View>
          </Marker>
        ))}
        {dest ? <Marker coordinate={ll(dest)} tracksViewChanges={false}>{dest.kind === 'safeplace' ? <Safe big /> : <Camp big />}</Marker> : null}
        {pin ? <Marker coordinate={ll(pin)} pinColor={C.safe} /> : null}
        {me ? (
          <Marker coordinate={ll(me)} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: `${C.me}33`, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 13, height: 13, borderRadius: 7, backgroundColor: C.me, borderWidth: 2.5, borderColor: '#fff' }} />
            </View>
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
}

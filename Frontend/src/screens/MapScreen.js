import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FloodMap from '../components/FloodMap';
import { Icon, Sev } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { campsAsPlaces } from '../api/live';
import { nearLabel } from '../actions';
import { fmtDistance, timeAgo } from '../geo';
import { C, F, alpha } from '../theme';

const CAMPS = campsAsPlaces();

// map box that shows both me and the nearest flood, so the danger is never off-screen
function boxAround(me, zone) {
  const pts = [me];
  if (zone) {
    const d = zone.radiusM / 111000;
    pts.push({ lat: zone.lat - d, lng: zone.lng - d }, { lat: zone.lat + d, lng: zone.lng + d });
  } else {
    pts.push({ lat: me.lat - 0.008, lng: me.lng - 0.008 }, { lat: me.lat + 0.008, lng: me.lng + 0.008 });
  }
  return pts;
}

function LayerChip({ icon, label, on, onPress, color }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="switch" accessibilityState={{ checked: on }} style={[st.layer, !on && st.layerOff]}>
      <Icon name={on ? icon : 'eye-off-outline'} size={15} color={on ? color : C.inactive} />
      <Text style={[st.layerText, !on && { color: C.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

export default function MapScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { me, setMe, floods, sensors, safePlaces, nearestDanger, mode, updatedAt, lang } = useApp();
  const t = useT();
  const [layers, setLayers] = useState({ floods: true, camps: true, sensors: true, safe: true });
  const [fitReq, setFitReq] = useState(0);
  const [hint, setHint] = useState(false);
  const flip = (k) => setLayers((l) => ({ ...l, [k]: !l[k] }));
  const inside = nearestDanger?.inside;
  const near = nearestDanger && !inside && nearestDanger.distanceM < 5000 ? nearestDanger : null;
  const hasZones = floods.zones.length > 0;

  // fit once when floods first load, and again whenever "centre" is tapped (not on every tap on the map)
  const fitTo = useMemo(
    () => boxAround(me, nearestDanger && nearestDanger.distanceM < 5000 ? nearestDanger.zone : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fitReq, hasZones],
  );

  // in demo mode, explain once that tapping the map moves you
  useEffect(() => {
    if (mode !== 'demo') return undefined;
    setHint(true);
    const timer = setTimeout(() => setHint(false), 7000);
    return () => clearTimeout(timer);
  }, [mode]);

  const statusLine = mode === 'live'
    ? `● ${t('live')} · ${t('updated', { t: timeAgo(updatedAt, lang) })}`
    : mode === 'demo' ? `⚠ ${t('demoData')} · ${t('serverOffline')}` : '…';

  return (
    <View style={{ flex: 1 }}>
      <FloodMap
        me={me}
        center={me}
        zoom={14}
        segments={layers.floods ? floods.segments : []}
        zones={layers.floods ? floods.zones : []}
        camps={layers.camps ? CAMPS : []}
        safePlaces={layers.safe ? safePlaces : []}
        sensors={layers.sensors ? sensors : []}
        fitTo={fitTo}
        fitPadding={{ top: 170, bottom: 210 }}
        onPress={(p) => { setHint(false); setMe({ ...p, label: nearLabel(p) }); }}
      />

      <View style={[st.top, { top: insets.top + 10 }]} pointerEvents="box-none">
        <View style={st.status}>
          <View style={[st.pinDot, inside && { backgroundColor: C.dangerSoft }]}>
            <Icon name="map-marker" color={inside ? C.danger : C.location} size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.place} numberOfLines={1}>{me.label}</Text>
            <Text style={[st.mode, { color: mode === 'demo' ? C.warningText : C.textSecondary }]} numberOfLines={1}>{statusLine}</Text>
          </View>
          <Sev level={inside ? 'DANGER' : 'SAFE'} label={inside ? t('youAreInDanger') : t('youAreSafe')} style={{ alignSelf: 'center' }} />
        </View>

        {(near || inside) && (
          <Pressable style={st.banner} onPress={() => navigation.navigate('Alerts')} accessibilityRole="button">
            <Icon name="waves" color={C.textOnColor} />
            <View style={{ flex: 1 }}>
              <Text style={st.bannerTitle}>{inside ? t('insideFlood') : t('dangerAway', { d: fmtDistance(near.distanceM) })}</Text>
              <Text style={st.bannerSub} numberOfLines={1}>
                {nearestDanger.zone.label || ''} · {nearestDanger.zone.source === 'sensor' ? t('sourceSensor') : t('sourceReport')} · {timeAgo(nearestDanger.zone.ts, lang)}
              </Text>
            </View>
            <Icon name="chevron-right" color={C.textOnColor} />
          </Pressable>
        )}
      </View>

      <View style={st.bottom} pointerEvents="box-none">
        <View style={st.controlsRow} pointerEvents="box-none">
          {hint ? (
            <Pressable style={st.hint} onPress={() => setHint(false)}>
              <Icon name="gesture-tap" size={16} color={C.textOnColor} />
              <Text style={st.hintText}>{t('tapToMove')}</Text>
            </Pressable>
          ) : <View />}
          <Pressable style={st.round} onPress={() => setFitReq((n) => n + 1)} accessibilityRole="button" accessibilityLabel={t('centreMap')}>
            <Icon name="crosshairs-gps" size={22} color={C.action} />
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 14 }}>
          <LayerChip icon="waves" color={C.danger} label={t('floodsLayer')} on={layers.floods} onPress={() => flip('floods')} />
          <LayerChip icon="tent" color={C.action} label={t('reliefCamp')} on={layers.camps} onPress={() => flip('camps')} />
          <LayerChip icon="home-roof" color={C.safeMarker} label={t('safePlaces')} on={layers.safe} onPress={() => flip('safe')} />
          <LayerChip icon="gauge" color={C.textSecondary} label={t('waterSensors')} on={layers.sensors} onPress={() => flip('sensors')} />
        </ScrollView>
        <Pressable style={({ pressed }) => [st.fab, pressed && { transform: [{ scale: 0.98 }] }]} onPress={() => navigation.navigate('Route', { target: 'camp' })} accessibilityRole="button">
          <Icon name="navigation-variant" color={C.textOnColor} size={22} />
          <Text style={st.fabText}>{t('getToSafety')}</Text>
          <Text style={st.fabAlt}>{t('getToSafetyAlt')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const shadow = { shadowColor: C.shadow, shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4 };
const st = StyleSheet.create({
  top: { position: 'absolute', left: 12, right: 12, gap: 8 },
  status: { minHeight: 58, borderRadius: 16, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8, ...shadow },
  pinDot: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.locationSoft, alignItems: 'center', justifyContent: 'center' },
  place: { fontFamily: F.bodyBold, fontSize: 15.5, color: C.text },
  mode: { fontFamily: F.bodySemi, fontSize: 12 },
  banner: { backgroundColor: C.danger, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10, ...shadow, shadowColor: C.danger },
  bannerTitle: { fontFamily: F.bodyBold, fontSize: 15, color: C.textOnColor },
  bannerSub: { fontFamily: F.body, fontSize: 12.5, color: alpha(C.white, 0.9) },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 12, gap: 10 },
  controlsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 14, gap: 10 },
  round: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', ...shadow },
  hint: { flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: alpha(C.text, 0.86), borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8 },
  hintText: { fontFamily: F.bodySemi, fontSize: 12.5, color: C.textOnColor, flexShrink: 1 },
  layer: { height: 34, borderRadius: 17, paddingHorizontal: 12, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', gap: 6, ...shadow, shadowOpacity: 0.12 },
  layerOff: { backgroundColor: alpha(C.white, 0.72), shadowOpacity: 0 },
  layerText: { fontFamily: F.bodySemi, fontSize: 13, color: C.text },
  fab: { marginHorizontal: 14, height: 58, borderRadius: 17, backgroundColor: C.action, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow, shadowColor: C.action, shadowOpacity: 0.4 },
  fabText: { fontFamily: F.bodyBold, fontSize: 17, color: C.textOnColor },
  fabAlt: { fontFamily: F.body, fontSize: 13, color: alpha(C.white, 0.85) },
});

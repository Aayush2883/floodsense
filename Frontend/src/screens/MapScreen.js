import React, { useState, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import FloodMap from '../components/FloodMap';
import { Chip, Icon, Sev } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { campsAsPlaces } from '../api/live';
import { nearLabel } from '../actions';
import { fmtDistance, timeAgo } from '../geo';
import { C, F } from '../theme';

const CAMPS = campsAsPlaces();

export default function MapScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { me, setMe, floods, sensors, safePlaces, nearestDanger, mode, updatedAt, lang } = useApp();
  const t = useT();
  const [layers, setLayers] = useState({ floods: true, camps: true, sensors: true, safe: true });
  const [locateMeTrigger, setLocateMeTrigger] = useState(0);
  const [locating, setLocating] = useState(false);
  const flip = (k) => setLayers((l) => ({ ...l, [k]: !l[k] }));
  const inside = nearestDanger?.inside;
  const near = nearestDanger && !inside && nearestDanger.distanceM < 5000 ? nearestDanger : null;

  const handleLocateMe = useCallback(async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const p = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setMe({ ...p, label: nearLabel(p) });
      }
      // Either way, fly the map to current `me` position
      setLocateMeTrigger((n) => n + 1);
    } catch {}
    setLocating(false);
  }, [setMe]);

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
        onPress={(p) => setMe({ ...p, label: nearLabel(p) })}
        locateMeTrigger={locateMeTrigger}
      />

      <View style={[st.top, { top: insets.top + 10 }]} pointerEvents="box-none">
        <View style={st.search}>
          <Icon name="map-marker-outline" color={C.river} />
          <Text style={st.searchText} numberOfLines={1}>{me.label}</Text>
          <Sev level={inside ? 'DANGER' : 'SAFE'} label={inside ? t('youAreInDanger') : t('youAreSafe')} />
        </View>
        {(near || inside) && (
          <Pressable style={st.banner} onPress={() => navigation.navigate('Alerts')} accessibilityRole="button">
            <Icon name="waves" color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={st.bannerTitle}>{inside ? t('insideFlood') : t('dangerAway', { d: fmtDistance(near.distanceM) })}</Text>
              <Text style={st.bannerSub} numberOfLines={1}>{(nearestDanger.zone.label || '')}{nearestDanger.zone.source === 'sensor' ? ' · sensor' : ' · report'} · {timeAgo(nearestDanger.zone.ts, lang)}</Text>
            </View>
            <Icon name="chevron-right" color="#fff" />
          </Pressable>
        )}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Chip float label={mode === 'live' ? `🟢 Live · ${timeAgo(updatedAt, lang)}` : mode === 'demo' ? t('demoData') : '⏳'} color={mode === 'live' ? C.safe : C.warn} />
        </View>
      </View>

      {/* Locate-Me button – top right */}
      <Pressable
        style={[st.locateBtn, { top: insets.top + 10 }]}
        onPress={handleLocateMe}
        accessibilityRole="button"
        accessibilityLabel="Go to my location"
      >
        {locating
          ? <ActivityIndicator color={C.river} size="small" />
          : <Icon name="crosshairs-gps" color={C.river} size={22} />}
      </Pressable>

      <View style={st.bottom} pointerEvents="box-none">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 14 }}>
          <Chip float icon="layers-outline" label={t('floodsLayer')} on={layers.floods} onPress={() => flip('floods')} />
          <Chip float icon="tent" label={t('reliefCamp')} on={layers.camps} onPress={() => flip('camps')} />
          <Chip float icon="home-roof" label={t('safePlaces')} on={layers.safe} onPress={() => flip('safe')} />
          <Chip float icon="gauge" label={t('waterSensors')} on={layers.sensors} onPress={() => flip('sensors')} />
        </ScrollView>
        <Text style={st.hint}>{t('tapToMove')}</Text>
        <Pressable style={st.fab} onPress={() => navigation.navigate('Route', { target: 'camp' })} accessibilityRole="button">
          <Icon name="navigation-variant" color="#fff" size={22} />
          <Text style={st.fabText}>{t('getToSafety')}</Text>
          <Text style={st.fabAlt}>{t('getToSafetyAlt')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const shadow = { shadowColor: '#0F1E24', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 4 };
const st = StyleSheet.create({
  top: { position: 'absolute', left: 12, right: 68, gap: 8 },
  search: { height: 50, borderRadius: 15, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, ...shadow },
  searchText: { flex: 1, fontFamily: F.bodySemi, fontSize: 15, color: C.ink },
  banner: { backgroundColor: C.danger, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10, ...shadow, shadowColor: C.danger },
  bannerTitle: { fontFamily: F.bodyBold, fontSize: 15, color: '#fff' },
  bannerSub: { fontFamily: F.body, fontSize: 12.5, color: 'rgba(255,255,255,.9)' },
  locateBtn: { position: 'absolute', right: 12, width: 48, height: 48, borderRadius: 14, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', ...shadow },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 12, gap: 8 },
  hint: { alignSelf: 'center', fontFamily: F.bodySemi, fontSize: 11.5, color: C.muted, backgroundColor: 'rgba(255,255,255,.85)', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, overflow: 'hidden' },
  fab: { marginHorizontal: 14, height: 56, borderRadius: 16, backgroundColor: C.river, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, ...shadow, shadowColor: C.river, shadowOpacity: 0.4 },
  fabText: { fontFamily: F.bodyBold, fontSize: 17, color: '#fff' },
  fabAlt: { fontFamily: F.body, fontSize: 13, color: 'rgba(255,255,255,.85)' },
});

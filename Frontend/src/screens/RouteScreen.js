import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FloodMap from '../components/FloodMap';
import { Banner, Btn, Icon, Sev, T } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { campsAsPlaces } from '../api/live';
import { mapsLink, shareText } from '../actions';
import { countFloodedCrossings, fmtDistance, haversine, pathLength, sameRoute, walkMinutes } from '../geo';
import { C, F } from '../theme';

const CAMPS = campsAsPlaces();

export default function RouteScreen({ navigation, route: nav }) {
  const insets = useSafeAreaInsets();
  const { api, me, floods, safePlaces, ensureAuth, mode, lang } = useApp();
  const t = useT();
  const [target, setTarget] = useState(nav.params || { target: 'camp' });
  const [res, setRes] = useState(null);
  const [naive, setNaive] = useState(null);
  const [err, setErr] = useState('');
  const [walking, setWalking] = useState(false);
  const [picking, setPicking] = useState(false);

  const load = useCallback(async () => {
    setRes(null); setNaive(null); setErr(''); setWalking(false);
    try {
      await ensureAuth();
      let r;
      if (target.target === 'place') r = await api.routeTo(me, target.place);
      else if (target.target === 'safeplace') r = await api.routeToSafePlace(me);
      else r = await api.routeToCamp(me);
      if (r.kind === 'shelter') {
        navigation.replace('Shelter', { message: r.message, dest: r.dest });
        return;
      }
      setRes(r);
      try {
        const n = await api.routeTo(me, r.dest, { avoid: false });
        if (n.kind === 'ok') setNaive(n);
      } catch { /* the comparison line is optional */ }
    } catch (e) {
      setErr(e.status === 404 ? (lang === 'hi' ? 'पास में कोई सड़क या शिविर नहीं मिला।' : 'No road or camp found near you. Move closer to central Patna.') : t('errorGeneric', { e: e.message }));
    }
  }, [api, me, target, ensureAuth, navigation, t, lang]);

  useEffect(() => { load(); }, [load]);

  const distanceM = res ? (res.distanceM ?? pathLength(res.coords)) : 0;
  const safeCross = res ? (mode === 'live' ? countFloodedCrossings(res.coords, floods.segments) : 0) : 0;
  const naiveCross = naive ? (naive.crossings ?? countFloodedCrossings(naive.coords, floods.segments)) : 0;
  const showNaive = naive && !sameRoute(naive.coords, res?.coords) && naiveCross > 0;
  const fit = res ? [...res.coords, ...(showNaive ? naive.coords : [])] : [me];

  const options = useMemo(() => [
    ...CAMPS.map((c) => ({ ...c, kind: 'camp' })),
    ...safePlaces.filter((p) => !p.isFull),
  ].map((p) => ({ ...p, d: haversine(me, p) })).sort((a, b) => a.d - b.d), [safePlaces, me]);

  return (
    <View style={{ flex: 1, backgroundColor: C.ground }}>
      <FloodMap
        me={me} center={me} zoom={14}
        segments={floods.segments} zones={floods.zones}
        route={res?.coords} naive={showNaive ? naive.coords : null} dest={res?.dest}
        fitTo={fit} fitPadding={{ top: 130, bottom: 380 }}
      />

      <View style={[st.top, { top: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} style={st.back} accessibilityRole="button" accessibilityLabel="Back">
          <Icon name="chevron-left" size={28} />
        </Pressable>
        {res && (
          <View style={st.topCard}>
            <Icon name={res.dest.kind === 'safeplace' ? 'home-roof' : 'tent'} color={C.river} size={24} />
            <View style={{ flex: 1 }}>
              <T v="smallB" numberOfLines={1}>{res.dest.name}</T>
              <T v="muted">{res.dest.kind === 'safeplace' ? t('safePlace') : t('reliefCamp')}{res.dest.capacity ? ` · ${t('roomFor', { n: res.dest.capacity })}` : ''}</T>
            </View>
          </View>
        )}
      </View>

      <View style={[st.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={st.grab} />
        {!res && !err && (
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
            <ActivityIndicator color={C.river} size="large" />
            <T v="muted">{t('findingRoute')}</T>
          </View>
        )}
        {err ? <><Banner>{err}</Banner><Btn kind="outline" title="Try again" onPress={load} /></> : null}

        {res && !picking && (
          <>
            <View style={st.between}>
              <View>
                <Text style={st.big}>{fmtDistance(distanceM)}</Text>
                <T v="muted">{t('minWalk', { m: walkMinutes(distanceM) })}</T>
              </View>
              <Sev level="SAFE" label={t('dryRoute')} big />
            </View>
            <View style={{ gap: 8 }}>
              <View style={st.cmp}>
                <View style={[st.line, { backgroundColor: C.safe }]} />
                <Text style={st.cmpText}><Text style={{ fontFamily: F.bodyBold }}>{t('thisRoute')}</Text> · {t('floodedRoads', { n: safeCross })}</Text>
              </View>
              {showNaive && (
                <View style={st.cmp}>
                  <View style={st.dash}>{[0, 1, 2].map((i) => <View key={i} style={st.dashBit} />)}</View>
                  <Text style={st.cmpText}><Text style={{ fontFamily: F.bodyBold }}>{t('usualRoute')}</Text> · <Text style={{ color: C.danger, fontFamily: F.bodyBold }}>{t('floodedRoads', { n: naiveCross })}</Text></Text>
                </View>
              )}
            </View>
            {walking ? (
              <Banner kind="info">{lang === 'hi' ? `आप ${res.dest.name} की ओर जा रहे हैं। हरी लाइन पर चलें। पानी में न उतरें।` : `On your way to ${res.dest.name}. Stay on the green line. Do not walk into water.`}</Banner>
            ) : null}
            <Btn kind="safe" icon={walking ? 'check' : 'walk'} title={walking ? (lang === 'hi' ? 'मैं पहुँच गया' : "I've arrived") : t('startWalking')}
              onPress={() => (walking ? navigation.navigate('Tabs', { screen: 'Map' }) : setWalking(true))} />
            <View style={st.between}>
              <Pressable onPress={() => setPicking(true)} hitSlop={8}><Text style={st.link}>{t('otherCamps')} ({options.length})</Text></Pressable>
              <Pressable onPress={() => shareText(`FloodSense dry route to ${res.dest.name} (${fmtDistance(distanceM)}). ${mapsLink(res.dest)}`)} hitSlop={8}>
                <Text style={st.link}>{t('shareRoute')}</Text>
              </Pressable>
            </View>
          </>
        )}

        {res && picking && (
          <>
            <View style={st.between}><T v="h2">{t('otherCamps')}</T><Pressable onPress={() => setPicking(false)} hitSlop={8}><Icon name="close" /></Pressable></View>
            <ScrollView style={{ maxHeight: 260 }}>
              {options.map((p) => (
                <Pressable key={p.id || p.nodeId} style={st.opt} onPress={() => { setPicking(false); setTarget({ target: 'place', place: p }); }}>
                  <Icon name={p.kind === 'camp' ? 'tent' : 'home-roof'} color={p.kind === 'camp' ? C.river : C.safe} />
                  <View style={{ flex: 1 }}>
                    <T v="smallB">{p.name}</T>
                    <T v="muted">{p.kind === 'camp' ? t('reliefCamp') : t('sharedByPeople')} · {fmtDistance(p.d)}</T>
                  </View>
                  <Icon name="chevron-right" color={C.muted} />
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  top: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  back: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', shadowColor: '#0F1E24', shadowOpacity: 0.18, shadowRadius: 8, elevation: 4 },
  topCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, shadowColor: '#0F1E24', shadowOpacity: 0.18, shadowRadius: 8, elevation: 4 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 10, gap: 12, shadowColor: '#0F1E24', shadowOpacity: 0.16, shadowRadius: 20, elevation: 10 },
  grab: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: C.line },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  big: { fontFamily: F.displayHeavy, fontSize: 34, lineHeight: 38, color: C.ink },
  cmp: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { width: 26, height: 5, borderRadius: 3 },
  dash: { width: 26, flexDirection: 'row', gap: 3 },
  dashBit: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#5E6F72' },
  cmpText: { fontFamily: F.body, fontSize: 14, color: C.ink, flex: 1 },
  link: { fontFamily: F.bodyBold, fontSize: 14, color: C.river },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
});

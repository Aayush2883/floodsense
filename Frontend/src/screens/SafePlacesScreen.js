import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FloodMap from '../components/FloodMap';
import { Btn, Card, Header, Icon, Screen, Segmented, T } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { campsAsPlaces } from '../api/live';
import { confirm } from '../actions';
import { fmtDistance, haversine } from '../geo';
import { C, F } from '../theme';

const CAMPS = campsAsPlaces();

export default function SafePlacesScreen({ navigation }) {
  const { safePlaces, me, api, ensureAuth, refresh, floods, showToast } = useApp();
  const t = useT();
  const [view, setView] = useState('list');

  const list = useMemo(() => [
    ...safePlaces.map((p) => ({ ...p, key: p.nodeId })),
    ...CAMPS.map((c) => ({ ...c, key: c.id })),
  ].map((p) => ({ ...p, d: haversine(me, p) })).sort((a, b) => (a.isFull - b.isFull) || a.d - b.d), [safePlaces, me]);

  function markFull(p) {
    confirm(t('markFull'), p.name, async () => {
      try { await ensureAuth(); await api.markFull(p.nodeId); refresh(); showToast(t('markedFull', { n: p.name }), 'info'); }
      catch (e) { showToast(t('errorGeneric', { e: e.message }), 'error'); }
    });
  }

  return (
    <Screen>
      <Header title={t('safePlacesNear')} sub={t('safePlacesSub')} onBack={() => navigation.goBack()}
        right={<View style={{ width: 150 }}><Segmented value={view} onChange={setView} options={[{ value: 'map', label: 'Map' }, { value: 'list', label: 'List' }]} /></View>} />

      {view === 'map' && (
        <View style={st.mapBox}>
          <FloodMap me={me} center={me} zoom={13} camps={CAMPS} safePlaces={safePlaces} zones={floods.zones} segments={floods.segments} />
        </View>
      )}

      <Card>
        {list.map((p, i) => {
          const camp = p.kind === 'camp';
          return (
            <View key={p.key} style={[st.place, p.isFull && { opacity: 0.5 }, i === list.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[st.pi, { backgroundColor: p.isFull ? C.grey : camp ? C.river : C.safe }]}>
                <Icon name={camp ? 'tent' : 'home-roof'} size={18} color="#fff" />
              </View>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={[st.tag, !camp && { color: '#7A5A00' }, p.isFull && { color: C.muted }]}>{p.isFull ? t('full') : camp ? t('verifiedCamp') : t('sharedByPeople')}</Text>
                <T v="smallB">{p.name}</T>
                <T v="muted" numberOfLines={2}>{[p.notes, p.capacity ? t('roomFor', { n: p.capacity }) : null, fmtDistance(p.d)].filter(Boolean).join(' · ')}</T>
                {!camp && !p.isFull && (
                  <Pressable onPress={() => markFull(p)} hitSlop={6}><Text style={st.link}>{t('markFull')}</Text></Pressable>
                )}
              </View>
              {!p.isFull && (
                <Pressable style={st.routeBtn} onPress={() => navigation.navigate('Route', { target: 'place', place: p })} accessibilityRole="button">
                  <Text style={st.routeText}>{t('route')}</Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </Card>
      <Btn icon="plus" title={t('addSafePlace')} onPress={() => navigation.navigate('AddSafePlace')} />
    </Screen>
  );
}

const st = StyleSheet.create({
  mapBox: { height: 260, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.line },
  place: { flexDirection: 'row', gap: 11, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line, alignItems: 'flex-start' },
  pi: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tag: { fontFamily: F.bodyBold, fontSize: 10.5, letterSpacing: 0.6, textTransform: 'uppercase', color: C.river },
  link: { fontFamily: F.bodyBold, fontSize: 12.5, color: C.muted, textDecorationLine: 'underline', marginTop: 2 },
  routeBtn: { height: 34, paddingHorizontal: 14, borderRadius: 10, backgroundColor: C.river, alignItems: 'center', justifyContent: 'center' },
  routeText: { fontFamily: F.bodyBold, fontSize: 13, color: '#fff' },
});

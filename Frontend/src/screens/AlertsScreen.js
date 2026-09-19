import React, { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Card, Chip, Header, Sev, T } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { alertSpeech, speak } from '../actions';
import { haversine, fmtDistance, timeAgo } from '../geo';
import { C, F, SEVERITY, SENSOR_DANGER_CM, SENSOR_WARN_CM } from '../theme';

const SCALE_MAX = 200; // cm shown on the sensor bars

export default function AlertsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { alerts, reports, sensors, me, lang, refresh, mode } = useApp();
  const t = useT();
  const [refreshing, setRefreshing] = React.useState(false);

  const feed = useMemo(() => {
    const a = alerts.map((x) => ({ ...x, ts: Date.parse(x.timestamp), title: `${lang === 'hi' ? 'पानी' : 'Water at'} ${Math.round(x.waterLevelCm)} cm ${lang === 'hi' ? '·' : 'near'} ${x.place}`, sub: x.message?.split('. ').slice(1).join('. ') }));
    const r = reports
      .filter((x) => ['HIGH', 'DANGER', 'MEDIUM'].includes(x.extracted?.severity))
      .map((x) => ({ id: x.reportId, kind: 'report', severity: x.extracted.severity, ts: x.createdAt, lat: x.lat, lng: x.lng, place: x.extracted.locationText || x.geocodedLabel, title: x.extracted.summary || x.text, sub: `${t('fromReport')}${x.roadsFlooded ? ` · ${t('roadsClosed', { n: x.roadsFlooded })}` : ''}`, message: x.extracted.summary }));
    return [...a, ...r].sort((p, q) => q.ts - p.ts).slice(0, 30);
  }, [alerts, reports, lang, t]);

  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.ground }} contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 30, gap: 12 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={st.between}>
        <Header title={t('alerts')} sub={lang === 'hi' ? 'Alerts · लाइव' : 'चेतावनी · live'} />
        <Chip icon="circle" color={mode === 'live' ? C.safe : C.warn} label={mode === 'live' ? t('live') : t('demoData')} />
      </View>

      {feed.length === 0 && <T v="muted">{t('noAlerts')}</T>}
      {feed.map((a) => {
        const danger = a.severity === 'DANGER';
        const dist = a.lat ? haversine(me, a) : null;
        return (
          <View key={`${a.kind}_${a.id}`} style={[st.card, danger && st.cardDanger]}>
            <View style={st.between}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Sev level={a.severity} />
                <Text style={st.kind}>{a.kind === 'sensor' ? (lang === 'hi' ? 'सेंसर' : 'SENSOR') : (lang === 'hi' ? 'सूचना' : 'REPORT')}</Text>
              </View>
              <Text style={st.time}>{timeAgo(a.ts, lang)}{dist != null ? ` · ${fmtDistance(dist)}` : ''}</Text>
            </View>
            <T v="bodyB">{a.title}</T>
            {a.sub ? <T v="muted">{a.sub}</T> : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn small kind="outline" icon="volume-high" title={t('readAloud')} style={{ flex: 1 }} onPress={() => speak(alertSpeech(a, lang), lang)} />
              {danger && <Btn small kind="safe" icon="navigation-variant" title={t('getToSafety')} style={{ flex: 1 }} onPress={() => navigation.navigate('Route', { target: 'camp' })} />}
            </View>
          </View>
        );
      })}

      <View style={[st.between, { marginTop: 6 }]}>
        <T v="label">{t('waterSensors')}</T>
        <T v="muted">{t('every2s')}</T>
      </View>
      <Card>
        {sensors.map((s, i) => {
          const col = SEVERITY[s.alert]?.color || C.grey;
          return (
            <View key={s.sensorId} style={[st.sensor, i === sensors.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={st.between}>
                <T v="smallB">{s.area || s.sensorId}</T>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Text style={st.cm}>{Number(s.waterLevelCm).toFixed(0)} cm</Text>
                  <Sev level={s.alert} />
                </View>
              </View>
              <View style={st.bar}>
                <View style={[st.fill, { width: `${Math.min(100, (s.waterLevelCm / SCALE_MAX) * 100)}%`, backgroundColor: col }]} />
                <View style={[st.tick, { left: `${(SENSOR_WARN_CM / SCALE_MAX) * 100}%` }]} />
                <View style={[st.tick, { left: `${(SENSOR_DANGER_CM / SCALE_MAX) * 100}%` }]} />
              </View>
            </View>
          );
        })}
        {sensors.length === 0 && <View style={st.sensor}><T v="muted">No sensor data yet.</T></View>}
      </Card>
      <T v="muted" style={{ fontSize: 12 }}>{lang === 'hi' ? 'निशान: 90 cm सावधान · 150 cm खतरा' : 'Marks: 90 cm warning · 150 cm danger'}</T>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  card: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 12, gap: 7 },
  cardDanger: { borderColor: '#EDB3BA', borderLeftWidth: 4, borderLeftColor: C.danger },
  kind: { fontFamily: F.bodyBold, fontSize: 10.5, letterSpacing: 0.8, color: C.muted },
  time: { fontFamily: F.mono, fontSize: 11.5, color: C.muted },
  sensor: { paddingVertical: 11, gap: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  cm: { fontFamily: F.monoBold, fontSize: 14, color: C.ink },
  bar: { height: 9, borderRadius: 5, backgroundColor: C.fill, overflow: 'visible' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 5 },
  tick: { position: 'absolute', top: -3, bottom: -3, width: 2, backgroundColor: '#8C9A9C' },
});

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FloodMap from '../components/FloodMap';
import { Banner, Btn, Card, Chip, Header, Row, Screen, Sev, T } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { confirm, notify } from '../actions';
import { timeAgo } from '../geo';
import { C, F } from '../theme';

export default function VolunteerScreen({ navigation }) {
  const { api, floods, reports, sensors, refresh, ensureAuth, simulateSensor, mode, lang } = useApp();
  const t = useT();
  const [heat, setHeat] = useState([]);
  const [busy, setBusy] = useState(null);

  useEffect(() => { api.getHeatmap().then(setHeat).catch(() => setHeat([])); }, [api, reports]);

  const hourAgo = Date.now() - 3600e3;
  const recent = reports.filter((r) => r.createdAt > hourAgo).length;
  const danger = sensors.filter((s) => s.alert === 'DANGER').length;
  const zones = [...floods.zones].sort((a, b) => b.ts - a.ts);

  function reopen() {
    confirm(t('reopenRoads'), lang === 'hi' ? 'सभी बंद सड़कें फिर से खुल जाएँगी।' : 'All closed roads will be opened again.', async () => {
      setBusy('clear');
      try { await ensureAuth(); await api.clearFloods(); await refresh(); } catch (e) { notify('Error', e.message); } finally { setBusy(null); }
    });
  }

  async function simulate() {
    setBusy('sim');
    try { await simulateSensor(); } catch (e) { notify(t('simulateSensor'), e.message); } finally { setBusy(null); }
  }

  return (
    <Screen>
      <Header title={t('volunteer')} sub={t('volunteerSub')} onBack={() => navigation.goBack()} right={<Chip icon="shield-account" label="Admin" style={{ backgroundColor: C.ink }} color="#fff" />} />
      <View style={st.stats}>
        <View style={st.stat}><Text style={[st.num, { color: C.danger }]}>{floods.segmentCount}</Text><T v="muted">{t('floodedSegments')}</T></View>
        <View style={st.stat}><Text style={st.num}>{recent}</Text><T v="muted">{t('reportsCount')} · 1 h</T></View>
        <View style={st.stat}><Text style={st.num}>{danger}</Text><T v="muted">{t('sensorsDanger')}</T></View>
      </View>
      <View style={st.map}>
        <FloodMap zoom={13} heat={heat} zones={floods.zones} segments={floods.segments} sensors={sensors} />
      </View>
      <T v="label">{t('floodedRoadsList')}</T>
      <Card>
        {zones.length === 0 && <Row last><T v="muted">{lang === 'hi' ? 'कोई सड़क बंद नहीं है।' : 'No roads are closed.'}</T></Row>}
        {zones.map((z, i) => (
          <Row key={z.id} last={i === zones.length - 1}>
            <View style={{ flex: 1 }}>
              <T v="smallB">{z.label || 'Flooded area'}</T>
              <T v="muted">{z.source === 'sensor' ? 'Sensor' : 'Citizen report'} · {Math.round(z.radiusM)} m · {timeAgo(z.ts, lang)}</T>
            </View>
            <Sev level={z.severity} />
          </Row>
        ))}
      </Card>
      {mode === 'live' && floods.segments.length > 0 && <Banner kind="info">{floods.segments.length} {t('floodedSegments')} in Neo4j</Banner>}
      <Btn kind="outline" icon="road-variant" title={t('reopenRoads')} onPress={reopen} loading={busy === 'clear'} />
      <Btn kind="danger" icon="waves-arrow-up" title={t('simulateSensor')} onPress={simulate} loading={busy === 'sim'} />
    </Screen>
  );
}

const st = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 10 },
  num: { fontFamily: F.displayHeavy, fontSize: 30, lineHeight: 34, color: C.ink },
  map: { height: 210, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.line },
});

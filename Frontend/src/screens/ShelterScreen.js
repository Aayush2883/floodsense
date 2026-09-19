import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Btn, Header, Icon, Screen, T } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { callNumber, mapsLink, shareText } from '../actions';
import { C, F } from '../theme';

export default function ShelterScreen({ navigation, route }) {
  const { api, me, ensureAuth, refresh, lang } = useApp();
  const t = useT();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function imStuck() {
    setBusy(true);
    try {
      await ensureAuth();
      await api.sendReport({
        text: `I am stuck here and need rescue. Water is chest deep around me, people trapped. Location: ${me.label}`,
        lang: 'en-IN', lat: me.lat, lng: me.lng, depth: 'chest',
      });
      setSent(true);
      refresh();
    } catch { setSent(false); } finally { setBusy(false); }
  }

  return (
    <Screen bg={C.dangerDeep} contentStyle={{ gap: 14 }}>
      <Header light title={t('noRouteTitle')} sub={t('noRouteAlt')} onBack={() => navigation.goBack()} />
      <View style={st.icon}><Icon name="home-roof" size={34} color="#fff" /></View>
      <Text style={st.body}>{t('noRouteBody')}</Text>
      {route.params?.message ? <Text style={st.small}>{route.params.message}</Text> : null}
      <View style={st.checks}>
        {['tipHigh', 'tipBattery', 'tipSignal'].map((k) => (
          <View key={k} style={st.check}><Icon name="check" size={18} color="#fff" /><Text style={st.checkText}>{t(k)}</Text></View>
        ))}
      </View>
      <Btn kind="white" icon="phone" title={t('call112')} onPress={() => callNumber('112')} />
      <Btn kind="ghost" icon={sent ? 'check-circle' : 'hand-back-right'} title={sent ? t('stuckSent') : t('imStuck')} onPress={imStuck} loading={busy} disabled={sent} />
      <Btn kind="ghost" icon="share-variant" title={t('sendLocation')} onPress={() => shareText(`${lang === 'hi' ? 'मैं यहाँ फँसा हूँ' : 'I am stuck here'}: ${me.label} ${mapsLink(me)}`)} />
      <T v="muted" style={{ color: 'rgba(255,255,255,.75)', textAlign: 'center' }}>{t('willAlert')}</T>
    </Screen>
  );
}

const st = StyleSheet.create({
  icon: { width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  body: { fontFamily: F.bodyMedium, fontSize: 17, lineHeight: 24, color: '#fff' },
  small: { fontFamily: F.body, fontSize: 13, color: 'rgba(255,255,255,.75)' },
  checks: { backgroundColor: 'rgba(0,0,0,.18)', borderRadius: 14, padding: 14, gap: 10 },
  check: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  checkText: { flex: 1, fontFamily: F.bodyMedium, fontSize: 15, color: '#fff' },
});

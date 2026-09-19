import React, { useState } from 'react';
import { View } from 'react-native';
import * as Location from 'expo-location';
import { Avatar, Btn, Card, Header, Icon, Row, Screen, T, Toggle } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { DEMO_ME } from '../data/places';
import { nearLabel, notify } from '../actions';
import { C } from '../theme';

function SettingRow({ icon, title, sub, right, last, onPress }) {
  return (
    <Row last={last} onPress={onPress}>
      <Icon name={icon} color={C.river} size={22} />
      <View style={{ flex: 1 }}>
        <T v="bodyB">{title}</T>
        {sub ? <T v="muted">{sub}</T> : null}
      </View>
      {right}
    </Row>
  );
}

export default function ProfileScreen({ navigation }) {
  const { session, saveSession, lang, setLang, me, setMe, forceDemo, setDemo, mode, baseUrl, serverUp, reports, showToast } = useApp();
  const t = useT();
  const [alertsOn, setAlertsOn] = useState(true);
  const user = session?.user || {};
  const display = session?.guest ? t('guest') : user.name || user.email || t('guest');

  async function useGps() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const p = await Location.getCurrentPositionAsync({});
      const pt = { lat: p.coords.latitude, lng: p.coords.longitude };
      setMe({ ...pt, label: nearLabel(pt) });
      notify('GPS', lang === 'hi' ? 'आपकी असली लोकेशन सेट हो गई। सड़क का नक्शा अभी सिर्फ़ पटना के लिए है।' : 'Using your real location. The road map covers central Patna only.');
    } catch (e) { notify('GPS', e.message); }
  }

  return (
    <Screen>
      <Header title={t('profile')} onBack={() => navigation.goBack()} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar text={display.slice(0, 2).toUpperCase()} size={52} />
        <View style={{ flex: 1 }}>
          <T v="h2">{display}</T>
          <T v="muted">{user.email || (lang === 'hi' ? 'बिना खाते के' : 'No account')}</T>
        </View>
      </View>
      <Card>
        <SettingRow icon="home-outline" title={t('home')} sub={me.label} right={<T v="link" onPress={useGps}>GPS</T>} />
        <SettingRow icon="crosshairs-gps" title="Reset to demo location" sub={DEMO_ME.label} onPress={() => { setMe(DEMO_ME); showToast(DEMO_ME.label, 'info'); }} right={<Icon name="chevron-right" color={C.muted} />} />
        <SettingRow icon="translate" title={t('language')} sub={lang === 'hi' ? 'हिंदी' : 'English'} onPress={() => setLang(lang === 'hi' ? 'en' : 'hi')} right={<T v="link">{lang === 'hi' ? 'English' : 'हिंदी'}</T>} />
        <SettingRow icon="bell-outline" title={t('dangerAlerts')} sub="Push + SMS backup" right={<Toggle value={alertsOn} onChange={setAlertsOn} />} />
        <SettingRow icon="flask-outline" title={t('demoData')} sub={t('demoDataSub')} right={<Toggle value={forceDemo} onChange={(v) => { setDemo(v); showToast(v ? t('demoOn') : t('demoOff'), 'info'); }} />} />
        <SettingRow last icon="server-network" title={t('server')} sub={`${baseUrl} · ${mode === 'live' ? 'connected' : serverUp === false ? 'not reachable' : forceDemo ? 'not used' : 'checking…'}`} />
      </Card>
      <T v="muted" style={{ textAlign: 'center' }}>{lang === 'hi' ? `आपकी सूचनाएँ: ${reports.length}` : `Reports on the map: ${reports.length}`}</T>
      <Btn kind="outline" icon="logout" title={t('signOut')} onPress={() => saveSession(null)} />
    </Screen>
  );
}

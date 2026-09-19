import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Banner, Btn, Field, Icon, Screen, T } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { C, F } from '../theme';

export default function SignInScreen() {
  const { lang, setLang, api, saveSession, mode } = useApp();
  const t = useT();
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState('');

  async function run(kind) {
    setErr(''); setBusy(kind);
    try {
      let r;
      if (kind === 'guest') r = await api.guest();
      else if (creating) r = await api.signup({ email: email.trim(), password, name: name.trim() });
      else r = await api.login({ email: email.trim(), password });
      saveSession({ token: r.token, user: r.user, guest: kind === 'guest' });
    } catch (e) {
      const m = { 'invalid-credentials': 'Wrong email or password.', 'email-exists': 'This email already has an account. Sign in instead.', 'missing-fields': 'Enter your email and a password.' }[e.message];
      setErr(m || t('errorGeneric', { e: e.message }));
    } finally { setBusy(null); }
  }

  return (
    <Screen contentStyle={{ gap: 14, paddingTop: 48 }}>
      <View style={st.brand}>
        <View style={st.mark}><Icon name="waves" size={26} color="#fff" /></View>
        <View>
          <Text style={st.wm}>FloodSense</Text>
          <T v="muted">{t('tagline')}</T>
        </View>
      </View>

      <T v="label" style={{ marginTop: 10 }}>{t('chooseLang')}</T>
      <View style={st.langs}>
        {[['hi', 'हिंदी'], ['en', 'English']].map(([k, label]) => (
          <Pressable key={k} onPress={() => setLang(k)} style={[st.lang, lang === k && st.langOn]} accessibilityRole="radio" accessibilityState={{ checked: lang === k }}>
            <Text style={[st.langText, lang === k && { color: C.river }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {creating && <Field label={t('name')} value={name} onChangeText={setName} autoComplete="name" />}
      <Field label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label={t('password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" onSubmitEditing={() => run('account')} />
      {err ? <Banner>{err}</Banner> : null}
      <Btn title={creating ? t('createAccount') : t('signIn')} onPress={() => run('account')} loading={busy === 'account'} disabled={!email || !password} />
      <Btn kind="outline" title={creating ? t('haveAccount') : t('createAccount')} onPress={() => { setCreating(!creating); setErr(''); }} />

      <Pressable onPress={() => run('guest')} style={st.guest} accessibilityRole="button">
        <Icon name="map-outline" size={24} color={C.river} />
        <View style={{ flex: 1 }}>
          <T v="bodyB">{t('guestTitle')}</T>
          <T v="muted">{t('guestSub')}</T>
        </View>
        {busy === 'guest' ? <T v="muted">…</T> : <Icon name="chevron-right" size={24} color={C.river} />}
      </Pressable>
      <T v="muted" style={{ textAlign: 'center', fontSize: 12 }}>{mode === 'demo' ? 'Server offline · using demo data' : mode === 'live' ? 'Connected to FloodSense server' : 'Checking server…'}</T>
    </Screen>
  );
}

const st = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mark: { width: 52, height: 52, borderRadius: 15, backgroundColor: C.river, alignItems: 'center', justifyContent: 'center' },
  wm: { fontFamily: F.displayHeavy, fontSize: 32, lineHeight: 36, color: C.ink },
  langs: { flexDirection: 'row', gap: 8 },
  lang: { flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  langOn: { borderColor: C.river, backgroundColor: C.riverSoft },
  langText: { fontFamily: F.bodyBold, fontSize: 17, color: C.ink },
  guest: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#E8F1EF', borderColor: '#CFE2DE', borderWidth: 1, borderRadius: 16, padding: 14 },
});

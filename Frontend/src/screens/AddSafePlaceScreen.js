import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FloodMap from '../components/FloodMap';
import { Banner, Btn, Chip, Field, Header, Screen, T } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { C, F } from '../theme';

const TYPES = ['temple', 'school', 'terrace', 'building', 'other'];

export default function AddSafePlaceScreen({ navigation }) {
  const { api, me, ensureAuth, refresh, showToast } = useApp();
  const t = useT();
  const [name, setName] = useState('');
  const [type, setType] = useState('temple');
  const [capacity, setCapacity] = useState(30);
  const [contact, setContact] = useState('');
  const [notes, setNotes] = useState('');
  const [pin, setPin] = useState({ lat: me.lat, lng: me.lng });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit() {
    setBusy(true); setErr('');
    try {
      await ensureAuth();
      await api.addSafePlace({ name: name.trim(), type, capacity, contact: contact.trim(), notes: notes.trim(), lat: pin.lat, lng: pin.lng });
      await refresh();
      showToast(t('safePlaceShared'));
      navigation.goBack();
    } catch (e) {
      setErr(t('errorGeneric', { e: e.message }));
    } finally { setBusy(false); }
  }

  return (
    <Screen>
      <Header title={t('shareSafePlace')} sub={t('shareSafePlaceSub')} onBack={() => navigation.goBack()} />
      <Field label={t('placeName')} value={name} onChangeText={setName} placeholder="Krishna Temple Terrace" />
      <T v="label">{t('placeType')}</T>
      <View style={st.chips}>{TYPES.map((k) => <Chip key={k} label={t(k)} on={type === k} onPress={() => setType(k)} />)}</View>
      <View style={st.between}>
        <T v="label">{t('capacity')}</T>
        <View style={st.stepper}>
          <Pressable style={st.step} onPress={() => setCapacity((c) => Math.max(5, c - 5))} accessibilityLabel="Less"><Text style={st.stepText}>−</Text></Pressable>
          <Text style={st.stepVal}>{capacity}</Text>
          <Pressable style={st.step} onPress={() => setCapacity((c) => c + 5)} accessibilityLabel="More"><Text style={st.stepText}>+</Text></Pressable>
        </View>
      </View>
      <Field label={t('contact')} value={contact} onChangeText={setContact} keyboardType="phone-pad" />
      <T v="label">{t('pinOnMap')}</T>
      <View style={st.map}>
        <FloodMap center={pin} zoom={15} pin={pin} me={me} onPress={setPin} />
      </View>
      <Field label={t('notes')} value={notes} onChangeText={setNotes} placeholder="3rd-floor terrace, stairs from the back gate" multiline />
      {err ? <Banner>{err}</Banner> : null}
      <Btn title={t('shareSafePlace')} onPress={submit} loading={busy} disabled={!name.trim()} />
    </Screen>
  );
}

const st = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: C.line, borderRadius: 12, backgroundColor: C.surface, overflow: 'hidden' },
  step: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: F.bodyBold, fontSize: 22, color: C.action },
  stepVal: { width: 52, textAlign: 'center', fontFamily: F.monoBold, fontSize: 16, color: C.text },
  map: { height: 180, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.line },
});

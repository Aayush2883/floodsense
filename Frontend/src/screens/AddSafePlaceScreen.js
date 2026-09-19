import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import FloodMap from '../components/FloodMap';
import { Banner, Btn, Chip, Field, Header, Icon, Screen, T } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { nearLabel } from '../actions';
import { C, F } from '../theme';

const TYPES = ['temple', 'school', 'terrace', 'building', 'other'];

export default function AddSafePlaceScreen({ navigation }) {
  const { api, me, ensureAuth, refresh, lang } = useApp();
  const t = useT();
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [type, setType] = useState('building');
  const [capacity, setCapacity] = useState(30);
  const [contact, setContact] = useState('');
  const [notes, setNotes] = useState('');
  const [pin, setPin] = useState({ lat: me.lat, lng: me.lng });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [locating, setLocating] = useState(false);

  async function useCurrentGPS() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (loc?.coords) {
          const newPin = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setPin(newPin);
          if (!label) setLabel(nearLabel(newPin));
        }
      }
    } catch (e) {
      console.warn('GPS error:', e);
    } finally {
      setLocating(false);
    }
  }

  function handleMapTap(p) {
    setPin({ lat: p.lat, lng: p.lng });
    if (!label) {
      setLabel(nearLabel(p));
    }
  }

  async function submit() {
    if (!name.trim()) return;
    setBusy(true);
    setErr('');
    try {
      await ensureAuth();
      await api.addSafePlace({
        name: name.trim(),
        label: (label.trim() || nearLabel(pin)),
        address: (label.trim() || nearLabel(pin)),
        lat: Number(pin.lat),
        lng: Number(pin.lng),
        capacity: Number(capacity),
        contact: contact.trim(),
        notes: notes.trim(),
        type,
      });
      await refresh();
      navigation.goBack();
    } catch (e) {
      setErr(t('errorGeneric', { e: e.message }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen contentStyle={{ gap: 14, paddingBottom: 32 }}>
      <Header
        title={lang === 'hi' ? 'सुरक्षित स्थान जोड़ें' : 'Add Community Safe Place'}
        sub={lang === 'hi' ? 'उच्च स्थल जहाँ लोग शरण ले सकें' : 'Register a dry, elevated building for emergency shelter'}
        onBack={() => navigation.goBack()}
      />

      <Field
        label={lang === 'hi' ? 'स्थान का नाम *' : 'Place Name *'}
        value={name}
        onChangeText={setName}
        placeholder={lang === 'hi' ? 'उदा. श्रीकृष्ण मंदिर छत' : 'e.g. Community Center Terrace'}
      />

      <Field
        label={lang === 'hi' ? 'पता / लैंडमार्क' : 'Address / Landmark'}
        value={label}
        onChangeText={setLabel}
        placeholder={lang === 'hi' ? 'उदा. बोरिंग रोड चौराहा के पास' : 'e.g. Near Boring Road Crossing'}
      />

      <View style={st.row}>
        <View style={{ flex: 1 }}>
          <Field
            label="Latitude"
            value={String(pin.lat.toFixed(5))}
            onChangeText={(v) => {
              const n = parseFloat(v);
              if (!isNaN(n)) setPin((p) => ({ ...p, lat: n }));
            }}
            keyboardType="numeric"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Longitude"
            value={String(pin.lng.toFixed(5))}
            onChangeText={(v) => {
              const n = parseFloat(v);
              if (!isNaN(n)) setPin((p) => ({ ...p, lng: n }));
            }}
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={st.gpsRow}>
        <Text style={st.gpsHint}>
          {lang === 'hi' ? 'मानचित्र पर टैप करें या GPS का उपयोग करें' : 'Tap on map below to set coordinates, or use GPS'}
        </Text>
        <Pressable style={st.gpsBtn} onPress={useCurrentGPS} disabled={locating}>
          <Icon name="crosshairs-gps" size={16} color={C.river} />
          <Text style={st.gpsBtnText}>{locating ? 'Locating...' : 'Use My GPS'}</Text>
        </Pressable>
      </View>

      <View style={st.map}>
        <FloodMap center={pin} zoom={15} pin={pin} me={me} onPress={handleMapTap} />
      </View>

      <T v="label">{t('placeType')}</T>
      <View style={st.chips}>
        {TYPES.map((k) => (
          <Chip key={k} label={t(k)} on={type === k} onPress={() => setType(k)} />
        ))}
      </View>

      <View style={st.between}>
        <T v="label">{t('capacity')}</T>
        <View style={st.stepper}>
          <Pressable
            style={st.step}
            onPress={() => setCapacity((c) => Math.max(5, c - 5))}
            accessibilityLabel="Less"
          >
            <Text style={st.stepText}>-</Text>
          </Pressable>
          <Text style={st.stepVal}>{capacity}</Text>
          <Pressable
            style={st.step}
            onPress={() => setCapacity((c) => c + 5)}
            accessibilityLabel="More"
          >
            <Text style={st.stepText}>+</Text>
          </Pressable>
        </View>
      </View>

      <Field
        label={t('contact')}
        value={contact}
        onChangeText={setContact}
        placeholder="+91-9876543210"
        keyboardType="phone-pad"
      />

      <Field
        label={t('notes')}
        value={notes}
        onChangeText={setNotes}
        placeholder="3rd floor terrace, drinking water available, stairs from back"
        multiline
      />

      {err ? <Banner>{err}</Banner> : null}

      <Btn
        title={lang === 'hi' ? 'सुरक्षित स्थान जोड़ें' : 'Save Safe Place'}
        onPress={submit}
        loading={busy}
        disabled={!name.trim()}
      />
    </Screen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  gpsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  gpsHint: { flex: 1, fontFamily: F.body, fontSize: 12.5, color: C.muted },
  gpsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: C.riverSoft },
  gpsBtnText: { fontFamily: F.bodyBold, fontSize: 12, color: C.river },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: C.line, borderRadius: 12, backgroundColor: C.surface, overflow: 'hidden' },
  step: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: F.bodyBold, fontSize: 22, color: C.river },
  stepVal: { width: 52, textAlign: 'center', fontFamily: F.monoBold, fontSize: 16, color: C.ink },
  map: { height: 180, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.line },
});

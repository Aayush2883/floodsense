import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DepthFigure from '../components/DepthFigure';
import { Banner, Btn, Chip, Field, Header, Icon, Screen, Segmented, T } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { C, F } from '../theme';

const DEPTHS = [['ankle', 'ankle'], ['knee', 'knee'], ['waist', 'waist'], ['chest', 'chest'], ['head', 'above-head']];

function getRecognizer() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function ReportScreen({ navigation }) {
  const { api, me, lang, mode, ensureAuth, refresh, setLastReport, queue, queueReport, showToast } = useApp();
  const t = useT();
  const [modeTab, setModeTab] = useState('type');
  const [text, setText] = useState('');
  const [depth, setDepth] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const [listening, setListening] = useState(false);
  const [secs, setSecs] = useState(0);
  const recRef = useRef(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const Recognizer = getRecognizer();

  useEffect(() => {
    if (!listening) return undefined;
    const timer = setInterval(() => setSecs((x) => x + 1), 1000);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    loop.start();
    return () => { clearInterval(timer); loop.stop(); };
  }, [listening, pulse]);

  useEffect(() => () => recRef.current?.stop(), []);

  function toggleListen() {
    if (listening) { recRef.current?.stop(); return; }
    const rec = new Recognizer();
    rec.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    rec.interimResults = true;
    rec.continuous = true;
    const base = text ? `${text} ` : '';
    rec.onresult = (e) => {
      let s = '';
      for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
      setText(base + s);
    };
    rec.onerror = (e) => { setErr(`Microphone: ${e.error}`); setListening(false); };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setSecs(0); setErr('');
    rec.start();
    setListening(true);
  }

  async function pickPhoto(fromCamera) {
    try {
      const opts = { mediaTypes: ['images'], quality: 0.6 };
      const r = fromCamera && Platform.OS !== 'web'
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
      if (!r.canceled && r.assets?.[0]) setPhoto(r.assets[0].uri);
    } catch (e) { setErr(e.message); }
  }

  // what the server does with a report, shown while we wait: read (AI) → find the place → close roads
  useEffect(() => {
    if (!busy) { setStep(0); return undefined; }
    const a = setTimeout(() => setStep(1), 1100);
    const b = setTimeout(() => setStep(2), 2300);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [busy]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setBusy(true); setErr('');
    recRef.current?.stop();
    const depthNote = depth ? ` (water level: ${depth === 'above-head' ? 'above head' : depth})` : '';
    const payload = { text: body + depthNote, lang: lang === 'hi' ? 'hi-IN' : 'en-IN', lat: me.lat, lng: me.lng, depth };
    try {
      await ensureAuth();
      const res = await api.sendReport(payload);
      setLastReport({ ...res, text: body, at: res.geocoded || { lat: me.lat, lng: me.lng } });
      refresh();
      navigation.replace('ReportResult');
    } catch (e) {
      // no connection: keep the report on the phone and send it later
      if (mode === 'live' && (e.name === 'TypeError' || e.name === 'AbortError')) {
        queueReport(payload);
        showToast(t('queuedToast'), 'warn');
        navigation.goBack();
        return;
      }
      setErr(t('errorGeneric', { e: e.message }));
    } finally { setBusy(false); }
  }

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

  return (
    <Screen>
      <Header title={t('reportTitle')} sub={t('reportAlt')} onBack={() => navigation.goBack()} right={<Chip label={lang === 'hi' ? 'हिंदी' : 'English'} />} />
      <Segmented
        value={modeTab}
        onChange={setModeTab}
        options={[
          { value: 'type', label: t('type'), icon: 'format-text' },
          { value: 'speak', label: t('speak'), icon: 'microphone-outline' },
          { value: 'photo', label: t('photo'), icon: 'camera-outline' },
        ]}
      />

      {modeTab === 'speak' && (
        Recognizer ? (
          <View style={st.speak}>
            <Text style={st.timer}>{`0:${String(secs).padStart(2, '0')}`}</Text>
            <Pressable onPress={toggleListen} accessibilityRole="button" accessibilityLabel={listening ? 'Stop' : 'Start speaking'}>
              <Animated.View style={[st.micBtn, listening && { backgroundColor: C.danger, transform: [{ scale }] }]}>
                {listening ? <View style={st.stop} /> : <Icon name="microphone" size={38} color="#fff" />}
              </Animated.View>
            </Pressable>
            <T v="muted">{listening ? t('listening') : t('tapToSpeak')}</T>
          </View>
        ) : <Banner kind="info">{t('speakNative')}</Banner>
      )}

      {modeTab === 'photo' && (
        <View style={{ gap: 8 }}>
          {photo ? <Image source={{ uri: photo }} style={st.photo} resizeMode="cover" /> : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {Platform.OS !== 'web' && <Btn small kind="outline" icon="camera" title="Camera" onPress={() => pickPhoto(true)} style={{ flex: 1 }} />}
            <Btn small kind="outline" icon="image-outline" title={photo ? t('photoAdded') : t('addPhoto')} onPress={() => pickPhoto(false)} style={{ flex: 1 }} />
          </View>
          <T v="muted">{t('addPhotoSub')}</T>
        </View>
      )}

      <Field
        label={modeTab === 'speak' ? t('heardSoFar') : t('whatDoYouSee')}
        value={text}
        onChangeText={setText}
        placeholder={t('reportPlaceholder')}
        multiline
      />

      <View>
        <T v="label">{t('howDeep')} <Text style={{ textTransform: 'none', letterSpacing: 0 }}>· {t('optional')}</Text></T>
        <View style={st.depths}>
          {DEPTHS.map(([k, d]) => (
            <Pressable key={k} onPress={() => setDepth(depth === d ? null : d)} style={[st.dp, depth === d && st.dpOn]} accessibilityRole="radio" accessibilityState={{ checked: depth === d }}>
              <DepthFigure depth={d} width={22} />
              <Text style={[st.dpText, depth === d && { color: C.river }]}>{t(k)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={st.loc}>
        <Icon name="map-marker-outline" color={C.river} />
        <View style={{ flex: 1 }}>
          <T v="smallB">{me.label}</T>
          <T v="muted">{t('fromGps')} · {me.lat.toFixed(4)}, {me.lng.toFixed(4)}</T>
        </View>
      </View>

      {err ? <Banner>{err}</Banner> : null}
      {queue.length > 0 && !busy ? <Banner kind="warn">{t('queuedCount', { n: queue.length })}</Banner> : null}
      {busy ? (
        <View style={st.steps} accessibilityLiveRegion="polite">
          {['stepRead', 'stepPlace', 'stepRoads'].map((k, i) => (
            <View key={k} style={st.stepRow}>
              {i < step ? <Icon name="check-circle" size={20} color={C.safe} />
                : i === step ? <ActivityIndicator size="small" color={C.river} />
                  : <Icon name="circle-outline" size={20} color={C.line} />}
              <Text style={[st.stepText, i > step && { color: C.muted }]}>{t(k)}</Text>
            </View>
          ))}
        </View>
      ) : <T v="muted" style={{ textAlign: 'center', fontSize: 12 }}>{t('offlineNote')}</T>}
      <Btn title={busy ? t('sending') : t('sendReport')} icon="send" onPress={send} disabled={!text.trim() || busy} />
    </Screen>
  );
}

const st = StyleSheet.create({
  speak: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  timer: { fontFamily: F.monoBold, fontSize: 18, color: C.ink },
  micBtn: { width: 92, height: 92, borderRadius: 46, backgroundColor: C.river, alignItems: 'center', justifyContent: 'center', shadowColor: C.danger, shadowOpacity: 0.3, shadowRadius: 14, elevation: 4 },
  stop: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#fff' },
  photo: { width: '100%', height: 170, borderRadius: 14, backgroundColor: C.fill },
  depths: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dp: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 7, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', backgroundColor: C.surface },
  dpOn: { borderColor: C.river, backgroundColor: C.riverSoft },
  dpText: { fontFamily: F.bodySemi, fontSize: 12, color: C.ink },
  steps: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 12, gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 22 },
  stepText: { fontFamily: F.bodySemi, fontSize: 14, color: C.ink },
  loc: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 12 },
});

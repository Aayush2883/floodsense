import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './ui';
import { useApp, useT } from '../state/AppState';
import { alertSpeech, speak } from '../actions';
import { fmtDistance, haversine } from '../geo';
import { C, F, alpha } from '../theme';

// In-app version of the push notification: slides down when a DANGER alert arrives.
export default function AlertBanner({ onGetToSafety }) {
  const { banner, setBanner, me, lang } = useApp();
  const t = useT();
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(-220)).current;

  useEffect(() => {
    if (!banner) return undefined;
    Animated.spring(y, { toValue: 0, useNativeDriver: Platform.OS !== 'web', friction: 8 }).start();
    if (lang === 'hi' || lang === 'en') speak(alertSpeech({ ...banner, place: banner.message?.match(/near ([^.]+)\./)?.[1] }, lang), lang);
    const timer = setTimeout(() => close(), 15000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner?.ts]);

  function close() {
    Animated.timing(y, { toValue: -220, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start(() => setBanner(null));
  }

  if (!banner) return null;
  const dist = banner.lat ? fmtDistance(haversine(me, banner)) : null;
  return (
    <Animated.View style={[st.wrap, { top: insets.top + 8, transform: [{ translateY: y }] }]}>
      <View style={st.head}>
        <View style={st.appIcon}><Icon name="waves" size={12} color={C.textOnColor} /></View>
        <Text style={st.app}>FLOODSENSE</Text>
        <Text style={[st.app, { marginLeft: 'auto' }]}>{lang === 'hi' ? 'अभी' : 'now'}</Text>
        <Pressable onPress={close} hitSlop={10}><Icon name="close" size={16} color={C.textSecondary} /></Pressable>
      </View>
      <Text style={st.title}>{`${t('sevDANGER')}${dist ? ` · ${dist}` : ''}`}</Text>
      <Text style={st.msg} numberOfLines={3}>{banner.message}</Text>
      <View style={st.acts}>
        <Pressable style={[st.act, { backgroundColor: C.action }]} onPress={() => { close(); onGetToSafety(); }}>
          <Text style={[st.actText, { color: C.textOnColor }]}>{t('getToSafety')}</Text>
        </Pressable>
        <Pressable style={st.act} onPress={() => speak(alertSpeech({ ...banner }, lang), lang)}>
          <Text style={st.actText}>{t('readAloud')}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', left: 10, right: 10, zIndex: 100, backgroundColor: alpha(C.white, 0.97), borderRadius: 18, padding: 12, gap: 3, borderWidth: 1, borderColor: C.dangerBorder, shadowColor: C.shadow, shadowOpacity: 0.28, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appIcon: { width: 18, height: 18, borderRadius: 5, backgroundColor: C.action, alignItems: 'center', justifyContent: 'center' },
  app: { fontFamily: F.bodySemi, fontSize: 11, color: C.textSecondary, letterSpacing: 0.4 },
  title: { fontFamily: F.bodyBold, fontSize: 15, color: C.danger, marginTop: 2 },
  msg: { fontFamily: F.body, fontSize: 13.5, lineHeight: 19, color: C.text },
  acts: { flexDirection: 'row', gap: 8, marginTop: 6 },
  act: { flex: 1, height: 36, borderRadius: 10, backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  actText: { fontFamily: F.bodyBold, fontSize: 13, color: C.text },
});

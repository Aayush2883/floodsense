import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './ui';
import { useApp } from '../state/AppState';
import { C, F } from '../theme';

const KIND = {
  // confirmations are actions, not "safe", so they use the teal family; problems use amber
  ok: { icon: 'check-circle', color: C.toastAction },
  info: { icon: 'information', color: C.toastInfo },
  warn: { icon: 'wifi-off', color: C.toastWarning },
  error: { icon: 'alert-circle', color: C.toastWarning },
};

// Short confirmation at the bottom of the screen ("Saved", "Roads reopened", …)
export default function Toast() {
  const { toast, setToast } = useApp();
  const insets = useSafeAreaInsets();
  const a = useRef(new Animated.Value(0)).current;
  const native = Platform.OS !== 'web';

  useEffect(() => {
    if (!toast) return undefined;
    a.setValue(0);
    Animated.timing(a, { toValue: 1, duration: 180, useNativeDriver: native }).start();
    const timer = setTimeout(() => {
      Animated.timing(a, { toValue: 0, duration: 180, useNativeDriver: native }).start(() => setToast(null));
    }, toast.kind === 'warn' ? 4200 : 2600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.ts]);

  if (!toast) return null;
  const k = KIND[toast.kind] || KIND.ok;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[st.wrap, { bottom: insets.bottom + 92, opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}
    >
      <Icon name={k.icon} size={20} color={k.color} />
      <Text style={st.text}>{toast.message}</Text>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 90, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.text, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, shadowColor: C.shadow, shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  text: { flex: 1, fontFamily: F.bodySemi, fontSize: 14.5, lineHeight: 20, color: C.textOnColor },
});

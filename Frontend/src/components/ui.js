import React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C, F, SEVERITY } from '../theme';
import { useT } from '../state/AppState';

export const Icon = ({ name, size = 20, color = C.ink, style }) => (
  <MaterialCommunityIcons name={name} size={size} color={color} style={style} />
);

export function T({ v = 'body', style, children, ...rest }) {
  return <Text {...rest} style={[s[v] || s.body, style]}>{children}</Text>;
}

export function Screen({ children, scroll = true, bg = C.ground, pad = true, bottomInset = 0, contentStyle }) {
  const insets = useSafeAreaInsets();
  const inner = { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 + bottomInset, paddingHorizontal: pad ? 16 : 0, gap: 12 };
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: bg }, inner, contentStyle]}>{children}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={[inner, contentStyle]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Header({ title, sub, onBack, right, light }) {
  const col = light ? '#fff' : C.ink;
  return (
    <View style={{ gap: 6 }}>
      {(onBack || right) && (
        <View style={s.rowBetween}>
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={s.backBtn}>
              <Icon name="chevron-left" size={28} color={col} />
            </Pressable>
          ) : <View />}
          {right}
        </View>
      )}
      <T v="h1" style={light && { color: '#fff' }}>{title}</T>
      {sub ? <T v="muted" style={light && { color: 'rgba(255,255,255,.8)' }}>{sub}</T> : null}
    </View>
  );
}

const BTN = {
  primary: { bg: C.river, fg: '#fff' },
  safe: { bg: C.safe, fg: '#fff' },
  danger: { bg: C.danger, fg: '#fff' },
  outline: { bg: C.surface, fg: C.ink, border: C.line },
  white: { bg: '#fff', fg: C.danger },
  ghost: { bg: 'rgba(255,255,255,0.15)', fg: '#fff' },
};

export function Btn({ title, kind = 'primary', icon, onPress, small, disabled, loading, style }) {
  const k = BTN[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.btn, small && s.btnSm,
        { backgroundColor: k.bg, borderColor: k.border || k.bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={k.fg} /> : (
        <>
          {icon ? <Icon name={icon} size={small ? 16 : 20} color={k.fg} /> : null}
          <Text style={[s.btnText, small && { fontSize: 13 }, { color: k.fg }]} numberOfLines={1}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function Chip({ label, on, onPress, icon, float, style, color }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[s.chip, float && s.chipFloat, on && { backgroundColor: C.river }, style]}>
      {icon ? <Icon name={icon} size={14} color={on ? '#fff' : color || C.ink} /> : null}
      <Text style={[s.chipText, on && { color: '#fff' }, color && !on && { color }]}>{label}</Text>
    </Pressable>
  );
}

export function Sev({ level, label, big }) {
  const t = useT();
  const color = SEVERITY[level]?.color || C.grey;
  return (
    <View style={[s.sev, big && { height: 24, paddingHorizontal: 10 }, { backgroundColor: color }]}>
      <Text style={[s.sevText, big && { fontSize: 12 }]}>{label || t(`sev${level}`)}</Text>
    </View>
  );
}

export function Card({ children, style, danger }) {
  return <View style={[s.card, danger && { borderColor: '#EDB3BA' }, style]}>{children}</View>;
}

export function Field({ label, style, inputStyle, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <View style={[s.field, focus && s.fieldFocus, style]}>
      {label ? <T v="label">{label}</T> : null}
      <TextInput
        placeholderTextColor="#98A5A7"
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={[s.input, rest.multiline && { minHeight: 64, textAlignVertical: 'top' }, inputStyle]}
        {...rest}
      />
    </View>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <View style={s.seg}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.segItem, value === o.value && s.segOn]} accessibilityRole="tab" accessibilityState={{ selected: value === o.value }}>
          {o.icon ? <Icon name={o.icon} size={16} color={value === o.value ? C.ink : C.muted} /> : null}
          <Text style={[s.segText, value === o.value && { color: C.ink }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Toggle({ value, onChange }) {
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} style={[s.tgl, value && { backgroundColor: C.safe }]}>
      <View style={[s.tglKnob, value && { left: 19 }]} />
    </Pressable>
  );
}

export function Row({ children, style, onPress, last }) {
  const Wrap = onPress ? Pressable : View;
  return <Wrap onPress={onPress} style={[s.row, last && { borderBottomWidth: 0 }, style]}>{children}</Wrap>;
}

export function Avatar({ text, danger, size = 36 }) {
  return (
    <View style={[s.av, { width: size, height: size, borderRadius: size / 2 }, danger && { backgroundColor: '#FBE0E3' }]}>
      <Text style={[s.avText, danger && { color: C.danger }]}>{text}</Text>
    </View>
  );
}

export function Banner({ kind = 'danger', children, style }) {
  const bg = kind === 'danger' ? C.dangerSoft : kind === 'info' ? C.riverSoft : '#F6EAD1';
  const fg = kind === 'danger' ? C.dangerDeep : kind === 'info' ? C.river : '#7A5200';
  return <View style={[s.bannerBox, { backgroundColor: bg }, style]}><Text style={[s.bannerText, { color: fg }]}>{children}</Text></View>;
}

export const s = StyleSheet.create({
  h1: { fontFamily: F.display, fontSize: 26, lineHeight: 30, color: C.ink },
  h2: { fontFamily: F.display, fontSize: 20, lineHeight: 24, color: C.ink },
  big: { fontFamily: F.displayHeavy, fontSize: 34, lineHeight: 38, color: C.ink },
  body: { fontFamily: F.body, fontSize: 15, lineHeight: 21, color: C.ink },
  bodyB: { fontFamily: F.bodyBold, fontSize: 15, lineHeight: 20, color: C.ink },
  small: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.ink },
  smallB: { fontFamily: F.bodySemi, fontSize: 13, lineHeight: 18, color: C.ink },
  muted: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted },
  label: { fontFamily: F.bodyBold, fontSize: 11, letterSpacing: 0.7, textTransform: 'uppercase', color: C.muted },
  mono: { fontFamily: F.mono, fontSize: 13, color: C.ink },
  link: { fontFamily: F.bodyBold, fontSize: 13, color: C.river },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  backBtn: { width: 36, height: 36, marginLeft: -8, alignItems: 'center', justifyContent: 'center' },
  btn: { height: 52, borderRadius: 14, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 },
  btnSm: { height: 38, borderRadius: 11 },
  btnText: { fontFamily: F.bodyBold, fontSize: 16 },
  chip: { height: 30, borderRadius: 15, paddingHorizontal: 11, backgroundColor: C.fill, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  chipFloat: { backgroundColor: C.surface, shadowColor: '#0F1E24', shadowOpacity: 0.16, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  chipText: { fontFamily: F.bodySemi, fontSize: 12.5, color: C.ink },
  sev: { height: 21, borderRadius: 6, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  sevText: { fontFamily: F.bodyBold, fontSize: 10.5, letterSpacing: 0.8, color: '#fff' },
  card: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 4 },
  field: { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.line, borderRadius: 14, paddingHorizontal: 12, paddingTop: 9, paddingBottom: 6, gap: 2 },
  fieldFocus: { borderColor: C.river },
  input: { fontFamily: F.bodyMedium, fontSize: 16, color: C.ink, paddingVertical: 4, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null) },
  seg: { flexDirection: 'row', backgroundColor: C.fill, borderRadius: 13, padding: 3, gap: 2 },
  segItem: { flex: 1, height: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  segOn: { backgroundColor: C.surface, shadowColor: '#0F1E24', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontFamily: F.bodySemi, fontSize: 14, color: C.muted },
  tgl: { width: 42, height: 25, borderRadius: 13, backgroundColor: '#C9D2CF', justifyContent: 'center' },
  tglKnob: { position: 'absolute', left: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  av: { backgroundColor: '#DCE8E6', alignItems: 'center', justifyContent: 'center' },
  avText: { fontFamily: F.bodyBold, fontSize: 14, color: C.river },
  bannerBox: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  bannerText: { fontFamily: F.bodyMedium, fontSize: 13.5, lineHeight: 19 },
});

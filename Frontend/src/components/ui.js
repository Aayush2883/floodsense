import React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C, F, SEVERITY, alpha } from '../theme';
import { useT } from '../state/AppState';

export const Icon = ({ name, size = 20, color = C.text, style }) => (
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
  const col = light ? C.textOnColor : C.text;
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
      <T v="h1" style={light && { color: C.textOnColor }}>{title}</T>
      {sub ? <T v="muted" style={light && { color: alpha(C.white, 0.85) }}>{sub}</T> : null}
    </View>
  );
}

const BTN = {
  primary: { bg: C.action, fg: C.textOnColor },   // navigation / actions
  safe: { bg: C.safe, fg: C.textOnColor },       // only for confirmed-safe states
  danger: { bg: C.danger, fg: C.textOnColor },   // only for danger itself, never ordinary actions
  outline: { bg: C.surface, fg: C.text, border: C.line },
  white: { bg: C.white, fg: C.danger },          // on the red shelter screen
  ghost: { bg: alpha(C.white, 0.15), fg: C.textOnColor },
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
    <Pressable onPress={onPress} disabled={!onPress} style={[s.chip, float && s.chipFloat, on && { backgroundColor: C.action }, style]}>
      {icon ? <Icon name={icon} size={14} color={on ? C.textOnColor : color || C.text} /> : null}
      <Text style={[s.chipText, on && { color: C.textOnColor }, color && !on && { color }]}>{label}</Text>
    </Pressable>
  );
}

export function Sev({ level, label, big, style }) {
  const t = useT();
  // solid fill, never a gradient; text colour chosen per state for contrast (dark text on amber/slate)
  const sv = SEVERITY[level] || SEVERITY.UNKNOWN;
  return (
    <View style={[s.sev, big && { height: 24, paddingHorizontal: 10 }, { backgroundColor: sv.color }, style]}>
      <Text style={[s.sevText, big && { fontSize: 12 }, { color: sv.fg }]}>{label || t(`sev${level}`)}</Text>
    </View>
  );
}

export function Card({ children, style, danger }) {
  return <View style={[s.card, danger && { borderColor: C.dangerBorder }, style]}>{children}</View>;
}

export function Field({ label, style, inputStyle, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <View style={[s.field, focus && s.fieldFocus, style]}>
      {label ? <T v="label">{label}</T> : null}
      <TextInput
        placeholderTextColor={C.placeholder}
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
          {o.icon ? <Icon name={o.icon} size={16} color={value === o.value ? C.text : C.textSecondary} /> : null}
          <Text style={[s.segText, value === o.value && { color: C.text }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Toggle({ value, onChange }) {
  return (
    <Pressable onPress={() => onChange(!value)} accessibilityRole="switch" accessibilityState={{ checked: value }} style={[s.tgl, value && { backgroundColor: C.action }]}>
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
    <View style={[s.av, { width: size, height: size, borderRadius: size / 2 }, danger && { backgroundColor: C.dangerSoft }]}>
      <Text style={[s.avText, danger && { color: C.danger }]}>{text}</Text>
    </View>
  );
}

export function Banner({ kind = 'danger', children, style }) {
  // danger = red, warn = amber, info = neutral (info is not an action, so not teal)
  const bg = kind === 'danger' ? C.dangerSoft : kind === 'info' ? C.fill : C.warningSoft;
  const fg = kind === 'danger' ? C.dangerText : kind === 'info' ? C.text : C.warningText;
  return <View style={[s.bannerBox, { backgroundColor: bg }, style]}><Text style={[s.bannerText, { color: fg }]}>{children}</Text></View>;
}

export const s = StyleSheet.create({
  h1: { fontFamily: F.display, fontSize: 26, lineHeight: 30, color: C.text },
  h2: { fontFamily: F.display, fontSize: 20, lineHeight: 24, color: C.text },
  big: { fontFamily: F.displayHeavy, fontSize: 34, lineHeight: 38, color: C.text },
  body: { fontFamily: F.body, fontSize: 15, lineHeight: 21, color: C.text },
  bodyB: { fontFamily: F.bodyBold, fontSize: 15, lineHeight: 20, color: C.text },
  small: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.text },
  smallB: { fontFamily: F.bodySemi, fontSize: 13, lineHeight: 18, color: C.text },
  muted: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.textSecondary },
  label: { fontFamily: F.bodyBold, fontSize: 11, letterSpacing: 0.7, textTransform: 'uppercase', color: C.textSecondary },
  mono: { fontFamily: F.mono, fontSize: 13, color: C.text },
  link: { fontFamily: F.bodyBold, fontSize: 13, color: C.action },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  backBtn: { width: 36, height: 36, marginLeft: -8, alignItems: 'center', justifyContent: 'center' },
  btn: { height: 52, borderRadius: 14, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 },
  btnSm: { height: 38, borderRadius: 11 },
  btnText: { fontFamily: F.bodyBold, fontSize: 16 },
  chip: { height: 30, borderRadius: 15, paddingHorizontal: 11, backgroundColor: C.fill, flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  chipFloat: { backgroundColor: C.surface, shadowColor: C.shadow, shadowOpacity: 0.16, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  chipText: { fontFamily: F.bodySemi, fontSize: 12.5, color: C.text },
  sev: { height: 21, borderRadius: 6, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  sevText: { fontFamily: F.bodyBold, fontSize: 10.5, letterSpacing: 0.8, color: C.textOnColor },
  card: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 4 },
  field: { backgroundColor: C.surface, borderWidth: 1.5, borderColor: C.line, borderRadius: 14, paddingHorizontal: 12, paddingTop: 9, paddingBottom: 6, gap: 2 },
  fieldFocus: { borderColor: C.action },
  input: { fontFamily: F.bodyMedium, fontSize: 16, color: C.text, paddingVertical: 4, ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : null) },
  seg: { flexDirection: 'row', backgroundColor: C.fill, borderRadius: 13, padding: 3, gap: 2 },
  segItem: { flex: 1, height: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  segOn: { backgroundColor: C.surface, shadowColor: C.shadow, shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segText: { fontFamily: F.bodySemi, fontSize: 14, color: C.textSecondary },
  tgl: { width: 42, height: 25, borderRadius: 13, backgroundColor: C.inactive, justifyContent: 'center' },
  tglKnob: { position: 'absolute', left: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: C.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  av: { backgroundColor: C.fill, alignItems: 'center', justifyContent: 'center' },
  avText: { fontFamily: F.bodyBold, fontSize: 14, color: C.textSecondary },
  bannerBox: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  bannerText: { fontFamily: F.bodyMedium, fontSize: 13.5, lineHeight: 19 },
});

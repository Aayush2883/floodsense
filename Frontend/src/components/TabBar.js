import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './ui';
import { useApp, useT } from '../state/AppState';
import { C, F } from '../theme';

const ICONS = { Map: 'map-outline', Alerts: 'bell-outline', Family: 'account-group-outline', More: 'dots-horizontal' };
const LABELS = { Map: 'tabMap', Alerts: 'tabAlerts', Family: 'tabFamily', More: 'tabMore' };

// Five tabs with a raised Report button in the middle.
export default function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { alerts, familyStatus } = useApp();
  const badges = {
    Alerts: alerts.filter((a) => a.severity === 'DANGER').length,
    Family: familyStatus.filter((c) => c.status === 'DANGER').length,
  };
  const routes = state.routes;
  const left = routes.slice(0, 2);
  const right = routes.slice(2);

  const item = (r) => {
    const i = routes.indexOf(r);
    const on = state.index === i;
    const col = on ? C.river : C.muted;
    return (
      <Pressable key={r.key} style={st.tab} onPress={() => navigation.navigate(r.name)} accessibilityRole="tab" accessibilityState={{ selected: on }}>
        <View>
          <Icon name={ICONS[r.name]} color={col} size={24} />
          {badges[r.name] ? <View style={st.badge}><Text style={st.badgeText}>{badges[r.name]}</Text></View> : null}
        </View>
        <Text style={[st.label, { color: col }]}>{t(LABELS[r.name])}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[st.bar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {left.map(item)}
      <Pressable style={st.tab} onPress={() => navigation.navigate('Report')} accessibilityRole="button" accessibilityLabel={t('reportTitle')}>
        <View style={st.report}><Icon name="plus" color="#fff" size={28} /></View>
        <Text style={[st.label, { color: C.river }]}>{t('tabReport')}</Text>
      </Pressable>
      {right.map(item)}
    </View>
  );
}

const st = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6, paddingHorizontal: 4 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2, minHeight: 50 },
  label: { fontFamily: F.bodyBold, fontSize: 11.5 },
  report: { width: 52, height: 52, borderRadius: 17, backgroundColor: C.river, alignItems: 'center', justifyContent: 'center', marginTop: -22, borderWidth: 4, borderColor: C.surface, shadowColor: C.river, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  badge: { position: 'absolute', top: -4, right: -9, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.surface },
  badgeText: { fontFamily: F.bodyBold, fontSize: 10, color: '#fff', lineHeight: 12 },
});

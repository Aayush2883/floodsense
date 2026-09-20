import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FloodMap from '../components/FloodMap';
import DepthFigure from '../components/DepthFigure';
import { Banner, Btn, Chip, Icon, Sev, T } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { shareText, mapsLink } from '../actions';
import { C, F, SEVERITY } from '../theme';

const HAZARD = {
  en: { waterlogging: 'Waterlogging', 'road-blocked': 'Road blocked', 'building-damage': 'Building damage', 'missing-person': 'Missing person', other: 'Other' },
  hi: { waterlogging: 'जलभराव', 'road-blocked': 'सड़क बंद', 'building-damage': 'इमारत को नुकसान', 'missing-person': 'व्यक्ति लापता', other: 'अन्य' },
};
const WATER = {
  en: { ankle: 'Ankle-deep', knee: 'Knee-deep', waist: 'Waist-deep', chest: 'Chest-deep', 'above-head': 'Above head', unknown: 'Not said' },
  hi: { ankle: 'टखने तक', knee: 'घुटने तक', waist: 'कमर तक', chest: 'छाती तक', 'above-head': 'सिर से ऊपर', unknown: 'पता नहीं' },
};

export default function ReportResultScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { lastReport: r, floods, lang, me } = useApp();
  const t = useT();
  if (!r) return null;
  const x = r.extracted || {};
  const at = r.at || me;
  // show the closed area with some streets around it, not just a red circle
  const radius = Math.max(SEVERITY[x.severity]?.radiusM || 0, 400);
  const d = (radius * 1.8) / 111000;
  const fit = [{ lat: at.lat - d, lng: at.lng - d }, { lat: at.lat + d, lng: at.lng + d }];

  return (
    <View style={{ flex: 1, backgroundColor: C.ground }}>
      <FloodMap segments={floods.segments} zones={floods.zones} center={at} zoom={15} fitTo={fit} fitPadding={{ top: 60, bottom: 380 }} me={me} />
      <View style={[st.chip, { top: insets.top + 12 }]}>
        <Chip float icon="waves" color={C.danger} label={lang === 'hi' ? 'नक्शा अभी अपडेट हुआ' : 'Map updated just now'} />
      </View>
      <View style={[st.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={st.grab} />
        <View style={st.between}>
          <Sev level={x.severity || 'LOW'} big />
          <T v="muted">{t('readByAi', { s: ((r.latencyMs || 0) / 1000).toFixed(1) })}</T>
        </View>
        <T v="h2">{x.summary || r.text}</T>
        <View style={st.facts}>
          <View style={[st.fact, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
            <DepthFigure depth={x.waterLevelEstimate} width={14} />
            <View><Text style={st.fk}>{t('water')}</Text><Text style={st.fv}>{WATER[lang][x.waterLevelEstimate] || '–'}</Text></View>
          </View>
          <View style={st.fact}><Text style={st.fk}>{t('problem')}</Text><Text style={st.fv}>{HAZARD[lang][x.hazardType] || '–'}</Text></View>
          <View style={st.fact}><Text style={st.fk}>{t('peopleStuck')}</Text><Text style={st.fv}>{x.casualtiesMentioned ? t('yes') : t('no')}</Text></View>
          <View style={st.fact}><Text style={st.fk}>{t('placeFound')}</Text><Text style={st.fv} numberOfLines={2}>{r.geocoded?.label || x.locationText || me.label}</Text></View>
        </View>
        {r.roadsFlooded > 0 ? (
          <Banner><Text style={{ fontFamily: F.bodyBold }}>{t('roadsClosed', { n: r.roadsFlooded })}</Text>{' · '}{t('roadsClosedSub')}</Banner>
        ) : <Banner kind="info">{t('noRoadsClosed')}</Banner>}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Btn kind="outline" icon="account-group-outline" title={t('warnFamily')} style={{ flex: 1 }}
            onPress={() => shareText(`⚠️ FloodSense: ${x.summary} ${mapsLink(at)}`)} />
          <Btn title={t('done')} style={{ flex: 1 }} onPress={() => navigation.navigate('Tabs', { screen: 'Map' })} />
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  chip: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 10, gap: 11, shadowColor: C.shadow, shadowOpacity: 0.16, shadowRadius: 20, elevation: 10 },
  grab: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: C.line },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderColor: C.line, borderRadius: 12, overflow: 'hidden' },
  fact: { width: '50%', paddingHorizontal: 10, paddingVertical: 8, borderColor: C.line, borderRightWidth: 0.5, borderBottomWidth: 0.5 },
  fk: { fontFamily: F.bodyBold, fontSize: 10.5, letterSpacing: 0.6, textTransform: 'uppercase', color: C.textSecondary },
  fv: { fontFamily: F.bodySemi, fontSize: 14, color: C.text },
});

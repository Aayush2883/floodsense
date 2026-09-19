import React from 'react';
import { View } from 'react-native';
import { Card, Header, Icon, Row, Screen, T } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { C } from '../theme';

export default function MoreScreen({ navigation }) {
  const { safePlaces, floods } = useApp();
  const t = useT();
  const items = [
    { icon: 'home-roof', title: t('safePlaces'), sub: `${safePlaces.filter((p) => !p.isFull).length} · ${t('safePlacesSub')}`, go: 'SafePlaces' },
    { icon: 'shield-account-outline', title: t('volunteer'), sub: `${floods.segmentCount} ${t('floodedSegments')}`, go: 'Volunteer' },
    { icon: 'account-cog-outline', title: t('profile'), sub: `${t('language')} · ${t('dangerAlerts')} · ${t('demoData')}`, go: 'Profile' },
  ];
  return (
    <Screen>
      <Header title={t('more')} />
      <Card>
        {items.map((it, i) => (
          <Row key={it.go} onPress={() => navigation.navigate(it.go)} last={i === items.length - 1}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.actionSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={it.icon} color={C.action} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <T v="bodyB">{it.title}</T>
              <T v="muted" numberOfLines={1}>{it.sub}</T>
            </View>
            <Icon name="chevron-right" color={C.textSecondary} />
          </Row>
        ))}
      </Card>
    </Screen>
  );
}

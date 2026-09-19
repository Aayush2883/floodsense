import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Btn, Card, Header, Icon, Row, Screen, T } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { confirm, notify } from '../actions';
import { C, F } from '../theme';

export default function MoreScreen({ navigation }) {
  const { safePlaces, floods, mode, api, refresh, lang } = useApp();
  const t = useT();
  const [clearing, setClearing] = useState(false);

  const items = [
    {
      icon: 'home-roof',
      title: t('safePlaces'),
      sub: `${safePlaces.filter((p) => !p.isFull).length} • ${t('safePlacesSub')}`,
      go: 'SafePlaces',
    },
    {
      icon: 'plus-circle-outline',
      title: lang === 'hi' ? 'सुरक्षित स्थान जोड़ें' : 'Add Community Safe Place',
      sub: lang === 'hi' ? 'नए आश्रय स्थल पंजीकृत करें' : 'Register a new emergency shelter',
      go: 'AddSafePlace',
    },
    {
      icon: 'shield-account-outline',
      title: t('volunteer'),
      sub: `${floods.segmentCount} ${t('floodedSegments')}`,
      go: 'Volunteer',
    },
    {
      icon: 'account-cog-outline',
      title: t('profile'),
      sub: `${t('language')} • ${t('dangerAlerts')} • ${t('demoData')}`,
      go: 'Profile',
    },
  ];

  function handleClearFloods() {
    confirm(
      lang === 'hi' ? 'सभी जलमग्न सड़कें साफ़ करें?' : 'Clear All Flood Roads?',
      lang === 'hi'
        ? 'क्या आप लाइव ग्राफ़ से सभी बाढ़ अवरोधों को हटाना चाहते हैं?'
        : 'Are you sure you want to mark all flooded roads as dry and open in the graph?',
      async () => {
        setClearing(true);
        try {
          await api.clearFloods();
          await refresh();
          notify(
            lang === 'hi' ? 'सफलता' : 'Success',
            lang === 'hi' ? 'सभी बाढ़ अवरोध हटा दिए गए हैं।' : 'All flooded roads have been cleared from the live graph.'
          );
        } catch (err) {
          notify('Error', err.message);
        } finally {
          setClearing(false);
        }
      }
    );
  }

  return (
    <Screen contentStyle={{ gap: 16 }}>
      <Header title={t('more')} />
      <Card>
        {items.map((it, i) => (
          <Row key={it.go} onPress={() => navigation.navigate(it.go)} last={i === items.length - 1}>
            <View style={st.iconBox}>
              <Icon name={it.icon} color={C.river} size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <T v="bodyB">{it.title}</T>
              <T v="muted" numberOfLines={1}>{it.sub}</T>
            </View>
            <Icon name="chevron-right" color={C.muted} />
          </Row>
        ))}
      </Card>

      {/* Admin Tools - visible only in Live mode */}
      {mode === 'live' && (
        <View style={st.adminSection}>
          <T v="label" style={{ color: C.ink }}>
            {lang === 'hi' ? 'व्यवस्थापक उपकरण (Admin Tools)' : 'Admin Tools'}
          </T>
          <Card>
            <View style={st.adminContent}>
              <View style={st.adminText}>
                <T v="bodyB">
                  {lang === 'hi' ? 'सभी बाढ़ अवरोध साफ़ करें' : 'Clear All Flood Roads'}
                </T>
                <T v="muted">
                  {lang === 'hi'
                    ? `वर्तमान में बंद सड़कें: ${floods.segmentCount || 0}`
                    : `Currently flooded road segments in graph: ${floods.segmentCount || 0}`}
                </T>
              </View>
              <Btn
                kind="danger"
                icon="delete-sweep"
                title={lang === 'hi' ? 'बाढ़ साफ़ करें' : 'Clear All Floods'}
                onPress={handleClearFloods}
                loading={clearing}
              />
            </View>
          </Card>
        </View>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.riverSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminSection: {
    gap: 8,
    marginTop: 8,
  },
  adminContent: {
    padding: 16,
    gap: 14,
  },
  adminText: {
    gap: 4,
  },
});

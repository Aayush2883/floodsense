import React, { useState } from 'react';
import { Alert, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Btn, Header, Icon, Screen, T } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { callNumber } from '../actions';
import { C, F } from '../theme';

export default function ShelterScreen({ navigation, route }) {
  const { api, me, family, ensureAuth, refresh, lang } = useApp();
  const t = useT();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const helpMessage = `I need help. My location: https://maps.google.com/?q=${me.lat.toFixed(5)},${me.lng.toFixed(5)} — sent via FloodSense`;

  async function imStuck() {
    setBusy(true);
    try {
      await ensureAuth();
      await api.sendReport({
        text: `I am stuck here and need rescue. Water is chest deep around me, people trapped. Location: ${me.label || 'My location'}`,
        lang: 'en-IN',
        lat: me.lat,
        lng: me.lng,
        depth: 'chest',
      });
      setSent(true);
      refresh();
    } catch {
      setSent(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    try {
      if (Platform.OS === 'web') {
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({ text: helpMessage });
          return;
        }
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(helpMessage);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
          return;
        }
        window.alert('Message copied to clipboard:\n\n' + helpMessage);
        return;
      }
      await Share.share({ message: helpMessage });
    } catch (e) {
      console.warn('Share error:', e);
    }
  }

  function handleSendSMS(phone) {
    if (!phone) return;
    const url = `sms:${phone}?body=${encodeURIComponent(helpMessage)}`;
    Linking.openURL(url).catch((err) => {
      console.warn('Could not open SMS URL:', err);
      Alert.alert('SMS', `Send to ${phone}: ${helpMessage}`);
    });
  }

  return (
    <Screen bg={C.dangerDeep} contentStyle={{ gap: 14, paddingBottom: 32 }}>
      <Header light title={t('noRouteTitle')} sub={t('noRouteAlt')} onBack={() => navigation.goBack()} />
      <View style={st.icon}>
        <Icon name="home-roof" size={34} color="#fff" />
      </View>
      <Text style={st.body}>{t('noRouteBody')}</Text>
      {route.params?.message ? <Text style={st.small}>{route.params.message}</Text> : null}

      <View style={st.checks}>
        {['tipHigh', 'tipBattery', 'tipSignal'].map((k) => (
          <View key={k} style={st.check}>
            <Icon name="check" size={18} color="#fff" />
            <Text style={st.checkText}>{t(k)}</Text>
          </View>
        ))}
      </View>

      <Btn kind="white" icon="phone" title={t('call112')} onPress={() => callNumber('112')} />

      <Btn
        kind="ghost"
        icon={sent ? 'check-circle' : 'hand-back-right'}
        title={sent ? t('stuckSent') : t('imStuck')}
        onPress={imStuck}
        loading={busy}
        disabled={sent}
      />

      <Btn
        kind="ghost"
        icon={copied ? 'check' : 'share-variant'}
        title={copied ? (lang === 'hi' ? 'लोकेशन कॉपी हो गई!' : 'Location Copied!') : (lang === 'hi' ? 'परिवार को मेरी लोकेशन भेजें' : 'Send my location to family')}
        onPress={handleShare}
      />

      {/* Family Contacts List with Direct SMS */}
      {family && family.length > 0 && (
        <View style={st.familySection}>
          <Text style={st.familyTitle}>
            {lang === 'hi' ? 'परिवार के संपर्क (सीधे SMS भेजें):' : 'Family Contacts (Send Direct SMS):'}
          </Text>
          <View style={st.familyList}>
            {family.map((member) => (
              <View key={member.id || member.phone || member.name} style={st.familyRow}>
                <View style={st.familyAvatar}>
                  <Icon name="account" size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.familyName}>{member.name}</Text>
                  <Text style={st.familyRelation}>
                    {[member.relation, member.phone].filter(Boolean).join(' • ')}
                  </Text>
                </View>
                {member.phone ? (
                  <Pressable
                    style={st.smsBtn}
                    onPress={() => handleSendSMS(member.phone)}
                    accessibilityRole="button"
                    accessibilityLabel={`Send SMS to ${member.name}`}
                  >
                    <Icon name="message-text-outline" size={16} color={C.dangerDeep} />
                    <Text style={st.smsBtnText}>SMS</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      )}

      <T v="muted" style={{ color: 'rgba(255,255,255,.75)', textAlign: 'center' }}>
        {t('willAlert')}
      </T>
    </Screen>
  );
}

const st = StyleSheet.create({
  icon: { width: 64, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  body: { fontFamily: F.bodyMedium, fontSize: 17, lineHeight: 24, color: '#fff' },
  small: { fontFamily: F.body, fontSize: 13, color: 'rgba(255,255,255,.75)' },
  checks: { backgroundColor: 'rgba(0,0,0,.18)', borderRadius: 14, padding: 14, gap: 10 },
  check: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  checkText: { flex: 1, fontFamily: F.bodyMedium, fontSize: 15, color: '#fff' },
  familySection: {
    backgroundColor: 'rgba(0,0,0,.22)',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  familyTitle: {
    fontFamily: F.bodyBold,
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.9)',
  },
  familyList: {
    gap: 8,
  },
  familyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  familyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyName: {
    fontFamily: F.bodyBold,
    fontSize: 14,
    color: '#fff',
  },
  familyRelation: {
    fontFamily: F.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  smsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smsBtnText: {
    fontFamily: F.bodyBold,
    fontSize: 12.5,
    color: C.dangerDeep,
  },
});

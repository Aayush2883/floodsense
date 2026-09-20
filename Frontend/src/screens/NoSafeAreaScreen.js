import React, { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Btn, Header, Icon, Screen, T } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { callNumber } from '../actions';
import { C, F } from '../theme';

export default function NoSafeAreaScreen({ navigation }) {
  const { me, family, lang } = useApp();
  const t = useT();
  const [copied, setCopied] = useState(false);

  const helpMessage = `I need help. My location: https://maps.google.com/?q=${me.lat.toFixed(5)},${me.lng.toFixed(5)} — sent via FloodSense`;

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
    <Screen bg={C.ground} contentStyle={{ gap: 16, paddingBottom: 32 }}>
      <Header
        title={lang === 'hi' ? 'कोई सुरक्षित स्थान नहीं मिला' : 'No relief point found near you'}
        sub={lang === 'hi' ? 'आपके क्षेत्र में 50 किमी के भीतर कोई राहत शिविर या सुरक्षित स्थान नहीं है' : 'There are no registered relief camps or safe places in your area'}
        onBack={() => navigation.goBack()}
      />

      <View style={st.warningCard}>
        <View style={st.iconWrap}>
          <Icon name="alert-circle-outline" size={36} color={C.danger} />
        </View>
        <Text style={st.cardTitle}>
          {lang === 'hi' ? 'आस-पास कोई राहत बिंदु नहीं' : 'No relief point found near you'}
        </Text>
        <Text style={st.cardSub}>
          {lang === 'hi'
            ? 'आपके 50 किमी के दायरे में कोई भी पंजीकृत राहत शिविर या सुरक्षित स्थान नहीं मिला।'
            : 'There are no registered relief camps or safe places in your area (50km radius).'}
        </Text>
      </View>

      {/* Primary Emergency Call 112 */}
      <Btn
        kind="danger"
        icon="phone"
        title={lang === 'hi' ? 'आपातकालीन कॉल 112' : 'Call 112 Emergency'}
        onPress={() => callNumber('112')}
      />

      {/* Share Location to Family Button */}
      <Btn
        kind="primary"
        icon={copied ? 'check' : 'share-variant'}
        title={copied ? (lang === 'hi' ? 'लिंक कॉपी हो गया!' : 'Location Copied!') : (lang === 'hi' ? 'परिवार को मेरी लोकेशन भेजें' : 'Send my location to family')}
        onPress={handleShare}
      />

      {/* Family Contacts List with Direct SMS */}
      {family && family.length > 0 && (
        <View style={st.familySection}>
          <T v="label">
            {lang === 'hi' ? 'परिवार के संपर्क (सीधे SMS भेजें)' : 'Family Contacts (Send Direct SMS)'}
          </T>
          <View style={st.familyList}>
            {family.map((member) => (
              <View key={member.id || member.phone || member.name} style={st.familyRow}>
                <View style={st.familyAvatar}>
                  <Icon name="account" size={20} color={C.river} />
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
                    <Icon name="message-text-outline" size={16} color="#fff" />
                    <Text style={st.smsBtnText}>SMS</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Return Button */}
      <Btn
        kind="outline"
        icon="arrow-left"
        title={lang === 'hi' ? 'मैं ठीक हूँ — वापस जाएँ' : "I'm okay — go back"}
        onPress={() => navigation.goBack()}
      />
    </Screen>
  );
}

const st = StyleSheet.create({
  warningCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    textAlign: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#F8D7DA',
    shadowColor: '#0F1E24',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: '#FDEDEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: F.displayHeavy,
    fontSize: 20,
    color: C.ink,
    textAlign: 'center',
  },
  cardSub: {
    fontFamily: F.body,
    fontSize: 14.5,
    lineHeight: 21,
    color: C.muted,
    textAlign: 'center',
  },
  familySection: {
    gap: 8,
    marginTop: 4,
  },
  familyList: {
    backgroundColor: C.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.line,
  },
  familyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  familyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.riverSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyName: {
    fontFamily: F.bodyBold,
    fontSize: 15,
    color: C.ink,
  },
  familyRelation: {
    fontFamily: F.body,
    fontSize: 12.5,
    color: C.muted,
  },
  smsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.safe,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  smsBtnText: {
    fontFamily: F.bodyBold,
    fontSize: 12.5,
    color: '#fff',
  },
});

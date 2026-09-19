import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Banner, Btn, Card, Chip, Field, Header, Icon, Screen, Sev, T } from '../components/ui';
import { useApp, useT } from '../state/AppState';
import { callNumber, confirm, mapsLink, shareText } from '../actions';
import { C, F } from '../theme';

const RELATIONS = {
  en: ['Father', 'Mother', 'Brother', 'Sister', 'Grandparent', 'Friend'],
  hi: ['पिता', 'माँ', 'भाई', 'बहन', 'दादा/दादी', 'दोस्त'],
};

export default function FamilyScreen({ navigation }) {
  const { familyStatus, family, saveFamily, api, ensureAuth, lang, showToast } = useApp();
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [pin, setPin] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const danger = familyStatus.filter((c) => c.status === 'DANGER').length;

  async function add() {
    if (!name.trim() || !/^\d{6}$/.test(pin)) { setErr(lang === 'hi' ? 'नाम और 6 अंकों का पिन कोड डालें।' : 'Enter a name and a 6-digit PIN code.'); return; }
    setBusy(true); setErr('');
    const contact = { id: `fam_${Date.now()}`, name: name.trim(), relation: relation || RELATIONS[lang][0], pinCode: pin, phone: phone.trim() };
    let geo = await api.geocodePin(pin).catch(() => null);
    try {
      await ensureAuth();
      const fromServer = await api.addFamily({ name: contact.name, relation: contact.relation, relationship: contact.relation, pinCode: pin, phone: contact.phone });
      if (!geo && fromServer) geo = fromServer;
    } catch { /* kept on this phone even if the server is down */ }
    saveFamily([...family, { ...contact, lat: geo?.lat ?? null, lng: geo?.lng ?? null, label: geo?.label || `PIN ${pin}` }]);
    setName(''); setRelation(''); setPin(''); setPhone(''); setAdding(false); setBusy(false);
    showToast(geo ? t('familyAdded', { n: contact.name }) : t('familyAddedNoPin', { n: contact.name }), geo ? 'ok' : 'warn');
  }

  function remove(c) {
    confirm(t('remove'), c.name, () => {
      saveFamily(family.filter((x) => x.id !== c.id));
      api.removeFamily(c.id).catch(() => {});
      showToast(t('familyRemoved', { n: c.name }), 'info');
    });
  }

  return (
    <Screen>
      <Header title={t('familyWatch')} sub={danger ? t('inDangerCount', { n: danger, t: familyStatus.length }) : t('allSafe')} />

      {familyStatus.map((c) => {
        const inDanger = c.status === 'DANGER';
        return (
          <Card key={c.id} danger={inDanger} style={{ paddingVertical: 10, gap: 10 }}>
            <View style={st.row}>
              <Avatar text={c.name.slice(0, 1).toUpperCase()} danger={inDanger} />
              <View style={{ flex: 1 }}>
                <T v="bodyB">{c.name}</T>
                <T v="muted" numberOfLines={1}>{c.relation} · PIN {c.pinCode} · {c.label}</T>
              </View>
              <Sev level={inDanger ? 'DANGER' : c.status === 'SAFE' ? 'SAFE' : 'LOW'} label={c.status === 'UNKNOWN' ? '?' : undefined} />
              <Pressable onPress={() => remove(c)} hitSlop={10} accessibilityLabel={`${t('remove')} ${c.name}`}>
                <Icon name="trash-can-outline" size={20} color={C.textSecondary} />
              </Pressable>
            </View>
            {inDanger && (
              <View style={st.expand}>
                <Text style={st.expandText}>{t('floodNear', { m: `${c.zone.label}${c.zone.source === 'sensor' ? ' (sensor)' : ''}` })}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Btn small kind="outline" icon="phone" title={`${t('call')} ${c.name}`} style={{ flex: 1 }} onPress={() => callNumber(c.phone || '112')} />
                  <Btn small kind="primary" title={t('sendSafeRoute')} style={{ flex: 1 }}
                    onPress={() => shareText(lang === 'hi'
                      ? `${c.name}, आपके इलाके में बाढ़ की चेतावनी है। FloodSense खोलें और "सुरक्षित जगह जाएँ" दबाएँ। ${mapsLink(c)}`
                      : `${c.name}, there is a flood alert in your area. Open FloodSense and tap "Get to safety". ${mapsLink(c)}`)} />
                </View>
              </View>
            )}
          </Card>
        );
      })}

      {adding ? (
        <Card style={{ paddingVertical: 14, gap: 10 }}>
          <T v="h2">{t('addFamily')}</T>
          <Field label={t('name')} value={name} onChangeText={setName} />
          <T v="label">{t('relation')}</T>
          <View style={st.chips}>
            {RELATIONS[lang].map((r) => <Chip key={r} label={r} on={relation === r} onPress={() => setRelation(r)} />)}
          </View>
          <Field label={t('pinCode')} value={pin} onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="800001" inputStyle={{ fontFamily: F.mono }} />
          <Field label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          {err ? <Banner>{err}</Banner> : null}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Btn kind="outline" title="Cancel" style={{ flex: 1 }} onPress={() => setAdding(false)} />
            <Btn title={t('save')} style={{ flex: 1 }} onPress={add} loading={busy} />
          </View>
        </Card>
      ) : (
        <Btn kind="outline" icon="plus" title={t('addFamily')} onPress={() => setAdding(true)} />
      )}
      <T v="muted" style={{ textAlign: 'center' }}>{t('addFamilyNote')}</T>
    </Screen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  expand: { backgroundColor: C.dangerSoft, borderRadius: 12, padding: 10, gap: 8 },
  expandText: { fontFamily: F.bodyMedium, fontSize: 13.5, color: C.dangerText },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});

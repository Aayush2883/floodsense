import { Alert, Linking, Platform, Share } from 'react-native';
import * as Speech from 'expo-speech';
import { KNOWN_PLACES } from './data/places';
import { haversine } from './geo';

export function speak(text, lang) {
  Speech.stop();
  Speech.speak(text, { language: lang === 'hi' ? 'hi-IN' : 'en-IN', rate: 0.95 });
}

export function alertSpeech(a, lang) {
  const place = a.place || 'your area';
  if (lang === 'hi') {
    const lvl = a.waterLevelCm ? `पानी ${Math.round(a.waterLevelCm)} सेंटीमीटर तक है।` : 'पानी बहुत ऊपर है।';
    return `खतरा। ${place} के पास ${lvl} सड़कें बंद हैं। तुरंत ऊँची जगह पर जाएँ।`;
  }
  return a.message || `Danger near ${place}. Move to higher ground.`;
}

export const mapsLink = (p) => `https://www.google.com/maps/search/?api=1&query=${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;

export async function shareText(message) {
  try {
    if (Platform.OS === 'web') {
      if (navigator.share) { await navigator.share({ text: message }); return; }
      await navigator.clipboard?.writeText(message);
      window.alert('Copied. Paste it in WhatsApp or SMS.\n\n' + message);
      return;
    }
    await Share.share({ message });
  } catch { /* user closed the share sheet */ }
}

export function callNumber(num) {
  const url = `tel:${num}`;
  if (Platform.OS === 'web') { window.location.href = url; return; }
  Linking.openURL(url).catch(() => Alert.alert('Call', num));
}

export function confirm(title, msg, onYes) {
  if (Platform.OS === 'web') { if (window.confirm(`${title}\n\n${msg}`)) onYes(); return; }
  Alert.alert(title, msg, [{ text: 'Cancel', style: 'cancel' }, { text: 'OK', onPress: onYes }]);
}

export function notify(title, msg) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${msg}`);
  else Alert.alert(title, msg);
}

// "Near Gandhi Maidan" style label for a tapped point
export function nearLabel(p) {
  let best = null;
  for (const k of KNOWN_PLACES) {
    const d = haversine(p, k);
    if (!best || d < best.d) best = { d, name: k.label.split(',')[0] };
  }
  return best && best.d < 1500 ? `Near ${best.name}, Patna` : `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`;
}

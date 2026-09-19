import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaInsetsContext, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AnekDevanagari_700Bold, AnekDevanagari_800ExtraBold } from '@expo-google-fonts/anek-devanagari';
import { Mukta_400Regular, Mukta_500Medium, Mukta_600SemiBold, Mukta_700Bold } from '@expo-google-fonts/mukta';
import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';

import { AppProvider, useApp } from './src/state/AppState';
import TabBar from './src/components/TabBar';
import AlertBanner from './src/components/AlertBanner';
import Toast from './src/components/Toast';
import SignInScreen from './src/screens/SignInScreen';
import MapScreen from './src/screens/MapScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import FamilyScreen from './src/screens/FamilyScreen';
import MoreScreen from './src/screens/MoreScreen';
import ReportScreen from './src/screens/ReportScreen';
import ReportResultScreen from './src/screens/ReportResultScreen';
import RouteScreen from './src/screens/RouteScreen';
import ShelterScreen from './src/screens/ShelterScreen';
import SafePlacesScreen from './src/screens/SafePlacesScreen';
import AddSafePlaceScreen from './src/screens/AddSafePlaceScreen';
import VolunteerScreen from './src/screens/VolunteerScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { C, F, alpha } from './src/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navRef = createNavigationContainerRef();

function Tabs() {
  return (
    <Tab.Navigator tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Family" component={FamilyScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

function Root() {
  const { ready, session } = useApp();
  if (!ready) return <View style={st.center}><ActivityIndicator color={C.action} /></View>;
  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer ref={navRef} theme={navTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.ground } }}>
          {!session ? (
            <Stack.Screen name="SignIn" component={SignInScreen} />
          ) : (
            <>
              <Stack.Screen name="Tabs" component={Tabs} />
              <Stack.Screen name="Report" component={ReportScreen} options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="ReportResult" component={ReportResultScreen} />
              <Stack.Screen name="Route" component={RouteScreen} />
              <Stack.Screen name="Shelter" component={ShelterScreen} />
              <Stack.Screen name="SafePlaces" component={SafePlacesScreen} />
              <Stack.Screen name="AddSafePlace" component={AddSafePlaceScreen} />
              <Stack.Screen name="Volunteer" component={VolunteerScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      {session && <AlertBanner onGetToSafety={() => navRef.isReady() && navRef.navigate('Route', { target: 'camp' })} />}
      <Toast />
    </View>
  );
}

const navTheme = {
  dark: false,
  colors: { primary: C.action, background: C.ground, card: C.surface, text: C.text, border: C.line, notification: C.danger },
  fonts: {
    regular: { fontFamily: F.body, fontWeight: '400' },
    medium: { fontFamily: F.bodyMedium, fontWeight: '500' },
    bold: { fontFamily: F.bodyBold, fontWeight: '700' },
    heavy: { fontFamily: F.displayHeavy, fontWeight: '800' },
  },
};

const FRAME_INSETS = { top: 34, bottom: 10, left: 0, right: 0 };

// Looks like a real phone in the demo video: time on the left, signal and battery on the right.
function FakeStatusBar() {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  const time = now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: false });
  return (
    <View style={st.statusBar} pointerEvents="none">
      <Text style={st.statusTime}>{time}</Text>
      <View style={st.notch} />
      <View style={st.statusIcons}>
        <MaterialCommunityIcons name="signal-cellular-2" size={15} color={C.text} />
        <Text style={st.statusNet}>4G</Text>
        <MaterialCommunityIcons name="battery-30" size={17} color={C.text} style={{ transform: [{ rotate: '90deg' }] }} />
      </View>
    </View>
  );
}

// On a wide browser window, show the app inside a phone frame (for the demo video).
function WebFrame({ children }) {
  const { width, height } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= 760;
  const deviceInsets = useSafeAreaInsets();
  const h = Math.min(844, height - 48);
  // same tree at every width, so resizing the window never resets the app
  return (
    <View style={wide ? st.stage : { flex: 1 }}>
      {wide && (
        <View style={st.side}>
          <Text style={st.sideEyebrow}>BHARAT BUILD TOUR · LIVE DEMO</Text>
          <Text style={st.sideTitle}>FloodSense</Text>
          <Text style={st.sideSub}>Citizens and water sensors report floods. AI reads Hindi reports, flooded roads close on a live road graph of Patna, and everyone gets a dry route to safety.</Text>
          <Text style={st.sideHint}>Try it: Report → “Gandhi Maidan ke paas paani chest tak hai” → Get to safety</Text>
        </View>
      )}
      <View style={wide ? [st.phone, { height: h }] : { flex: 1 }}>
        <View style={wide ? st.screen : { flex: 1 }}>
          <SafeAreaInsetsContext.Provider value={wide ? FRAME_INSETS : deviceInsets}>
            {wide ? <FakeStatusBar /> : null}
            {children}
          </SafeAreaInsetsContext.Provider>
        </View>
      </View>
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    AnekDevanagari_700Bold, AnekDevanagari_800ExtraBold,
    Mukta_400Regular, Mukta_500Medium, Mukta_600SemiBold, Mukta_700Bold,
    IBMPlexMono_500Medium, IBMPlexMono_600SemiBold,
    ...MaterialCommunityIcons.font,
  });
  if (!fontsLoaded) return <View style={st.center}><ActivityIndicator color={C.action} /></View>;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppProvider>
        <WebFrame>
          <Root />
        </WebFrame>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const st = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ground },
  stage: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 64, backgroundColor: C.frameStage, padding: 24 },
  side: { width: 340, gap: 14 },
  sideEyebrow: { fontFamily: F.monoBold, fontSize: 12, letterSpacing: 1.2, color: C.action },
  sideTitle: { fontFamily: F.displayHeavy, fontSize: 56, lineHeight: 60, color: C.text },
  sideSub: { fontFamily: F.body, fontSize: 17, lineHeight: 25, color: C.textSecondary },
  sideHint: { fontFamily: F.bodySemi, fontSize: 14, lineHeight: 20, color: C.action, borderLeftWidth: 3, borderLeftColor: C.action, paddingLeft: 12 },
  phone: { width: 400, borderRadius: 48, backgroundColor: C.frameBezel, padding: 10, shadowColor: C.shadow, shadowOpacity: 0.35, shadowRadius: 40, shadowOffset: { width: 0, height: 24 } },
  screen: { flex: 1, borderRadius: 38, overflow: 'hidden', backgroundColor: C.ground },
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 34, zIndex: 200, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 26, backgroundColor: alpha(C.ground, 0.92) },
  statusTime: { fontFamily: F.bodyBold, fontSize: 14, color: C.text, width: 60 },
  notch: { width: 92, height: 24, borderRadius: 14, backgroundColor: C.frameNotch, marginTop: 4 },
  statusIcons: { flexDirection: 'row', alignItems: 'center', gap: 3, width: 60, justifyContent: 'flex-end' },
  statusNet: { fontFamily: F.bodyBold, fontSize: 11, color: C.text },
});

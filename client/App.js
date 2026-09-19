import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AnekDevanagari_700Bold, AnekDevanagari_800ExtraBold } from '@expo-google-fonts/anek-devanagari';
import { Mukta_400Regular, Mukta_500Medium, Mukta_600SemiBold, Mukta_700Bold } from '@expo-google-fonts/mukta';
import { IBMPlexMono_500Medium, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';

import { AppProvider, useApp } from './src/state/AppState';
import TabBar from './src/components/TabBar';
import AlertBanner from './src/components/AlertBanner';
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
import { C, F } from './src/theme';

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
  if (!ready) return <View style={st.center}><ActivityIndicator color={C.river} /></View>;
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
    </View>
  );
}

const navTheme = {
  dark: false,
  colors: { primary: C.river, background: C.ground, card: C.surface, text: C.ink, border: C.line, notification: C.danger },
  fonts: {
    regular: { fontFamily: F.body, fontWeight: '400' },
    medium: { fontFamily: F.bodyMedium, fontWeight: '500' },
    bold: { fontFamily: F.bodyBold, fontWeight: '700' },
    heavy: { fontFamily: F.displayHeavy, fontWeight: '800' },
  },
};

// On a wide browser window, show the app inside a phone frame (for the demo video).
function WebFrame({ children }) {
  const { width, height } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= 760;
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
        <View style={wide ? st.screen : { flex: 1 }}>{children}</View>
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
  if (!fontsLoaded) return <View style={st.center}><ActivityIndicator color={C.river} /></View>;

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
  stage: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 64, backgroundColor: '#DCE5E2', padding: 24 },
  side: { width: 340, gap: 14 },
  sideEyebrow: { fontFamily: F.monoBold, fontSize: 12, letterSpacing: 1.2, color: C.river },
  sideTitle: { fontFamily: F.displayHeavy, fontSize: 56, lineHeight: 60, color: C.ink },
  sideSub: { fontFamily: F.body, fontSize: 17, lineHeight: 25, color: '#3C4D51' },
  sideHint: { fontFamily: F.bodySemi, fontSize: 14, lineHeight: 20, color: C.river, borderLeftWidth: 3, borderLeftColor: C.river, paddingLeft: 12 },
  phone: { width: 400, borderRadius: 48, backgroundColor: '#111A1C', padding: 10, shadowColor: '#0F1E24', shadowOpacity: 0.35, shadowRadius: 40, shadowOffset: { width: 0, height: 24 } },
  screen: { flex: 1, borderRadius: 38, overflow: 'hidden', backgroundColor: C.ground },
});

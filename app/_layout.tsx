// Lo primero: la protección contra cierres (antes de cargar cualquier otra cosa de la app).
import '@/lib/installCrashHandlers';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Lobster_400Regular } from '@expo-google-fonts/lobster/400Regular';
import { COLORS } from '@/game/config';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useSettings } from '@/hooks/useSettings';
import { setLanguagePreference } from '@/lib/i18n';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { LastCrashNotice } from '@/components/ui/LastCrashNotice';
import { AdConsentModal } from '@/components/ui/AdConsentModal';
import { ADS_SUPPORTED, initAds } from '@/lib/ads';
import { loadStartupConsent, saveAdConsent } from '@/lib/ads/consent';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Si las fuentes no terminan de cargar, se sigue con la del sistema. */
const FONT_TIMEOUT_MS = 4000;

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ErrorBoundary>
        <AppShell />
      </ErrorBoundary>
      <LastCrashNotice />
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}

function AppShell() {
  useFrameworkReady();
  const { settings } = useSettings();
  setLanguagePreference(settings.language);
  const [fontsLoaded, fontError] = useFonts({ Lobster_400Regular });
  const [fontTimeout, setFontTimeout] = useState(false);
  const ready = fontsLoaded || Boolean(fontError) || fontTimeout;

  useEffect(() => {
    const timer = setTimeout(() => setFontTimeout(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  // Anuncios: en el EEE, Reino Unido y Suiza se pregunta antes de iniciar Start.io. Sin SDK (web, Expo Go) no se
  // hace nada. El App ID ya lo leyó el SDK del AndroidManifest al abrir la app.
  const [askConsent, setAskConsent] = useState(false);
  useEffect(() => {
    if (!ADS_SUPPORTED) return;
    loadStartupConsent()
      .then((startup) => {
        if (startup.kind === 'ask') setAskConsent(true);
        else initAds(startup.personalized).catch(() => undefined);
      })
      .catch(() => undefined);
  }, []);
  const chooseConsent = (personalized: boolean) => {
    setAskConsent(false);
    saveAdConsent(personalized).catch(() => undefined);
    initAds(personalized).catch(() => undefined);
  };

  if (!ready) return null;

  return (
    <>
    <Stack
      key={settings.language}
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background }, animation: 'fade' }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="game" options={{ gestureEnabled: false }} />
      <Stack.Screen name="result" options={{ gestureEnabled: false }} />
      <Stack.Screen name="settings" />
      <Stack.Screen name="tutorial" options={{ gestureEnabled: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
    <AdConsentModal visible={askConsent} onChoose={chooseConsent} />
    </>
  );
}

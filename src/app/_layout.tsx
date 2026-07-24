import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Platform, StatusBar as RNStatusBar, View } from "react-native";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AnimatedSplash } from "@/components/AnimatedSplash";
import { AppProvider, useApp } from "@/context/app";
import { ClimateProvider } from "@/context/climate";
import { ThemeProvider, useTheme } from "@/context/theme";
import { I18nProvider } from "@/lib/i18n";
import { colors } from "@/lib/theme";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AuthGate({ children }: { children: ReactNode }) {
  const { ready, authed } = useApp();
  const segments = useSegments();
  const router = useRouter();
  const [flashDone, setFlashDone] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!ready || !flashDone) return;
    const root = String(segments[0] || "");
    const publicRoots = new Set(["login", "onboarding", "share-track"]);
    const isPublic = publicRoots.has(root);

    if (!authed) {
      // index.tsx decides onboarding vs login; keep public screens free
      if (!isPublic && root !== "index") router.replace("/login");
      return;
    }

    const onIndex = !root || root === "index";
    if (root === "login" || root === "onboarding" || onIndex) router.replace("/(tabs)/home");
  }, [ready, authed, flashDone, segments, router]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.stone }}>
      {flashDone && ready ? children : null}
      {flashDone && !ready ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.stone }}>
          <ActivityIndicator color={colors.ember} />
        </View>
      ) : null}
      {/* Splash stays full-screen */}
      {!flashDone ? (
        <AnimatedSplash tagline="Made with love" onDone={() => setFlashDone(true)} />
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.saffron} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
      <AppProvider>
        <ClimateProvider>
        <I18nProvider>
        <RootStatusBar />
        <AuthGate>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.cream },
              animation: "slide_from_right",
              animationDuration: 280,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="product/[id]" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="shops/[id]" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="cart" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="checkout" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="orders/[id]" />
            <Stack.Screen name="track/[id]" />
            <Stack.Screen name="share-track/[token]" />
            <Stack.Screen name="invoice/[id]" />
            <Stack.Screen name="custom-cake" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="returns" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="addresses" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="favorites" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="notifications" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="help" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="wallet" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="gift-hamper" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="subscriptions" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="referral" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="corporate" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="language" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="appearance" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="calls" options={{ animation: "fade_from_bottom" }} />
            <Stack.Screen name="payment-success" />
            <Stack.Screen name="payment-failed" />
            <Stack.Screen name="order-confirm" />
            <Stack.Screen name="rate-review" options={{ animation: "fade_from_bottom" }} />
          </Stack>
        </AuthGate>
        </I18nProvider>
        </ClimateProvider>
      </AppProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootStatusBar() {
  const { dark } = useTheme();
  useEffect(() => {
    // Season headers draw under the status bar (same as Home).
    if (Platform.OS === "android") {
      RNStatusBar.setTranslucent(true);
      RNStatusBar.setBackgroundColor("transparent");
    }
  }, []);
  return <StatusBar style={dark ? "light" : "dark"} />;
}

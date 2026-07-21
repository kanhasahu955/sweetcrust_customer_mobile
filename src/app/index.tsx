import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { hasSession } from "@/lib/api";
import { colors } from "@/lib/theme";

export default function Gate() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("sc_onboarded")
      .then((v) => setOnboarded(v === "1"))
      .catch(() => setOnboarded(false))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream }}>
        <ActivityIndicator color={colors.pink} />
      </View>
    );
  }

  if (hasSession()) return <Redirect href="/(tabs)/home" />;
  if (!onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/login" />;
}

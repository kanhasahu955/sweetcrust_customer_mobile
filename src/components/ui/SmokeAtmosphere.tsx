import { StyleSheet, View } from "react-native";

import { colors } from "@/lib/theme";

/** Soft static smoke/ember orbs (no Reanimated — stable under Expo Go + React Compiler). */
export function SmokeAtmosphere() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.orb, { width: 220, height: 220, borderRadius: 110, top: -40, left: -60, backgroundColor: colors.ember, opacity: 0.12 }]} />
      <View style={[styles.orb, { width: 180, height: 180, borderRadius: 90, top: 120, right: -50, backgroundColor: "#5A2A1A", opacity: 0.18 }]} />
      <View style={[styles.orb, { width: 140, height: 140, borderRadius: 70, bottom: 180, left: 40, backgroundColor: colors.saffron, opacity: 0.1 }]} />
      <View style={[styles.orb, { width: 260, height: 260, borderRadius: 130, bottom: -80, right: -80, backgroundColor: colors.chili, opacity: 0.08 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: { position: "absolute" },
});

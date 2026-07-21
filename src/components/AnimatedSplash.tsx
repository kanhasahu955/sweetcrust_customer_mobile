import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { colors, fonts } from "@/lib/theme";

type Props = {
  tagline?: string;
  onDone: () => void;
};

/** Short branded splash — cream/pink SweetCrust (stable in Expo Go). */
export function AnimatedSplash({ tagline = "Made with love", onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(() => onDone(), 1400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={["#FFF9F5", "#FFF0F2", "#F8EDE6"]} style={StyleSheet.absoluteFill} />
      <View style={styles.glow} />
      <Text style={styles.brand}>SweetCrust</Text>
      <Text style={styles.bakery}>BAKERY</Text>
      <Text style={styles.tag}>{tagline}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  glow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.pink,
    opacity: 0.12,
  },
  brand: {
    fontFamily: fonts.display,
    fontSize: 36,
    color: colors.chocolate,
    letterSpacing: -0.8,
  },
  bakery: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 3,
    color: colors.pink,
    marginTop: 4,
  },
  tag: {
    marginTop: 12,
    fontFamily: fonts.medium,
    fontSize: 13,
    letterSpacing: 0.8,
    color: colors.muted,
  },
});

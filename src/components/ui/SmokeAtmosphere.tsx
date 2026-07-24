import { memo, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const SMOKE_A = require("@/assets/images/cloud-soft-a.png");
const SMOKE_B = require("@/assets/images/cloud-soft-b.png");

type Wisp = {
  src: number;
  top: number;
  w: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  op0: number;
  op1: number;
  dur: number;
  delay: number;
  tint: string;
  scale: number;
};

/**
 * Real smoke feel — soft cloud wisps that drift, rise, and breathe.
 * RN Animated only (no Reanimated) — stable under Expo Go + React Compiler.
 */
export function SmokeAtmosphere() {
  const { width, height } = useWindowDimensions();

  const wisps = useMemo<Wisp[]>(
    () => [
      {
        src: SMOKE_B,
        top: height * 0.02,
        w: width * 1.15,
        x0: -width * 0.25,
        x1: width * 0.15,
        y0: 0,
        y1: -28,
        op0: 0.22,
        op1: 0.48,
        dur: 22000,
        delay: 0,
        tint: "#E8F0F6",
        scale: 1.05,
      },
      {
        src: SMOKE_A,
        top: height * 0.12,
        w: width * 1.05,
        x0: width * 0.2,
        x1: -width * 0.2,
        y0: 8,
        y1: -36,
        op0: 0.18,
        op1: 0.42,
        dur: 26000,
        delay: 600,
        tint: "#FFFFFF",
        scale: 1.1,
      },
      {
        src: SMOKE_B,
        top: height * 0.28,
        w: width * 1.2,
        x0: -width * 0.15,
        x1: width * 0.25,
        y0: 0,
        y1: -44,
        op0: 0.16,
        op1: 0.38,
        dur: 30000,
        delay: 200,
        tint: "#F5F0EE",
        scale: 1.15,
      },
      {
        src: SMOKE_A,
        top: height * 0.42,
        w: width * 0.95,
        x0: width * 0.1,
        x1: -width * 0.25,
        y0: 12,
        y1: -30,
        op0: 0.12,
        op1: 0.32,
        dur: 24000,
        delay: 900,
        tint: "#F2DCE2",
        scale: 1.08,
      },
      {
        src: SMOKE_B,
        top: height * 0.55,
        w: width * 1.25,
        x0: -width * 0.3,
        x1: width * 0.1,
        y0: 0,
        y1: -50,
        op0: 0.2,
        op1: 0.45,
        dur: 28000,
        delay: 400,
        tint: "#DDE8F0",
        scale: 1.2,
      },
      {
        src: SMOKE_A,
        top: height * 0.68,
        w: width * 1.1,
        x0: width * 0.15,
        x1: -width * 0.18,
        y0: 6,
        y1: -40,
        op0: 0.14,
        op1: 0.36,
        dur: 32000,
        delay: 1100,
        tint: "#FFF8F4",
        scale: 1.12,
      },
      {
        src: SMOKE_B,
        top: height * 0.8,
        w: width * 1.3,
        x0: -width * 0.2,
        x1: width * 0.2,
        y0: 0,
        y1: -34,
        op0: 0.18,
        op1: 0.4,
        dur: 27000,
        delay: 300,
        tint: "#E6EEF5",
        scale: 1.18,
      },
    ],
    [width, height],
  );

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={["#E4EEF7", "#F4F1EE", "#F8EEF2", "#EAF0F6"]}
        locations={[0, 0.32, 0.68, 1]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.95, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Soft haze volume under the wisps */}
      <View style={[styles.haze, { top: -40, left: -80, backgroundColor: "rgba(180, 210, 230, 0.22)" }]} />
      <View style={[styles.haze, styles.hazeMid, { backgroundColor: "rgba(255, 246, 240, 0.2)" }]} />
      <View style={[styles.haze, styles.hazeLow, { backgroundColor: "rgba(233, 116, 142, 0.06)" }]} />

      {wisps.map((w, i) => (
        <SmokeWisp key={i} {...w} />
      ))}
    </View>
  );
}

const SmokeWisp = memo(function SmokeWisp({
  src,
  top,
  w,
  x0,
  x1,
  y0,
  y1,
  op0,
  op1,
  dur,
  delay,
  tint,
  scale,
}: Wisp) {
  const t = useRef(new Animated.Value(0)).current;

  const translateX = useMemo(
    () => t.interpolate({ inputRange: [0, 1], outputRange: [x0, x1] }),
    [t, x0, x1],
  );
  const translateY = useMemo(
    () => t.interpolate({ inputRange: [0, 1], outputRange: [y0, y1] }),
    [t, y0, y1],
  );
  const opacity = useMemo(
    () =>
      t.interpolate({
        inputRange: [0, 0.35, 0.7, 1],
        outputRange: [op0, op1, op1 * 0.85, op0],
      }),
    [t, op0, op1],
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, {
          toValue: 1,
          duration: dur,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: dur * 0.95,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, dur, delay]);

  const h = Math.round(w * 0.52);

  return (
    <Animated.Image
      source={src}
      resizeMode="contain"
      style={{
        position: "absolute",
        top,
        left: 0,
        width: w,
        height: h,
        tintColor: tint,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    />
  );
});

const styles = StyleSheet.create({
  haze: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  hazeMid: {
    top: "38%",
    right: -100,
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  hazeLow: {
    bottom: 60,
    left: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
});

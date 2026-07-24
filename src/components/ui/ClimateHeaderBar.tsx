import { memo, useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/Icon";
import { useClimate } from "@/context/climate";
import { useLayout } from "@/hooks/use-layout";
import type { ClimateMood } from "@/lib/climate";

const CLOUD_A = require("@/assets/images/cloud-soft-a.png");
const CLOUD_B = require("@/assets/images/cloud-soft-b.png");

type Props = {
  children: ReactNode;
  /**
   * page — full season header under status bar (sticky shells)
   * flush — continuation strip (e.g. home banner) without extra safe-area pad
   */
  variant?: "page" | "flush";
  /** Shorter BrandHeader strip — calmer/slower FX so the bar doesn’t jitter. */
  compact?: boolean;
};

/** Full-width season weather header (same wash/clouds/rain as Home). */
export function ClimateHeaderBar({ children, variant = "page", compact = false }: Props) {
  const { mood } = useClimate();
  const insets = useSafeAreaInsets();
  const { pagePad } = useLayout();
  const wash = washFor(mood);
  // Prefer season/weather overlays; still show soft clouds for misty/monsoon wash
  const showClouds =
    mood.overlays.includes("clouds") ||
    mood.overlays.includes("rain") ||
    mood.overlays.includes("mist") ||
    mood.weather === "cloudy" ||
    mood.season === "monsoon";
  const showRain = mood.overlays.includes("rain") || mood.weather === "storm";
  const statusPad = variant === "page" ? insets.top : 0;

  return (
    <View style={[styles.wrap, variant === "page" && { paddingTop: insets.top + 2 }]}>
      <LinearGradient colors={wash.colors} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFillObject} />
      <Atmosphere statusPad={statusPad} showClouds={showClouds} showRain={showRain} compact={compact} />
      <View style={[styles.content, { paddingHorizontal: pagePad }]}>{children}</View>
    </View>
  );
}

export function ClimateWeatherBadge() {
  const { mood } = useClimate();
  const wash = washFor(mood);
  const glyph = glyphFor(mood);

  return (
    <View style={[styles.badge, { backgroundColor: wash.badgeBg }]}>
      <Icon name={glyph.name as never} size={22} color={glyph.color} />
    </View>
  );
}

/** Isolated so logo/cart re-renders don’t restart cloud/rain loops. */
const Atmosphere = memo(function Atmosphere({
  statusPad,
  showClouds,
  showRain,
  compact,
}: {
  statusPad: number;
  showClouds: boolean;
  showRain: boolean;
  compact: boolean;
}) {
  return (
    <>
      {showClouds ? <BigClouds statusPad={statusPad} compact={compact} /> : null}
      {showRain ? <SoftRain statusPad={statusPad} compact={compact} /> : null}
    </>
  );
});

function BigClouds({ statusPad, compact }: { statusPad: number; compact: boolean }) {
  const { width } = useWindowDimensions();
  const clouds = useMemo(() => {
    if (compact) {
      // Visible but calm — short BrandHeader strip
      return [
        {
          top: Math.max(2, statusPad * 0.15),
          x0: -width * 0.2,
          x1: width * 0.25,
          w: width * 0.7,
          op: 0.72,
          dur: 42000,
          delay: 0,
          src: CLOUD_B,
        },
        {
          top: statusPad + 6,
          x0: width * 0.4,
          x1: -width * 0.05,
          w: width * 0.65,
          op: 0.62,
          dur: 48000,
          delay: 400,
          src: CLOUD_A,
        },
        {
          top: statusPad + 28,
          x0: width * 0.1,
          x1: -width * 0.2,
          w: width * 0.75,
          op: 0.55,
          dur: 50000,
          delay: 200,
          src: CLOUD_B,
        },
      ];
    }
    return [
      {
        top: Math.max(0, statusPad * 0.15),
        x0: width * 0.15,
        x1: -width * 0.2,
        w: width * 0.9,
        op: 0.9,
        dur: 34000,
        delay: 0,
        src: CLOUD_B,
      },
      {
        top: statusPad * 0.35,
        x0: -width * 0.25,
        x1: width * 0.5,
        w: width * 0.88,
        op: 0.85,
        dur: 30000,
        delay: 200,
        src: CLOUD_A,
      },
      {
        top: statusPad + 20,
        x0: width * 0.2,
        x1: -width * 0.3,
        w: width * 0.95,
        op: 0.8,
        dur: 38000,
        delay: 0,
        src: CLOUD_B,
      },
      {
        top: statusPad + 48,
        x0: -width * 0.1,
        x1: width * 0.55,
        w: width * 0.75,
        op: 0.7,
        dur: 32000,
        delay: 500,
        src: CLOUD_A,
      },
    ];
  }, [width, statusPad, compact]);

  return (
    <View style={styles.cloudLayer} pointerEvents="none">
      {clouds.map((c, i) => (
        <DriftCloud key={i} {...c} />
      ))}
    </View>
  );
}

function DriftCloud({
  top,
  x0,
  x1,
  w,
  op,
  dur,
  delay,
  src,
}: {
  top: number;
  x0: number;
  x1: number;
  w: number;
  op: number;
  dur: number;
  delay: number;
  src: number;
}) {
  const x = useRef(new Animated.Value(0)).current;
  const translateX = useMemo(
    () => x.interpolate({ inputRange: [0, 1], outputRange: [x0, x1] }),
    [x, x0, x1],
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(x, {
          toValue: 1,
          duration: dur,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );
    loop.start();
    return () => loop.stop();
  }, [x, dur, delay]);

  const h = Math.round(w * 0.45);

  return (
    <Animated.Image
      source={src}
      resizeMode="contain"
      // Assets are pale gray — tint to white so they read on the sky wash
      style={{
        position: "absolute",
        top,
        left: 0,
        width: w,
        height: h,
        opacity: op,
        tintColor: "#FFFFFF",
        transform: [{ translateX }],
      }}
    />
  );
}

function SoftRain({ statusPad, compact }: { statusPad: number; compact: boolean }) {
  const { width } = useWindowDimensions();
  const travel = compact ? statusPad + 72 : statusPad + 280;
  const count = compact ? 8 : 22;
  const drops = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: ((i * 23) % Math.max(width - 8, 40)) + 4,
        delay: (i * 110) % 1200,
        dur: (compact ? 1400 : 900) + (i % 4) * 120,
      })),
    [width, count, compact],
  );
  return (
    <View style={styles.rainLayer} pointerEvents="none">
      {drops.map((d, i) => (
        <RainTick
          key={i}
          {...d}
          travel={travel}
          opacity={compact ? 0.28 : 0.42}
          height={compact ? 10 : 14}
        />
      ))}
    </View>
  );
}

function RainTick({
  left,
  delay,
  dur,
  travel,
  opacity,
  height,
}: {
  left: number;
  delay: number;
  dur: number;
  travel: number;
  opacity: number;
  height: number;
}) {
  const y = useRef(new Animated.Value(0)).current;
  const translateY = useMemo(
    () => y.interpolate({ inputRange: [0, 1], outputRange: [-10, travel] }),
    [y, travel],
  );

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(y, {
          toValue: 1,
          duration: dur,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: true },
    );
    loop.start();
    return () => loop.stop();
  }, [y, delay, dur]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left,
        top: 0,
        width: 1.5,
        height,
        borderRadius: 1,
        backgroundColor: `rgba(90,130,165,${opacity})`,
        transform: [{ translateY }, { rotate: "14deg" }],
      }}
    />
  );
}

function washFor(mood: ClimateMood): {
  colors: [string, string, string];
  badgeBg: string;
} {
  if (mood.dayPart === "night") {
    return { colors: ["#C8D2E2", "#DCE4EE", "#ECEEF4"], badgeBg: "rgba(60,80,120,0.16)" };
  }
  if (mood.overlays.includes("rain") || mood.weather === "storm") {
    return { colors: ["#C4D4E4", "#D8E4EE", "#EEF2F6"], badgeBg: "rgba(80,120,150,0.18)" };
  }
  if (mood.overlays.includes("clouds") || mood.weather === "cloudy") {
    return { colors: ["#D0DCE8", "#E4EAF2", "#F3F6FA"], badgeBg: "rgba(120,140,165,0.16)" };
  }
  if (mood.dayPart === "evening") {
    return { colors: ["#E4D4E0", "#F0E8EC", "#F3F6FA"], badgeBg: "rgba(233,116,142,0.16)" };
  }
  if (mood.dayPart === "morning") {
    return { colors: ["#DCE8F4", "#EEF2F6", "#F7F0F2"], badgeBg: "rgba(170,205,230,0.22)" };
  }
  return { colors: ["#E4EEF7", "#F2F4F7", "#F7F0F2"], badgeBg: "rgba(170,205,230,0.2)" };
}

function glyphFor(mood: ClimateMood): { name: string; color: string } {
  if (mood.dayPart === "night") return { name: "moon", color: "#6B7C9C" };
  if (mood.overlays.includes("rain") || mood.weather === "storm") {
    return { name: "rainy", color: "#5A8A9A" };
  }
  if (mood.overlays.includes("snow")) return { name: "snow", color: "#7A8FA8" };
  if (mood.overlays.includes("clouds") || mood.weather === "cloudy") {
    return { name: "cloudy", color: "#7A8FA8" };
  }
  if (mood.dayPart === "evening") return { name: "sunny", color: "#FF8A3D" };
  if (mood.dayPart === "morning") return { name: "sunny", color: "#FFA000" };
  return { name: "sunny", color: "#E6B800" };
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignSelf: "stretch",
    overflow: "hidden",
    marginHorizontal: 0,
    marginBottom: 0,
    paddingBottom: 6,
  },
  content: {
    zIndex: 3,
    gap: 8,
    paddingTop: 0,
    paddingBottom: 4,
    width: "100%",
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cloudLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  rainLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    overflow: "hidden",
  },
});

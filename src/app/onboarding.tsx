import { useRef, useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { BrandHeader } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useThemeColors } from "@/context/theme";
import { fonts, radius, space } from "@/lib/theme";

const ONBOARD_KEY = "sc_onboarded";

const PAGES = [
  {
    key: "fresh",
    accent: "freshly",
    titleBefore: "Browse ",
    titleAfter: " baked products",
    body: "Discover cakes, pastries, breads and more — baked fresh every single day.",
    icon: "nutrition" as const,
    tint: ["#FFF0F2", "#FFF9F5"] as const,
  },
  {
    key: "fast",
    accent: "fast",
    titleBefore: "Enjoy ",
    titleAfter: " bakery delivery",
    body: "Hot from our ovens to your door. Live tracking so you know exactly when it arrives.",
    icon: "bicycle" as const,
    tint: ["#FFE8D6", "#FFF9F5"] as const,
  },
  {
    key: "love",
    accent: "love",
    titleBefore: "Made with ",
    titleAfter: ", just for you",
    body: "Handcrafted recipes, eggless options, and celebration cakes for every occasion.",
    icon: "heart" as const,
    tint: ["#F5E8DF", "#FFF9F5"] as const,
  },
];

export default function OnboardingScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const heroH = Math.min(240, Math.round(height * 0.28));

  async function finish() {
    try {
      await AsyncStorage.setItem(ONBOARD_KEY, "1");
    } catch {
      /* ignore */
    }
    router.replace("/login");
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  }

  function next() {
    if (index >= PAGES.length - 1) {
      void finish();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
  }

  return (
    <Screen pad={false} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.topBar}>
        <BrandHeader
          left="none"
          compact
          climate={false}
          right={
            <FloatPress onPress={finish}>
              <Text style={[styles.skip, { color: c.pink }]}>Skip</Text>
            </FloatPress>
          }
        />
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {PAGES.map((p) => (
          <View key={p.key} style={[styles.page, { width }]}>
            <LinearGradient colors={[...p.tint]} style={[styles.hero, { height: heroH }]}>
              <View style={[styles.iconWrap, { backgroundColor: c.paper }]}>
                <Icon name={p.icon} size={44} color={c.pink} />
              </View>
              <Text style={[styles.tag, { color: c.muted }]}>MADE WITH LOVE · BAKED FRESH</Text>
            </LinearGradient>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: c.ink }]}>
                {p.titleBefore}
                <Text style={{ color: c.pink }}>{p.accent}</Text>
                {p.titleAfter}
              </Text>
              <Text style={[styles.body, { color: c.muted }]}>{p.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {PAGES.map((p, i) => (
            <View
              key={p.key}
              style={[
                styles.dot,
                { backgroundColor: c.border },
                i === index && { width: 22, backgroundColor: c.pink },
              ]}
            />
          ))}
        </View>
        <FloatPress style={[styles.cta, { backgroundColor: c.chocolate }]} onPress={next}>
          <Text style={styles.ctaText}>{index >= PAGES.length - 1 ? "Get Started" : "Next →"}</Text>
        </FloatPress>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: space.md, paddingTop: space.sm },
  skip: { fontFamily: fonts.bold, fontSize: 15 },
  page: { flex: 1 },
  hero: {
    marginHorizontal: space.md,
    marginTop: space.sm,
    borderRadius: radius.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  tag: {
    fontFamily: fonts.medium,
    fontSize: 11,
    letterSpacing: 1.2,
  },
  copy: { paddingHorizontal: space.lg, paddingTop: space.md, gap: space.sm },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  footer: { paddingHorizontal: space.md, paddingBottom: space.md, gap: space.md },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cta: {
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: "center",
  },
  ctaText: { fontFamily: fonts.bold, color: "#FFF", fontSize: 16 },
});

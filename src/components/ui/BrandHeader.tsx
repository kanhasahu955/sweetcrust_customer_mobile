import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ClimateHeaderBar } from "@/components/ui/ClimateHeaderBar";
import { Icon } from "@/components/ui/Icon";
import { useThemeColors } from "@/context/theme";
import { fonts, space } from "@/lib/theme";

/** Original SweetCrust mark (transparent background). */
const APP_LOGO = require("../../../assets/images/sweetcrust-logo.png");
/** Tight crop is ~1.88 wide — keep header short. */
const LOGO_ASPECT = 1.85;

type Side = "back" | "menu" | "cart" | "bell" | "support" | "none" | ReactNode;

type Props = {
  left?: Side;
  right?: Side;
  tagline?: string | null;
  /** Listing pages: show title instead of logo (Blinkit-style). */
  title?: string | null;
  subtitle?: string | null;
  /** Rendered under the nav row inside the climate strip (e.g. search). */
  children?: ReactNode;
  cartCount?: number;
  onLeft?: () => void;
  onRight?: () => void;
  compact?: boolean;
  /** Larger mark for login / onboarding */
  hero?: boolean;
  /** Same season animation as Home header (default on). */
  climate?: boolean;
};

function SideBtn({
  side,
  count,
  onPress,
  color,
  accent,
}: {
  side: Side;
  count?: number;
  onPress?: () => void;
  color: string;
  accent: string;
}) {
  if (side == null || side === "none") return <View style={styles.slot} />;
  if (typeof side !== "string") return <View style={styles.slot}>{side}</View>;

  const map: Record<string, string> = {
    back: "chevron-back",
    menu: "menu",
    cart: "bag-handle-outline",
    bell: "notifications-outline",
    support: "headset-outline",
  };
  const name = map[side] || "ellipse";

  return (
    <Pressable style={styles.slot} onPress={onPress} hitSlop={8}>
      <Icon name={name} size={22} color={color} />
      {side === "cart" && count && count > 0 ? (
        <View style={[styles.badge, { backgroundColor: accent }]}>
          <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
        </View>
      ) : null}
      {side === "bell" && count && count > 0 ? <View style={[styles.dot, { backgroundColor: accent }]} /> : null}
    </Pressable>
  );
}

export function BrandHeader({
  left = "back",
  right = "none",
  tagline = null,
  title = null,
  subtitle = null,
  children,
  cartCount,
  onLeft,
  onRight,
  compact,
  hero,
  climate = true,
}: Props) {
  const router = useRouter();
  const c = useThemeColors();
  const listing = Boolean(title) && !hero;

  const handleLeft = () => {
    if (onLeft) onLeft();
    else if (left === "back") router.back();
  };

  const handleRight = () => {
    if (onRight) onRight();
    else if (right === "cart") router.push("/cart");
    else if (right === "bell") router.push("/notifications");
    else if (right === "support") router.push("/(tabs)/chat");
  };

  const h = hero ? 140 : compact ? 48 : 56;
  const w = Math.round(h * LOGO_ASPECT);
  const useClimate = climate && !hero;

  const row = (
    <View style={[styles.wrap, hero && styles.wrapHero, useClimate && styles.wrapClimate]}>
      <View style={[styles.row, { minHeight: Math.max(40, h * (hero ? 1 : 0.75)) }]}>
        {!hero ? (
          <SideBtn side={left} onPress={handleLeft} color={c.ink} accent={c.pink} count={cartCount} />
        ) : (
          <View style={styles.slot} />
        )}
        {listing ? (
          <View style={styles.titleBlock}>
            <Text style={[styles.titleText, { color: c.ink }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.subText, { color: c.muted }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.brand}>
            <Image
              source={APP_LOGO}
              style={{ width: w, height: useClimate ? Math.min(h, 44) : h }}
              resizeMode="contain"
              accessibilityLabel="SweetCrust Bakery"
            />
            {tagline && !hero ? (
              <Text style={[styles.tag, { color: c.muted }]} numberOfLines={1}>
                {tagline}
              </Text>
            ) : null}
          </View>
        )}
        {!hero ? (
          <SideBtn side={right} onPress={handleRight} color={c.ink} accent={c.pink} count={cartCount} />
        ) : (
          <View style={styles.slot} />
        )}
      </View>
      {children}
    </View>
  );

  if (!useClimate) return row;
  return (
    <View style={styles.sticky}>
      <ClimateHeaderBar compact={compact || listing}>{row}</ClimateHeaderBar>
    </View>
  );
}

(BrandHeader as typeof BrandHeader & { bleed?: boolean }).bleed = true;

/** Centered title with heart flourish (cart / favorites mockups). */
export function TitleFlourish({ title, subtitle }: { title: string; subtitle?: string }) {
  const c = useThemeColors();
  return (
    <View style={styles.flourishWrap}>
      <Text style={[styles.flourishTitle, { color: c.ink }]}>{title}</Text>
      <View style={styles.flourishLine}>
        <View style={[styles.line, { backgroundColor: c.pink }]} />
        <Icon name="heart" size={12} color={c.pink} />
        <View style={[styles.line, { backgroundColor: c.pink }]} />
      </View>
      {subtitle ? <Text style={[styles.flourishSub, { color: c.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sticky: { zIndex: 40, elevation: 40, width: "100%", alignSelf: "stretch" },
  wrap: { paddingBottom: 4, paddingTop: 0, gap: 8, width: "100%" },
  wrapHero: { paddingBottom: space.md },
  wrapClimate: { paddingBottom: 6 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  slot: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { flex: 1, alignItems: "center", justifyContent: "center" },
  titleBlock: { flex: 1, paddingHorizontal: 6, justifyContent: "center", alignItems: "center" },
  titleText: { fontFamily: fonts.bold, fontSize: 17, letterSpacing: -0.2, textAlign: "center" },
  subText: { fontFamily: fonts.medium, fontSize: 11, marginTop: 1, textAlign: "center" },
  tag: {
    fontFamily: fonts.medium,
    fontSize: 9,
    letterSpacing: 0.8,
    marginTop: 2,
    textTransform: "uppercase",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#FFF", fontSize: 9, fontFamily: fonts.bold },
  dot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  flourishWrap: { alignItems: "center", marginBottom: space.md, gap: 6 },
  flourishTitle: {
    fontFamily: fonts.display,
    fontSize: 26,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  flourishLine: { flexDirection: "row", alignItems: "center", gap: 8, width: "55%" },
  line: { flex: 1, height: 1.5 },
  flourishSub: { fontFamily: fonts.body, fontSize: 13, textAlign: "center" },
});

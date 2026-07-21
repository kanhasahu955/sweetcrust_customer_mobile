import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { Icon } from "@/components/ui/Icon";
import { useThemeColors } from "@/context/theme";
import { fonts, space } from "@/lib/theme";

type Side = "back" | "menu" | "cart" | "bell" | "support" | "none" | ReactNode;

type Props = {
  left?: Side;
  right?: Side;
  tagline?: string | null;
  cartCount?: number;
  onLeft?: () => void;
  onRight?: () => void;
  compact?: boolean;
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
  cartCount,
  onLeft,
  onRight,
  compact,
}: Props) {
  const router = useRouter();
  const c = useThemeColors();

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

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <SideBtn side={left} onPress={handleLeft} color={c.ink} accent={c.pink} count={cartCount} />
        <View style={styles.brand}>
          <Text style={[styles.logo, { color: c.ink, fontSize: compact ? 18 : 22 }]}>SweetCrust</Text>
          <Text style={[styles.bakery, { color: c.pink }]}>BAKERY</Text>
          {tagline ? (
            <Text style={[styles.tag, { color: c.muted }]}>• {tagline} •</Text>
          ) : null}
        </View>
        <SideBtn side={right} onPress={handleRight} color={c.ink} accent={c.pink} count={cartCount} />
      </View>
    </View>
  );
}

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
  wrap: { paddingBottom: space.sm },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  slot: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { flex: 1, alignItems: "center" },
  logo: { fontFamily: fonts.display, letterSpacing: -0.4 },
  bakery: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 2.5,
    marginTop: 1,
  },
  tag: { fontFamily: fonts.medium, fontSize: 10, letterSpacing: 1, marginTop: 2 },
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

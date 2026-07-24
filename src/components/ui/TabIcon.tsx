import { View, StyleSheet } from "react-native";

import { Icon, type IconName } from "@/components/ui/Icon";
import { useThemeColors } from "@/context/theme";

export type TabName = "house" | "list" | "cart" | "orders" | "chat" | "shop";

const MAP: Record<TabName, { on: IconName; off: IconName }> = {
  house: { on: "home", off: "home-outline" },
  list: { on: "grid", off: "grid-outline" },
  cart: { on: "cart", off: "cart-outline" },
  orders: { on: "bag-handle", off: "bag-handle-outline" },
  chat: { on: "chatbubbles", off: "chatbubbles-outline" },
  shop: { on: "person", off: "person-outline" },
};

export function TabGlyph({
  name,
  focused,
  hot,
}: {
  name: TabName;
  focused: boolean;
  /** Pink active tint for the creamy dock. */
  hot?: boolean;
}) {
  const c = useThemeColors();
  const tint = focused ? (hot ? c.pink : c.chocolate) : c.muted;
  const pair = MAP[name];
  return <Icon name={focused ? pair.on : pair.off} size={20} color={tint} />;
}

export function TabIcon({ name, focused }: { name: TabName; focused: boolean }) {
  return (
    <View style={styles.wrap}>
      <TabGlyph name={name} focused={focused} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
});

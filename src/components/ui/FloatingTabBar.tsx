import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabGlyph, type TabName } from "@/components/ui/TabIcon";
import { useThemeColors } from "@/context/theme";
import { TAB_BAR_HEIGHT } from "@/hooks/use-tab-bar-clearance";
import { useI18n } from "@/lib/i18n";
import { fonts, float } from "@/lib/theme";

const LABEL_KEYS: Record<string, string> = {
  home: "home",
  categories: "categories",
  orders: "orders",
  chat: "chat",
  account: "profile",
};

const ICONS: Record<string, TabName> = {
  home: "house",
  categories: "list",
  orders: "orders",
  chat: "chat",
  account: "shop",
};

export function FloatingTabBar({ state, descriptors, navigation }: any) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const bottom = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.wrap, { paddingBottom: bottom }]} pointerEvents="box-none">
      <View style={[styles.bar, { backgroundColor: c.paper, borderColor: c.border }]}>
        {state.routes
          .filter((route: any) => LABEL_KEYS[route.name])
          .map((route: any) => {
            const index = state.routes.findIndex((r: any) => r.key === route.key);
            const focused = state.index === index;
            const { options } = descriptors[route.key];
            const label = t(LABEL_KEYS[route.name]) || options.title || route.name;
            const icon = ICONS[route.name] || "house";
            const badge = options.tabBarBadge;
            const showBadge = badge != null && Number(badge) > 0;

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                onPress={() => {
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name, route.params);
                  }
                }}
                style={styles.item}
              >
                <View style={styles.iconWrap}>
                  <TabGlyph name={icon} focused={focused} />
                  {showBadge ? (
                    <View style={[styles.badge, { backgroundColor: c.pink }]}>
                      <Text style={styles.badgeText}>{Number(badge) > 99 ? "99+" : String(badge)}</Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[styles.label, { color: focused ? c.chocolate : c.muted }, focused && styles.labelOn]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
                {focused ? (
                  <View style={[styles.underline, { backgroundColor: c.chocolate }]} />
                ) : (
                  <View style={styles.underlineSpacer} />
                )}
              </Pressable>
            );
          })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    paddingHorizontal: 12,
  },
  bar: {
    minHeight: TAB_BAR_HEIGHT,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 4,
    borderWidth: 1,
    ...float,
  },
  item: { flex: 1, alignItems: "center", gap: 1 },
  iconWrap: {
    width: 32,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 10,
  },
  labelOn: { fontFamily: fonts.bold },
  underline: {
    marginTop: 2,
    width: 18,
    height: 3,
    borderRadius: 2,
  },
  underlineSpacer: { marginTop: 2, height: 3 },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#FFF", fontSize: 9, fontFamily: fonts.bold },
});

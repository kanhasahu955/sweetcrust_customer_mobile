import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { TabGlyph, type TabName } from "@/components/ui/TabIcon";
import { useThemeColors } from "@/context/theme";
import { TAB_BAR_HEIGHT, TAB_WAVE_HEIGHT } from "@/hooks/use-tab-bar-clearance";
import { useI18n } from "@/lib/i18n";
import { colors, fonts } from "@/lib/theme";

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

/** Sine top edge kept fully inside the SVG so lobes don’t clip into a fake U. */
function waveY(t: number, height: number): number {
  const pad = 2;
  const mid = height * 0.52;
  const amp = Math.min(mid - pad, height - mid - pad);
  // 2.5 periods — same clear wavy look as before
  return mid - Math.sin(t * Math.PI * 2.5) * amp;
}

function waveFill(width: number, height: number): string {
  const steps = 80;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = width * t;
    const y = waveY(t, height);
    d += i === 0 ? `M${x.toFixed(2)} ${y.toFixed(2)}` : ` L${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  d += ` L${width} ${height} L0 ${height} Z`;
  return d;
}

function waveLip(width: number, height: number): string {
  const steps = 80;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = width * t;
    const y = waveY(t, height);
    d += i === 0 ? `M${x.toFixed(2)} ${y.toFixed(2)}` : ` L${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

export function FloatingTabBar({ state, descriptors, navigation }: any) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t } = useI18n();
  const bottomPad = Math.max(insets.bottom, 0);
  const waveH = TAB_WAVE_HEIGHT;
  const fill = waveFill(width, waveH);
  const lip = waveLip(width, waveH);
  // Exact same cream as Screen / home scroll — one color end to end
  const dock = c.cream || colors.cream;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {/* Cream fill under the wave + cream bar = same as page (one color). */}
      <View style={[styles.waveWrap, { width, height: waveH }]} pointerEvents="none">
        <Svg width={width} height={waveH}>
          <Path d={fill} fill={dock} />
          <Path
            d={lip}
            stroke="rgba(233,116,142,0.35)"
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>

      <View style={[styles.bar, { paddingBottom: bottomPad, backgroundColor: dock }]}>
        <View style={styles.row}>
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
                  <View style={[styles.iconBubble, focused && styles.iconBubbleOn]}>
                    <TabGlyph name={icon} focused={focused} hot={focused} />
                    {showBadge ? (
                      <View style={[styles.badge, { backgroundColor: c.pink }]}>
                        <Text style={styles.badgeText}>
                          {Number(badge) > 99 ? "99+" : String(badge)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text
                    style={[
                      styles.label,
                      { color: focused ? c.chocolate : c.muted },
                      focused && styles.labelOn,
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
        </View>
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
    width: "100%",
  },
  waveWrap: {
    marginBottom: -1,
  },
  bar: {
    width: "100%",
    minHeight: TAB_BAR_HEIGHT,
    paddingTop: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 4,
    minHeight: TAB_BAR_HEIGHT - 6,
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  iconBubble: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBubbleOn: {
    backgroundColor: "#FFE8EC",
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 10,
  },
  labelOn: { fontFamily: fonts.bold },
  badge: {
    position: "absolute",
    top: -2,
    right: 2,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#FFF", fontSize: 8, fontFamily: fonts.bold },
});

import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { useThemeColors } from "@/context/theme";
import { fonts, radius, space } from "@/lib/theme";

const ITEMS = [
  { icon: "cafe" as const, label: "Freshly Baked" },
  { icon: "shield-checkmark" as const, label: "Quality Assured" },
  { icon: "bicycle" as const, label: "On-time Delivery" },
];

export function TrustStrip() {
  const c = useThemeColors();
  return (
    <View style={[styles.wrap, { backgroundColor: c.blushSoft }]}>
      {ITEMS.map((it, i) => (
        <View key={it.label} style={[styles.item, i < ITEMS.length - 1 && styles.border, { borderColor: c.border }]}>
          <Icon name={it.icon} size={16} color={c.pink} />
          <Text style={[styles.label, { color: c.ink }]} numberOfLines={2}>
            {it.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    borderRadius: radius.md,
    paddingVertical: space.sm,
    marginTop: space.sm,
  },
  item: { flex: 1, alignItems: "center", gap: 4, paddingHorizontal: 4 },
  border: { borderRightWidth: 1 },
  label: { fontFamily: fonts.medium, fontSize: 9, textAlign: "center", lineHeight: 12 },
});

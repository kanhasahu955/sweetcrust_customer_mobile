import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { useThemeColors } from "@/context/theme";
import { useLayout } from "@/hooks/use-layout";
import { fonts, space } from "@/lib/theme";

type Props = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  /** Heart divider under title (cart / favorites style). */
  flourish?: boolean;
  centered?: boolean;
};

export function PageHeader({ title, subtitle, right, flourish, centered }: Props) {
  const { titleSize } = useLayout();
  const c = useThemeColors();

  if (centered || flourish) {
    return (
      <View style={styles.centerWrap}>
        <View style={styles.topRow}>
          <View style={{ width: 40 }} />
          <View style={{ flex: 1 }} />
          {right ? <View style={styles.right}>{right}</View> : <View style={{ width: 40 }} />}
        </View>
        <Text style={[styles.titleCenter, { fontSize: titleSize, color: c.ink }]} numberOfLines={2}>
          {title}
        </Text>
        {flourish ? (
          <View style={styles.flourishLine}>
            <View style={[styles.line, { backgroundColor: c.pink }]} />
            <Icon name="heart" size={12} color={c.pink} />
            <View style={[styles.line, { backgroundColor: c.pink }]} />
          </View>
        ) : null}
        {subtitle ? (
          <Text style={[styles.subCenter, { color: c.muted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.title, { fontSize: titleSize, color: c.ink }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: c.muted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space.sm,
    paddingTop: space.xs,
    paddingBottom: space.sm,
  },
  title: {
    fontFamily: fonts.display,
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
  },
  right: { paddingTop: 4 },
  centerWrap: { alignItems: "center", paddingBottom: space.md, gap: 6 },
  topRow: { flexDirection: "row", width: "100%", justifyContent: "flex-end" },
  titleCenter: {
    fontFamily: fonts.display,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  flourishLine: { flexDirection: "row", alignItems: "center", gap: 8, width: "50%" },
  line: { flex: 1, height: 1.5 },
  subCenter: { fontFamily: fonts.body, fontSize: 13, textAlign: "center" },
});

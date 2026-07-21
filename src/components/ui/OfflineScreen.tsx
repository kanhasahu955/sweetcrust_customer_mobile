import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { useThemeColors } from "@/context/theme";
import { fonts, radius, space } from "@/lib/theme";

type Props = {
  onRetry?: () => void;
  reconnecting?: boolean;
};

/** Full-screen offline state (customer-26). */
export function OfflineScreen({ onRetry, reconnecting }: Props) {
  const c = useThemeColors();
  return (
    <View style={[styles.root, { backgroundColor: c.cream }]}>
      <Text style={[styles.logo, { color: c.ink }]}>SweetCrust</Text>
      <Text style={[styles.bakery, { color: c.muted }]}>• BAKERY •</Text>

      <View style={[styles.hero, { backgroundColor: c.blushSoft, borderColor: c.coral }]}>
        <Icon name="wifi" size={36} color={c.coral} />
        <View style={styles.slash}>
          <Icon name="close" size={28} color={c.coral} />
        </View>
      </View>
      <Icon name="nutrition" size={48} color={c.coral} />

      <Text style={[styles.title, { color: c.ink }]}>You're offline</Text>
      <Text style={[styles.sub, { color: c.cocoa }]}>
        Check your connection. Your cart is saved locally.
      </Text>

      <FloatPress style={[styles.btn, { backgroundColor: c.chocolate }]} onPress={onRetry}>
        <Icon name="refresh" size={18} color="#FFF" />
        <Text style={styles.btnText}>Try Again</Text>
      </FloatPress>

      {reconnecting ? (
        <View style={styles.reconnect}>
          <ActivityIndicator size="small" color={c.coral} />
          <Text style={[styles.reconnectText, { color: c.muted }]}>Reconnecting…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.xl,
    gap: space.sm,
  },
  logo: { fontFamily: fonts.display, fontSize: 28 },
  bakery: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 2, marginBottom: space.md },
  hero: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  slash: { position: "absolute", right: 18, top: 18 },
  title: { fontFamily: fonts.display, fontSize: 28, marginTop: space.md },
  sub: { fontFamily: fonts.body, fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: space.md },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: space.sm,
  },
  btnText: { fontFamily: fonts.bold, color: "#FFF", fontSize: 16 },
  reconnect: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: space.lg },
  reconnectText: { fontFamily: fonts.medium, fontSize: 13 },
});

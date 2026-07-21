import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { BrandHeader } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useThemeColors } from "@/context/theme";
import { fonts, radius, space } from "@/lib/theme";
import { money } from "@/lib/types";

export default function PaymentFailedScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const params = useLocalSearchParams<{ amount?: string; reason?: string }>();
  const amount = Number(params.amount || 0);
  const reason = params.reason || "Payment could not be completed";

  return (
    <Screen>
      <BrandHeader left="back" right="none" />

      <View style={styles.center}>
        <View style={[styles.xOuter, { backgroundColor: c.danger }]}>
          <Icon name="close" size={40} color="#FFF" />
        </View>
        <Text style={[styles.title, { color: c.chocolate }]}>Payment Failed</Text>
        <Text style={[styles.sub, { color: c.muted }]}>
          We couldn't complete your payment. Please try again.
        </Text>

        <View style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}>
          {amount > 0 ? (
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: c.muted }]}>Order Amount</Text>
              <Text style={[styles.rowVal, { color: c.ink }]}>{money(amount)}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: c.muted }]}>Reason</Text>
            <Text style={[styles.rowVal, { color: c.danger, flexShrink: 1, textAlign: "right" }]}>{reason}</Text>
          </View>
        </View>

        <View style={[styles.codRow, { backgroundColor: c.successSoft, borderColor: c.success }]}>
          <Icon name="cash-outline" size={20} color={c.success} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.codTitle, { color: c.success }]}>Cash on Delivery available</Text>
            <Text style={[styles.codSub, { color: c.muted }]}>
              You can still place your order and pay when it arrives.
            </Text>
          </View>
        </View>
      </View>

      <FloatPress
        style={[styles.primary, { backgroundColor: c.coral }]}
        onPress={() => router.replace("/checkout")}
      >
        <Icon name="refresh" size={18} color="#FFF" />
        <Text style={styles.primaryText}>Retry Payment</Text>
      </FloatPress>

      <FloatPress
        style={[styles.secondary, { backgroundColor: c.paper, borderColor: c.coral }]}
        onPress={() => router.replace("/checkout")}
      >
        <Icon name="card-outline" size={18} color={c.coral} />
        <Text style={[styles.secondaryText, { color: c.coral }]}>Choose Another Method</Text>
      </FloatPress>

      <Text style={[styles.footer, { color: c.muted }]}>Thank you for choosing SweetCrust Bakery</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", paddingTop: space.lg, gap: space.sm },
  xOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.sm,
  },
  title: { fontFamily: fonts.display, fontSize: 28 },
  sub: {
    fontFamily: fonts.body,
    textAlign: "center",
    paddingHorizontal: space.lg,
    marginBottom: space.md,
  },
  card: {
    width: "100%",
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    gap: space.md,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
  rowLabel: { fontFamily: fonts.body },
  rowVal: { fontFamily: fonts.bold },
  codRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
    marginTop: space.sm,
  },
  codTitle: { fontFamily: fonts.bold, fontSize: 14 },
  codSub: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.lg,
    paddingVertical: 16,
  },
  primaryText: { fontFamily: fonts.bold, color: "#FFF", fontSize: 16 },
  secondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: space.sm,
    borderRadius: radius.lg,
    paddingVertical: 14,
    borderWidth: 1.5,
  },
  secondaryText: { fontFamily: fonts.bold },
  footer: {
    textAlign: "center",
    fontFamily: fonts.displaySoft,
    marginVertical: space.lg,
    fontSize: 13,
  },
});

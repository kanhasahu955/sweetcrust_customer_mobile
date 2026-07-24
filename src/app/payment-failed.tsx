import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandHeader } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useThemeColors } from "@/context/theme";
import { fonts, space } from "@/lib/theme";
import { money } from "@/lib/types";

export default function PaymentFailedScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ amount?: string; reason?: string; orderId?: string }>();
  const amount = Number(params.amount || 0);
  const reason = params.reason || "Payment could not be completed";
  const orderId = Number(params.orderId || 0);

  function retryPay() {
    if (orderId) {
      router.replace(`/orders/${orderId}`);
      return;
    }
    router.replace("/checkout");
  }

  return (
    <Screen>
      <BrandHeader left="back" right="none" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 28 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={[styles.glow, { backgroundColor: "rgba(233,116,142,0.12)" }]} />
          <View style={[styles.xRing, { borderColor: "rgba(214,69,69,0.22)", backgroundColor: "#FFF" }]}>
            <LinearGradient colors={[c.danger, "#E9748E"]} style={styles.xInner}>
              <Icon name="close" size={36} color="#FFF" />
            </LinearGradient>
          </View>
          <Text style={[styles.title, { color: c.ink }]}>Payment Failed</Text>
          <View style={styles.flourish}>
            <View style={[styles.line, { backgroundColor: c.pink }]} />
            <Icon name="heart" size={11} color={c.pink} />
            <View style={[styles.line, { backgroundColor: c.pink }]} />
          </View>
          <Text style={[styles.sub, { color: c.muted }]}>
            We couldn't complete your payment. Please try again.
          </Text>
        </View>

        <View style={[styles.card, { borderColor: c.border }]}>
          {orderId ? (
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: c.muted }]}>Order</Text>
              <Text style={[styles.rowVal, { color: c.ink }]}>#{orderId}</Text>
            </View>
          ) : null}
          {amount > 0 ? (
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: c.muted }]}>Order Amount</Text>
              <Text style={[styles.rowVal, { color: c.pink }]}>{money(amount)}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: c.muted }]}>Reason</Text>
            <Text style={[styles.reason, { color: c.danger }]}>{reason}</Text>
          </View>
        </View>

        <View style={[styles.codCard, { backgroundColor: c.successSoft, borderColor: "rgba(46,160,100,0.35)" }]}>
          <View style={[styles.codIcon, { backgroundColor: "#FFFFFF" }]}>
            <Icon name="cash-outline" size={18} color={c.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.codTitle, { color: c.success }]}>Cash on Delivery available</Text>
            <Text style={[styles.codSub, { color: c.muted }]}>
              {orderId
                ? "Open the order and pay with Razorpay, or place a new COD order from cart."
                : "You can still place your order and pay when it arrives."}
            </Text>
          </View>
        </View>

        <FloatPress onPress={retryPay}>
          <LinearGradient colors={[c.pink, "#D45A78"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primary}>
            <Icon name="refresh" size={18} color="#FFF" />
            <Text style={styles.primaryText}>{orderId ? "Pay this order" : "Retry Payment"}</Text>
          </LinearGradient>
        </FloatPress>

        <FloatPress
          style={[styles.secondary, { backgroundColor: "#FFFFFF", borderColor: c.pink }]}
          onPress={() => router.replace(orderId ? `/orders/${orderId}` : "/checkout")}
        >
          <Icon name="card-outline" size={18} color={c.pink} />
          <Text style={[styles.secondaryText, { color: c.pink }]}>
            {orderId ? "Open order details" : "Choose Another Method"}
          </Text>
        </FloatPress>

        <Text style={[styles.footer, { color: c.muted }]}>Thank you for choosing SweetCrust Bakery</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { flexGrow: 1, gap: 14, paddingTop: 8 },
  hero: { alignItems: "center", paddingTop: space.md, gap: 8, marginBottom: 4 },
  glow: {
    position: "absolute",
    top: 4,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  xRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  xInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.3 },
  flourish: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: 120,
    marginVertical: 2,
  },
  line: { flex: 1, height: 1.5, borderRadius: 1 },
  sub: {
    fontFamily: fonts.body,
    textAlign: "center",
    paddingHorizontal: space.md,
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#6A849C",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  rowLabel: { fontFamily: fonts.body, fontSize: 14 },
  rowVal: { fontFamily: fonts.bold, fontSize: 14 },
  reason: { fontFamily: fonts.bold, fontSize: 13, flexShrink: 1, textAlign: "right", lineHeight: 18 },
  codCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  codIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  codTitle: { fontFamily: fonts.bold, fontSize: 14 },
  codSub: { fontFamily: fonts.body, fontSize: 12, marginTop: 2, lineHeight: 17 },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 18,
    paddingVertical: 16,
    shadowColor: "#E9748E",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  primaryText: { fontFamily: fonts.bold, color: "#FFF", fontSize: 16 },
  secondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1.5,
  },
  secondaryText: { fontFamily: fonts.bold, fontSize: 15 },
  footer: {
    textAlign: "center",
    fontFamily: fonts.displaySoft,
    marginTop: 8,
    fontSize: 13,
  },
});

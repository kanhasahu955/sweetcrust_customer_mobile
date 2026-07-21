import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { BrandHeader } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useThemeColors } from "@/context/theme";
import { fonts, radius, space } from "@/lib/theme";
import { money } from "@/lib/types";

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const params = useLocalSearchParams<{
    orderId?: string;
    orderNumber?: string;
    amount?: string;
  }>();
  const orderId = params.orderId || "";
  const orderNumber = params.orderNumber || (orderId ? `SC-${orderId}` : "—");
  const amount = Number(params.amount || 0);

  return (
    <Screen>
      <BrandHeader left="none" right="none" />

      <View style={styles.center}>
        <View style={[styles.checkOuter, { borderColor: c.success }]}>
          <View style={[styles.checkInner, { backgroundColor: c.success }]}>
            <Icon name="checkmark" size={40} color="#FFF" />
          </View>
        </View>
        <Text style={[styles.title, { color: c.chocolate }]}>Payment Successful</Text>
        <Text style={[styles.sub, { color: c.muted }]}>Thank you! Your order has been confirmed.</Text>

        <View style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}>
          <Text style={[styles.amtLabel, { color: c.muted }]}>Amount Paid</Text>
          <Text style={[styles.amt, { color: c.chocolate }]}>{money(amount)}</Text>
          <View style={[styles.divider, { borderColor: c.border }]} />
          <Row label="Order ID" value={orderNumber} />
          {orderId ? <Row label="Order #" value={String(orderId)} /> : null}
        </View>

        <View style={[styles.secure, { backgroundColor: c.successSoft }]}>
          <Icon name="shield-checkmark" size={14} color={c.success} />
          <Text style={[styles.secureText, { color: c.success }]}>Secure payment · Your payment is safe</Text>
        </View>
      </View>

      <FloatPress
        style={[styles.primary, { backgroundColor: c.chocolate }]}
        onPress={() => {
          if (orderId) router.replace({ pathname: "/order-confirm", params: { orderId } });
          else router.replace("/(tabs)/orders");
        }}
      >
        <Icon name="receipt-outline" size={18} color="#FFF" />
        <Text style={styles.primaryText}>Continue to Order</Text>
      </FloatPress>

      {orderId ? (
        <FloatPress
          style={[styles.secondary, { backgroundColor: c.paper, borderColor: c.chocolate }]}
          onPress={() => router.replace(`/invoice/${orderId}`)}
        >
          <Icon name="download-outline" size={18} color={c.chocolate} />
          <Text style={[styles.secondaryText, { color: c.chocolate }]}>Download Invoice</Text>
        </FloatPress>
      ) : null}

      {orderId ? (
        <FloatPress
          style={[styles.secondary, { backgroundColor: c.paper, borderColor: c.border }]}
          onPress={() => router.replace(`/track/${orderId}`)}
        >
          <Icon name="bicycle" size={18} color={c.ink} />
          <Text style={[styles.secondaryText, { color: c.ink }]}>Track Live</Text>
        </FloatPress>
      ) : null}

      <Text style={[styles.footer, { color: c.muted }]}>Baked with love, just for you</Text>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const c = useThemeColors();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: c.muted }]}>{label}</Text>
      <Text style={[styles.rowVal, { color: c.ink }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", paddingTop: space.md, gap: space.sm },
  checkOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.sm,
  },
  checkInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.display, fontSize: 28, textAlign: "center" },
  sub: { fontFamily: fonts.body, textAlign: "center", marginBottom: space.md, paddingHorizontal: space.lg },
  card: {
    width: "100%",
    borderRadius: radius.xl,
    padding: space.lg,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  amtLabel: { fontFamily: fonts.medium, fontSize: 13 },
  amt: { fontFamily: fonts.display, fontSize: 36 },
  divider: {
    alignSelf: "stretch",
    borderBottomWidth: 1,
    borderStyle: "dashed",
    marginVertical: space.sm,
  },
  row: {
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  rowLabel: { fontFamily: fonts.body },
  rowVal: { fontFamily: fonts.bold },
  secure: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: space.sm,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  secureText: { fontFamily: fonts.medium, fontSize: 12 },
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
    borderWidth: 1,
  },
  secondaryText: { fontFamily: fonts.bold },
  footer: {
    textAlign: "center",
    fontFamily: fonts.displaySoft,
    marginVertical: space.md,
    fontSize: 13,
  },
});

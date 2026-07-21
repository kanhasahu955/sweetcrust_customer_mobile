import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { TrustStrip } from "@/components/ui/TrustStrip";
import { useThemeColors } from "@/context/theme";
import { api } from "@/lib/api";
import { fonts, radius, space } from "@/lib/theme";
import { money, type Order } from "@/lib/types";

export default function OrderConfirmScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const id = Number(orderId);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(Boolean(id));

  const load = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const data = (await api.customer.order(id)) as { order: Order };
      setOrder(data.order);
    } catch {
      setOrder({ id } as Order);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={c.pink} />
        </View>
      </Screen>
    );
  }

  const number = order?.order_number || (id ? `SC-${id}` : "—");

  return (
    <Screen>
      <BrandHeader left="none" right="none" />
      <TitleFlourish title="Order Confirmed!" subtitle="We're baking happiness for you" />

      <View style={styles.centerFlex}>
        <View style={[styles.checkOuter, { backgroundColor: c.successSoft }]}>
          <View style={[styles.checkInner, { backgroundColor: c.success }]}>
            <Icon name="checkmark" size={36} color="#FFF" />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}>
          <Row label="Order Number" value={number} />
          <Row
            label="Payment Status"
            value={String(order?.payment_status || "paid")}
            badge
          />
          <Row label="Amount Paid" value={money(order?.final_amount)} />
          {order?.delivery_slot ? <Row label="Delivery slot" value={order.delivery_slot} /> : null}
        </View>

        <TrustStrip />
      </View>

      <FloatPress
        style={[styles.primary, { backgroundColor: c.chocolate }]}
        onPress={() => {
          if (id) router.replace(`/track/${id}`);
          else router.replace("/(tabs)/orders");
        }}
      >
        <Icon name="bicycle" size={18} color="#FFF" />
        <Text style={styles.primaryText}>Track Order</Text>
      </FloatPress>
      <FloatPress
        style={[styles.secondary, { backgroundColor: c.paper, borderColor: c.chocolate }]}
        onPress={() => router.replace("/(tabs)/catalog")}
      >
        <Icon name="bag-handle-outline" size={18} color={c.chocolate} />
        <Text style={[styles.secondaryText, { color: c.chocolate }]}>Continue Shopping</Text>
      </FloatPress>
    </Screen>
  );
}

function Row({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  const c = useThemeColors();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: c.muted }]}>{label}</Text>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: c.successSoft }]}>
          <Text style={[styles.badgeText, { color: c.success }]}>{value}</Text>
        </View>
      ) : (
        <Text style={[styles.rowVal, { color: c.ink }]}>{value}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerFlex: { flex: 1, alignItems: "center", gap: space.sm },
  checkOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
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
  card: {
    width: "100%",
    borderRadius: radius.xl,
    padding: space.lg,
    borderWidth: 1,
    gap: space.md,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  rowLabel: { fontFamily: fonts.body },
  rowVal: { fontFamily: fonts.bold, textTransform: "capitalize" },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, textTransform: "capitalize" },
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
    marginBottom: space.lg,
    borderRadius: radius.lg,
    paddingVertical: 14,
    borderWidth: 1,
  },
  secondaryText: { fontFamily: fonts.bold },
});

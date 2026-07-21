import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { FadeIn } from "@/components/FadeIn";
import { Banner } from "@/components/ui/Banner";
import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useThemeColors } from "@/context/theme";
import { useTabBarClearance } from "@/hooks/use-tab-bar-clearance";
import { api } from "@/lib/api";
import { float, fonts, radius, space } from "@/lib/theme";
import { money, type Order } from "@/lib/types";

const TABS = [
  { key: "active", label: "Active" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
] as const;

function statusPillStyle(status: string, c: ReturnType<typeof useThemeColors>) {
  const s = status.toLowerCase();
  if (s.includes("deliver")) return { bg: c.successSoft, fg: c.success };
  if (s.includes("cancel")) return { bg: c.blushSoft, fg: c.danger };
  if (s.includes("prepar") || s.includes("pack")) return { bg: "#FFF3E0", fg: c.warning };
  return { bg: c.blushSoft, fg: c.pink };
}

export default function OrdersScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const clearance = useTabBarClearance(16);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("active");
  const [items, setItems] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.customer.orders(tab);
      setItems((data.items || []) as Order[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load orders");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  return (
    <Screen>
      <BrandHeader left="none" right="bell" />
      <FadeIn>
        <TitleFlourish title="My Orders" subtitle="Track what's baking and what's done" />
        <View style={styles.tabs}>
          {TABS.map((t) => (
            <FloatPress
              key={t.key}
              style={[
                styles.tab,
                { backgroundColor: c.paper, borderColor: c.border },
                tab === t.key && { backgroundColor: c.chocolate, borderColor: c.chocolate },
              ]}
              onPress={() => {
                setTab(t.key);
                setLoading(true);
              }}
            >
              <Text style={[styles.tabText, { color: c.cocoa }, tab === t.key && { color: "#FFF" }]}>
                {t.label}
              </Text>
            </FloatPress>
          ))}
        </View>
      </FadeIn>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.pink} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: clearance }]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
          showsVerticalScrollIndicator={false}
        >
          {error ? <Banner text={error} tone="danger" /> : null}
          {!items.length ? (
            <Text style={[styles.empty, { color: c.muted }]}>No orders in this list yet.</Text>
          ) : (
            items.map((o) => {
              const status = String(o.status || "").replace(/_/g, " ");
              const paid = String(o.payment_status || "").toLowerCase() === "paid";
              const pill = statusPillStyle(status, c);
              return (
                <View key={o.id} style={[styles.card, float, { backgroundColor: c.paper, borderColor: c.border }]}>
                  <View style={styles.row}>
                    <Text style={[styles.cardTitle, { color: c.ink }]}>
                      {o.order_number || `Order #${o.id}`}
                    </Text>
                    <Text style={[styles.amount, { color: c.pink }]}>{money(o.final_amount)}</Text>
                  </View>
                  <Text style={[styles.meta, { color: c.muted }]}>
                    {o.delivery_date ? `${o.delivery_date}` : ""}
                    {o.delivery_slot ? ` · ${o.delivery_slot}` : ""}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={[styles.pill, { backgroundColor: paid ? c.successSoft : c.blushSoft }]}>
                      <Text style={[styles.pillText, { color: paid ? c.success : c.coral }]}>
                        {paid ? "Paid" : String(o.payment_status || "Pending")}
                      </Text>
                    </View>
                    <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                      <Text style={[styles.pillText, { color: pill.fg }]}>{status || "placed"}</Text>
                    </View>
                  </View>
                  <View style={styles.actions}>
                    <FloatPress
                      style={[styles.trackBtn, { backgroundColor: c.pink }]}
                      onPress={() => router.push(`/track/${o.id}`)}
                    >
                      <Icon name="bicycle" size={16} color="#FFF" />
                      <Text style={styles.trackText}>Track Order</Text>
                    </FloatPress>
                    <FloatPress
                      style={[styles.detailBtn, { borderColor: c.pink }]}
                      onPress={() => router.push(`/orders/${o.id}`)}
                    >
                      <Text style={[styles.detailText, { color: c.pink }]}>View Details ›</Text>
                    </FloatPress>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8, marginBottom: space.md },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
  },
  tabText: { fontFamily: fonts.bold, fontSize: 13 },
  content: { gap: space.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
    gap: 8,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16 },
  amount: { fontFamily: fonts.bold },
  meta: { textTransform: "capitalize", fontFamily: fonts.body, fontSize: 13 },
  badgeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  pill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontFamily: fonts.bold, fontSize: 11, textTransform: "capitalize" },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  trackBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.md,
    paddingVertical: 10,
  },
  trackText: { color: "#FFF", fontFamily: fonts.bold, fontSize: 13 },
  detailBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  detailText: { fontFamily: fonts.bold, fontSize: 13 },
  empty: { textAlign: "center", marginTop: 40, fontFamily: fonts.body },
});

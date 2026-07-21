import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Banner } from "@/components/ui/Banner";
import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { OfflineBanner, isNetworkError } from "@/components/ui/OfflineBanner";
import { Screen } from "@/components/ui/Screen";
import { Skeleton } from "@/components/ui/Skeleton";
import { useThemeColors } from "@/context/theme";
import { api } from "@/lib/api";
import { fonts, radius, space } from "@/lib/theme";
import { money } from "@/lib/types";

type Invoice = {
  id?: number;
  order_id?: number;
  invoice_number?: string;
  bakery_name?: string;
  gstin?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string | null;
  line_items?: unknown;
  subtotal?: number;
  discount?: number;
  gst_amount?: number;
  delivery_fee?: number;
  grand_total?: number;
  payment_method?: string | null;
  transaction_id?: string | null;
  notes?: string | null;
  created_at?: string;
};

export default function InvoiceScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const [inv, setInv] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    setError(null);
    try {
      const res = (await api.customer.invoice(orderId)) as Invoice;
      setInv(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invoice unavailable");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const lines = normalizeLines(inv?.line_items);

  return (
    <Screen>
      <BrandHeader left="back" right="none" />
      <TitleFlourish
        title="Invoice"
        subtitle={inv?.invoice_number || (orderId ? `Order #${orderId}` : undefined)}
      />

      <OfflineBanner offline={Boolean(error && isNetworkError(error))} error={error} onRetry={load} />

      {loading && !inv ? (
        <View style={styles.skel}>
          <Skeleton height={80} />
          <Skeleton height={160} />
          <Skeleton height={100} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
          showsVerticalScrollIndicator={false}
        >
          {error && !isNetworkError(error) ? <Banner text={error} tone="danger" /> : null}
          {!inv && !error ? <Banner text="Invoice not found" tone="warn" /> : null}

          {inv ? (
            <>
              <View style={[styles.hero, { backgroundColor: c.chocolate }]}>
                <Icon name="receipt-outline" size={24} color={c.blush} />
                <Text style={[styles.bakery, { color: c.white }]}>{inv.bakery_name || "SweetCrust Bakery"}</Text>
                <Text style={[styles.invNo, { color: c.blush }]}>#{inv.invoice_number || inv.id || orderId}</Text>
                {inv.gstin ? <Text style={styles.metaLight}>GSTIN: {inv.gstin}</Text> : null}
                {inv.created_at ? (
                  <Text style={styles.metaLight}>{new Date(inv.created_at).toLocaleString("en-IN")}</Text>
                ) : null}
              </View>

              <View style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}>
                <View style={styles.sectionRow}>
                  <Icon name="person-outline" size={16} color={c.pink} />
                  <Text style={[styles.section, { color: c.muted }]}>Bill to</Text>
                </View>
                <Text style={[styles.bold, { color: c.ink }]}>{inv.customer_name || "—"}</Text>
                <Text style={[styles.meta, { color: c.muted }]}>{inv.customer_phone || ""}</Text>
                {inv.customer_address ? <Text style={[styles.meta, { color: c.muted }]}>{inv.customer_address}</Text> : null}
              </View>

              {lines.length ? (
                <View style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}>
                  <View style={styles.sectionRow}>
                    <Icon name="bag-handle-outline" size={16} color={c.pink} />
                    <Text style={[styles.section, { color: c.muted }]}>Items</Text>
                  </View>
                  {lines.map((line, i) => (
                    <View key={i} style={styles.lineRow}>
                      <Text style={[styles.lineName, { color: c.ink }]}>
                        {line.name} × {line.qty}
                      </Text>
                      <Text style={[styles.lineAmt, { color: c.pink }]}>{money(line.total)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}>
                <MoneyRow label="Subtotal" value={inv.subtotal} />
                <MoneyRow label="Discount" value={inv.discount} />
                <MoneyRow label="GST" value={inv.gst_amount} />
                <MoneyRow label="Delivery" value={inv.delivery_fee} />
                <View style={[styles.divider, { borderColor: c.border }]} />
                <MoneyRow label="Grand total" value={inv.grand_total} bold />
                {inv.payment_method ? (
                  <View style={styles.payRow}>
                    <Icon name="card-outline" size={14} color={c.muted} />
                    <Text style={[styles.meta, { color: c.muted }]}>
                      Paid via {String(inv.payment_method).replace(/_/g, " ")}
                    </Text>
                  </View>
                ) : null}
                {inv.transaction_id ? (
                  <Text style={[styles.meta, { color: c.muted }]}>Txn: {inv.transaction_id}</Text>
                ) : null}
              </View>

              <FloatPress
                style={[styles.cta, { backgroundColor: c.chocolate }]}
                onPress={() => router.push(`/orders/${orderId}`)}
              >
                <Icon name="eye-outline" size={18} color="#FFF" />
                <Text style={styles.ctaText}>View order</Text>
              </FloatPress>
            </>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

function MoneyRow({ label, value, bold }: { label: string; value?: number; bold?: boolean }) {
  const c = useThemeColors();
  return (
    <View style={styles.moneyRow}>
      <Text style={[styles.meta, bold && styles.bold, { color: bold ? c.ink : c.muted }]}>{label}</Text>
      <Text style={[styles.meta, bold && styles.bold, { color: bold ? c.pink : c.muted }]}>{money(value)}</Text>
    </View>
  );
}

function normalizeLines(raw: unknown): { name: string; qty: number; total: number }[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((r) => {
      const o = r as Record<string, unknown>;
      return {
        name: String(o.name || o.product_name || "Item"),
        qty: Number(o.qty || o.quantity || 1),
        total: Number(o.total || o.total_price || o.amount || 0),
      };
    });
  }
  if (typeof raw === "object" && raw !== null && Array.isArray((raw as { items?: unknown }).items)) {
    return normalizeLines((raw as { items: unknown[] }).items);
  }
  return [];
}

const styles = StyleSheet.create({
  skel: { gap: space.md },
  content: { gap: space.sm, paddingBottom: 48 },
  hero: {
    borderRadius: radius.xl,
    padding: space.lg,
    gap: 4,
    alignItems: "flex-start",
  },
  bakery: { fontFamily: fonts.display, fontSize: 22, marginTop: 4 },
  invNo: { fontFamily: fonts.bold, fontSize: 15 },
  metaLight: { fontFamily: fonts.body, color: "rgba(255,255,255,0.75)", fontSize: 13 },
  card: {
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    gap: 6,
  },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  section: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  bold: { fontFamily: fonts.bold },
  meta: { fontFamily: fonts.body },
  lineRow: { flexDirection: "row", justifyContent: "space-between", gap: 8, paddingVertical: 4 },
  lineName: { fontFamily: fonts.medium, flex: 1 },
  lineAmt: { fontFamily: fonts.bold },
  moneyRow: { flexDirection: "row", justifyContent: "space-between" },
  divider: { borderBottomWidth: 1, borderStyle: "dashed", marginVertical: 6 },
  payRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: space.sm,
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  ctaText: { fontFamily: fonts.bold, color: "#FFF" },
});

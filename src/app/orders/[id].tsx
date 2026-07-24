import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";

import { FadeIn } from "@/components/FadeIn";
import { Banner } from "@/components/ui/Banner";
import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useApp } from "@/context/app";
import { useThemeColors } from "@/context/theme";
import { api } from "@/lib/api";
import { waitForPaymentStatus } from "@/lib/payment";
import { connectSocket, getSocket, joinOrderRoom } from "@/lib/socket";
import { float, fonts, radius, space } from "@/lib/theme";
import { money, type Order } from "@/lib/types";

type OrderItem = {
  id: number;
  product_id?: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type TrackPayload = {
  stages?: string[];
  timeline?: { status?: string; note?: string; created_at?: string }[];
  tracking?: {
    rider_lat?: number | null;
    rider_lng?: number | null;
    eta_minutes?: number | null;
    status?: string | null;
  } | null;
  delivery_person?: { id?: number; name?: string; phone?: string } | null;
};

const STAGE_LABELS: Record<string, string> = {
  placed: "Placed",
  payment_received: "Paid",
  accepted: "Accepted",
  preparing: "Preparing",
  packed: "Packed",
  delivery_assigned: "Rider assigned",
  picked_up: "Picked up",
  out_for_delivery: "Out for delivery",
  near_location: "Nearby",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function OrderDetailScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { refreshCart } = useApp();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [track, setTrack] = useState<TrackPayload | null>(null);
  const [invoice, setInvoice] = useState<Record<string, unknown> | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [liveNote, setLiveNote] = useState<string | null>(null);
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");

  const load = useCallback(async () => {
    if (!orderId) return;
    setError(null);
    try {
      const [data, tracking] = await Promise.all([
        api.customer.order(orderId) as Promise<{ order: Order; items: OrderItem[] }>,
        api.customer.trackOrder(orderId).catch(() => null),
      ]);
      setOrder(data.order);
      setItems(data.items || []);
      setTrack(tracking as TrackPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    (async () => {
      const s = await connectSocket();
      if (!active || !s) return;
      joinOrderRoom(orderId);
      const onStatus = (payload: { order_id?: number; status?: string }) => {
        if (payload?.order_id && Number(payload.order_id) !== orderId) return;
        setLiveNote(`Live update: ${String(payload.status || "").replace(/_/g, " ")}`);
        load();
      };
      const onLoc = (payload: { order_id?: number; lat?: number; lng?: number; eta_minutes?: number }) => {
        if (payload?.order_id && Number(payload.order_id) !== orderId) return;
        setTrack((t) => ({
          ...(t || {}),
          tracking: {
            ...(t?.tracking || {}),
            rider_lat: payload.lat,
            rider_lng: payload.lng,
            eta_minutes: payload.eta_minutes ?? t?.tracking?.eta_minutes,
          },
        }));
        if (payload.eta_minutes != null) setLiveNote(`Rider ETA ~${payload.eta_minutes} mins`);
      };
      s.on("order_status", onStatus);
      s.on("delivery_location", onLoc);
      return () => {
        s.off("order_status", onStatus);
        s.off("delivery_location", onLoc);
      };
    })();
    return () => {
      active = false;
      const s = getSocket();
      s?.off("order_status");
      s?.off("delivery_location");
    };
  }, [orderId, load]);

  const currentStatus = String(order?.status || track?.tracking?.status || "").toLowerCase();
  const stages = track?.stages || Object.keys(STAGE_LABELS).filter((k) => k !== "cancelled");
  const stageIndex = useMemo(() => {
    const idx = stages.findIndex((s) => s === currentStatus);
    return idx >= 0 ? idx : 0;
  }, [stages, currentStatus]);

  async function cancel() {
    setBusy(true);
    try {
      await api.customer.cancelOrder(orderId);
      setMsg("Order cancelled");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  async function reorder() {
    setBusy(true);
    try {
      await api.customer.reorder(orderId);
      await refreshCart();
      setMsg("Items added to cart");
      router.push("/cart");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reorder failed");
    } finally {
      setBusy(false);
    }
  }

  async function rate() {
    setBusy(true);
    try {
      await api.customer.rateOrder(orderId, { rating: Number(rating) || 5, comment: comment.trim() || undefined });
      setMsg("Thanks for rating!");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rating failed");
    } finally {
      setBusy(false);
    }
  }

  async function payRazorpay() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const rz = await api.payments.razorpayCreate(orderId);
      const url = rz.short_url || rz.payment_link?.short_url;
      if (!url) {
        setError("Payment link unavailable");
        return;
      }
      await WebBrowser.openBrowserAsync(url);
      const status = await waitForPaymentStatus(orderId);
      await load();
      if (status === "paid") setMsg("Payment received");
      else if (status === "failed") setError("Payment failed or cancelled");
      else setMsg("Payment still pending — pull to refresh in a moment");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  async function loadInvoice() {
    setBusy(true);
    try {
      const inv = (await api.customer.invoice(orderId)) as Record<string, unknown>;
      setInvoice(inv);
      setShowInvoice(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invoice unavailable");
    } finally {
      setBusy(false);
    }
  }

  async function chatAboutOrder() {
    setBusy(true);
    try {
      await api.customer.createChat({
        category: "order",
        order_id: orderId,
        initial_message: `Help with order ${order?.order_number || orderId}`,
      });
      router.push("/(tabs)/chat");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start chat");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !order) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={c.pink} />
        </View>
      </Screen>
    );
  }

  if (!order) {
    return (
      <Screen>
        <BrandHeader left="back" right="none" />
        <Banner text={error || "Order not found"} tone="danger" />
      </Screen>
    );
  }

  const status = currentStatus.replace(/_/g, " ");
  const payPending = String(order.payment_status || "").toLowerCase() === "pending";
  const canCancel = !["cancelled", "delivered", "out_for_delivery", "near_location", "picked_up"].includes(
    currentStatus
  );
  const rider = track?.delivery_person;
  const eta = track?.tracking?.eta_minutes;
  const itemIds = items.map((i) => i.id).join(",");

  return (
    <Screen smoky={false}>
      <BrandHeader left="back" right="none" />
      <TitleFlourish
        title={order.order_number || `Order #${order.id}`}
        subtitle={status || "placed"}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn>
          <LinearGradient colors={[c.chocolate, c.inkSoft]} style={styles.hero}>
            <Text style={styles.number}>{order.order_number || `Order #${order.id}`}</Text>
            <Text style={styles.status}>{status || "placed"}</Text>
            <Text style={styles.amount}>{money(order.final_amount)}</Text>
            {eta != null ? <Text style={styles.etaLive}>ETA ~{eta} mins</Text> : null}
            {liveNote ? <Text style={styles.live}>{liveNote}</Text> : null}
          </LinearGradient>
        </FadeIn>

        {error ? <Banner text={error} tone="danger" /> : null}
        {msg ? <Banner text={msg} tone="ok" /> : null}

        <Text style={[styles.heading, { color: c.caramel }]}>Progress</Text>
        <View style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}>
          {stages.map((s, i) => {
            const done = i <= stageIndex && currentStatus !== "cancelled";
            const active = i === stageIndex;
            return (
              <View key={s} style={styles.stageRow}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: c.border },
                    done && { backgroundColor: c.pink },
                    active && { width: 14, height: 14, borderRadius: 7, backgroundColor: c.coral },
                  ]}
                />
                <Text style={[styles.stageText, { color: c.muted }, done && { color: c.ink, fontFamily: fonts.bold }]}>
                  {STAGE_LABELS[s] || s.replace(/_/g, " ")}
                </Text>
              </View>
            );
          })}
        </View>

        {rider?.name || track?.tracking?.rider_lat != null ? (
          <>
            <Text style={[styles.heading, { color: c.caramel }]}>Rider</Text>
            <View style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}>
              <Text style={[styles.meta, { color: c.muted }]}>{rider?.name || "Delivery partner"}</Text>
              {rider?.phone ? <Text style={styles.meta}>Phone: {rider.phone}</Text> : null}
              {track?.tracking?.rider_lat != null ? (
                <Text style={styles.meta}>
                  Live: {Number(track.tracking.rider_lat).toFixed(4)},{" "}
                  {Number(track.tracking.rider_lng || 0).toFixed(4)}
                </Text>
              ) : (
                <Text style={styles.meta}>Waiting for live location…</Text>
              )}
            </View>
          </>
        ) : null}

        <Text style={[styles.heading, { color: c.caramel }]}>Items</Text>
        {items.map((item) => (
          <View key={item.id} style={[styles.row, { backgroundColor: c.paper, borderColor: c.border }]}>
            <Text style={[styles.rowTitle, { color: c.ink }]}>
              {item.product_name} × {item.quantity}
            </Text>
            <Text style={[styles.rowPrice, { color: c.pink }]}>{money(item.total_price)}</Text>
          </View>
        ))}

        <Text style={[styles.heading, { color: c.caramel }]}>Delivery</Text>
        <View style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}>
          <Text style={styles.meta}>Date: {order.delivery_date || "—"}</Text>
          <Text style={styles.meta}>Slot: {order.delivery_slot || "—"}</Text>
          <Text style={styles.meta}>Phone: {order.customer_phone || "—"}</Text>
          <Text style={styles.meta}>
            Payment: {String(order.payment_method || "—").replace(/_/g, " ")} (
            {String(order.payment_status || "—")})
          </Text>
        </View>

        {track?.timeline?.length ? (
          <>
            <Text style={styles.heading}>Timeline</Text>
            <View style={styles.card}>
              {track.timeline.map((t, i) => (
                <Text key={i} style={styles.meta}>
                  {String(t.status || "").replace(/_/g, " ")}
                  {t.note ? ` — ${t.note}` : ""}
                </Text>
              ))}
            </View>
          </>
        ) : null}

        <View style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}>
          <Line label="Subtotal" value={order.subtotal} />
          <Line label="GST" value={order.gst_amount} />
          <Line label="Delivery" value={order.delivery_fee} />
          <Line label="Total" value={order.final_amount} bold />
        </View>

        {payPending ? (
          <FloatPress onPress={payRazorpay} disabled={busy}>
            <LinearGradient colors={[c.pink, c.coral]} style={styles.cta}>
              <Icon name="card-outline" size={18} color="#FFF" />
              <Text style={styles.ctaText}>Pay online</Text>
            </LinearGradient>
          </FloatPress>
        ) : null}

        <ActionBtn icon="bicycle" label="Live tracking" onPress={() => router.push(`/track/${orderId}`)} />
        <ActionBtn
          icon="share-outline"
          label="Share tracking"
          onPress={async () => {
            try {
              const res = (await api.customer.shareTrack(orderId)) as { token?: string; url?: string };
              const token = res.token;
              if (token) router.push(`/share-track/${token}`);
              else setError("Could not create share link");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Share failed");
            }
          }}
          disabled={busy}
        />
        <ActionBtn icon="refresh" label="Reorder" onPress={reorder} disabled={busy} />
        <ActionBtn icon="document-text-outline" label="View invoice" onPress={() => router.push(`/invoice/${orderId}`)} disabled={busy} />
        <ActionBtn icon="receipt-outline" label="Invoice summary" onPress={loadInvoice} disabled={busy} />
        <ActionBtn icon="chatbubble-outline" label="Chat about this order" onPress={chatAboutOrder} disabled={busy} />
        <ActionBtn icon="call-outline" label="Call bakery / rider" onPress={() => router.push("/calls")} />
        <ActionBtn
          icon="return-down-back-outline"
          label="Request return"
          onPress={() =>
            router.push({
              pathname: "/returns",
              params: { order_id: String(orderId), item_ids: itemIds },
            })
          }
        />

        {canCancel ? (
          <ActionBtn icon="close-circle-outline" label="Cancel order" onPress={cancel} disabled={busy} danger />
        ) : null}

        {showInvoice && invoice ? (
          <View style={styles.card}>
            <Text style={styles.headingInline}>Invoice</Text>
            <Text style={styles.meta}>#{String(invoice.invoice_number || invoice.id || orderId)}</Text>
            <Text style={styles.meta}>Amount: {money(Number(invoice.total || invoice.final_amount || order.final_amount))}</Text>
            {"gstin" in invoice ? <Text style={styles.meta}>GSTIN: {String(invoice.gstin)}</Text> : null}
          </View>
        ) : null}

        {currentStatus === "delivered" ? (
          <>
            <ActionBtn
              icon="star-outline"
              label="Rate & review"
              onPress={() =>
                router.push({ pathname: "/rate-review", params: { order_id: String(orderId) } })
              }
            />
            <Text style={[styles.heading, { color: c.caramel }]}>Quick rating</Text>
            <TextInput
              style={[styles.input, { borderColor: c.border, backgroundColor: c.paper, color: c.ink }]}
              value={rating}
              onChangeText={setRating}
              keyboardType="number-pad"
              placeholder="1–5"
              placeholderTextColor={c.muted}
            />
            <TextInput
              style={[styles.input, { borderColor: c.border, backgroundColor: c.paper, color: c.ink }]}
              value={comment}
              onChangeText={setComment}
              placeholder="Comment"
              placeholderTextColor={c.muted}
            />
            <ActionBtn icon="checkmark-circle-outline" label="Submit rating" onPress={rate} disabled={busy} />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ActionBtn({
  icon,
  label,
  onPress,
  disabled,
  danger,
}: {
  icon: string;
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  danger?: boolean;
}) {
  const c = useThemeColors();
  return (
    <FloatPress
      style={[
        styles.actionBtn,
        float,
        { backgroundColor: c.paper, borderColor: danger ? c.danger : c.border },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Icon name={icon} size={18} color={danger ? c.danger : c.chocolate} />
      <Text style={[styles.actionText, { color: danger ? c.danger : c.ink }]}>{label}</Text>
      <Icon name="chevron-forward" size={16} color={c.muted} />
    </FloatPress>
  );
}

function Line({ label, value, bold }: { label: string; value?: number; bold?: boolean }) {
  const c = useThemeColors();
  return (
    <View style={styles.line}>
      <Text style={[styles.meta, { color: bold ? c.ink : c.muted }, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.meta, { color: bold ? c.ink : c.muted }, bold && styles.bold]}>{money(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.sm, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: {
    borderRadius: radius.xl,
    padding: space.lg,
    gap: 6,
    marginBottom: space.sm,
  },
  number: { color: "#FFF", fontSize: 22, fontFamily: fonts.display },
  status: { color: "#FFD0C2", fontFamily: fonts.bold, textTransform: "capitalize" },
  amount: { color: "#FFF", fontSize: 28, fontFamily: fonts.bold, marginTop: 4 },
  etaLive: { color: "#FFD0B8", fontFamily: fonts.bold, marginTop: 4 },
  live: { color: "#B8FFCE", fontFamily: fonts.medium, fontSize: 12, marginTop: 4 },
  heading: {
    marginTop: space.md,
    fontSize: 12,
    fontFamily: fonts.bold,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  headingInline: { fontFamily: fonts.bold, marginBottom: 4 },
  stageRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  stageText: { fontFamily: fonts.body, textTransform: "capitalize" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.md,
  },
  rowTitle: { fontFamily: fonts.medium, flex: 1, paddingRight: 8 },
  rowPrice: { fontFamily: fonts.bold },
  card: { borderRadius: radius.md, borderWidth: 1, padding: space.md, gap: 6 },
  meta: { fontFamily: fonts.body },
  bold: { fontFamily: fonts.bold },
  line: { flexDirection: "row", justifyContent: "space-between" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  ctaText: { color: "#FFF", fontFamily: fonts.bold },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: space.md,
    borderWidth: 1,
  },
  actionText: { flex: 1, fontFamily: fonts.bold, fontSize: 14 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
  },
});

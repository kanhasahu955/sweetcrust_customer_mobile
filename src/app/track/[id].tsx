import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Banner } from "@/components/ui/Banner";
import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { OfflineBanner, isNetworkError } from "@/components/ui/OfflineBanner";
import { Screen } from "@/components/ui/Screen";
import { useThemeColors } from "@/context/theme";
import { api } from "@/lib/api";
import { connectSocket, getSocket, joinOrderRoom } from "@/lib/socket";
import { float, fonts, radius, space } from "@/lib/theme";
import type { Order } from "@/lib/types";

type TrackPayload = {
  stages?: string[];
  timeline?: { status?: string; note?: string; created_at?: string }[];
  tracking?: {
    rider_lat?: number | null;
    rider_lng?: number | null;
    eta_minutes?: number | null;
    status?: string | null;
  } | null;
  delivery_person?: {
    id?: number;
    name?: string;
    phone?: string;
    rating?: number;
    vehicle_number?: string;
  } | null;
  order?: Order;
};

const STAGE_LABELS: Record<string, string> = {
  placed: "Placed",
  payment_received: "Paid",
  accepted: "Accepted",
  preparing: "Preparing",
  packed: "Packed",
  delivery_assigned: "Assigned",
  picked_up: "Picked up",
  out_for_delivery: "On the way",
  near_location: "Nearby",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

type MapProps = { style?: object; initialRegion?: object; children?: ReactNode };
type MarkerProps = { coordinate: { latitude: number; longitude: number }; title?: string };

let MapView: ComponentType<MapProps> | null = null;
let Marker: ComponentType<MarkerProps> | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const maps = require("react-native-maps");
  MapView = maps.default;
  Marker = maps.Marker;
} catch {
  MapView = null;
  Marker = null;
}

export default function TrackOrderScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const [order, setOrder] = useState<Order | null>(null);
  const [track, setTrack] = useState<TrackPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveNote, setLiveNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    setError(null);
    try {
      const [detail, tracking] = await Promise.all([
        api.customer.order(orderId) as Promise<{ order: Order }>,
        api.customer.trackOrder(orderId) as Promise<TrackPayload>,
      ]);
      setOrder(detail.order);
      setTrack(tracking);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load tracking");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    setLoading(true);
    void load();
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
        setLiveNote(`Live: ${String(payload.status || "").replace(/_/g, " ")}`);
        void load();
      };
      const onLoc = (payload: {
        order_id?: number;
        lat?: number;
        lng?: number;
        eta_minutes?: number;
      }) => {
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

  const lat = track?.tracking?.rider_lat;
  const lng = track?.tracking?.rider_lng;
  const hasCoords = lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
  const rider = track?.delivery_person;
  const eta = track?.tracking?.eta_minutes;

  async function shareTrack() {
    setBusy(true);
    setError(null);
    try {
      const res = (await api.customer.shareTrack(orderId)) as {
        share_url?: string;
        token?: string;
        order_number?: string;
      };
      const url = res.share_url || (res.token ? `/share-track/${res.token}` : "");
      await Share.share({
        message: `Track my SweetCrust order ${res.order_number || order?.order_number || orderId}: ${url}`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Share failed");
    } finally {
      setBusy(false);
    }
  }

  async function callRider() {
    setBusy(true);
    try {
      const direct = String(rider?.phone || "").replace(/[^\d+]/g, "");
      if (direct) {
        await Linking.openURL(`tel:${direct}`);
        return;
      }
      const call = (await api.customer.startCall({
        order_id: orderId,
        callee_id: rider?.id,
        target: rider?.id ? "rider" : "bakery",
        call_type: "phone",
      })) as { masked_number?: string | null };
      const phone = String(call.masked_number || "").replace(/[^\d+]/g, "");
      if (phone) await Linking.openURL(`tel:${phone}`);
      else router.push("/calls");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Call failed");
    } finally {
      setBusy(false);
    }
  }

  async function chatOrder() {
    setBusy(true);
    try {
      await api.customer.createChat({
        category: "order",
        order_id: orderId,
        initial_message: `Help with order ${order?.order_number || orderId}`,
      });
      router.push("/(tabs)/chat");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chat failed");
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

  return (
    <Screen>
      <BrandHeader left="back" right="none" />
      <TitleFlourish
        title="Live Tracking"
        subtitle={order?.order_number || (orderId ? `#${orderId}` : undefined)}
      />
      <OfflineBanner offline={Boolean(error && isNetworkError(error))} error={error} onRetry={load} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
        showsVerticalScrollIndicator={false}
      >
        {error && !isNetworkError(error) ? <Banner text={error} tone="danger" /> : null}
        {liveNote ? <Banner text={liveNote} tone="ok" /> : null}

        <View style={[styles.statusCard, float, { backgroundColor: c.paper, borderColor: c.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, { color: c.chocolate }]}>
              {STAGE_LABELS[currentStatus] || currentStatus.replace(/_/g, " ") || "Placed"}
            </Text>
            <Text style={[styles.statusSub, { color: c.muted }]}>
              {rider?.name ? `${rider.name} is on the way with your order` : "We're preparing your bakery box"}
            </Text>
          </View>
          {eta != null ? (
            <View style={[styles.etaBox, { backgroundColor: c.successSoft }]}>
              <Text style={[styles.etaLabel, { color: c.success }]}>ETA</Text>
              <Text style={[styles.etaVal, { color: c.success }]}>{eta} min</Text>
            </View>
          ) : null}
        </View>

        {MapView && hasCoords ? (
          <View style={styles.mapWrap}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: Number(lat),
                longitude: Number(lng),
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
            >
              {Marker ? (
                <Marker
                  coordinate={{ latitude: Number(lat), longitude: Number(lng) }}
                  title={rider?.name || "Rider"}
                />
              ) : null}
            </MapView>
          </View>
        ) : (
          <View style={[styles.mapPlaceholder, { backgroundColor: c.creamDeep, borderColor: c.border }]}>
            <Text style={[styles.mapPlaceholderTitle, { color: c.chocolate }]}>Map preview</Text>
            <Text style={[styles.mapPlaceholderSub, { color: c.muted }]}>
              {hasCoords
                ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`
                : "Waiting for live rider location…"}
            </Text>
          </View>
        )}

        <View style={[styles.riderCard, float, { backgroundColor: c.paper, borderColor: c.border }]}>
          <View style={[styles.avatar, { backgroundColor: c.blushSoft }]}>
            <Text style={[styles.avatarText, { color: c.pink }]}>{(rider?.name || "R").slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.riderName, { color: c.ink }]}>{rider?.name || "Delivery partner"}</Text>
            {rider?.phone ? <Text style={[styles.meta, { color: c.muted }]}>{rider.phone}</Text> : null}
            {rider?.vehicle_number ? <Text style={[styles.meta, { color: c.muted }]}>{rider.vehicle_number}</Text> : null}
          </View>
          <FloatPress style={[styles.iconBtn, { backgroundColor: c.creamDeep }]} onPress={callRider} disabled={busy}>
            <Icon name="call" size={20} color={c.chocolate} />
          </FloatPress>
          <FloatPress style={[styles.iconBtn, { backgroundColor: c.creamDeep }]} onPress={chatOrder} disabled={busy}>
            <Icon name="chatbubble" size={20} color={c.chocolate} />
          </FloatPress>
        </View>

        <Text style={[styles.section, { color: c.chocolate }]}>PROGRESS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepper}>
          {stages.map((s, i) => {
            const done = i <= stageIndex && currentStatus !== "cancelled";
            const active = i === stageIndex;
            return (
              <View key={s} style={styles.step}>
                <View
                  style={[
                    styles.stepDot,
                    { backgroundColor: c.border },
                    done && { backgroundColor: c.success },
                    active && { backgroundColor: c.coral, width: 18, height: 18, borderRadius: 9 },
                  ]}
                />
                <Text
                  style={[
                    styles.stepLabel,
                    { color: c.muted },
                    done && { color: c.ink, fontFamily: fonts.bold },
                  ]}
                  numberOfLines={2}
                >
                  {STAGE_LABELS[s] || s.replace(/_/g, " ")}
                </Text>
                {i < stages.length - 1 ? (
                  <View style={[styles.stepLine, { backgroundColor: c.border }, done && { backgroundColor: c.success }]} />
                ) : null}
              </View>
            );
          })}
        </ScrollView>

        <FloatPress
          style={[styles.shareBtn, { backgroundColor: c.pink }]}
          onPress={shareTrack}
          disabled={busy}
        >
          <Icon name="share-outline" size={18} color="#FFF" />
          <Text style={styles.shareText}>{busy ? "Sharing…" : "Share tracking link"}</Text>
        </FloatPress>
        <FloatPress
          style={[styles.secondary, { backgroundColor: c.paper, borderColor: c.border }]}
          onPress={() => router.push(`/orders/${orderId}`)}
        >
          <Icon name="receipt-outline" size={16} color={c.ink} />
          <Text style={[styles.secondaryText, { color: c.ink }]}>Order details</Text>
        </FloatPress>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { gap: space.sm, paddingBottom: 48 },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    gap: space.md,
  },
  statusTitle: { fontFamily: fonts.display, fontSize: 20, textTransform: "capitalize" },
  statusSub: { fontFamily: fonts.body, marginTop: 4, fontSize: 13 },
  etaBox: {
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  etaLabel: { fontFamily: fonts.bold, fontSize: 10 },
  etaVal: { fontFamily: fonts.bold, fontSize: 18 },
  mapWrap: { height: 200, borderRadius: radius.lg, overflow: "hidden" },
  map: { flex: 1 },
  mapPlaceholder: {
    height: 160,
    borderRadius: radius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  mapPlaceholderTitle: { fontFamily: fonts.display, fontSize: 18 },
  mapPlaceholderSub: { fontFamily: fonts.body, fontSize: 13 },
  riderCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.display, fontSize: 20 },
  riderName: { fontFamily: fonts.bold },
  meta: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginTop: space.sm,
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.7,
  },
  stepper: { gap: 0, paddingVertical: 8, alignItems: "flex-start" },
  step: { width: 72, alignItems: "center", position: "relative" },
  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    zIndex: 1,
  },
  stepLabel: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 10,
    textAlign: "center",
  },
  stepLine: {
    position: "absolute",
    top: 6,
    left: 43,
    width: 58,
    height: 2,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: space.md,
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  shareText: { fontFamily: fonts.bold, color: "#FFF" },
  secondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.lg,
    paddingVertical: 12,
    borderWidth: 1,
  },
  secondaryText: { fontFamily: fonts.bold },
});

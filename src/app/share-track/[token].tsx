import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Banner } from "@/components/ui/Banner";
import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { Icon } from "@/components/ui/Icon";
import { OfflineBanner, isNetworkError } from "@/components/ui/OfflineBanner";
import { Screen } from "@/components/ui/Screen";
import { TrustStrip } from "@/components/ui/TrustStrip";
import { useThemeColors } from "@/context/theme";
import { api } from "@/lib/api";
import { fonts, radius, space } from "@/lib/theme";

type PublicTrack = {
  order?: {
    id?: number;
    order_number?: string;
    status?: string;
  };
  tracking?: {
    rider_lat?: number | null;
    rider_lng?: number | null;
    eta_minutes?: number | null;
    status?: string | null;
  } | null;
  delivery_person?: { name?: string; phone?: string } | null;
  timeline?: { status?: string; note?: string; created_at?: string }[];
};

/**
 * Public order tracking — no login required.
 * AuthGate must allow the `share-track` segment for unauthenticated users.
 */
export default function ShareTrackScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { token } = useLocalSearchParams<{ token: string }>();
  const [data, setData] = useState<PublicTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const res = (await api.customer.publicTrack(String(token))) as PublicTrack;
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tracking link unavailable");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const status = String(data?.order?.status || data?.tracking?.status || "—").replace(/_/g, " ");
  const eta = data?.tracking?.eta_minutes;
  const lat = data?.tracking?.rider_lat;
  const lng = data?.tracking?.rider_lng;

  if (loading && !data) {
    return (
      <Screen>
        <BrandHeader
          left="back"
          right="none"
          onLeft={() => {
            if (router.canGoBack()) router.back();
            else router.replace("/login");
          }}
        />
        <View style={styles.center}>
          <ActivityIndicator color={c.pink} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <BrandHeader
        left="back"
        right="none"
        onLeft={() => {
          if (router.canGoBack()) router.back();
          else router.replace("/login");
        }}
      />
      <TitleFlourish title="Track Order" subtitle="Shared live link" />

      <OfflineBanner offline={Boolean(error && isNetworkError(error))} error={error} onRetry={load} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
        showsVerticalScrollIndicator={false}
      >
        {error && !isNetworkError(error) ? <Banner text={error} tone="danger" /> : null}

        {data?.order ? (
          <>
            <View style={[styles.statusCard, { backgroundColor: c.chocolate }]}>
              <Icon name="bicycle" size={22} color={c.blush} />
              <Text style={[styles.orderNo, { color: c.white }]}>
                {data.order.order_number || `Order #${data.order.id}`}
              </Text>
              <Text style={[styles.status, { color: c.blush }]}>{status}</Text>
              {eta != null ? (
                <View style={styles.etaRow}>
                  <Icon name="time-outline" size={14} color={c.cream} />
                  <Text style={[styles.eta, { color: c.cream }]}>ETA ~{eta} minutes</Text>
                </View>
              ) : null}
            </View>

            {data.delivery_person?.name ? (
              <View style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}>
                <View style={styles.sectionRow}>
                  <Icon name="person-outline" size={16} color={c.pink} />
                  <Text style={[styles.section, { color: c.muted }]}>Rider</Text>
                </View>
                <Text style={[styles.bold, { color: c.ink }]}>{data.delivery_person.name}</Text>
                {data.delivery_person.phone ? (
                  <Text style={[styles.meta, { color: c.muted }]}>{data.delivery_person.phone}</Text>
                ) : null}
              </View>
            ) : null}

            <View style={[styles.mapPlaceholder, { backgroundColor: c.creamDeep, borderColor: c.border }]}>
              <Icon name="location-outline" size={24} color={c.pink} />
              <Text style={[styles.mapTitle, { color: c.chocolate }]}>Location</Text>
              <Text style={[styles.meta, { color: c.muted }]}>
                {lat != null && lng != null
                  ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`
                  : "Live location will appear when the rider is on the way"}
              </Text>
            </View>

            {data.timeline?.length ? (
              <View style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}>
                <View style={styles.sectionRow}>
                  <Icon name="list-outline" size={16} color={c.pink} />
                  <Text style={[styles.section, { color: c.muted }]}>Timeline</Text>
                </View>
                {data.timeline.map((t, i) => (
                  <View key={i} style={styles.timelineRow}>
                    <Icon name="ellipse" size={6} color={c.pink} />
                    <Text style={[styles.meta, { color: c.muted }]}>
                      {String(t.status || "").replace(/_/g, " ")}
                      {t.note ? ` — ${t.note}` : ""}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <TrustStrip />
          </>
        ) : !error ? (
          <Text style={[styles.meta, { color: c.muted }]}>No tracking data for this link.</Text>
        ) : null}

        <Text style={[styles.footer, { color: c.muted }]}>
          Your order is safe with SweetCrust. Location is only shared for delivery.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { gap: space.md, paddingBottom: 48 },
  statusCard: {
    borderRadius: radius.xl,
    padding: space.lg,
    gap: 6,
  },
  orderNo: { fontFamily: fonts.display, fontSize: 22, marginTop: 4 },
  status: { fontFamily: fonts.bold, textTransform: "capitalize", fontSize: 16 },
  etaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  eta: { fontFamily: fonts.medium },
  card: {
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    gap: 4,
  },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  section: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  bold: { fontFamily: fonts.bold },
  meta: { fontFamily: fonts.body, lineHeight: 20 },
  mapPlaceholder: {
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    minHeight: 120,
    justifyContent: "center",
    gap: 6,
    alignItems: "flex-start",
  },
  mapTitle: { fontFamily: fonts.display, fontSize: 18 },
  timelineRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 },
  footer: {
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: "center",
    marginTop: space.md,
  },
});

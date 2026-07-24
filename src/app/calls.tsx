import { useCallback, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { Banner } from "@/components/ui/Banner";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { OfflineBanner, isNetworkError } from "@/components/ui/OfflineBanner";
import { Screen } from "@/components/ui/Screen";
import { Skeleton } from "@/components/ui/Skeleton";
import { useThemeColors } from "@/context/theme";
import { api } from "@/lib/api";
import { fonts, radius, space } from "@/lib/theme";

type CallRow = {
  id: number;
  status?: string;
  call_type?: string;
  target?: string;
  masked_number?: string | null;
  duration_seconds?: number | null;
  notes?: string | null;
  created_at?: string;
  started_at?: string | null;
  ended_at?: string | null;
  order_id?: number | null;
};

export default function CallsScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await api.customer.calls();
      setCalls(Array.isArray(rows) ? (rows as CallRow[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load calls");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  async function callBakery() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const call = (await api.customer.startCall({
        target: "bakery",
        call_type: "phone",
      })) as CallRow;
      const phone = String(call.masked_number || "").replace(/[^\d+]/g, "");
      if (phone) {
        await Linking.openURL(`tel:${phone}`);
        setMsg("Opening phone dialer…");
      } else {
        setMsg(`Call logged #${call.id}. Chat support if dialer number is unavailable.`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start call");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BrandHeader left="back" right="support" onRight={() => router.push("/(tabs)/chat")} />
      <Text style={[styles.h1, { color: c.ink }]}>Call bakery</Text>
      <Text style={[styles.sub, { color: c.muted }]}>Quick dial support · no VoIP required</Text>
      <OfflineBanner offline={Boolean(error && isNetworkError(error))} error={error} onRetry={load} />

      <View style={[styles.dialCard, { backgroundColor: c.paper, borderColor: c.border }]}>
        <View style={[styles.avatar, { backgroundColor: c.blushSoft }]}>
          <Icon name="storefront-outline" size={32} color={c.pink} />
        </View>
        <Text style={[styles.bakeryName, { color: c.ink }]}>SweetCrust Bakery</Text>
        <Text style={[styles.bakeryMeta, { color: c.muted }]}>Usually answers in under a minute</Text>
        <FloatPress
          style={[styles.cta, { backgroundColor: c.chocolate }]}
          onPress={callBakery}
          disabled={busy}
        >
          <Icon name="call" size={20} color="#FFF" />
          <Text style={styles.ctaText}>{busy ? "Connecting…" : "Call bakery"}</Text>
        </FloatPress>
      </View>

      {loading && !calls.length ? (
        <View style={styles.skel}>
          <Skeleton height={64} />
          <Skeleton height={64} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
          showsVerticalScrollIndicator={false}
        >
          {error && !isNetworkError(error) ? <Banner text={error} tone="danger" /> : null}
          {msg ? <Banner text={msg} tone="ok" /> : null}

          <Text style={[styles.section, { color: c.chocolate }]}>RECENT CALLS</Text>
          {!calls.length ? (
            <Text style={[styles.empty, { color: c.muted }]}>No calls yet. Tap Call bakery to start.</Text>
          ) : null}
          {calls.map((row) => (
            <View
              key={row.id}
              style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}
            >
              <View style={[styles.callIcon, { backgroundColor: c.blushSoft }]}>
                <Icon name="call" size={18} color={c.pink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: c.ink }]}>Call #{row.id}</Text>
                <Text style={[styles.meta, { color: c.muted }]}>
                  {String(row.call_type || "audio").replace(/_/g, " ")}
                  {row.masked_number ? ` · ${row.masked_number}` : ""}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: c.blushSoft }]}>
                <Text style={[styles.badgeText, { color: c.pink }]}>
                  {String(row.status || "—").replace(/_/g, " ")}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: fonts.display, fontSize: 28 },
  sub: { fontFamily: fonts.body, fontSize: 13, marginBottom: space.md },
  dialCard: {
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
    gap: 8,
    marginBottom: space.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  bakeryName: { fontFamily: fonts.bold, fontSize: 18 },
  bakeryMeta: { fontFamily: fonts.body, fontSize: 13 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 8,
  },
  ctaText: { color: "#FFF", fontFamily: fonts.bold, fontSize: 16 },
  skel: { gap: space.sm },
  content: { gap: space.sm, paddingBottom: 48 },
  section: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.7 },
  empty: { fontFamily: fonts.body, textAlign: "center", marginTop: 8 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.md,
  },
  callIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.bold, fontSize: 15 },
  meta: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  badge: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.bold, fontSize: 11, textTransform: "capitalize" },
});

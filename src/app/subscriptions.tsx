import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";

import { Banner } from "@/components/ui/Banner";
import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { OfflineBanner, isNetworkError } from "@/components/ui/OfflineBanner";
import { Screen } from "@/components/ui/Screen";
import { Skeleton } from "@/components/ui/Skeleton";
import { TrustStrip } from "@/components/ui/TrustStrip";
import { useThemeColors } from "@/context/theme";
import { api } from "@/lib/api";
import { fonts, radius, space } from "@/lib/theme";
import { money } from "@/lib/types";

type Plan = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  cadence?: string;
};

type Mine = {
  id: number;
  plan_id: number;
  status?: string;
  next_delivery_date?: string | null;
};

export default function SubscriptionsScreen() {
  const c = useThemeColors();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mine, setMine] = useState<Mine[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = (await api.customer.subscriptions()) as { plans?: Plan[]; mine?: Mine[] };
      setPlans(Array.isArray(data.plans) ? data.plans : []);
      setMine(Array.isArray(data.mine) ? data.mine : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load plans");
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

  async function subscribe(planId: number) {
    setBusyId(planId);
    setError(null);
    setMsg(null);
    try {
      const data = (await api.customer.subscribe(planId)) as { plans?: Plan[]; mine?: Mine[] };
      setPlans(Array.isArray(data.plans) ? data.plans : plans);
      setMine(Array.isArray(data.mine) ? data.mine : []);
      setMsg("Subscribed! Fresh bakery on the way.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Subscribe failed");
    } finally {
      setBusyId(null);
    }
  }

  const activePlanIds = new Set(mine.filter((m) => m.status === "active").map((m) => m.plan_id));

  return (
    <Screen>
      <BrandHeader left="back" right="none" />
      <TitleFlourish title="Subscriptions" subtitle="Fresh bakery on a schedule" />

      <OfflineBanner offline={Boolean(error && isNetworkError(error))} error={error} onRetry={load} />

      {loading && !plans.length ? (
        <View style={styles.skel}>
          <Skeleton height={120} />
          <Skeleton height={120} />
          <Skeleton height={120} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
          showsVerticalScrollIndicator={false}
        >
          {error && !isNetworkError(error) ? <Banner text={error} tone="danger" /> : null}
          {msg ? <Banner text={msg} tone="ok" /> : null}

          {mine.length ? (
            <>
              <Text style={[styles.section, { color: c.chocolate }]}>YOUR PLANS</Text>
              {mine.map((m) => {
                const plan = plans.find((p) => p.id === m.plan_id);
                return (
                  <View key={m.id} style={[styles.mineCard, { backgroundColor: c.blushSoft, borderColor: c.blush }]}>
                    <Icon name="checkmark-circle" size={20} color={c.pink} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.planName, { color: c.chocolate }]}>{plan?.name || `Plan #${m.plan_id}`}</Text>
                      <Text style={[styles.planMeta, { color: c.cocoa }]}>
                        {String(m.status || "active")}
                        {m.next_delivery_date ? ` · Next ${m.next_delivery_date}` : ""}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </>
          ) : null}

          <Text style={[styles.section, { color: c.chocolate }]}>AVAILABLE PLANS</Text>
          {plans.map((p) => {
            const active = activePlanIds.has(p.id);
            return (
              <View key={p.id} style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.planIcon, { backgroundColor: c.blushSoft }]}>
                    <Icon name="cafe-outline" size={22} color={c.pink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planName, { color: c.chocolate }]}>{p.name}</Text>
                    <Text style={[styles.planDesc, { color: c.muted }]}>{p.description}</Text>
                    <Text style={[styles.cadence, { color: c.pink }]}>{String(p.cadence || "weekly").toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.price, { color: c.pink }]}>{money(p.price)}</Text>
                </View>
                <FloatPress
                  style={[styles.cta, { backgroundColor: active ? c.muted : c.chocolate }]}
                  onPress={() => subscribe(p.id)}
                  disabled={busyId === p.id || active}
                >
                  <Icon name={active ? "checkmark" : "add-circle-outline"} size={18} color="#FFF" />
                  <Text style={styles.ctaText}>
                    {active ? "Subscribed" : busyId === p.id ? "Subscribing…" : "Subscribe"}
                  </Text>
                </FloatPress>
              </View>
            );
          })}
          {!plans.length ? <Text style={[styles.empty, { color: c.muted }]}>No subscription plans yet.</Text> : null}

          <TrustStrip />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  skel: { gap: space.md },
  content: { gap: space.sm, paddingBottom: 48 },
  section: {
    marginTop: space.sm,
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.7,
  },
  card: {
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    gap: space.md,
  },
  mineCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
  },
  cardTop: { flexDirection: "row", gap: space.md, alignItems: "flex-start" },
  planIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  planName: { fontFamily: fonts.display, fontSize: 20 },
  planDesc: { fontFamily: fonts.body, marginTop: 4, lineHeight: 20 },
  planMeta: { fontFamily: fonts.medium, marginTop: 4, textTransform: "capitalize" },
  cadence: { fontFamily: fonts.bold, fontSize: 11, marginTop: 8, letterSpacing: 0.6 },
  price: { fontFamily: fonts.bold, fontSize: 20 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  ctaText: { fontFamily: fonts.bold, color: "#FFF" },
  empty: { fontFamily: fonts.body },
});

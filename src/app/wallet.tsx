import { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

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

type Reward = {
  id: string;
  title: string;
  unlock_at?: number;
  progress?: number;
  subtitle?: string;
};

type Txn = {
  id: number;
  title: string;
  subtitle?: string | null;
  amount: number;
  txn_type: string;
  balance_after?: number;
  created_at?: string | null;
};

type WalletData = {
  balance: number;
  loyalty_points: number;
  lifetime_points?: number;
  rewards?: Reward[];
  transactions?: Txn[];
};

export default function WalletScreen() {
  const c = useThemeColors();
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [amount, setAmount] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = (await api.customer.wallet()) as WalletData;
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load wallet");
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

  async function addMoney() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid amount");
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = (await api.customer.walletAdd(value)) as WalletData;
      setData(res);
      setMsg(`₹${value} added to wallet`);
      setAmount("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add money failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BrandHeader left="back" right="none" />
      <TitleFlourish title="SweetCrust Wallet" subtitle="Treats in your wallet, happiness on the way!" />

      <OfflineBanner offline={Boolean(error && isNetworkError(error))} error={error} onRetry={load} />

      {loading && !data ? (
        <View style={styles.skel}>
          <Skeleton height={140} borderRadius={radius.xl} />
          <Skeleton height={72} />
          <Skeleton height={100} />
          <Skeleton height={56} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
          showsVerticalScrollIndicator={false}
        >
          {error && !isNetworkError(error) ? <Banner text={error} tone="danger" /> : null}
          {msg ? <Banner text={msg} tone="ok" /> : null}

          <LinearGradient colors={[c.chocolate, "#3D2520"]} style={styles.balanceCard}>
            <View style={{ flex: 1 }}>
              <View style={styles.balLabelRow}>
                <Icon name="wallet-outline" size={14} color={c.blush} />
                <Text style={[styles.balLabel, { color: c.blush }]}>WALLET BALANCE</Text>
              </View>
              <Text style={[styles.balAmt, { color: c.white }]}>{money(data?.balance)}</Text>
              <Text style={styles.balHint}>Use for orders, cakes and more</Text>
            </View>
            <Text style={[styles.balLogo, { color: c.blush }]}>
              SweetCrust{"\n"}BAKERY
            </Text>
          </LinearGradient>

          <View style={[styles.loyalty, { backgroundColor: c.paper, borderColor: c.border }]}>
            <View style={[styles.loyaltyIcon, { backgroundColor: c.blushSoft }]}>
              <Icon name="star" size={28} color={c.pink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.loyaltyLabel, { color: c.muted }]}>LOYALTY POINTS</Text>
              <Text style={[styles.loyaltyPts, { color: c.chocolate }]}>
                {(data?.loyalty_points ?? 0).toLocaleString("en-IN")} pts
              </Text>
              <Text style={[styles.loyaltyHint, { color: c.muted }]}>Earn more points with every order</Text>
            </View>
          </View>

          <Text style={[styles.section, { color: c.chocolate }]}>REWARDS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rewardRow}>
            {(data?.rewards || []).map((r) => (
              <View key={r.id} style={[styles.rewardCard, { backgroundColor: c.paper, borderColor: c.border }]}>
                <Icon name="gift-outline" size={20} color={c.pink} />
                <Text style={[styles.rewardTitle, { color: c.ink }]}>{r.title}</Text>
                <Text style={[styles.rewardSub, { color: c.muted }]}>{r.subtitle}</Text>
                {r.unlock_at != null ? (
                  <View style={[styles.progressTrack, { backgroundColor: c.creamDeep }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: c.pink,
                          width: `${Math.min(100, ((r.progress || 0) / r.unlock_at) * 100)}%`,
                        },
                      ]}
                    />
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>

          <Text style={[styles.section, { color: c.chocolate }]}>TRANSACTION HISTORY</Text>
          {(data?.transactions || []).length === 0 ? (
            <Text style={[styles.empty, { color: c.muted }]}>No transactions yet. Add money to get started.</Text>
          ) : (
            (data?.transactions || []).map((t) => {
              const credit = String(t.txn_type).toLowerCase() === "credit" || t.amount >= 0;
              return (
                <View key={t.id} style={[styles.txn, { backgroundColor: c.paper, borderColor: c.border }]}>
                  <View
                    style={[
                      styles.txnIcon,
                      { backgroundColor: credit ? c.successSoft : "#FDE4E0" },
                    ]}
                  >
                    <Icon
                      name={credit ? "arrow-down" : "arrow-up"}
                      size={16}
                      color={credit ? c.success : c.danger}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.txnTitle, { color: c.ink }]}>{t.title}</Text>
                    <Text style={[styles.txnSub, { color: c.muted }]}>
                      {t.subtitle || ""}
                      {t.created_at ? ` · ${new Date(t.created_at).toLocaleString("en-IN")}` : ""}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.txnAmt, { color: credit ? c.success : c.danger }]}>
                      {credit ? "+" : ""}
                      {money(Math.abs(t.amount))}
                    </Text>
                    {t.balance_after != null ? (
                      <Text style={[styles.txnBal, { color: c.muted }]}>Balance: {money(t.balance_after)}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}

          <TextInput
            style={[styles.amountInput, { borderColor: c.border, backgroundColor: c.paper, color: c.ink }]}
            value={amount}
            onChangeText={setAmount}
            keyboardType="number-pad"
            placeholder="Amount to add"
            placeholderTextColor={c.muted}
          />
          <FloatPress
            style={[styles.addBtn, { backgroundColor: c.chocolate }]}
            onPress={addMoney}
            disabled={busy}
          >
            <Icon name="add-circle-outline" size={20} color="#FFF" />
            <Text style={styles.addBtnText}>{busy ? "Adding…" : "Add Money"}</Text>
          </FloatPress>

          <TrustStrip />
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  skel: { gap: space.md, paddingTop: space.sm },
  content: { gap: space.sm, paddingBottom: 48 },
  amountInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  balanceCard: {
    borderRadius: radius.xl,
    padding: space.lg,
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: 140,
  },
  balLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  balLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.8 },
  balAmt: { fontFamily: fonts.display, fontSize: 40, marginTop: 6 },
  balHint: { fontFamily: fonts.body, color: "rgba(255,255,255,0.7)", marginTop: 4, fontSize: 13 },
  balLogo: {
    fontFamily: fonts.display,
    fontSize: 14,
    textAlign: "right",
    lineHeight: 18,
  },
  loyalty: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
  },
  loyaltyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  loyaltyLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.6 },
  loyaltyPts: { fontFamily: fonts.display, fontSize: 24 },
  loyaltyHint: { fontFamily: fonts.body, fontSize: 12 },
  section: {
    marginTop: space.md,
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.7,
  },
  rewardRow: { gap: space.sm, paddingVertical: 4 },
  rewardCard: {
    width: 150,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    gap: 6,
  },
  rewardTitle: { fontFamily: fonts.bold, fontSize: 13 },
  rewardSub: { fontFamily: fonts.body, fontSize: 12 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: { height: "100%" },
  empty: { fontFamily: fonts.body },
  txn: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
  },
  txnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  txnTitle: { fontFamily: fonts.bold, fontSize: 14 },
  txnSub: { fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  txnAmt: { fontFamily: fonts.bold, fontSize: 14 },
  txnBal: { fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  addBtn: {
    marginTop: space.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.lg,
    paddingVertical: 16,
  },
  addBtnText: { fontFamily: fonts.bold, color: "#FFF", fontSize: 16 },
});

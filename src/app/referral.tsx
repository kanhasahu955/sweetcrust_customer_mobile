import { useCallback, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";

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

type ReferralData = {
  code: string;
  reward_amount: number;
  referred_count: number;
  share_message: string;
};

async function copyText(text: string) {
  await Share.share({ message: text });
  return false;
}

export default function ReferralScreen() {
  const c = useThemeColors();
  const [data, setData] = useState<ReferralData | null>(null);
  const [codeIn, setCodeIn] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = (await api.customer.referral()) as ReferralData;
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load referral");
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

  async function share() {
    if (!data) return;
    try {
      await Share.share({ message: data.share_message || `Order with my code ${data.code}` });
    } catch {
      /* cancelled */
    }
  }

  async function apply() {
    const code = codeIn.trim();
    if (!code) {
      setError("Enter a referral code");
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = (await api.customer.referralApply(code)) as { credited?: number };
      setMsg(`Code applied! ₹${res.credited ?? data?.reward_amount ?? 100} credited.`);
      setCodeIn("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BrandHeader left="back" right="none" />
      <TitleFlourish title="Invite & Earn" subtitle="Friends get treats. You get rewards." />

      <OfflineBanner offline={Boolean(error && isNetworkError(error))} error={error} onRetry={load} />

      {loading && !data ? (
        <View style={styles.skel}>
          <Skeleton height={100} />
          <Skeleton height={140} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error && !isNetworkError(error) ? <Banner text={error} tone="danger" /> : null}
          {msg ? <Banner text={msg} tone="ok" /> : null}

          <View style={[styles.hero, { backgroundColor: c.blushSoft, borderColor: c.blush }]}>
            <Icon name="people-outline" size={28} color={c.pink} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: c.chocolate }]}>
                Get {money(data?.reward_amount)} when a friend orders
              </Text>
              <Text style={[styles.heroSub, { color: c.muted }]}>Share your code — you both earn wallet credit.</Text>
            </View>
          </View>

          <View style={[styles.codeCard, { backgroundColor: c.paper, borderColor: c.border }]}>
            <Text style={[styles.codeLabel, { color: c.pink }]}>Your referral code</Text>
            <View style={[styles.codeBox, { borderColor: c.pink, backgroundColor: c.blushSoft }]}>
              <Text style={[styles.code, { color: c.pink }]}>{data?.code || "—"}</Text>
            </View>
            <View style={styles.row}>
              <FloatPress
                style={[styles.secondary, { borderColor: c.chocolate, backgroundColor: c.paper }]}
                onPress={async () => {
                  if (!data?.code) return;
                  const copied = await copyText(data.code);
                  setMsg(copied ? "Code copied" : "Shared code");
                }}
              >
                <Icon name="copy-outline" size={16} color={c.chocolate} />
                <Text style={[styles.secondaryText, { color: c.chocolate }]}>Copy</Text>
              </FloatPress>
              <FloatPress style={[styles.primary, { backgroundColor: c.pink }]} onPress={share}>
                <Icon name="share-social-outline" size={16} color="#FFF" />
                <Text style={styles.primaryText}>Share</Text>
              </FloatPress>
            </View>
            {data?.share_message ? (
              <Text style={[styles.sharePreview, { color: c.muted }]}>{data.share_message}</Text>
            ) : null}
          </View>

          <View style={[styles.stats, { backgroundColor: c.paper, borderColor: c.border }]}>
            <View style={styles.stat}>
              <Icon name="person-add-outline" size={20} color={c.pink} />
              <Text style={[styles.statVal, { color: c.pink }]}>{data?.referred_count ?? 0}</Text>
              <Text style={[styles.statLabel, { color: c.muted }]}>Friends joined</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <View style={styles.stat}>
              <Icon name="wallet-outline" size={20} color={c.coral} />
              <Text style={[styles.statVal, { color: c.coral }]}>
                {money((data?.referred_count ?? 0) * (data?.reward_amount ?? 0))}
              </Text>
              <Text style={[styles.statLabel, { color: c.muted }]}>You've earned</Text>
            </View>
          </View>

          <Text style={[styles.section, { color: c.chocolate }]}>HAVE A CODE?</Text>
          <TextInput
            style={[styles.input, { borderColor: c.inputBorder, backgroundColor: c.paper, color: c.ink }]}
            value={codeIn}
            onChangeText={setCodeIn}
            placeholder="Enter friend's code"
            placeholderTextColor={c.muted}
            autoCapitalize="characters"
          />
          <FloatPress
            style={[styles.applyBtn, { backgroundColor: c.chocolate }]}
            onPress={apply}
            disabled={busy}
          >
            <Icon name="checkmark-circle-outline" size={18} color="#FFF" />
            <Text style={styles.primaryText}>{busy ? "Applying…" : "Apply code"}</Text>
          </FloatPress>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  skel: { gap: space.md },
  content: { gap: space.md, paddingBottom: 48 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderRadius: radius.xl,
    padding: space.lg,
    borderWidth: 1,
  },
  heroTitle: { fontFamily: fonts.display, fontSize: 22 },
  heroSub: { fontFamily: fonts.body, marginTop: 4 },
  codeCard: {
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    gap: space.md,
  },
  codeLabel: {
    fontFamily: fonts.bold,
    textAlign: "center",
    fontSize: 13,
  },
  codeBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  code: { fontFamily: fonts.display, fontSize: 28, letterSpacing: 2 },
  row: { flexDirection: "row", gap: space.sm },
  secondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  secondaryText: { fontFamily: fonts.bold },
  primary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  primaryText: { fontFamily: fonts.bold, color: "#FFF" },
  sharePreview: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  stats: {
    flexDirection: "row",
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
  },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statDivider: { width: 1 },
  statVal: { fontFamily: fonts.display, fontSize: 28 },
  statLabel: { fontFamily: fonts.medium, fontSize: 12 },
  section: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.7,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
});

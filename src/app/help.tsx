import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useThemeColors } from "@/context/theme";
import { api } from "@/lib/api";
import { fonts, radius, space } from "@/lib/theme";

type Faq = { id: number; question: string; answer: string };

export default function HelpScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await api.customer.faqs();
      setFaqs(Array.isArray(rows) ? (rows as Faq[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load FAQs");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  return (
    <Screen>
      <BrandHeader left="back" right="support" />
      <TitleFlourish title="Help & support" subtitle="FAQs · chat · returns" />
      {loading && !faqs.length ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.pink} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
        >
          {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}

          <FloatPress
            style={[styles.action, { backgroundColor: c.paper, borderColor: c.border }]}
            onPress={() => router.push("/(tabs)/chat")}
          >
            <Icon name="chatbubbles-outline" size={20} color={c.pink} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: c.ink }]}>Chat with bakery</Text>
              <Text style={[styles.actionHint, { color: c.muted }]}>Human help · AI assistant · photos</Text>
            </View>
            <Icon name="chevron-forward" size={16} color={c.muted} />
          </FloatPress>
          <FloatPress
            style={[styles.action, { backgroundColor: c.paper, borderColor: c.border }]}
            onPress={() => router.push("/returns")}
          >
            <Icon name="return-down-back-outline" size={20} color={c.pink} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: c.ink }]}>Returns & refunds</Text>
              <Text style={[styles.actionHint, { color: c.muted }]}>Report an issue with an order</Text>
            </View>
            <Icon name="chevron-forward" size={16} color={c.muted} />
          </FloatPress>
          <FloatPress
            style={[styles.action, { backgroundColor: c.paper, borderColor: c.border }]}
            onPress={() => router.push("/custom-cake")}
          >
            <Icon name="color-palette" size={20} color={c.pink} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: c.ink }]}>Custom cake request</Text>
              <Text style={[styles.actionHint, { color: c.muted }]}>Occasion cakes made to order</Text>
            </View>
            <Icon name="chevron-forward" size={16} color={c.muted} />
          </FloatPress>

          <Text style={[styles.section, { color: c.caramel }]}>FAQs</Text>
          {!faqs.length ? <Text style={[styles.empty, { color: c.muted }]}>No FAQs published yet.</Text> : null}
          {faqs.map((f) => (
            <FloatPress
              key={f.id}
              style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}
              onPress={() => setOpenId((id) => (id === f.id ? null : f.id))}
            >
              <Text style={[styles.q, { color: c.ink }]}>{f.question}</Text>
              {openId === f.id ? <Text style={[styles.a, { color: c.muted }]}>{f.answer}</Text> : null}
            </FloatPress>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { gap: space.sm, paddingBottom: 40 },
  error: { fontFamily: fonts.medium },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
  },
  actionTitle: { fontFamily: fonts.bold, fontSize: 15 },
  actionHint: { fontFamily: fonts.body, marginTop: 3, fontSize: 13 },
  section: {
    marginTop: space.md,
    fontFamily: fonts.bold,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  empty: { fontFamily: fonts.body },
  card: {
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
  },
  q: { fontFamily: fonts.bold },
  a: { fontFamily: fonts.body, marginTop: 8, lineHeight: 20 },
});

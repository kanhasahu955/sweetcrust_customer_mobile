import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";

import { Banner } from "@/components/ui/Banner";
import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useThemeColors } from "@/context/theme";
import { api } from "@/lib/api";
import type { CustomCakeIn } from "@/lib/api-client";
import { fonts, radius, space } from "@/lib/theme";

type CakeReq = CustomCakeIn & { id?: number; status?: string; quoted_price?: number };

export default function CustomCakeScreen() {
  const c = useThemeColors();
  const [list, setList] = useState<CakeReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState<CustomCakeIn>({
    occasion: "",
    cake_type: "",
    flavor: "",
    weight: "",
    shape: "",
    is_eggless: false,
    cream_type: "",
    decoration_theme: "",
    cake_message: "",
    special_instructions: "",
    delivery_date: "",
    delivery_time: "",
    budget_min: undefined,
    budget_max: undefined,
  });

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await api.customer.customCakes();
      setList(Array.isArray(rows) ? (rows as CakeReq[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!form.occasion.trim() || !form.flavor.trim()) {
      setError("Occasion and flavor are required");
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await api.customer.createCustomCake(form);
      setMsg("Custom cake request submitted");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  function set<K extends keyof CustomCakeIn>(key: K, value: CustomCakeIn[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function pickReference() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError("Photo permission needed");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    setBusy(true);
    setError(null);
    try {
      const uploaded = (await api.uploads.file(res.assets[0].uri, "custom_cake", "cake-ref.jpg")) as {
        url?: string;
      };
      if (!uploaded?.url) throw new Error("Upload failed");
      set("reference_image_url", uploaded.url);
      setMsg("Reference photo attached");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BrandHeader left="back" right="none" />
      <TitleFlourish title="Custom Cake" subtitle="Tell us the occasion" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[c.chocolate, "#3D2520"]} style={styles.hero}>
          <Icon name="sparkles-outline" size={24} color={c.blush} />
          <Text style={[styles.heroBrand, { color: c.white }]}>SweetCrust</Text>
          <Text style={[styles.heroTag, { color: c.blush }]}>Bespoke cakes · made with love</Text>
        </LinearGradient>

        {error ? <Banner text={error} tone="danger" /> : null}
        {msg ? <Banner text={msg} tone="ok" /> : null}

        <Field label="Occasion" value={form.occasion} onChange={(v) => set("occasion", v)} />
        <Field label="Cake type" value={form.cake_type} onChange={(v) => set("cake_type", v)} />
        <Field label="Flavor" value={form.flavor} onChange={(v) => set("flavor", v)} />
        <Field label="Weight" value={form.weight} onChange={(v) => set("weight", v)} />
        <Field label="Shape" value={form.shape} onChange={(v) => set("shape", v)} />
        <Field label="Cream type" value={form.cream_type || ""} onChange={(v) => set("cream_type", v)} />
        <Field
          label="Decoration theme"
          value={form.decoration_theme || ""}
          onChange={(v) => set("decoration_theme", v)}
        />
        <Field label="Delivery date (YYYY-MM-DD)" value={form.delivery_date || ""} onChange={(v) => set("delivery_date", v)} />
        <Field label="Delivery time" value={form.delivery_time || ""} onChange={(v) => set("delivery_time", v)} />
        <Field label="Message on cake" value={form.cake_message || ""} onChange={(v) => set("cake_message", v)} />
        <Field
          label="Special instructions"
          value={form.special_instructions || ""}
          onChange={(v) => set("special_instructions", v)}
        />
        <Field
          label="Budget min"
          value={String(form.budget_min ?? "")}
          onChange={(v) => set("budget_min", Number(v) || 0)}
        />
        <Field
          label="Budget max"
          value={String(form.budget_max ?? "")}
          onChange={(v) => set("budget_max", Number(v) || 0)}
        />

        <FloatPress
          style={[styles.toggle, { borderColor: c.border, backgroundColor: c.paper }]}
          onPress={pickReference}
          disabled={busy}
        >
          <Icon name="image-outline" size={18} color={c.pink} />
          <Text style={[styles.toggleText, { color: c.cocoa }]}>
            {form.reference_image_url ? "Change reference photo" : "Add reference photo"}
          </Text>
        </FloatPress>
        {form.reference_image_url ? (
          <Image source={{ uri: form.reference_image_url }} style={[styles.refImg, { backgroundColor: c.creamDeep }]} resizeMode="cover" />
        ) : null}

        <FloatPress
          style={[
            styles.toggle,
            { borderColor: form.is_eggless ? c.pink : c.border, backgroundColor: form.is_eggless ? c.blushSoft : c.paper },
          ]}
          onPress={() => set("is_eggless", !form.is_eggless)}
        >
          <Icon name="leaf-outline" size={18} color={form.is_eggless ? c.pink : c.muted} />
          <Text style={[styles.toggleText, { color: form.is_eggless ? c.pink : c.cocoa }]}>
            {form.is_eggless ? "Eggless · on" : "Eggless · off"}
          </Text>
        </FloatPress>

        <FloatPress onPress={submit} disabled={busy}>
          <View style={[styles.cta, { backgroundColor: c.chocolate }]}>
            {busy ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Icon name="send-outline" size={18} color="#FFF" />
                <Text style={styles.ctaText}>Submit request</Text>
              </>
            )}
          </View>
        </FloatPress>

        <Text style={[styles.section, { color: c.chocolate }]}>YOUR REQUESTS</Text>
        {!list.length ? (
          <Text style={[styles.empty, { color: c.muted }]}>No custom cake requests yet.</Text>
        ) : (
          list.map((r) => (
            <View key={r.id || `${r.occasion}-${r.flavor}`} style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}>
              <Icon name="cafe-outline" size={18} color={c.pink} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: c.ink }]}>
                  {r.occasion} · {r.flavor}
                </Text>
                <Text style={[styles.cardMeta, { color: c.muted }]}>
                  {r.weight} · {r.shape}
                  {r.status ? ` · ${r.status}` : ""}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const c = useThemeColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: c.cocoa }]}>{label}</Text>
      <TextInput
        style={[styles.input, { borderColor: c.inputBorder, backgroundColor: c.paper, color: c.ink }]}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={c.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md, paddingBottom: 48 },
  hero: {
    borderRadius: radius.xl,
    padding: space.xl,
    minHeight: 120,
    justifyContent: "flex-end",
    gap: 4,
  },
  heroBrand: { fontFamily: fonts.display, fontSize: 28 },
  heroTag: { fontFamily: fonts.medium, marginTop: 4 },
  label: { fontFamily: fonts.medium, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
  },
  refImg: { width: "100%", height: 160, borderRadius: radius.md },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 12,
  },
  toggleText: { fontFamily: fonts.bold },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.lg,
    paddingVertical: 16,
  },
  ctaText: { color: "#FFF", fontFamily: fonts.bold, fontSize: 16 },
  section: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.7,
    marginTop: space.sm,
  },
  empty: { fontFamily: fonts.body },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.md,
  },
  cardTitle: { fontFamily: fonts.bold },
  cardMeta: { fontFamily: fonts.body, marginTop: 4, fontSize: 13 },
});

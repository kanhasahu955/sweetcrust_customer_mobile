import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Banner } from "@/components/ui/Banner";
import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { OfflineBanner, isNetworkError } from "@/components/ui/OfflineBanner";
import { Screen } from "@/components/ui/Screen";
import { useThemeColors } from "@/context/theme";
import { api } from "@/lib/api";
import { fonts, radius, space } from "@/lib/theme";

type Form = {
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  headcount: string;
  occasion: string;
  budget: string;
  notes: string;
};

const empty: Form = {
  company_name: "",
  contact_name: "",
  phone: "",
  email: "",
  headcount: "",
  occasion: "",
  budget: "",
  notes: "",
};

export default function CorporateScreen() {
  const c = useThemeColors();
  const [form, setForm] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function set<K extends keyof Form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    if (!form.company_name.trim() || !form.contact_name.trim() || !form.phone.trim()) {
      setError("Company, contact name and phone are required");
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await api.customer.corporate({
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        headcount: form.headcount ? Number(form.headcount) : null,
        occasion: form.occasion.trim() || null,
        budget: form.budget ? Number(form.budget) : null,
        notes: form.notes.trim() || null,
      });
      setMsg("Inquiry sent! Our team will call you shortly.");
      setForm(empty);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BrandHeader left="back" right="none" />
      <TitleFlourish title="Corporate Orders" subtitle="Bulk cakes, meetings & celebrations" />

      <OfflineBanner offline={Boolean(error && isNetworkError(error))} error={error} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {error && !isNetworkError(error) ? <Banner text={error} tone="danger" /> : null}
          {msg ? <Banner text={msg} tone="ok" /> : null}

          <View style={[styles.hero, { backgroundColor: c.blushSoft, borderColor: c.blush }]}>
            <Icon name="business-outline" size={28} color={c.pink} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: c.chocolate }]}>Treat your team</Text>
              <Text style={[styles.heroSub, { color: c.muted }]}>
                Tell us about your office order — we'll craft a quote for hampers, cakes and catering.
              </Text>
            </View>
          </View>

          <Field label="Company name *" value={form.company_name} onChange={(v) => set("company_name", v)} />
          <Field label="Contact name *" value={form.contact_name} onChange={(v) => set("contact_name", v)} />
          <Field
            label="Phone *"
            value={form.phone}
            onChange={(v) => set("phone", v)}
            keyboardType="phone-pad"
          />
          <Field
            label="Email"
            value={form.email}
            onChange={(v) => set("email", v)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Headcount"
            value={form.headcount}
            onChange={(v) => set("headcount", v)}
            keyboardType="number-pad"
          />
          <Field label="Occasion" value={form.occasion} onChange={(v) => set("occasion", v)} placeholder="Diwali, AGM…" />
          <Field
            label="Budget (₹)"
            value={form.budget}
            onChange={(v) => set("budget", v)}
            keyboardType="number-pad"
          />
          <Field
            label="Notes"
            value={form.notes}
            onChange={(v) => set("notes", v)}
            multiline
            placeholder="Dietary needs, delivery window…"
          />

          <FloatPress
            style={[styles.cta, { backgroundColor: c.chocolate }]}
            onPress={submit}
            disabled={busy}
          >
            <Icon name="send-outline" size={18} color="#FFF" />
            <Text style={styles.ctaText}>{busy ? "Sending…" : "Send inquiry"}</Text>
          </FloatPress>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad" | "email-address" | "number-pad";
  autoCapitalize?: "none" | "sentences";
  multiline?: boolean;
}) {
  const c = useThemeColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.cocoa }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.area,
          { borderColor: c.inputBorder, backgroundColor: c.paper, color: c.ink },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.sm, paddingBottom: 48 },
  hero: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    marginBottom: space.sm,
  },
  heroTitle: { fontFamily: fonts.display, fontSize: 22 },
  heroSub: { fontFamily: fonts.body, marginTop: 6, lineHeight: 20 },
  field: { gap: 6 },
  label: { fontFamily: fonts.medium, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
  },
  area: { minHeight: 88, textAlignVertical: "top" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: space.md,
    borderRadius: radius.lg,
    paddingVertical: 16,
  },
  ctaText: { fontFamily: fonts.bold, color: "#FFF", fontSize: 16 },
});

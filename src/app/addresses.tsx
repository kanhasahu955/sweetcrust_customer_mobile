import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { FadeIn } from "@/components/FadeIn";
import { Banner } from "@/components/ui/Banner";
import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useThemeColors } from "@/context/theme";
import { api, DEFAULT_DELIVERY_COORDS, getStoredUser, normalizePhone } from "@/lib/api";
import type { AddressDetails } from "@/lib/address";
import { fonts, radius, space } from "@/lib/theme";
import { colors } from "@/lib/theme";
import type { Address } from "@/lib/types";

function labelIcon(label?: string) {
  const l = (label || "").toLowerCase();
  if (l.includes("work") || l.includes("office")) return "briefcase-outline";
  if (l.includes("home")) return "home-outline";
  return "location-outline";
}

export default function AddressesScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const user = getStoredUser();
  const [list, setList] = useState<Address[]>([]);
  const [picked, setPicked] = useState<AddressDetails | null>(null);
  const [fullName, setFullName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [label, setLabel] = useState("Home");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [coverage, setCoverage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const rows = await api.customer.addresses();
      setList(Array.isArray(rows) ? (rows as Address[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load addresses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function checkDelivery(lat: number, lng: number) {
    try {
      const res = await api.customer.deliveryCheck(lat, lng);
      const ok = Boolean(res.deliverable ?? res.ok ?? res.within_radius);
      setCoverage(ok ? "We deliver here" : String(res.detail || "Outside delivery radius"));
      return ok;
    } catch (e) {
      setCoverage(e instanceof Error ? e.message : "Delivery check failed");
      return false;
    }
  }

  async function onPick(next: AddressDetails) {
    setPicked(next);
    if (next.latitude && next.longitude) {
      await checkDelivery(next.latitude, next.longitude);
    }
  }

  async function save() {
    if (!fullName.trim() || !phone.trim()) {
      setError("Name and phone required");
      return;
    }
    const lat = picked?.latitude ?? DEFAULT_DELIVERY_COORDS.latitude;
    const lng = picked?.longitude ?? DEFAULT_DELIVERY_COORDS.longitude;
    const line1 = picked?.address_line || "";
    if (!line1.trim()) {
      setError("Pick an address from search");
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const ok = await checkDelivery(lat, lng);
      if (!ok) {
        setError(coverage || "Outside delivery area");
        return;
      }
      await api.customer.addAddress({
        label: label.trim() || "Home",
        full_name: fullName.trim(),
        phone: normalizePhone(phone),
        line1,
        city: picked?.city || "",
        state: picked?.state || "",
        pincode: picked?.pincode || "",
        latitude: lat,
        longitude: lng,
        is_default: list.length === 0,
      });
      setMsg("Address saved");
      setPicked(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setBusy(true);
    try {
      await api.customer.deleteAddress(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function setDefault(a: Address) {
    setBusy(true);
    setError(null);
    try {
      await api.customer.addAddress({
        label: a.label || "Home",
        full_name: a.full_name,
        phone: a.phone,
        line1: a.line1,
        city: a.city || "",
        state: a.state || "",
        pincode: a.pincode,
        latitude: a.latitude ?? DEFAULT_DELIVERY_COORDS.latitude,
        longitude: a.longitude ?? DEFAULT_DELIVERY_COORDS.longitude,
        is_default: true,
      });
      await api.customer.deleteAddress(a.id);
      setMsg("Default address updated");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not set default");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BrandHeader left="back" right="none" />
      <TitleFlourish title="Saved Addresses" subtitle="Manage your delivery addresses" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <FadeIn>
          <Text style={[styles.section, { color: c.caramel }]}>Add address</Text>
        </FadeIn>

        {error ? <Banner text={error} tone="danger" /> : null}
        {msg ? <Banner text={msg} tone="ok" /> : null}
        {coverage ? <Banner text={coverage} tone={coverage.includes("deliver") ? "ok" : "warn"} /> : null}

        <Field label="Label" value={label} onChange={setLabel} />
        <Field label="Full name" value={fullName} onChange={setFullName} />
        <Field label="Phone" value={phone} onChange={setPhone} keyboardType="phone-pad" />

        <Text style={styles.label}>Search location</Text>
        <AddressAutocomplete value={picked} onChange={onPick} onError={setError} />

        <FloatPress onPress={save} disabled={busy}>
          <LinearGradient colors={[colors.coral, colors.pink]} style={styles.cta}>
            {busy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <View style={styles.ctaRow}>
                <Icon name="add-circle" size={20} color="#FFF" />
                <Text style={styles.ctaText}>Add New Address</Text>
              </View>
            )}
          </LinearGradient>
        </FloatPress>

        <View style={[styles.mapHint, { backgroundColor: c.blushSoft }]}>
          <Icon name="map-outline" size={20} color={c.pink} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.mapHintTitle, { color: c.ink }]}>Want to be more precise?</Text>
            <Text style={[styles.mapHintSub, { color: c.muted }]}>
              Pick your exact location from search while adding.
            </Text>
          </View>
        </View>

        <Text style={[styles.section, { color: c.caramel }]}>Saved</Text>
        {!list.length ? (
          <Text style={[styles.empty, { color: c.muted }]}>No addresses yet.</Text>
        ) : (
          list.map((a) => (
            <View key={a.id} style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}>
              <View style={styles.cardTop}>
                <View style={[styles.labelIcon, { backgroundColor: c.blushSoft }]}>
                  <Icon name={labelIcon(a.label || undefined)} size={20} color={c.ink} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.cardTitle, { color: c.ink }]}>{a.label || "Address"}</Text>
                    {a.is_default ? (
                      <View style={[styles.defaultBadge, { backgroundColor: c.successSoft }]}>
                        <Icon name="checkmark" size={10} color={c.success} />
                        <Text style={[styles.defaultText, { color: c.success }]}>DEFAULT</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.cardMeta, { color: c.cocoa }]}>
                    {a.full_name} · {a.phone}
                  </Text>
                  <Text style={[styles.cardMeta, { color: c.muted }]}>
                    {a.line1}, {a.city} {a.pincode}
                  </Text>
                </View>
              </View>
              <View style={[styles.actionBar, { borderTopColor: c.border }]}>
                <FloatPress style={styles.action} onPress={() => remove(a.id)} disabled={busy}>
                  <Icon name="trash-outline" size={14} color={c.danger} />
                  <Text style={[styles.delete, { color: c.danger }]}>Delete</Text>
                </FloatPress>
                {!a.is_default ? (
                  <FloatPress style={styles.action} onPress={() => setDefault(a)} disabled={busy}>
                    <Icon name="star-outline" size={14} color={c.ink} />
                    <Text style={[styles.setDefault, { color: c.ink }]}>Set as default</Text>
                  </FloatPress>
                ) : null}
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
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: "default" | "phone-pad";
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholderTextColor={colors.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md, paddingBottom: 48 },
  section: {
    fontFamily: fonts.bold,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  label: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
    color: colors.ink,
  },
  cta: { borderRadius: radius.lg, paddingVertical: 16, alignItems: "center" },
  ctaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  ctaText: { color: colors.white, fontFamily: fonts.bold, fontSize: 16 },
  mapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.md,
    padding: space.md,
  },
  mapHintTitle: { fontFamily: fonts.bold, fontSize: 13 },
  mapHintSub: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  empty: { fontFamily: fonts.body },
  card: { borderRadius: radius.md, borderWidth: 1, overflow: "hidden" },
  cardTop: { flexDirection: "row", gap: 12, padding: space.md },
  labelIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  cardTitle: { fontFamily: fonts.bold },
  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultText: { fontFamily: fonts.bold, fontSize: 10 },
  cardMeta: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
  actionBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: space.md,
    gap: 16,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 4 },
  delete: { fontFamily: fonts.bold, fontSize: 12 },
  setDefault: { fontFamily: fonts.bold, fontSize: 12 },
});

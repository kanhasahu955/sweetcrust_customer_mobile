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
import { useLocalSearchParams } from "expo-router";

import { Banner } from "@/components/ui/Banner";
import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useThemeColors } from "@/context/theme";
import { api } from "@/lib/api";
import { fonts, radius, space } from "@/lib/theme";

type ReturnRow = {
  id: number;
  order_id: number;
  issue_type?: string;
  solution?: string;
  status?: string;
  description?: string | null;
};

const ISSUE_ICONS: Record<string, string> = {
  damaged: "warning-outline",
  wrong_item: "swap-horizontal-outline",
  quality: "thumbs-down-outline",
  missing: "help-circle-outline",
};

export default function ReturnsScreen() {
  const c = useThemeColors();
  const params = useLocalSearchParams<{ order_id?: string; item_ids?: string }>();
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [orderId, setOrderId] = useState(typeof params.order_id === "string" ? params.order_id : "");
  const [itemIds, setItemIds] = useState(typeof params.item_ids === "string" ? params.item_ids : "");
  const [issueType, setIssueType] = useState("damaged");
  const [solution, setSolution] = useState("refund");
  const [description, setDescription] = useState("");
  const [detail, setDetail] = useState<{
    return?: ReturnRow;
    stages?: string[];
  } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.customer.returns();
      setRows(Array.isArray(data) ? (data as ReturnRow[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load returns");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (params.order_id) setOrderId(String(params.order_id));
    if (params.item_ids) setItemIds(String(params.item_ids));
  }, [params.order_id, params.item_ids]);

  async function submit() {
    const oid = Number(orderId);
    const ids = itemIds
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => n > 0);
    if (!oid || !ids.length) {
      setError("Order id and at least one item id required");
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await api.customer.createReturn({
        order_id: oid,
        affected_item_ids: ids,
        issue_type: issueType,
        solution,
        description: description.trim() || null,
      });
      setMsg("Return submitted");
      setOrderId("");
      setItemIds("");
      setDescription("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BrandHeader left="back" right="none" />
      <TitleFlourish title="Returns" subtitle="Issues & replacements" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.infoCard, { backgroundColor: c.blushSoft, borderColor: c.blush }]}>
          <Icon name="return-down-back-outline" size={22} color={c.pink} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: c.chocolate }]}>New return</Text>
            {params.order_id ? (
              <Text style={[styles.prefill, { color: c.cocoa }]}>Prefilled from order #{params.order_id}</Text>
            ) : (
              <Text style={[styles.prefill, { color: c.muted }]}>Report an issue with your order</Text>
            )}
          </View>
        </View>

        {error ? <Banner text={error} tone="danger" /> : null}
        {msg ? <Banner text={msg} tone="ok" /> : null}

        <Field label="Order ID" value={orderId} onChange={setOrderId} keyboardType="number-pad" />
        <Field label="Item IDs (comma-separated)" value={itemIds} onChange={setItemIds} />

        <Text style={[styles.fieldLabel, { color: c.cocoa }]}>Issue type</Text>
        <View style={styles.chips}>
          {["damaged", "wrong_item", "quality", "missing"].map((t) => (
            <FloatPress
              key={t}
              style={[
                styles.chip,
                { borderColor: c.border, backgroundColor: issueType === t ? c.chocolate : c.paper },
              ]}
              onPress={() => setIssueType(t)}
            >
              <Icon
                name={ISSUE_ICONS[t] || "ellipse-outline"}
                size={14}
                color={issueType === t ? "#FFF" : c.pink}
              />
              <Text style={[styles.chipText, { color: issueType === t ? "#FFF" : c.cocoa }]}>
                {t.replace(/_/g, " ")}
              </Text>
            </FloatPress>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: c.cocoa }]}>Preferred solution</Text>
        <View style={styles.chips}>
          {["refund", "replacement"].map((t) => (
            <FloatPress
              key={t}
              style={[
                styles.chip,
                { borderColor: c.border, backgroundColor: solution === t ? c.pink : c.paper },
              ]}
              onPress={() => setSolution(t)}
            >
              <Icon
                name={t === "refund" ? "cash-outline" : "refresh-outline"}
                size={14}
                color={solution === t ? "#FFF" : c.pink}
              />
              <Text style={[styles.chipText, { color: solution === t ? "#FFF" : c.cocoa }]}>{t}</Text>
            </FloatPress>
          ))}
        </View>

        <Field label="Description" value={description} onChange={setDescription} multiline />

        <FloatPress onPress={submit} disabled={busy}>
          <View style={[styles.cta, { backgroundColor: c.chocolate }]}>
            {busy ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Icon name="send-outline" size={18} color="#FFF" />
                <Text style={styles.ctaText}>Submit return</Text>
              </>
            )}
          </View>
        </FloatPress>

        {detail?.return ? (
          <View style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.ink }]}>
              Return #{detail.return.id} · {detail.return.status}
            </Text>
            {(detail.stages || []).map((s) => (
              <Text key={s} style={[styles.cardMeta, { color: c.muted }]}>
                · {s.replace(/_/g, " ")}
              </Text>
            ))}
          </View>
        ) : null}

        <Text style={[styles.section, { color: c.chocolate }]}>YOUR RETURNS</Text>
        {!rows.length ? (
          <Text style={[styles.empty, { color: c.muted }]}>No returns yet. Open an order → Request return.</Text>
        ) : (
          rows.map((r) => (
            <FloatPress
              key={r.id}
              style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}
              onPress={async () => {
                try {
                  const d = (await api.customer.returnOne(r.id)) as typeof detail;
                  setDetail(d);
                  setMsg(`Status: ${d?.return?.status || r.status || "ok"}`);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Detail failed");
                }
              }}
            >
              <View style={styles.cardRow}>
                <View style={[styles.cardIcon, { backgroundColor: c.blushSoft }]}>
                  <Icon name="document-text-outline" size={18} color={c.pink} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: c.ink }]}>
                    #{r.id} · Order {r.order_id}
                  </Text>
                  <Text style={[styles.cardMeta, { color: c.muted }]}>
                    {r.issue_type || "—"} → {r.solution || "—"} · {r.status || "submitted"}
                  </Text>
                  {r.description ? <Text style={[styles.cardMeta, { color: c.muted }]}>{r.description}</Text> : null}
                </View>
                <Icon name="chevron-forward" size={16} color={c.muted} />
              </View>
            </FloatPress>
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
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: "default" | "number-pad";
  multiline?: boolean;
}) {
  const c = useThemeColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.fieldLabel, { color: c.cocoa }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          multiline && styles.area,
          { borderColor: c.inputBorder, backgroundColor: c.paper, color: c.ink },
        ]}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholderTextColor={c.muted}
        multiline={multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.md, paddingBottom: 48 },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
  },
  infoTitle: { fontFamily: fonts.bold, fontSize: 15 },
  prefill: { fontFamily: fonts.medium, marginTop: 2, fontSize: 13 },
  fieldLabel: { fontFamily: fonts.medium, fontSize: 13 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { fontFamily: fonts.bold, fontSize: 12, textTransform: "capitalize" },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
  },
  area: { minHeight: 80, textAlignVertical: "top" },
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
    textTransform: "uppercase",
    marginTop: space.sm,
  },
  empty: { fontFamily: fonts.body },
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.md,
    gap: 4,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontFamily: fonts.bold },
  cardMeta: { fontFamily: fonts.body, fontSize: 13 },
});

import { useCallback, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { BrandHeader } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useThemeColors } from "@/context/theme";
import { api } from "@/lib/api";
import { fonts, radius, space } from "@/lib/theme";

type Notif = {
  id: number;
  title?: string;
  body?: string;
  is_read?: boolean;
  link_type?: string | null;
  link_value?: string | null;
  created_at?: string;
};

function notifIcon(n: Notif): string {
  if (n.link_type === "order") return "bag-handle-outline";
  if (n.link_type === "product") return "cafe-outline";
  return "notifications-outline";
}

export default function NotificationsScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const [rows, setRows] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.customer.notifications();
      setRows(Array.isArray(data) ? (data as Notif[]) : []);
      await api.customer.readNotifications();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load notifications");
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

  function open(n: Notif) {
    const v = n.link_value;
    if (n.link_type === "order" && v) router.push(`/orders/${v}`);
    else if (n.link_type === "product" && v) router.push(`/product/${v}`);
  }

  return (
    <Screen>
      <BrandHeader left="back" right="none" />
      <Text style={[styles.h1, { color: c.ink }]}>Notifications</Text>
      <Text style={[styles.sub, { color: c.muted }]}>Order & bakery updates</Text>

      {loading && !rows.length ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.pink} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
        >
          {error ? <Text style={[styles.error, { color: c.danger }]}>{error}</Text> : null}
          {!rows.length ? (
            <Text style={[styles.empty, { color: c.muted }]}>You're all caught up.</Text>
          ) : null}
          {rows.map((n) => (
            <FloatPress
              key={n.id}
              style={[
                styles.card,
                {
                  backgroundColor: c.paper,
                  borderColor: n.is_read ? c.border : c.pink,
                },
              ]}
              onPress={() => open(n)}
            >
              <View style={[styles.iconWrap, { backgroundColor: c.blushSoft }]}>
                <Icon name={notifIcon(n)} size={20} color={c.pink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: c.ink }]}>{n.title || "Update"}</Text>
                {n.body ? (
                  <Text style={[styles.body, { color: c.muted }]} numberOfLines={2}>
                    {n.body}
                  </Text>
                ) : null}
              </View>
              <Icon name="chevron-forward" size={16} color={c.muted} />
            </FloatPress>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: fonts.display, fontSize: 28 },
  sub: { fontFamily: fonts.body, fontSize: 13, marginBottom: space.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { gap: space.sm, paddingBottom: 40 },
  error: { fontFamily: fonts.medium },
  empty: { fontFamily: fonts.body, marginTop: 24, textAlign: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontFamily: fonts.bold, fontSize: 15 },
  body: { fontFamily: fonts.body, fontSize: 13, marginTop: 2 },
});

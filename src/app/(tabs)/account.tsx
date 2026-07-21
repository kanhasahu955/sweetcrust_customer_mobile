import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { Banner } from "@/components/ui/Banner";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useApp } from "@/context/app";
import { useThemeColors } from "@/context/theme";
import { useTabBarClearance } from "@/hooks/use-tab-bar-clearance";
import { api } from "@/lib/api";
import { fonts, radius, space } from "@/lib/theme";
import { money, type AuthUser } from "@/lib/types";

type Summary = {
  user?: AuthUser;
  orders_count?: number;
  total_spent?: number;
  favorites?: unknown[];
  payments?: { id: number; amount?: number; status?: string; method?: string }[];
};

type MenuItem = {
  title: string;
  icon: string;
  href: string;
  danger?: boolean;
};

const MENU: MenuItem[] = [
  { title: "Saved addresses", icon: "location-outline", href: "/addresses" },
  { title: "My orders", icon: "bag-handle-outline", href: "/(tabs)/orders" },
  { title: "Favorites", icon: "heart-outline", href: "/favorites" },
  { title: "Payment history", icon: "wallet-outline", href: "/wallet" },
  { title: "Returns", icon: "return-down-back-outline", href: "/returns" },
  { title: "Chat history", icon: "chatbubbles-outline", href: "/(tabs)/chat" },
  { title: "Call history", icon: "call-outline", href: "/calls" },
  { title: "Notifications", icon: "notifications-outline", href: "/notifications" },
  { title: "Language", icon: "language-outline", href: "/language" },
  { title: "Appearance", icon: "moon-outline", href: "/appearance" },
  { title: "Help & support", icon: "help-circle-outline", href: "/help" },
  { title: "Gift hampers", icon: "gift-outline", href: "/gift-hamper" },
  { title: "Subscriptions", icon: "calendar-outline", href: "/subscriptions" },
  { title: "Refer & earn", icon: "people-outline", href: "/referral" },
  { title: "Corporate orders", icon: "business-outline", href: "/corporate" },
  { title: "Custom cakes", icon: "color-palette", href: "/custom-cake" },
];

export default function AccountScreen() {
  const router = useRouter();
  const clearance = useTabBarClearance(16);
  const c = useThemeColors();
  const { user, setUser, logout } = useApp();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [booting, setBooting] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(
    async (mode: "boot" | "pull" = "boot") => {
      if (mode === "pull") setRefreshing(true);
      setError(null);
      try {
        const data = (await api.customer.profileSummary()) as Summary;
        setSummary(data);
        if (data.user) {
          setName(data.user.name || "");
          setEmail(data.user.email || "");
          setUser(data.user);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load profile");
      } finally {
        setBooting(false);
        setRefreshing(false);
      }
    },
    [setUser]
  );

  useEffect(() => {
    void load("boot");
  }, [load]);

  async function saveProfile() {
    if (name.trim().length < 2) {
      setError("Enter a name");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = (await api.auth.updateMe({
        name: name.trim(),
        email: email.trim() || undefined,
      })) as AuthUser;
      setUser(updated);
      setMsg("Profile saved");
      setEditOpen(false);
      await load("pull");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  if (booting && !summary) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={c.pink} />
        </View>
      </Screen>
    );
  }

  const displayName = name || user?.name || "Your account";

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: clearance }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load("pull")} tintColor={c.pink} />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <BrandHeader left="none" right="none" tagline="MADE WITH LOVE" compact />

        <View style={[styles.profileCard, { backgroundColor: c.paper, borderColor: c.blush }]}>
          <View style={[styles.avatar, { backgroundColor: c.blushSoft }]}>
            <Text style={[styles.avatarText, { color: c.pink }]}>
              {(displayName || "U").slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroName, { color: c.ink }]}>{displayName}</Text>
            <View style={styles.phoneRow}>
              <View style={[styles.phoneIcon, { backgroundColor: c.blushSoft }]}>
                <Icon name="call" size={12} color={c.pink} />
              </View>
              <Text style={[styles.heroMeta, { color: c.cocoa }]}>{user?.phone || ""}</Text>
            </View>
          </View>
          <Icon name="cafe" size={36} color={c.pink} />
        </View>

        {error ? <Banner text={error} tone="danger" /> : null}
        {msg ? <Banner text={msg} tone="ok" /> : null}

        <View style={styles.statRow}>
          <Stat label="Orders" value={String(summary?.orders_count ?? 0)} c={c} />
          <Stat label="Spent" value={money(summary?.total_spent)} c={c} accent />
          <Stat label="Saved" value={String(summary?.favorites?.length ?? 0)} c={c} />
        </View>

        <Pressable onPress={() => setEditOpen((v) => !v)}>
          <Text style={[styles.editToggle, { color: c.pink }]}>
            {editOpen ? "Hide profile edit" : "Edit name & email"}
          </Text>
        </Pressable>
        {editOpen ? (
          <View style={styles.editBox}>
            <TextInput
              style={[styles.input, { backgroundColor: c.paper, borderColor: c.border, color: c.ink }]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={c.muted}
            />
            <TextInput
              style={[styles.input, { backgroundColor: c.paper, borderColor: c.border, color: c.ink }]}
              value={email}
              onChangeText={setEmail}
              placeholder="Email (optional)"
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Pressable
              style={[styles.btn, { backgroundColor: c.chocolate }]}
              onPress={saveProfile}
              disabled={busy}
            >
              <Text style={styles.btnText}>{busy ? "Saving…" : "Save profile"}</Text>
            </Pressable>
          </View>
        ) : null}

        {MENU.map((item) => (
          <LinkRow
            key={item.title}
            title={item.title}
            icon={item.icon}
            onPress={() => router.push(item.href as never)}
            c={c}
          />
        ))}

        <Pressable style={[styles.logout, { borderColor: c.pink }]} onPress={logout}>
          <Icon name="log-out-outline" size={18} color={c.danger} />
          <Text style={[styles.logoutText, { color: c.danger }]}>Logout</Text>
          <Icon name="chevron-forward" size={18} color={c.danger} />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Stat({
  label,
  value,
  accent,
  c,
}: {
  label: string;
  value: string;
  accent?: boolean;
  c: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View
      style={[
        styles.stat,
        { backgroundColor: accent ? c.blushSoft : c.paper, borderColor: c.border },
      ]}
    >
      <Text style={[styles.statLabel, { color: c.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: c.ink }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function LinkRow({
  title,
  icon,
  onPress,
  c,
}: {
  title: string;
  icon: string;
  onPress: () => void;
  c: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.link,
        { backgroundColor: c.paper, borderColor: c.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Icon name={icon} size={20} color={c.pink} />
      <Text style={[styles.linkTitle, { color: c.ink }]}>{title}</Text>
      <Icon name="chevron-forward" size={18} color={c.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: space.md,
    marginBottom: space.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: fonts.display, fontSize: 24 },
  heroName: { fontFamily: fonts.bold, fontSize: 18 },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  phoneIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  heroMeta: { fontFamily: fonts.body, fontSize: 13 },
  statRow: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.sm,
  },
  statLabel: { fontFamily: fonts.medium, fontSize: 11 },
  statValue: { fontFamily: fonts.bold, fontSize: 15, marginTop: 2 },
  editToggle: { fontFamily: fonts.bold, fontSize: 13, marginVertical: 4 },
  editBox: { gap: 8 },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
  },
  btn: { borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  btnText: { color: "#FFF", fontFamily: fonts.bold },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: space.md,
  },
  linkTitle: { flex: 1, fontFamily: fonts.medium, fontSize: 15 },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: space.md,
    marginTop: space.sm,
  },
  logoutText: { flex: 1, fontFamily: fonts.bold, fontSize: 15 },
});

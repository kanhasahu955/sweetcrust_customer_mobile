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
import { LinearGradient } from "expo-linear-gradient";
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
};

const SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: "Shopping",
    items: [
      { title: "Saved addresses", icon: "location-outline", href: "/addresses" },
      { title: "My orders", icon: "bag-handle-outline", href: "/(tabs)/orders" },
      { title: "Favorites", icon: "heart-outline", href: "/favorites" },
      { title: "Payment history", icon: "wallet-outline", href: "/wallet" },
      { title: "Returns", icon: "return-down-back-outline", href: "/returns" },
    ],
  },
  {
    title: "Support",
    items: [
      { title: "Chat history", icon: "chatbubbles-outline", href: "/(tabs)/chat" },
      { title: "Call history", icon: "call-outline", href: "/calls" },
      { title: "Notifications", icon: "notifications-outline", href: "/notifications" },
      { title: "Help & support", icon: "help-circle-outline", href: "/help" },
    ],
  },
  {
    title: "More",
    items: [
      { title: "Language", icon: "language-outline", href: "/language" },
      { title: "Appearance", icon: "moon-outline", href: "/appearance" },
      { title: "Gift hampers", icon: "gift-outline", href: "/gift-hamper" },
      { title: "Subscriptions", icon: "calendar-outline", href: "/subscriptions" },
      { title: "Refer & earn", icon: "people-outline", href: "/referral" },
      { title: "Corporate orders", icon: "business-outline", href: "/corporate" },
      { title: "Custom cakes", icon: "color-palette", href: "/custom-cake" },
    ],
  },
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
    [setUser],
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
  const initial = (displayName || "U").slice(0, 1).toUpperCase();

  return (
    <Screen>
      <BrandHeader left="none" right="none" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: clearance + 8 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void load("pull")} tintColor={c.pink} />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={["#FFFFFF", "#FFF5F7", "#F3F7FB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.profileCard, { borderColor: "rgba(233,116,142,0.35)" }]}
        >
          <View style={[styles.avatar, { backgroundColor: c.pink }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.heroName, { color: c.ink }]} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.phoneRow}>
              <View style={[styles.phoneIcon, { backgroundColor: "rgba(255,255,255,0.85)" }]}>
                <Icon name="call" size={12} color={c.pink} />
              </View>
              <Text style={[styles.heroMeta, { color: c.cocoa }]} numberOfLines={1}>
                {user?.phone || "Add phone"}
              </Text>
            </View>
          </View>
          <View style={[styles.badgeCafe, { backgroundColor: "rgba(255,255,255,0.85)" }]}>
            <Icon name="cafe" size={22} color={c.pink} />
          </View>
        </LinearGradient>

        {error ? <Banner text={error} tone="danger" /> : null}
        {msg ? <Banner text={msg} tone="ok" /> : null}

        <View style={styles.statRow}>
          <Stat label="Orders" value={String(summary?.orders_count ?? 0)} c={c} />
          <Stat label="Spent" value={money(summary?.total_spent)} c={c} accent />
          <Stat label="Saved" value={String(summary?.favorites?.length ?? 0)} c={c} />
        </View>

        <Pressable
          onPress={() => setEditOpen((v) => !v)}
          style={[styles.editToggleBtn, { backgroundColor: c.blushSoft, borderColor: "rgba(233,116,142,0.3)" }]}
        >
          <Icon name={editOpen ? "chevron-up" : "create-outline"} size={16} color={c.pink} />
          <Text style={[styles.editToggle, { color: c.pink }]}>
            {editOpen ? "Hide profile edit" : "Edit name & email"}
          </Text>
        </Pressable>

        {editOpen ? (
          <View style={[styles.editBox, { backgroundColor: "#FFFFFF", borderColor: c.border }]}>
            <TextInput
              style={[styles.input, { backgroundColor: c.cream, borderColor: c.border, color: c.ink }]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={c.muted}
            />
            <TextInput
              style={[styles.input, { backgroundColor: c.cream, borderColor: c.border, color: c.ink }]}
              value={email}
              onChangeText={setEmail}
              placeholder="Email (optional)"
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Pressable
              style={[styles.btn, { backgroundColor: c.pink }]}
              onPress={saveProfile}
              disabled={busy}
            >
              <Text style={styles.btnText}>{busy ? "Saving…" : "Save profile"}</Text>
            </Pressable>
          </View>
        ) : null}

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.muted }]}>{section.title}</Text>
            <View style={[styles.sectionCard, { backgroundColor: "#FFFFFF", borderColor: c.border }]}>
              {section.items.map((item, idx) => (
                <LinkRow
                  key={item.title}
                  title={item.title}
                  icon={item.icon}
                  last={idx === section.items.length - 1}
                  onPress={() => router.push(item.href as never)}
                  c={c}
                />
              ))}
            </View>
          </View>
        ))}

        <Pressable
          style={[styles.logout, { backgroundColor: "#FFF5F5", borderColor: "rgba(214,69,69,0.35)" }]}
          onPress={logout}
        >
          <View style={[styles.linkIcon, { backgroundColor: "rgba(214,69,69,0.1)" }]}>
            <Icon name="log-out-outline" size={18} color={c.danger} />
          </View>
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
        {
          backgroundColor: accent ? c.blushSoft : "#FFFFFF",
          borderColor: accent ? "rgba(233,116,142,0.35)" : c.border,
        },
      ]}
    >
      <Text style={[styles.statLabel, { color: c.muted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: accent ? c.pink : c.ink }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function LinkRow({
  title,
  icon,
  onPress,
  last,
  c,
}: {
  title: string;
  icon: string;
  onPress: () => void;
  last?: boolean;
  c: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.link,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
        { opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={[styles.linkIcon, { backgroundColor: c.blushSoft }]}>
        <Icon name={icon} size={18} color={c.pink} />
      </View>
      <Text style={[styles.linkTitle, { color: c.ink }]}>{title}</Text>
      <Icon name="chevron-forward" size={18} color={c.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#4A6280",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
  avatarText: { fontFamily: fonts.display, fontSize: 26, color: "#FFF" },
  heroName: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.3 },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  phoneIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  heroMeta: { fontFamily: fonts.body, fontSize: 13, flexShrink: 1 },
  badgeCafe: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statRow: { flexDirection: "row", gap: 8 },
  stat: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    shadowColor: "#6A849C",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statLabel: { fontFamily: fonts.medium, fontSize: 11 },
  statValue: { fontFamily: fonts.bold, fontSize: 16, marginTop: 4, letterSpacing: -0.2 },
  editToggleBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  editToggle: { fontFamily: fonts.bold, fontSize: 13 },
  editBox: {
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
  },
  btn: { borderRadius: 14, paddingVertical: 13, alignItems: "center" },
  btnText: { color: "#FFF", fontFamily: fonts.bold, fontSize: 14 },
  section: { gap: 8 },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#6A849C",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  linkIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  linkTitle: { flex: 1, fontFamily: fonts.medium, fontSize: 15 },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  logoutText: { flex: 1, fontFamily: fonts.bold, fontSize: 15 },
});

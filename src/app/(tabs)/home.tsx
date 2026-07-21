import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
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

import { ProductTile } from "@/components/commerce/ProductTile";
import { Banner } from "@/components/ui/Banner";
import { Icon } from "@/components/ui/Icon";
import { OfflineBanner, isNetworkError } from "@/components/ui/OfflineBanner";
import { Screen } from "@/components/ui/Screen";
import { Skeleton, SkeletonCircle } from "@/components/ui/Skeleton";
import { useApp } from "@/context/app";
import { useThemeColors } from "@/context/theme";
import { useCartQty } from "@/hooks/use-cart-qty";
import { useLayout } from "@/hooks/use-layout";
import { useTabBarClearance } from "@/hooks/use-tab-bar-clearance";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { colors, float, fonts, radius, space } from "@/lib/theme";
import type { Product, ShopCard } from "@/lib/types";

type Category = { id: number; name: string; image_url?: string | null };
type PromoBanner = {
  id: number | string;
  title: string;
  subtitle?: string | null;
  image_url?: string;
  link_value?: string | null;
  colors?: [string, string];
};

export default function HomeScreen() {
  const tc = useThemeColors();
  const router = useRouter();
  const clearance = useTabBarClearance(8);
  const layout = useLayout();
  const bannerW = layout.width - layout.pagePad * 2;
  const { t } = useI18n();
  const { user, home, error, cartCount, refresh, refreshHome } = useApp();
  const cartQty = useCartQty();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [addressLine, setAddressLine] = useState("Set delivery address");
  const [unread, setUnread] = useState(0);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [favIds, setFavIds] = useState<Record<number, boolean>>({});
  const [shops, setShops] = useState<ShopCard[]>([]);
  const skeleton = !home && !error;

  useEffect(() => {
    refreshHome().catch(() => undefined);
    api.customer
      .addresses()
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        const def = list.find((a: { is_default?: boolean }) => a.is_default) || list[0];
        if (def?.line1) setAddressLine([def.line1, def.city || def.pincode].filter(Boolean).join(", "));
      })
      .catch(() => undefined);
    api.customer
      .notifications(true)
      .then((n) => setUnread(Array.isArray(n) ? n.length : 0))
      .catch(() => undefined);
    api.customer
      .shops()
      .then((rows) => setShops(Array.isArray(rows) ? (rows as ShopCard[]) : []))
      .catch(() => undefined);
  }, [refreshHome]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const apiCategories = (home?.categories || []) as Category[];
  const banners = useMemo(() => (home?.banners || []) as PromoBanner[], [home]);

  const rails = useMemo(
    () =>
      [
        { title: t("bestSellers"), items: home?.bestsellers || [] },
        { title: t("freshlyBaked"), items: home?.freshly_baked || [] },
        { title: "Trending now", items: home?.trending || [] },
        { title: "Festival picks", items: home?.festival_offers || [] },
        { title: "Top rated", items: home?.recommended || [] },
        { title: "Recently viewed", items: home?.recently_viewed || [] },
      ].filter((r) => r.items.length > 0),
    [home, t]
  );

  function goSearch(q?: string) {
    const query = (q ?? search).trim();
    router.push(query ? { pathname: "/(tabs)/catalog", params: { q: query } } : "/(tabs)/catalog");
  }

  async function toggleFav(p: Product) {
    try {
      await api.customer.favorite(p.id);
      setFavIds((m) => ({ ...m, [p.id]: !(m[p.id] ?? p.is_favorite) }));
    } catch {
      /* ignore */
    }
  }

  const ink = tc.ink;
  const muted = tc.muted;
  const surface = tc.paper;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: clearance + 8 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tc.pink} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Location + bell (mockup customer-04) */}
        <View style={styles.header}>
          <Pressable style={styles.loc} onPress={() => router.push("/addresses")}>
            <Icon name="location" size={20} color={tc.pink} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.locLine, { color: ink }]} numberOfLines={1}>
                {addressLine}
              </Text>
            </View>
            <Icon name="chevron-down" size={16} color={muted} />
          </Pressable>
          <Pressable style={[styles.iconBtn, { backgroundColor: surface, borderColor: tc.border }]} onPress={() => router.push("/notifications")}>
            <Icon name="notifications-outline" size={22} color={ink} />
            {unread > 0 ? <View style={styles.dot} /> : null}
          </Pressable>
        </View>

        {/* Search + mic */}
        <View style={[styles.searchWrap, { backgroundColor: surface, borderColor: tc.border }]}>
          <Icon name="search" size={18} color={muted} />
          <TextInput
            style={[styles.search, { color: ink }]}
            value={search}
            onChangeText={setSearch}
            placeholder={t("search")}
            placeholderTextColor={muted}
            returnKeyType="search"
            onSubmitEditing={() => goSearch()}
          />
          <Pressable
            onPress={() => goSearch()}
            hitSlop={10}
            accessibilityLabel="Voice search"
          >
            <Icon name="mic-outline" size={20} color={tc.pink} />
          </Pressable>
          {cartCount > 0 ? (
            <Pressable style={[styles.cartChip, { backgroundColor: tc.pink }]} onPress={() => router.push("/cart")}>
              <Icon name="bag-handle" size={16} color="#FFF" />
              <Text style={styles.cartChipText}>{cartCount}</Text>
            </Pressable>
          ) : null}
        </View>

        <OfflineBanner
          fullScreen
          offline={Boolean(error && isNetworkError(error))}
          error={error}
          onRetry={() => refresh()}
        />
        {error && !isNetworkError(error) ? <Banner text={error} tone="danger" /> : null}

        {skeleton ? (
          <View style={{ gap: 12 }}>
            <Skeleton height={150} borderRadius={radius.lg} />
            <View style={{ flexDirection: "row", gap: 12, justifyContent: "center" }}>
              <SkeletonCircle size={68} />
              <SkeletonCircle size={68} />
              <SkeletonCircle size={68} />
              <SkeletonCircle size={68} />
            </View>
            <Skeleton height={200} borderRadius={radius.lg} />
          </View>
        ) : null}

        {!skeleton && banners.length ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                setBannerIdx(Math.round(e.nativeEvent.contentOffset.x / bannerW));
              }}
            >
              {banners.map((b) => (
                <Pressable
                  key={String(b.id)}
                  style={[styles.bannerCard, { width: bannerW, height: layout.bannerH }]}
                  onPress={() => {
                    if (b.link_value) router.push(`/product/${b.link_value}` as never);
                    else goSearch();
                  }}
                >
                  {b.image_url ? (
                    <>
                      <Image source={{ uri: b.image_url }} style={styles.bannerImg} resizeMode="cover" />
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.55)"]}
                        style={styles.bannerShade}
                      >
                        <Text style={styles.bannerTitle} numberOfLines={1}>
                          {b.title}
                        </Text>
                        {b.subtitle ? (
                          <Text style={styles.bannerSub} numberOfLines={1}>
                            {b.subtitle}
                          </Text>
                        ) : null}
                      </LinearGradient>
                    </>
                  ) : (
                    <LinearGradient
                      colors={b.colors || [tc.coral, tc.pink]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.bannerImg}
                    >
                      <Text style={styles.bannerTitle}>{b.title}</Text>
                      {b.subtitle ? <Text style={styles.bannerSub}>{b.subtitle}</Text> : null}
                    </LinearGradient>
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.dots}>
              {banners.map((b, i) => (
                <View
                  key={String(b.id)}
                  style={[
                    styles.dotPage,
                    { backgroundColor: tc.border },
                    i === bannerIdx && { backgroundColor: tc.chocolate, width: 14 },
                  ]}
                />
              ))}
            </View>
          </View>
        ) : null}

        {!skeleton && shops.length ? (
          <View style={{ marginTop: 8, marginBottom: 4 }}>
            <Text style={[styles.section, { color: ink, fontSize: 20 }]}>Shops near you</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
              {shops.map((s) => (
                <Pressable
                  key={s.user_id}
                  style={[styles.shopCard, { backgroundColor: surface, borderColor: tc.border }]}
                  onPress={() => router.push(`/shops/${s.user_id}`)}
                >
                  {s.shop_logo_url ? (
                    <Image source={{ uri: s.shop_logo_url }} style={styles.shopLogo} />
                  ) : (
                    <View style={[styles.shopLogo, { backgroundColor: tc.creamDeep, alignItems: "center", justifyContent: "center" }]}>
                      <Text style={{ fontFamily: fonts.display, fontSize: 20, color: ink }}>
                        {(s.shop_name || "S").slice(0, 1)}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.shopName, { color: ink }]} numberOfLines={1}>
                    {s.shop_name}
                  </Text>
                  <Text style={{ color: muted, fontFamily: fonts.body, fontSize: 11 }} numberOfLines={1}>
                    {s.village || s.area || s.city || "Local shop"} · {s.product_count ?? 0}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {!skeleton && apiCategories.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {apiCategories.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.catItem, { width: layout.catSize + 12 }]}
                onPress={() => router.push({ pathname: "/(tabs)/catalog", params: { category_id: String(c.id) } })}
              >
                <View
                  style={[
                    styles.catCircle,
                    {
                      backgroundColor: tc.creamDeep,
                      width: layout.catSize,
                      height: layout.catSize,
                      borderRadius: layout.catSize / 2,
                    },
                  ]}
                >
                  {c.image_url ? (
                    <Image source={{ uri: c.image_url }} style={styles.catImg} resizeMode="cover" />
                  ) : (
                    <Text style={[styles.catLetter, { color: tc.ink }]}>{c.name.slice(0, 1).toUpperCase()}</Text>
                  )}
                </View>
                <Text style={[styles.catName, { color: ink }]} numberOfLines={2}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
            <Pressable
              style={[styles.catItem, { width: layout.catSize + 12 }]}
              onPress={() => router.push("/(tabs)/categories")}
            >
              <View
                style={[
                  styles.catCircle,
                  {
                    backgroundColor: tc.chocolate,
                    width: layout.catSize,
                    height: layout.catSize,
                    borderRadius: layout.catSize / 2,
                  },
                ]}
              >
                <Icon name="apps" size={24} color="#FFF" />
              </View>
              <Text style={[styles.catName, { color: ink }]}>{t("seeAll")}</Text>
            </Pressable>
          </ScrollView>
        ) : null}

        {!skeleton ? (
          <Pressable style={styles.customBanner} onPress={() => router.push("/custom-cake")}>
            <LinearGradient colors={[tc.blushSoft, "#FFE0CC"]} style={[styles.customInner, { borderColor: "rgba(233,116,142,0.25)" }]}>
              <View style={[styles.customIcon, { backgroundColor: tc.paper }]}>
                <Icon name="color-palette" size={22} color={tc.pink} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.customTitle, { color: tc.ink }]}>{t("customCake")}</Text>
                <Text style={[styles.customSub, { color: tc.muted }]}>{t("customCakeSub")}</Text>
              </View>
              <Text style={[styles.customCta, { color: tc.pink }]}>{t("start")} →</Text>
            </LinearGradient>
          </Pressable>
        ) : null}

        {rails.map((rail) => (
          <View key={rail.title} style={styles.railBlock}>
            <View style={styles.railHead}>
              <Text style={[styles.section, { color: ink, fontSize: layout.sectionSize }]}>{rail.title}</Text>
              <Pressable onPress={() => goSearch()} style={styles.viewAllBtn}>
                <Text style={[styles.seeAll, { color: tc.pink }]}>{t("viewAll")}</Text>
                <Icon name="chevron-forward" size={14} color={tc.pink} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {rail.items.slice(0, 12).map((p) => (
                <ProductTile
                  key={p.id}
                  product={p}
                  width={layout.tileW}
                  qty={cartQty.qtyOf(p.id)}
                  busy={cartQty.busyId === p.id}
                  onPress={() => router.push(`/product/${p.id}`)}
                  onAdd={() => cartQty.add(p).catch(() => undefined)}
                  onInc={() => cartQty.inc(p).catch(() => undefined)}
                  onDec={() => cartQty.dec(p).catch(() => undefined)}
                  onFavorite={() => toggleFav(p)}
                  favorited={favIds[p.id] ?? p.is_favorite}
                />
              ))}
            </ScrollView>
          </View>
        ))}

        {!skeleton && !rails.length ? (
          <View style={[styles.empty, { backgroundColor: tc.paper }]}>
            <Icon name="storefront-outline" size={36} color={tc.pink} />
            <Text style={[styles.emptyTitle, { color: tc.ink }]}>Catalog warming up</Text>
            <Text style={[styles.emptySub, { color: tc.muted }]}>Pull to refresh, or browse bakery categories.</Text>
            <Pressable style={[styles.emptyBtn, { backgroundColor: tc.pink }]} onPress={() => router.push("/(tabs)/categories")}>
              <Text style={styles.emptyBtnText}>Browse categories</Text>
            </Pressable>
          </View>
        ) : null}

        {user?.name ? (
          <Text style={[styles.hi, { color: muted }]}>Hi, {user.name.split(" ")[0]} — baked with love</Text>
        ) : null}
      </ScrollView>

      {/* Sweetie FAB — customer-04 */}
      <Pressable style={[styles.fab, { bottom: clearance }]} onPress={() => router.push("/(tabs)/chat")}>
        {!layout.narrow ? (
          <View style={[styles.fabBubble, { backgroundColor: tc.blushSoft, borderColor: tc.blush }]}>
            <Text style={[styles.fabText, { color: tc.chocolate }]} numberOfLines={2}>
              {t("sweetieHi")}
            </Text>
          </View>
        ) : null}
        <View style={[styles.fabCircle, { backgroundColor: tc.pink }]}>
          <Icon name="sparkles" size={22} color="#FFF" />
        </View>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: space.sm, paddingTop: 2 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  loc: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  locLine: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.pink,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.md,
    paddingVertical: 4,
    ...float,
  },
  search: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: fonts.body,
    color: colors.ink,
  },
  cartChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.pink,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  cartChipText: { color: colors.white, fontFamily: fonts.bold, fontSize: 11 },
  bannerCard: {
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.ink,
    marginRight: 0,
  },
  bannerImg: { width: "100%", height: "100%", justifyContent: "flex-end", padding: space.md },
  bannerShade: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-end",
    padding: space.md,
  },
  bannerOff: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.25)",
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: "hidden",
    marginBottom: 8,
  },
  bannerTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.white },
  bannerSub: { fontFamily: fonts.body, fontSize: 12, color: "#FFE4D4", marginTop: 2 },
  bannerCake: { position: "absolute", right: 12, top: 16, opacity: 0.9 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: 6 },
  dotPage: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.border },
  dotPageOn: { backgroundColor: colors.chocolate, width: 14 },
  catRow: { gap: space.sm, paddingVertical: 2, paddingRight: 8 },
  catItem: { alignItems: "center" },
  catCircle: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  catImg: { width: "100%", height: "100%" },
  catLetter: { fontFamily: fonts.bold, fontSize: 20, color: colors.ink },
  catName: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.cocoa,
    textAlign: "center",
    lineHeight: 14,
  },
  customBanner: { borderRadius: radius.lg, overflow: "hidden" },
  customInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    borderWidth: 1,
    borderColor: "rgba(233,116,142,0.25)",
    borderRadius: radius.lg,
  },
  customIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  customTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  customSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 3 },
  customCta: { fontFamily: fonts.bold, fontSize: 13, color: colors.pink },
  shopCard: {
    width: 120,
    padding: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 4,
  },
  shopLogo: { width: 48, height: 48, borderRadius: radius.md },
  shopName: { fontFamily: fonts.bold, fontSize: 13 },
  railBlock: { gap: space.sm },
  railHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  section: { fontFamily: fonts.display, color: colors.ink },
  viewAllBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAll: { fontFamily: fonts.bold, fontSize: 13, color: colors.pink },
  rail: { gap: space.sm, paddingRight: space.sm },
  empty: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: space.md,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  emptySub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: "center" },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: colors.pink,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyBtnText: { fontFamily: fonts.bold, color: colors.white },
  hi: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted, textAlign: "center" },
  fab: { position: "absolute", right: 14, alignItems: "flex-end", gap: 8 },
  fabCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.pink,
    alignItems: "center",
    justifyContent: "center",
    ...float,
  },
  fabBubble: {
    backgroundColor: colors.blushSoft,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.blush,
    maxWidth: 140,
  },
  fabText: { fontFamily: fonts.medium, fontSize: 10, color: colors.chocolate, lineHeight: 13 },
});

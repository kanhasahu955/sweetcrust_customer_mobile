import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ProductTile } from "@/components/commerce/ProductTile";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useApp } from "@/context/app";
import { useThemeColors } from "@/context/theme";
import { useCartQty } from "@/hooks/use-cart-qty";
import { useLayout } from "@/hooks/use-layout";
import { useTabBarClearance } from "@/hooks/use-tab-bar-clearance";
import { api } from "@/lib/api";
import { fonts, radius } from "@/lib/theme";
import type { Product } from "@/lib/types";

type Category = { id: number; name: string; image_url?: string | null };
type SortKey = "popular" | "price_asc" | "price_desc" | "newest" | "rating";
type FilterTab = "sort" | "dietary" | "category" | "brand";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "popular", label: "Popular" },
  { key: "price_asc", label: "Price — low to high" },
  { key: "price_desc", label: "Price — high to low" },
  { key: "newest", label: "Newest" },
  { key: "rating", label: "Rating" },
];

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "sort", label: "Sort" },
  { key: "dietary", label: "Dietary" },
  { key: "category", label: "Category" },
  { key: "brand", label: "Brand" },
];

export default function CatalogScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const { cartCount } = useApp();
  const clearance = useTabBarClearance(20);
  const cartQty = useCartQty();
  const params = useLocalSearchParams<{
    category_id?: string;
    brand_name?: string;
    q?: string;
    offers?: string;
    eggless?: string;
    shop_user_id?: string;
    supplier_user_id?: string;
  }>();
  const [q, setQ] = useState(typeof params.q === "string" ? params.q : "");
  const [categoryId, setCategoryId] = useState<number | undefined>(
    params.category_id ? Number(params.category_id) : undefined,
  );
  const [brandName, setBrandName] = useState<string | undefined>(
    typeof params.brand_name === "string" ? params.brand_name : undefined,
  );
  const shopUserId = Number(params.shop_user_id || params.supplier_user_id || 0) || undefined;
  const [eggless, setEggless] = useState(params.eggless === "1");
  const [offers, setOffers] = useState(params.offers === "1");
  const [sameDay, setSameDay] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [sugarFree, setSugarFree] = useState(false);
  const [sort, setSort] = useState<SortKey>("popular");
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<{ name: string }[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("sort");
  const sheetY = useRef(new Animated.Value(480)).current;

  const gap = 12;
  const tileW = (layout.width - layout.pagePad * 2 - gap) / 2;
  const sheetH = Math.min(480, Math.round(layout.height * 0.58));

  useEffect(() => {
    api.customer
      .categories()
      .then((data) => setCategories(Array.isArray(data) ? (data as Category[]) : []))
      .catch(() => setCategories([]));
    api.customer
      .brands()
      .then((data) => setBrands(Array.isArray(data) ? data : []))
      .catch(() => setBrands([]));
  }, []);

  useEffect(() => {
    if (params.category_id) setCategoryId(Number(params.category_id));
    if (typeof params.brand_name === "string") setBrandName(params.brand_name || undefined);
    if (typeof params.q === "string") setQ(params.q);
    if (params.eggless === "1") setEggless(true);
    if (params.offers === "1") setOffers(true);
  }, [params.category_id, params.brand_name, params.q, params.eggless, params.offers]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.customer.products({
        q: q.trim() || undefined,
        category_id: categoryId,
        brand_name: brandName,
        supplier_user_id: shopUserId,
        eggless: eggless || undefined,
        offers: offers || undefined,
        same_day: sameDay || undefined,
        in_stock: inStock || undefined,
        sugar_free: sugarFree || undefined,
        sort,
        page_size: 60,
      });
      setItems((data.items || []) as Product[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load products");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q, categoryId, brandName, shopUserId, eggless, offers, sameDay, inStock, sugarFree, sort]);

  useEffect(() => {
    const t = setTimeout(load, 220);
    return () => clearTimeout(t);
  }, [load]);

  const openFilters = () => {
    setFilterOpen(true);
    sheetY.setValue(sheetH + 40);
    Animated.timing(sheetY, { toValue: 0, duration: 240, useNativeDriver: true }).start();
  };

  const closeFilters = () => {
    Animated.timing(sheetY, { toValue: sheetH + 40, duration: 200, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setFilterOpen(false);
    });
  };

  const tabCounts = useMemo(() => {
    const dietary =
      Number(eggless) + Number(offers) + Number(sameDay) + Number(inStock) + Number(sugarFree);
    return {
      sort: sort !== "popular" ? 1 : 0,
      dietary,
      category: categoryId ? 1 : 0,
      brand: brandName ? 1 : 0,
    };
  }, [sort, eggless, offers, sameDay, inStock, sugarFree, categoryId, brandName]);

  const clearFilters = () => {
    setEggless(false);
    setOffers(false);
    setSameDay(false);
    setInStock(false);
    setSugarFree(false);
    setSort("popular");
    setBrandName(undefined);
    setCategoryId(undefined);
  };

  const activeCount = useMemo(() => {
    let n = 0;
    if (eggless) n++;
    if (offers) n++;
    if (sameDay) n++;
    if (inStock) n++;
    if (sugarFree) n++;
    if (sort !== "popular") n++;
    if (brandName) n++;
    if (categoryId) n++;
    return n;
  }, [eggless, offers, sameDay, inStock, sugarFree, sort, brandName, categoryId]);

  const headerTitle = categoryId
    ? categories.find((cat) => cat.id === categoryId)?.name || "Products"
    : "All products";

  return (
    <Screen>
      <BrandHeader
        left="back"
        right="cart"
        cartCount={cartCount}
        onLeft={() => router.back()}
        compact
      >
        <View style={[styles.searchShell, { backgroundColor: "rgba(255,255,255,0.96)", borderColor: c.border }]}>
          <Icon name="search" size={16} color={c.muted} />
          <TextInput
            style={[styles.search, { color: c.ink }]}
            value={q}
            onChangeText={setQ}
            placeholder={`Search ${headerTitle}…`}
            placeholderTextColor={c.muted}
            returnKeyType="search"
          />
          <Pressable onPress={openFilters} hitSlop={10} style={styles.filterIcon}>
            <Icon name="options-outline" size={18} color={activeCount ? c.pink : c.ink} />
            {activeCount > 0 ? (
              <View style={[styles.filterDot, { backgroundColor: c.pink }]}>
                <Text style={styles.filterDotText}>{activeCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </BrandHeader>

      <View style={styles.heading}>
        <Text style={[styles.headingTitle, { color: c.ink }]} numberOfLines={1}>
          {headerTitle}
        </Text>
        <Text style={[styles.headingSub, { color: c.muted }]}>
          {loading ? "…" : `${items.length} items`}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        <QuickChip
          label="Filter"
          icon="options-outline"
          active={activeCount > 0}
          onPress={openFilters}
          c={c}
        />
        <QuickChip label="Eggless" active={eggless} onPress={() => setEggless((v) => !v)} c={c} />
        <QuickChip label="Offers" active={offers} onPress={() => setOffers((v) => !v)} c={c} />
        <QuickChip label="Same day" active={sameDay} onPress={() => setSameDay((v) => !v)} c={c} />
        <QuickChip label="In stock" active={inStock} onPress={() => setInStock((v) => !v)} c={c} />
        {brandName ? (
          <QuickChip label={brandName} active onPress={() => setBrandName(undefined)} c={c} />
        ) : null}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.pink} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={[styles.error, { color: c.danger }]}>{error}</Text>
          <FloatPress onPress={load}>
            <Text style={[styles.retry, { color: c.pink }]}>Retry</Text>
          </FloatPress>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          columnWrapperStyle={[styles.gridRow, { gap }]}
          contentContainerStyle={[styles.list, { paddingBottom: clearance, gap }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={[styles.empty, { color: c.muted }]}>No products in this filter</Text>}
          renderItem={({ item }) => (
            <ProductTile
              product={item}
              width={tileW}
              compact
              qty={cartQty.qtyOf(item.id)}
              busy={cartQty.busyId === item.id}
              onPress={() => router.push(`/product/${item.id}`)}
              onAdd={() => cartQty.add(item).catch(() => undefined)}
              onInc={() => cartQty.inc(item).catch(() => undefined)}
              onDec={() => cartQty.dec(item).catch(() => undefined)}
            />
          )}
        />
      )}

      <Modal visible={filterOpen} transparent animationType="none" onRequestClose={closeFilters} statusBarTranslucent>
        <View style={styles.modalRoot}>
          <Pressable style={styles.scrim} onPress={closeFilters} />
          <Animated.View
            style={[
              styles.sheet,
              {
                height: sheetH,
                paddingBottom: Math.max(insets.bottom, 14),
                backgroundColor: "#FFFFFF",
                transform: [{ translateY: sheetY }],
              },
            ]}
          >
            <View style={styles.sheetHandleWrap}>
              <View style={[styles.sheetHandle, { backgroundColor: c.border }]} />
            </View>
            <View style={[styles.sheetHead, { backgroundColor: "#FFFFFF" }]}>
              <View style={styles.sheetHeadLeft}>
                <Text style={[styles.sheetTitle, { color: c.ink }]}>Filters</Text>
                {activeCount > 0 ? (
                  <View style={[styles.appliedPill, { backgroundColor: c.blushSoft }]}>
                    <Text style={[styles.sheetMeta, { color: c.pink }]}>{activeCount} applied</Text>
                  </View>
                ) : (
                  <Text style={[styles.sheetMeta, { color: c.muted }]}>Refine your bakery picks</Text>
                )}
              </View>
              <Pressable
                onPress={closeFilters}
                hitSlop={10}
                style={[styles.sheetClose, { backgroundColor: c.cream, borderColor: c.border }]}
              >
                <Icon name="close" size={18} color={c.ink} />
              </Pressable>
            </View>

            <View style={[styles.split, { backgroundColor: "#FFFFFF" }]}>
              <View style={[styles.rail, { backgroundColor: c.cream }]}>
                {FILTER_TABS.filter((t) => t.key !== "brand" || brands.length > 0).map((tab) => {
                  const on = filterTab === tab.key;
                  const count = tabCounts[tab.key];
                  return (
                    <Pressable
                      key={tab.key}
                      onPress={() => setFilterTab(tab.key)}
                      style={[styles.railItem, on && [styles.railItemOn, { backgroundColor: "#FFFFFF" }]]}
                    >
                      {on ? <View style={[styles.railAccent, { backgroundColor: c.pink }]} /> : null}
                      <Text
                        style={[styles.railLabel, { color: on ? c.ink : c.muted }, on && styles.railLabelOn]}
                        numberOfLines={1}
                      >
                        {tab.label}
                      </Text>
                      {count > 0 ? (
                        <View style={[styles.railDot, { backgroundColor: c.pink }]}>
                          <Text style={styles.railDotText}>{count}</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              <ScrollView
                style={[styles.options, { backgroundColor: "#FFFFFF" }]}
                contentContainerStyle={styles.optionsBody}
                showsVerticalScrollIndicator={false}
              >
                {filterTab === "sort"
                  ? SORTS.map((s) => (
                      <FilterRow
                        key={s.key}
                        label={s.label}
                        active={sort === s.key}
                        mode="radio"
                        onPress={() => setSort(s.key)}
                        c={c}
                      />
                    ))
                  : null}

                {filterTab === "dietary" ? (
                  <>
                    <FilterRow label="Eggless" active={eggless} mode="check" onPress={() => setEggless((v) => !v)} c={c} />
                    <FilterRow label="Offers" active={offers} mode="check" onPress={() => setOffers((v) => !v)} c={c} />
                    <FilterRow label="Same day" active={sameDay} mode="check" onPress={() => setSameDay((v) => !v)} c={c} />
                    <FilterRow label="In stock" active={inStock} mode="check" onPress={() => setInStock((v) => !v)} c={c} />
                    <FilterRow
                      label="Sugar free"
                      active={sugarFree}
                      mode="check"
                      onPress={() => setSugarFree((v) => !v)}
                      c={c}
                    />
                  </>
                ) : null}

                {filterTab === "category" ? (
                  <>
                    <FilterRow
                      label="All categories"
                      active={!categoryId}
                      mode="radio"
                      onPress={() => setCategoryId(undefined)}
                      c={c}
                    />
                    {categories.map((cat) => (
                      <FilterRow
                        key={cat.id}
                        label={cat.name}
                        active={categoryId === cat.id}
                        mode="radio"
                        onPress={() => setCategoryId(cat.id)}
                        c={c}
                      />
                    ))}
                  </>
                ) : null}

                {filterTab === "brand" ? (
                  <>
                    <FilterRow
                      label="All brands"
                      active={!brandName}
                      mode="radio"
                      onPress={() => setBrandName(undefined)}
                      c={c}
                    />
                    {brands.map((b) => (
                      <FilterRow
                        key={b.name}
                        label={b.name}
                        active={brandName === b.name}
                        mode="radio"
                        onPress={() => setBrandName(b.name)}
                        c={c}
                      />
                    ))}
                  </>
                ) : null}
              </ScrollView>
            </View>

            <View style={[styles.sheetFooter, { backgroundColor: "#FFFFFF", borderTopColor: c.border }]}>
              <Pressable onPress={clearFilters} style={styles.clearBtn}>
                <Text style={[styles.clearText, { color: c.muted }]}>Clear all</Text>
              </Pressable>
              <Pressable onPress={closeFilters} style={[styles.applyBtn, { backgroundColor: c.pink }]}>
                <Text style={styles.applyText}>
                  {activeCount > 0 ? `Show results · ${activeCount}` : "Show results"}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </Screen>
  );
}

function FilterRow({
  label,
  active,
  mode,
  onPress,
  c,
}: {
  label: string;
  active: boolean;
  mode: "radio" | "check";
  onPress: () => void;
  c: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        {
          backgroundColor: active ? c.blushSoft : c.cream,
          borderColor: active ? c.pink : c.border,
        },
      ]}
    >
      <Text style={[styles.rowLabel, { color: c.ink }, active && styles.rowLabelOn]} numberOfLines={2}>
        {label}
      </Text>
      {mode === "radio" ? (
        <View style={[styles.radio, { borderColor: active ? c.pink : c.border }]}>
          {active ? <View style={[styles.radioDot, { backgroundColor: c.pink }]} /> : null}
        </View>
      ) : (
        <View
          style={[
            styles.check,
            { borderColor: active ? c.pink : c.border },
            active && { backgroundColor: c.pink },
          ]}
        >
          {active ? <Icon name="checkmark" size={12} color="#FFF" /> : null}
        </View>
      )}
    </Pressable>
  );
}

function QuickChip({
  label,
  icon,
  active,
  onPress,
  c,
}: {
  label: string;
  icon?: string;
  active?: boolean;
  onPress: () => void;
  c: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.quickChip,
        {
          backgroundColor: active ? c.blushSoft : c.paper,
          borderColor: active ? c.pink : c.border,
        },
      ]}
    >
      {icon ? <Icon name={icon} size={13} color={active ? c.pink : c.ink} /> : null}
      <Text
        style={[styles.quickChipText, { color: active ? c.pink : c.ink }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {active && !icon ? <Icon name="close" size={11} color={c.pink} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: 40,
    width: "100%",
  },
  search: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: fonts.body,
  },
  filterIcon: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  filterDot: {
    position: "absolute",
    top: 0,
    right: -2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  filterDotText: { color: "#FFF", fontFamily: fonts.bold, fontSize: 8 },
  heading: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 6,
    gap: 8,
  },
  headingTitle: { flex: 1, fontFamily: fonts.bold, fontSize: 18, letterSpacing: -0.2 },
  headingSub: { fontFamily: fonts.medium, fontSize: 12 },
  chipScroll: { maxHeight: 34, marginBottom: 8, flexGrow: 0 },
  chipRow: { gap: 6, alignItems: "center", paddingRight: 4 },
  quickChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    height: 32,
    shadowColor: "#6A849C",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  quickChipText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 15,
    includeFontPadding: false,
  },
  list: { paddingTop: 0 },
  gridRow: { justifyContent: "space-between" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  empty: { textAlign: "center", marginTop: 40, fontFamily: fonts.body },
  error: { fontFamily: fonts.medium },
  retry: { fontFamily: fonts.bold },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(30,36,48,0.55)" },
  sheet: {
    zIndex: 2,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 28,
  },
  sheetHandleWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 4, backgroundColor: "#FFFFFF" },
  sheetHandle: { width: 40, height: 4, borderRadius: 2 },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  sheetHeadLeft: { flex: 1, gap: 4 },
  sheetTitle: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.4 },
  appliedPill: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sheetMeta: { fontFamily: fonts.medium, fontSize: 12 },
  sheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  split: {
    flex: 1,
    flexDirection: "row",
    minHeight: 0,
    marginHorizontal: 10,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#DCE4EE",
  },
  rail: { width: 104, paddingVertical: 8, paddingHorizontal: 6, gap: 4 },
  railItem: {
    minHeight: 42,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 12,
  },
  railItemOn: {
    shadowColor: "#6A849C",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  railAccent: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  railLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 15,
    includeFontPadding: false,
  },
  railLabelOn: { fontFamily: fonts.bold },
  railDot: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  railDotText: { color: "#FFF", fontFamily: fonts.bold, fontSize: 9 },
  options: { flex: 1 },
  optionsBody: { padding: 10, gap: 8, paddingBottom: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 19,
    includeFontPadding: false,
  },
  rowLabelOn: { fontFamily: fonts.bold },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 9, height: 9, borderRadius: 5 },
  check: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  clearBtn: { paddingVertical: 12, paddingHorizontal: 4 },
  clearText: { fontFamily: fonts.bold, fontSize: 13 },
  applyBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  applyText: { color: "#FFF", fontFamily: fonts.bold, fontSize: 14 },
});

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ProductTile } from "@/components/commerce/ProductTile";
import { FadeIn } from "@/components/FadeIn";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Screen } from "@/components/ui/Screen";
import { useApp } from "@/context/app";
import { useThemeColors } from "@/context/theme";
import { useCartQty } from "@/hooks/use-cart-qty";
import { useTabBarClearance } from "@/hooks/use-tab-bar-clearance";
import { api } from "@/lib/api";
import { fonts, radius, space } from "@/lib/theme";
import type { Product } from "@/lib/types";

type Category = { id: number; name: string; image_url?: string | null };

export default function CatalogScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const { cartCount } = useApp();
  const clearance = useTabBarClearance(16);
  const cartQty = useCartQty();
  const params = useLocalSearchParams<{
    category_id?: string;
    brand_name?: string;
    q?: string;
    offers?: string;
    eggless?: string;
  }>();
  const [q, setQ] = useState(typeof params.q === "string" ? params.q : "");
  const [categoryId, setCategoryId] = useState<number | undefined>(
    params.category_id ? Number(params.category_id) : undefined
  );
  const [brandName, setBrandName] = useState<string | undefined>(
    typeof params.brand_name === "string" ? params.brand_name : undefined
  );
  const [eggless, setEggless] = useState(params.eggless === "1");
  const [offers, setOffers] = useState(params.offers === "1");
  const [sameDay, setSameDay] = useState(false);
  const [inStock, setInStock] = useState(false);
  const [sugarFree, setSugarFree] = useState(false);
  const [sort, setSort] = useState<"popular" | "price_asc" | "price_desc" | "newest" | "rating">("popular");
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<{ name: string }[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [q, categoryId, brandName, eggless, offers, sameDay, inStock, sugarFree, sort]);

  useEffect(() => {
    const t = setTimeout(load, 220);
    return () => clearTimeout(t);
  }, [load]);

  const headerTitle = categoryId
    ? categories.find((cat) => cat.id === categoryId)?.name || "Products"
    : "All products";

  return (
    <Screen smoky={false}>
      <FadeIn>
        <BrandHeader
          left="back"
          right="cart"
          cartCount={cartCount}
          tagline={headerTitle}
          onLeft={() => router.back()}
        />
        <Text style={[styles.sub, { color: c.muted }]}>Filter · sort · add to cart</Text>
        <TextInput
          style={[styles.search, { borderColor: c.border, backgroundColor: c.paper, color: c.ink }]}
          value={q}
          onChangeText={setQ}
          placeholder="Search products…"
          placeholderTextColor={c.muted}
          returnKeyType="search"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(
            [
              { key: "eggless", label: "Eggless", on: eggless, set: setEggless },
              { key: "offers", label: "Offers", on: offers, set: setOffers },
              { key: "same", label: "Same day", on: sameDay, set: setSameDay },
              { key: "stock", label: "In stock", on: inStock, set: setInStock },
              { key: "sugar", label: "Sugar free", on: sugarFree, set: setSugarFree },
            ] as const
          ).map((f) => (
            <FloatPress
              key={f.key}
              style={[
                styles.filter,
                { borderColor: c.border, backgroundColor: c.paper },
                f.on && { backgroundColor: c.pink, borderColor: c.pink },
              ]}
              onPress={() => f.set((v) => !v)}
            >
              <Text style={[styles.filterText, { color: c.cocoa }, f.on && styles.filterTextOn]}>{f.label}</Text>
            </FloatPress>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(
            [
              ["popular", "Popular"],
              ["price_asc", "Price ↑"],
              ["price_desc", "Price ↓"],
              ["newest", "Newest"],
              ["rating", "Rating"],
            ] as const
          ).map(([key, label]) => (
            <FloatPress
              key={key}
              style={[
                styles.filter,
                { borderColor: c.border, backgroundColor: c.paper },
                sort === key && { backgroundColor: c.pink, borderColor: c.pink },
              ]}
              onPress={() => setSort(key)}
            >
              <Text style={[styles.filterText, { color: c.cocoa }, sort === key && styles.filterTextOn]}>{label}</Text>
            </FloatPress>
          ))}
        </ScrollView>
      </FadeIn>

      <FlatList
        horizontal
        data={[{ id: 0, name: "All" }, ...categories]}
        keyExtractor={(c) => String(c.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipList}
        renderItem={({ item }) => {
          const active = (item.id === 0 && !categoryId) || item.id === categoryId;
          return (
            <FloatPress
              onPress={() => setCategoryId(item.id === 0 ? undefined : item.id)}
              style={[
                styles.chip,
                { borderColor: c.border, backgroundColor: c.paper },
                active && { backgroundColor: c.ink, borderColor: c.ink },
              ]}
            >
              <Text style={[styles.chipText, { color: c.cocoa }, active && styles.chipTextActive]}>{item.name}</Text>
            </FloatPress>
          );
        }}
      />

      {brands.length > 0 ? (
        <FlatList
          horizontal
          data={[{ name: "All brands" }, ...brands]}
          keyExtractor={(b) => b.name}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipList}
          renderItem={({ item }) => {
            const all = item.name === "All brands";
            const active = (all && !brandName) || (!all && brandName === item.name);
            return (
              <FloatPress
                onPress={() => setBrandName(all ? undefined : item.name)}
                style={[
                  styles.chip,
                  { borderColor: c.border, backgroundColor: c.paper },
                  active && { backgroundColor: c.pink, borderColor: c.pink },
                ]}
              >
                <Text style={[styles.chipText, { color: c.cocoa }, active && styles.filterTextOn]}>
                  {item.name}
                </Text>
              </FloatPress>
            );
          }}
        />
      ) : null}

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
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.list, { paddingBottom: clearance }]}
          ListEmptyComponent={<Text style={[styles.empty, { color: c.muted }]}>No products in this filter</Text>}
          renderItem={({ item }) => (
            <ProductTile
              product={item}
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  sub: { fontFamily: fonts.body, marginBottom: space.sm, marginTop: 2, textAlign: "center" },
  search: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: fonts.body,
  },
  filters: { gap: space.sm, marginTop: space.sm, paddingRight: space.sm },
  filter: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterText: { fontFamily: fonts.bold, fontSize: 12 },
  filterTextOn: { color: "#FFF" },
  chipList: { maxHeight: 44, marginTop: space.sm, marginBottom: space.sm },
  chips: { gap: space.sm, alignItems: "center", paddingRight: space.lg },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontFamily: fonts.bold, fontSize: 13 },
  chipTextActive: { color: "#FFF" },
  list: { paddingTop: space.xs, gap: space.sm },
  gridRow: { gap: space.sm },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  empty: { textAlign: "center", marginTop: 40, fontFamily: fonts.body },
  error: { fontFamily: fonts.medium },
  retry: { fontFamily: fonts.bold },
});

import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { ProductTile } from "@/components/commerce/ProductTile";
import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useApp } from "@/context/app";
import { useThemeColors } from "@/context/theme";
import { useCartQty } from "@/hooks/use-cart-qty";
import { api } from "@/lib/api";
import { fonts, radius, space } from "@/lib/theme";
import type { Product } from "@/lib/types";

export default function FavoritesScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { cartCount } = useApp();
  const cartQty = useCartQty();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = (await api.customer.profileSummary()) as { favorites?: Product[] };
      const favs = Array.isArray(data.favorites) ? data.favorites : [];
      const products: Product[] = [];
      for (const f of favs as (Product & { product_id?: number })[]) {
        if (f.name && f.id) {
          products.push({ ...f, is_favorite: true });
          continue;
        }
        const pid = f.product_id || f.id;
        if (!pid) continue;
        try {
          const detail = await api.customer.product(pid);
          if (detail.product) products.push({ ...(detail.product as Product), is_favorite: true });
        } catch {
          /* skip */
        }
      }
      setItems(products);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load favorites");
      setItems([]);
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

  async function removeFav(p: Product) {
    try {
      await api.customer.favorite(p.id);
      setItems((prev) => prev.filter((x) => x.id !== p.id));
    } catch {
      /* ignore */
    }
  }

  return (
    <Screen>
      <BrandHeader left="back" right="cart" cartCount={cartCount} />
      <TitleFlourish title="Favorites" subtitle="Your most loved treats, saved for you" />

      {loading && !items.length ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.pink} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          columnWrapperStyle={styles.grid}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
          ListHeaderComponent={
            items.length ? (
              <View style={[styles.promo, { backgroundColor: c.blushSoft }]}>
                <Icon name="ribbon" size={20} color={c.coral} />
                <Text style={[styles.promoText, { color: c.ink }]}>
                  Good choice! These treats are customer favorites.
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="heart-outline" size={40} color={c.pink} />
              <Text style={[styles.emptyTitle, { color: c.ink }]}>{error || "No favorites yet"}</Text>
              <FloatPress
                style={[styles.btn, { backgroundColor: c.pink }]}
                onPress={() => router.push("/(tabs)/catalog")}
              >
                <Text style={styles.btnText}>Browse shop</Text>
              </FloatPress>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <ProductTile
                product={item}
                qty={cartQty.qtyOf(item.id)}
                busy={cartQty.busyId === item.id}
                favorited
                onFavorite={() => void removeFav(item)}
                onPress={() => router.push(`/product/${item.id}`)}
                onAdd={() => cartQty.add(item).catch(() => undefined)}
                onInc={() => cartQty.inc(item).catch(() => undefined)}
                onDec={() => cartQty.dec(item).catch(() => undefined)}
              />
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingBottom: 40, gap: space.sm },
  grid: { gap: space.sm },
  promo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.sm,
  },
  promoText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  empty: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 16 },
  btn: { marginTop: 8, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
  btnText: { color: "#FFF", fontFamily: fonts.bold },
});

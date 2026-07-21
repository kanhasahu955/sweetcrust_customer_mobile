import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { ProductTile } from "@/components/commerce/ProductTile";
import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { OfflineBanner, isNetworkError } from "@/components/ui/OfflineBanner";
import { Screen } from "@/components/ui/Screen";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApp } from "@/context/app";
import { useThemeColors } from "@/context/theme";
import { useCartQty } from "@/hooks/use-cart-qty";
import { api } from "@/lib/api";
import { fonts, radius, space } from "@/lib/theme";
import type { Product } from "@/lib/types";

export default function GiftHamperScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { cartCount } = useApp();
  const cartQty = useCartQty();
  const [items, setItems] = useState<Product[]>([]);
  const [title, setTitle] = useState("Gift Hampers");
  const [subtitle, setSubtitle] = useState("Curated boxes for every occasion");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = (await api.customer.giftHampers()) as {
        items?: Product[];
        title?: string;
        subtitle?: string;
      };
      setItems(Array.isArray(data.items) ? data.items : []);
      if (data.title) setTitle(data.title);
      if (data.subtitle) setSubtitle(data.subtitle);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load hampers");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  return (
    <Screen>
      <BrandHeader left="back" right="cart" cartCount={cartCount} />
      <TitleFlourish title={title} subtitle={subtitle} />

      <View style={[styles.hero, { backgroundColor: c.blushSoft, borderColor: c.blush }]}>
        <Icon name="gift-outline" size={22} color={c.pink} />
        <Text style={[styles.heroText, { color: c.cocoa }]}>
          Perfect for birthdays, festivals & corporate gifting
        </Text>
      </View>

      <OfflineBanner offline={Boolean(error && isNetworkError(error))} error={error} onRetry={load} />

      {loading && !items.length ? (
        <View style={styles.skelGrid}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={220} style={{ flex: 1, minWidth: "45%" }} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          columnWrapperStyle={styles.grid}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="gift-outline" size={40} color={c.muted} />
              <Text style={[styles.emptyTitle, { color: c.ink }]}>
                {error && !isNetworkError(error) ? error : "No hampers yet"}
              </Text>
              <Text style={[styles.emptySub, { color: c.muted }]}>Check back for festive gift boxes.</Text>
              <FloatPress style={[styles.btn, { backgroundColor: c.pink }]} onPress={() => router.push("/(tabs)/catalog")}>
                <Icon name="bag-handle-outline" size={16} color="#FFF" />
                <Text style={styles.btnText}>Browse shop</Text>
              </FloatPress>
            </View>
          }
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
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.md,
    marginBottom: space.sm,
  },
  heroText: { flex: 1, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  skelGrid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  list: { paddingBottom: 40, gap: space.sm },
  grid: { gap: space.sm },
  empty: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 16 },
  emptySub: { fontFamily: fonts.body, textAlign: "center" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  btnText: { fontFamily: fonts.bold, color: "#FFF" },
});

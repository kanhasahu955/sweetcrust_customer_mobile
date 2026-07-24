import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ProductTile } from "@/components/commerce/ProductTile";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { Screen } from "@/components/ui/Screen";
import { useApp } from "@/context/app";
import { useThemeColors } from "@/context/theme";
import { useCartQty } from "@/hooks/use-cart-qty";
import { useTabBarClearance } from "@/hooks/use-tab-bar-clearance";
import { api } from "@/lib/api";
import { fonts, radius, space } from "@/lib/theme";
import type { Product } from "@/lib/types";

type ShopDetail = {
  user_id: number;
  shop_name?: string;
  shop_logo_url?: string | null;
  village?: string | null;
  area?: string | null;
  city?: string | null;
  is_open?: boolean;
  product_count?: number;
  products?: Product[];
};

export default function ShopStorefrontScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const shopId = Number(id);
  const router = useRouter();
  const tc = useThemeColors();
  const { cartCount } = useApp();
  const clearance = useTabBarClearance(16);
  const cartQty = useCartQty();
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!shopId) return;
    setError(null);
    const data = (await api.customer.shop(shopId)) as ShopDetail;
    setShop(data);
    let list = Array.isArray(data.products) ? data.products : [];
    if (!list.length) {
      const catalog = await api.customer.products({
        supplier_user_id: shopId,
        page_size: 60,
      });
      list = (catalog.items || []) as Product[];
    }
    setProducts(list);
  }, [shopId]);

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "Failed to load shop"));
  }, [load]);

  const place = [shop?.area, shop?.village, shop?.city].filter(Boolean).join(", ");

  return (
    <Screen>
      <BrandHeader left="back" right="cart" cartCount={cartCount} />
      {error ? <Text style={[styles.error, { color: tc.danger || "#B00020" }]}>{error}</Text> : null}
      {!shop && !error ? <ActivityIndicator color={tc.pink} style={{ marginTop: 40 }} /> : null}
      {shop ? (
        <FlatList
          data={products}
          keyExtractor={(p) => String(p.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ paddingBottom: clearance, gap: 10, paddingHorizontal: space.md }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                try {
                  await load();
                } finally {
                  setRefreshing(false);
                }
              }}
              tintColor={tc.pink}
            />
          }
          ListHeaderComponent={
            <View style={[styles.header, { backgroundColor: tc.paper, borderColor: tc.border }]}>
              {shop.shop_logo_url ? (
                <Image source={{ uri: shop.shop_logo_url }} style={styles.logo} />
              ) : (
                <View
                  style={[
                    styles.logo,
                    {
                      backgroundColor: tc.stone || "#F3EDE6",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Text style={{ fontFamily: fonts.display, fontSize: 28, color: tc.ink }}>
                    {(shop.shop_name || "S").slice(0, 1)}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: tc.ink }]}>{shop.shop_name}</Text>
                {place ? <Text style={{ color: tc.muted, fontFamily: fonts.body }}>{place}</Text> : null}
                <Text style={{ color: tc.muted, fontFamily: fonts.medium, marginTop: 4 }}>
                  {shop.is_open === false ? "Closed" : "Open"} ·{" "}
                  {shop.product_count ?? products.length} items
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <Text style={{ color: tc.muted, fontFamily: fonts.body, textAlign: "center", marginTop: 32 }}>
              No products listed yet
            </Text>
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <ProductTile
                product={item}
                onPress={() => router.push(`/product/${item.id}`)}
                onAdd={() => cartQty.add(item).catch(() => undefined)}
                onInc={() => cartQty.inc(item).catch(() => undefined)}
                onDec={() => cartQty.dec(item).catch(() => undefined)}
                qty={cartQty.qtyOf(item.id)}
                busy={cartQty.busyId === item.id}
              />
            </View>
          )}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: fonts.medium, marginBottom: 8 },
  header: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: 12,
  },
  logo: { width: 64, height: 64, borderRadius: radius.md },
  title: { fontFamily: fonts.display, fontSize: 22 },
});

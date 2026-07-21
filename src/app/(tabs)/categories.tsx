import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useApp } from "@/context/app";
import { useThemeColors } from "@/context/theme";
import { useTabBarClearance } from "@/hooks/use-tab-bar-clearance";
import { api } from "@/lib/api";
import { float, fonts, radius, space } from "@/lib/theme";

type Category = { id: number; name: string; image_url?: string | null; slug?: string };

const TINTS = ["#FFF0F2", "#FCE4EC", "#FFF6EE", "#FFF5E8", "#FCEEF5", "#EEF8F3", "#F5F0FF"];

export default function CategoriesScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const clearance = useTabBarClearance(16);
  const { cartCount } = useApp();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.customer.categories();
      setItems(Array.isArray(data) ? (data as Category[]) : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = useMemo(
    () =>
      items.map((cat, i) => ({
        key: String(cat.id),
        id: cat.id,
        name: cat.name,
        image_url: cat.image_url,
        tint: TINTS[i % TINTS.length],
      })),
    [items]
  );

  return (
    <Screen>
      <BrandHeader
        left="menu"
        right="cart"
        cartCount={cartCount}
        onLeft={() => router.push("/(tabs)/account")}
      />
      <TitleFlourish title="Categories" />

      {loading && !cards.length ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.pink} />
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.key}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.list, { paddingBottom: clearance }]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
          ListEmptyComponent={<Text style={[styles.empty, { color: c.muted }]}>{error || "No categories yet"}</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: c.paper }]}
              onPress={() =>
                router.push({ pathname: "/(tabs)/catalog", params: { category_id: String(item.id) } })
              }
            >
              <View style={[styles.imgWrap, { backgroundColor: item.tint }]}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={styles.img} resizeMode="cover" />
                ) : (
                  <Text style={[styles.letter, { color: c.chocolate }]}>{item.name.slice(0, 1).toUpperCase()}</Text>
                )}
              </View>
              <View style={[styles.labelBar, { backgroundColor: c.blushSoft }]}>
                <Icon name="grid-outline" size={12} color={c.chocolate} />
                <Text style={[styles.label, { color: c.ink }]} numberOfLines={2}>
                  {item.name}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm },
  row: { gap: space.sm },
  card: {
    flex: 1,
    maxWidth: "32%",
    borderRadius: radius.md,
    overflow: "hidden",
    ...float,
    marginBottom: space.sm,
  },
  imgWrap: { aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  img: { width: "100%", height: "100%" },
  letter: { fontFamily: fonts.display, fontSize: 28 },
  labelBar: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  label: { fontFamily: fonts.bold, fontSize: 10, textAlign: "center", lineHeight: 13 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { textAlign: "center", marginTop: 40, fontFamily: fonts.body },
});

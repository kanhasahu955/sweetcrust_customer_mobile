import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { BrandHeader } from "@/components/ui/BrandHeader";
import { Screen } from "@/components/ui/Screen";
import { useApp } from "@/context/app";
import { useThemeColors } from "@/context/theme";
import { useLayout } from "@/hooks/use-layout";
import { useTabBarClearance } from "@/hooks/use-tab-bar-clearance";
import { api } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { fonts, radius, space } from "@/lib/theme";

type Category = { id: number; name: string; image_url?: string | null; slug?: string };

const TINTS = ["#FFE8EC", "#FFF1E6", "#FCE8F0", "#FFF6E8", "#F5E6EE", "#EEF6F2", "#F3EEF8"];

export default function CategoriesScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const clearance = useTabBarClearance(20);
  const layout = useLayout();
  const { cartCount } = useApp();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const gap = 14;
  // Screen body is already page-padded
  const tileW = (layout.width - layout.pagePad * 2 - gap) / 2;

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
        uri: mediaUrl(api.baseUrl, cat.image_url),
      })),
    [items],
  );

  return (
    <Screen>
      <BrandHeader
        left="menu"
        right="cart"
        cartCount={cartCount}
        onLeft={() => router.push("/(tabs)/account")}
      />

      <View style={styles.heading}>
        <Text style={[styles.title, { color: c.ink }]}>Categories</Text>
        <Text style={[styles.sub, { color: c.muted }]}>Browse by craving</Text>
      </View>

      {loading && !cards.length ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.pink} />
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.key}
          numColumns={2}
          columnWrapperStyle={[styles.row, { gap }]}
          contentContainerStyle={[styles.list, { paddingBottom: clearance, gap }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.muted }]}>{error || "No categories yet"}</Text>
          }
          renderItem={({ item, index }) => (
            <CategoryTile
              width={tileW}
              name={item.name}
              uri={item.uri}
              tint={item.tint}
              delay={index * 40}
              ink={c.ink}
              onPress={() =>
                router.push({ pathname: "/(tabs)/catalog", params: { category_id: String(item.id) } })
              }
            />
          )}
        />
      )}
    </Screen>
  );
}

function CategoryTile({
  width,
  name,
  uri,
  tint,
  ink,
  delay,
  onPress,
}: {
  width: number;
  name: string;
  uri?: string | null;
  tint: string;
  ink: string;
  delay: number;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 420,
      delay,
      useNativeDriver: true,
    }).start();
  }, [enter, delay]);

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, friction: 7 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  };

  return (
    <Animated.View
      style={{
        width,
        opacity: enter,
        transform: [
          { scale },
          {
            translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
          },
        ],
      }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[styles.tileOuter, { width }]}
      >
        <View style={[styles.tile, { backgroundColor: tint }]}>
          {uri ? (
            <Image source={{ uri }} style={styles.img} resizeMode="cover" />
          ) : (
            <View style={styles.letterWrap}>
              <Text style={[styles.letter, { color: ink }]}>{name.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <LinearGradient
            colors={["transparent", "rgba(40,22,20,0.15)", "rgba(40,22,20,0.72)"]}
            locations={[0.35, 0.65, 1]}
            style={styles.shade}
          >
            <Text style={styles.name} numberOfLines={2}>
              {name}
            </Text>
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  heading: {
    paddingTop: 4,
    paddingBottom: space.md,
    gap: 4,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    letterSpacing: -0.6,
  },
  sub: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  list: {
    paddingTop: 2,
  },
  row: {
    justifyContent: "space-between",
  },
  tileOuter: {
    // Soft 3D lift
    shadowColor: "#3A1E1A",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    borderRadius: radius.xl,
  },
  tile: {
    borderRadius: radius.xl,
    overflow: "hidden",
    aspectRatio: 0.92,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.55)",
  },
  img: {
    ...StyleSheet.absoluteFill,
  },
  letterWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  letter: {
    fontFamily: fonts.display,
    fontSize: 48,
    opacity: 0.35,
  },
  shade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 36,
    paddingBottom: 14,
    justifyContent: "flex-end",
  },
  name: {
    color: "#FFF",
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: -0.2,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: {
    textAlign: "center",
    marginTop: 48,
    fontFamily: fonts.body,
    fontSize: 15,
  },
});

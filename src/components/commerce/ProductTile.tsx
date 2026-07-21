import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/ui/Icon";
import { FloatPress } from "@/components/ui/FloatPress";
import { colors, float, fonts, radius, space } from "@/lib/theme";
import { money, type Product } from "@/lib/types";

type Props = {
  product: Product;
  width?: number;
  qty?: number;
  busy?: boolean;
  onPress: () => void;
  onAdd: () => void;
  onInc?: () => void;
  onDec?: () => void;
  onFavorite?: () => void;
  favorited?: boolean;
};

export function ProductTile({
  product,
  width,
  qty = 0,
  busy,
  onPress,
  onAdd,
  onInc,
  onDec,
  onFavorite,
  favorited,
}: Props) {
  const price = product.selling_price ?? product.customer_price;
  const original = (product as { original_price?: number; mrp?: number }).original_price
    ?? (product as { mrp?: number }).mrp;
  const discount = (product as { discount_percent?: number }).discount_percent;
  const img = product.cover_image_url;
  const ratingRaw = product.rating_avg ?? product.rating;
  const rating = ratingRaw != null ? Number(ratingRaw) : null;
  const ratingCount = product.rating_count ?? product.review_count ?? null;
  const countLabel =
    ratingCount != null && ratingCount >= 1000
      ? `${(ratingCount / 1000).toFixed(1).replace(/\.0$/, "")}K`
      : ratingCount != null
        ? String(ratingCount)
        : null;
  const imgH = width ? Math.round(width * 0.72) : 112;

  return (
    <FloatPress onPress={onPress} style={[styles.card, width ? { width } : styles.cardFlex]}>
      <View style={[styles.imgWrap, { height: imgH }]}>
        {img ? (
          <Image source={{ uri: img }} style={styles.img} resizeMode="cover" />
        ) : (
          <View style={styles.imgFallback}>
            <Text style={styles.imgFallbackText}>{product.name.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        {product.is_eggless ? (
          <View style={styles.badgeEgg}>
            <Icon name="leaf" size={10} color={colors.success} />
            <Text style={styles.badgeEggText}>EGGLESS</Text>
          </View>
        ) : null}
        {onFavorite ? (
          <FloatPress onPress={onFavorite} style={styles.heart}>
            <Icon
              name={favorited || product.is_favorite ? "heart" : "heart-outline"}
              size={16}
              color={colors.pink}
            />
          </FloatPress>
        ) : null}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {product.name}
      </Text>
      {product.brand_name ? (
        <Text style={styles.brand} numberOfLines={1}>
          {product.brand_name}
        </Text>
      ) : null}
      {rating != null && rating > 0 ? (
        <View style={styles.ratingRow}>
          <Icon name="star" size={12} color="#FFB400" />
          <Text style={styles.rating}>
            {rating.toFixed(1)}
            {countLabel != null ? ` (${countLabel})` : ""}
          </Text>
        </View>
      ) : null}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.price}>{money(price)}</Text>
          {original && Number(original) > Number(price) ? (
            <View style={styles.priceRow}>
              <Text style={styles.strike}>{money(original)}</Text>
              {discount ? <Text style={styles.off}>{Math.round(Number(discount))}% OFF</Text> : null}
            </View>
          ) : null}
        </View>
        {qty > 0 ? (
          <View style={styles.stepper}>
            <FloatPress onPress={onDec} style={styles.stepBtn} disabled={busy}>
              <Text style={styles.stepText}>−</Text>
            </FloatPress>
            {busy ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.qty}>{qty}</Text>
            )}
            <FloatPress onPress={onInc} style={styles.stepBtn} disabled={busy}>
              <Text style={styles.stepText}>+</Text>
            </FloatPress>
          </View>
        ) : (
          <FloatPress onPress={onAdd} style={styles.add} disabled={busy}>
            {busy ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Icon name="add" size={22} color={colors.white} />
            )}
          </FloatPress>
        )}
      </View>
    </FloatPress>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: space.sm,
    ...float,
  },
  cardFlex: { flex: 1 },
  imgWrap: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.creamDeep,
    marginBottom: 6,
  },
  img: { width: "100%", height: "100%" },
  imgFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.blushSoft,
  },
  imgFallbackText: { fontFamily: fonts.display, fontSize: 36, color: colors.pink },
  badgeEgg: {
    position: "absolute",
    left: 6,
    top: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.successSoft,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.success,
  },
  badgeEggText: { fontFamily: fonts.bold, fontSize: 9, color: colors.success },
  heart: {
    position: "absolute",
    right: 6,
    top: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink, lineHeight: 17 },
  brand: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, marginTop: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  rating: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  row: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 6,
  },
  price: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  strike: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, textDecorationLine: "line-through" },
  off: { fontFamily: fonts.bold, fontSize: 10, color: colors.coral },
  add: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.pink,
    alignItems: "center",
    justifyContent: "center",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.pink,
    borderRadius: 10,
    minWidth: 84,
    height: 32,
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  stepBtn: { width: 26, height: 26, alignItems: "center", justifyContent: "center" },
  stepText: { fontFamily: fonts.bold, fontSize: 16, color: colors.white, lineHeight: 18 },
  qty: { fontFamily: fonts.bold, fontSize: 13, color: colors.white, minWidth: 16, textAlign: "center" },
});

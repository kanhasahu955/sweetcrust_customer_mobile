import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { Icon } from "@/components/ui/Icon";
import { FloatPress } from "@/components/ui/FloatPress";
import { api } from "@/lib/api";
import { mediaUrl } from "@/lib/media";
import { colors, fonts, radius } from "@/lib/theme";
import { money, type Product } from "@/lib/types";

/** Ice · cream · spice washes for products without photos. */
const FALLBACK_SKINS: [string, string, string][] = [
  ["#DCE8F4", "#F4F0EE", "#F8E4EA"],
  ["#E4EEF6", "#FFF4EC", "#EDE4F0"],
  ["#E8F2EE", "#FFF0E8", "#F4E6EC"],
  ["#E6EAF4", "#F8EEE8", "#FFE8E0"],
  ["#E0ECF5", "#F6EEF2", "#FFF2E6"],
];

function skinFor(key: string | number): [string, string, string] {
  const s = String(key || "x");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) | 0;
  return FALLBACK_SKINS[Math.abs(h) % FALLBACK_SKINS.length];
}

type Props = {
  product: Product;
  width?: number;
  /** Dense modern card — home rails & catalog grids. */
  compact?: boolean;
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
  compact,
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
  const original =
    (product as { original_price?: number; mrp?: number }).original_price ??
    (product as { mrp?: number }).mrp;
  const discount = (product as { discount_percent?: number }).discount_percent;
  const img = mediaUrl(api.baseUrl, product.cover_image_url);
  const ratingRaw = product.rating_avg ?? product.rating;
  const rating = ratingRaw != null ? Number(ratingRaw) : null;
  const ratingCount = product.rating_count ?? product.review_count ?? null;
  const countLabel =
    ratingCount != null && ratingCount >= 1000
      ? `${(ratingCount / 1000).toFixed(1).replace(/\.0$/, "")}K`
      : ratingCount != null
        ? String(ratingCount)
        : null;
  const imgH = width ? Math.round(width * (compact ? 0.78 : 0.88)) : compact ? 96 : 128;
  const skin = skinFor(product.id || product.name);
  const initial = (product.name || "?").slice(0, 1).toUpperCase();

  return (
    <FloatPress
      onPress={onPress}
      style={[
        styles.card,
        compact && styles.cardCompact,
        width ? { width } : styles.cardFlex,
        compact && width ? { height: Math.round(width * 0.78) + 78 } : null,
      ]}
    >
      <View style={[styles.imgWrap, compact && styles.imgWrapCompact, { height: imgH }]}>
        {img ? (
          <Image source={{ uri: img }} style={styles.img} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={skin}
            start={{ x: 0.05, y: 0 }}
            end={{ x: 0.95, y: 1 }}
            style={styles.imgFallback}
          >
            <View style={[styles.orb, compact ? styles.orbSmA : styles.orbA]} />
            <View style={[styles.orb, compact ? styles.orbSmB : styles.orbB]} />
            <View style={[styles.initialRing, compact && styles.initialRingSm]}>
              <Text style={[styles.imgFallbackText, compact && styles.imgFallbackTextSm]}>{initial}</Text>
            </View>
          </LinearGradient>
        )}
        <LinearGradient
          colors={["rgba(255,255,255,0.2)", "transparent", "rgba(40,28,36,0.14)"]}
          locations={[0, 0.45, 1]}
          style={styles.imgShade}
          pointerEvents="none"
        />
        {product.is_eggless && !compact ? (
          <View style={styles.badgeEgg}>
            <Icon name="leaf" size={10} color={colors.success} />
            <Text style={styles.badgeEggText}>EGGLESS</Text>
          </View>
        ) : null}
        {product.is_eggless && compact ? (
          <View style={styles.badgeEggDot}>
            <Icon name="leaf" size={9} color={colors.success} />
          </View>
        ) : null}
        {onFavorite ? (
          <FloatPress onPress={onFavorite} style={[styles.heart, compact && styles.heartSm]}>
            <Icon
              name={favorited || product.is_favorite ? "heart" : "heart-outline"}
              size={compact ? 13 : 16}
              color={colors.pink}
            />
          </FloatPress>
        ) : null}
        {discount && Number(discount) > 0 ? (
          <View style={[styles.offBadge, compact && styles.offBadgeSm]}>
            <Text style={[styles.offBadgeText, compact && styles.offBadgeTextSm]}>
              {Math.round(Number(discount))}%
            </Text>
          </View>
        ) : null}

        {/* Stay inside image only — never covers name / rating / price */}
        <View style={[styles.addFloat, compact && styles.addFloatSm]} pointerEvents="box-none">
          {qty > 0 ? (
            <View style={[styles.stepper, compact && styles.stepperSm]}>
              <FloatPress onPress={onDec} style={[styles.stepBtn, compact && styles.stepBtnSm]} disabled={busy}>
                <Text style={[styles.stepText, compact && styles.stepTextSm]}>−</Text>
              </FloatPress>
              {busy ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={[styles.qty, compact && styles.qtySm]}>{qty}</Text>
              )}
              <FloatPress onPress={onInc} style={[styles.stepBtn, compact && styles.stepBtnSm]} disabled={busy}>
                <Text style={[styles.stepText, compact && styles.stepTextSm]}>+</Text>
              </FloatPress>
            </View>
          ) : (
            <FloatPress onPress={onAdd} style={[styles.add, compact && styles.addSm]} disabled={busy}>
              {busy ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Icon name="add" size={compact ? 15 : 18} color={colors.white} />
              )}
            </FloatPress>
          )}
        </View>
      </View>

      <View style={compact ? styles.bodyCompact : undefined}>
        <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={compact ? 1 : 2}>
          {product.name}
        </Text>
        {!compact && product.brand_name ? (
          <Text style={styles.brand} numberOfLines={1}>
            {product.brand_name}
          </Text>
        ) : null}
        <View style={[styles.ratingRow, compact && styles.ratingRowSm]}>
          {rating != null && rating > 0 ? (
            <>
              <Icon name="star" size={compact ? 10 : 12} color="#FFB400" />
              <Text style={[styles.rating, compact && styles.ratingSm]}>
                {rating.toFixed(1)}
                {!compact && countLabel != null ? ` (${countLabel})` : ""}
              </Text>
            </>
          ) : (
            <Text style={[styles.rating, compact && styles.ratingSm]}> </Text>
          )}
        </View>

        <View style={[styles.row, compact && styles.rowCompact]}>
          <Text style={[styles.price, compact && styles.priceCompact]} numberOfLines={1}>
            {money(price)}
          </Text>
          {!compact && original && Number(original) > Number(price) ? (
            <Text style={styles.strike}>{money(original)}</Text>
          ) : null}
        </View>
      </View>
    </FloatPress>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
    shadowColor: "#4A6280",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardCompact: {
    borderRadius: 16,
    padding: 7,
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
    justifyContent: "flex-start",
  },
  cardFlex: { flex: 1 },
  bodyCompact: { flex: 1, justifyContent: "space-between" },
  imgWrap: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.creamDeep,
    marginBottom: 8,
  },
  imgWrapCompact: { borderRadius: 12, marginBottom: 5 },
  img: { width: "100%", height: "100%" },
  imgShade: { ...StyleSheet.absoluteFillObject },
  imgFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  orb: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  orbA: { width: 90, height: 90, top: -24, right: -18 },
  orbB: { width: 70, height: 70, bottom: -16, left: -14, backgroundColor: "rgba(233,116,142,0.14)" },
  orbSmA: { width: 56, height: 56, top: -16, right: -12 },
  orbSmB: { width: 48, height: 48, bottom: -12, left: -10, backgroundColor: "rgba(233,116,142,0.14)" },
  initialRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.85)",
  },
  initialRingSm: { width: 42, height: 42, borderRadius: 21 },
  imgFallbackText: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.ink,
    opacity: 0.72,
  },
  imgFallbackTextSm: { fontSize: 20 },
  badgeEgg: {
    position: "absolute",
    left: 8,
    top: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(232,245,238,0.92)",
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeEggDot: {
    position: "absolute",
    left: 6,
    top: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(232,245,238,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeEggText: { fontFamily: fonts.bold, fontSize: 9, color: colors.success },
  offBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    backgroundColor: "rgba(233,116,142,0.92)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  offBadgeSm: { left: 5, bottom: 5, paddingHorizontal: 5, borderRadius: 6 },
  offBadgeText: { fontFamily: fonts.bold, fontSize: 10, color: "#FFF" },
  offBadgeTextSm: { fontSize: 9 },
  heart: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4A6280",
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  heartSm: { right: 5, top: 5, width: 24, height: 24, borderRadius: 12 },
  name: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.ink,
    lineHeight: 17,
    letterSpacing: -0.15,
  },
  nameCompact: { fontSize: 11, lineHeight: 14, letterSpacing: -0.1 },
  brand: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, marginTop: 2 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3, minHeight: 16 },
  ratingRowSm: { marginTop: 2, gap: 2, minHeight: 14 },
  rating: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  ratingSm: { fontSize: 10 },
  row: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowCompact: { marginTop: 4, gap: 4 },
  price: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, letterSpacing: -0.2 },
  priceCompact: { fontSize: 13 },
  strike: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, textDecorationLine: "line-through" },
  addFloat: {
    position: "absolute",
    right: 6,
    bottom: 6,
    zIndex: 4,
  },
  addFloatSm: { right: 5, bottom: 5 },
  add: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.pink,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.95)",
    shadowColor: "#3A1E28",
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  addSm: { width: 26, height: 26, borderRadius: 13 },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.pink,
    borderRadius: 14,
    minWidth: 70,
    height: 28,
    justifyContent: "space-between",
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.95)",
    shadowColor: "#3A1E28",
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  stepperSm: { minWidth: 62, height: 26, borderRadius: 13 },
  stepBtn: { width: 26, height: 26, alignItems: "center", justifyContent: "center" },
  stepBtnSm: { width: 22, height: 22 },
  stepText: { fontFamily: fonts.bold, fontSize: 15, color: colors.white, lineHeight: 17 },
  stepTextSm: { fontSize: 14, lineHeight: 16 },
  qty: { fontFamily: fonts.bold, fontSize: 12, color: colors.white, minWidth: 14, textAlign: "center" },
  qtySm: { fontSize: 11 },
});

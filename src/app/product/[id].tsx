import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Linking } from "react-native";

import { ProductTile } from "@/components/commerce/ProductTile";
import { BrandHeader } from "@/components/ui/BrandHeader";
import { Banner } from "@/components/ui/Banner";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApp } from "@/context/app";
import { useThemeColors } from "@/context/theme";
import { useCartQty } from "@/hooks/use-cart-qty";
import { api } from "@/lib/api";
import { fonts, radius, space, colors as fallbackColors } from "@/lib/theme";
import { money, type Product } from "@/lib/types";

type Review = { id: number; rating: number; comment?: string | null; user_name?: string };

const W = Dimensions.get("window").width;

function asStringList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(String).filter(Boolean);
}

export default function ProductScreen() {
  const c = useThemeColors();
  const router = useRouter();
  const { refreshCart } = useApp();
  const cartQty = useCartQty();
  const { id } = useLocalSearchParams<{ id: string }>();
  const productId = Number(id);
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<{ url?: string; image_url?: string }[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [fbt, setFbt] = useState<Product[]>([]);
  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState("");
  const [flavor, setFlavor] = useState("");
  const [eggless, setEggless] = useState(false);
  const [bakeryPhone, setBakeryPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [fav, setFav] = useState(false);
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [showIng, setShowIng] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    api.customer
      .settings()
      .then((s) => {
        if (s?.phone) setBakeryPhone(String(s.phone));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    api.customer
      .product(productId)
      .then((data) => {
        const p = data.product as Product;
        setProduct(p);
        setFav(Boolean(p.is_favorite));
        setEggless(Boolean(p.is_eggless));
        const sizes = asStringList(p.available_sizes);
        const flavors = asStringList(p.available_flavors);
        setSize(p.weight ? String(p.weight) : sizes[0] || "");
        setFlavor(p.flavor ? String(p.flavor) : flavors[0] || "");
        setImages((data.images || []) as typeof images);
        setReviews((data.reviews || []) as Review[]);
        setSimilar((data.similar || []) as Product[]);
        setFbt(((data as { frequently_bought?: Product[] }).frequently_bought || []) as Product[]);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Product not found"))
      .finally(() => setLoading(false));
  }, [productId]);

  const gallery = useMemo(() => {
    const urls = images.map((i) => i.url || i.image_url).filter(Boolean) as string[];
    if (product?.cover_image_url && !urls.includes(product.cover_image_url)) {
      return [product.cover_image_url, ...urls];
    }
    return urls.length ? urls : product?.cover_image_url ? [product.cover_image_url] : [];
  }, [images, product]);

  const sizes = useMemo(() => {
    const fromApi = asStringList(product?.available_sizes);
    if (product?.weight && !fromApi.includes(String(product.weight))) {
      return [String(product.weight), ...fromApi];
    }
    return fromApi.length ? fromApi : product?.weight ? [String(product.weight)] : [];
  }, [product]);

  const flavors = useMemo(() => {
    const fromApi = asStringList(product?.available_flavors);
    if (product?.flavor && !fromApi.includes(String(product.flavor))) {
      return [String(product.flavor), ...fromApi];
    }
    return fromApi.length ? fromApi : product?.flavor ? [String(product.flavor)] : [];
  }, [product]);

  const avgRating = useMemo(() => {
    if (reviews.length) return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
    const r = product?.rating_avg ?? product?.rating;
    return r != null && Number(r) > 0 ? Number(r) : null;
  }, [reviews, product]);

  const reviewCount = reviews.length || product?.review_count || product?.rating_count || 0;

  const mrp = Number((product as { mrp?: number; original_price?: number } | null)?.mrp
    || product?.original_price
    || 0);
  const price = Number(product?.selling_price || 0);
  const discount = mrp > price && price > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;

  const etaLabel = useMemo(() => {
    const mins = product?.estimated_delivery_mins;
    if (mins == null || mins <= 0) return null;
    if (mins < 60) return `About ${mins} mins`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `About ${h}h ${m}m` : `About ${h}h`;
  }, [product]);

  async function addToCart() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await api.customer.addCartItem({
        product_id: productId,
        quantity: 1,
        ...(size ? { variant: size } : {}),
        ...(flavor ? { flavor } : {}),
        is_eggless: eggless,
      });
      await refreshCart();
      setMsg("Added to cart");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add to cart");
    } finally {
      setBusy(false);
    }
  }

  async function buyNow() {
    await addToCart();
    router.push("/checkout");
  }

  async function toggleFav() {
    try {
      await api.customer.favorite(productId);
      setFav((f) => !f);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Favorite failed");
    }
  }

  async function shareProduct() {
    if (!product) return;
    try {
      await Share.share({
        message: `${product.name} · ${money(product.selling_price)} on SweetCrust`,
      });
    } catch {
      /* ignore */
    }
  }

  async function submitReview() {
    const r = Number(rating);
    if (r < 1 || r > 5) {
      setError("Rating must be 1–5");
      return;
    }
    try {
      await api.customer.review(productId, { rating: r, comment: comment.trim() || undefined });
      setMsg("Thanks for the review");
      setComment("");
      const data = await api.customer.product(productId);
      setReviews((data.reviews || []) as Review[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    }
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.pad}>
          <Skeleton height={320} borderRadius={0} />
          <Skeleton height={28} style={{ marginTop: 16 }} />
          <Skeleton height={20} style={{ marginTop: 8 }} />
          <Skeleton height={48} style={{ marginTop: 16 }} />
        </View>
      </Screen>
    );
  }

  if (!product) {
    return (
      <Screen>
        <BrandHeader left="back" right="none" onLeft={() => router.back()} />
        <Banner text={error || "Product not found"} tone="danger" />
      </Screen>
    );
  }

  const ingredients = product.ingredients?.trim() || null;
  const allergens = product.allergens?.trim() || null;

  return (
    <Screen pad={false} edges={[]}>
      <BrandHeader
        left="back"
        compact
        onLeft={() => router.back()}
        right={
          <View style={styles.topActions}>
            <Pressable onPress={toggleFav} hitSlop={8}>
              <Icon name={fav ? "heart" : "heart-outline"} size={22} color={c.pink} />
            </Pressable>
            <Pressable onPress={shareProduct} hitSlop={8}>
              <Icon name="share-outline" size={22} color={c.ink} />
            </Pressable>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.gallery}>
          {gallery.length ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setImgIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
            >
              {gallery.map((uri, i) => (
                <Image key={`${uri}-${i}`} source={{ uri }} style={styles.cover} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.cover, styles.coverEmpty, { backgroundColor: c.blushSoft }]}>
              <Text style={[styles.coverLetter, { color: c.pink }]}>{product.name.slice(0, 1)}</Text>
            </View>
          )}
          {gallery.length ? (
            <View style={styles.counter}>
              <Text style={styles.counterText}>
                {imgIdx + 1} / {gallery.length}
              </Text>
            </View>
          ) : null}
          <View style={styles.dots}>
            {gallery.map((_, i) => (
              <View key={i} style={[styles.dot, i === imgIdx && { backgroundColor: c.pink, width: 18 }]} />
            ))}
          </View>
        </View>

        <View style={styles.pad}>
          {error ? <Banner text={error} tone="danger" /> : null}
          {msg ? <Banner text={msg} tone="ok" /> : null}

          <Text style={[styles.name, { color: c.ink }]}>{product.name}</Text>
          {avgRating != null ? (
            <View style={styles.ratingRow}>
              <Icon name="star" size={14} color="#FFB400" />
              <Text style={[styles.rating, { color: c.muted }]}>
                {avgRating.toFixed(1)}
                {reviewCount ? ` (${reviewCount} reviews)` : ""}
              </Text>
            </View>
          ) : null}

          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: c.ink }]}>{money(price)}</Text>
            {discount > 0 ? (
              <View style={[styles.offBadge, { backgroundColor: c.blushSoft }]}>
                <Text style={[styles.offText, { color: c.pink }]}>{discount}% OFF</Text>
              </View>
            ) : null}
            {mrp > price ? <Text style={[styles.mrp, { color: c.muted }]}>{money(mrp)}</Text> : null}
          </View>

          {sizes.length ? (
            <>
              <Text style={[styles.sectionLabel, { color: c.ink }]}>Select Size</Text>
              <View style={styles.chipRow}>
                {sizes.map((s) => (
                  <Pressable
                    key={s}
                    style={[
                      styles.chip,
                      { borderColor: c.border, backgroundColor: c.paper },
                      size === s && { borderColor: c.pink, backgroundColor: c.blushSoft },
                    ]}
                    onPress={() => setSize(s)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: c.cocoa },
                        size === s && { color: c.pink, fontFamily: fonts.bold },
                      ]}
                    >
                      {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {flavors.length ? (
            <>
              <Text style={[styles.sectionLabel, { color: c.ink }]}>Select Flavor</Text>
              <View style={styles.chipRow}>
                {flavors.map((f) => (
                  <Pressable
                    key={f}
                    style={[
                      styles.chip,
                      { borderColor: c.border, backgroundColor: c.paper },
                      flavor === f && { borderColor: c.pink, backgroundColor: c.blushSoft },
                    ]}
                    onPress={() => setFlavor(f)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: c.cocoa },
                        flavor === f && { color: c.pink, fontFamily: fonts.bold },
                      ]}
                    >
                      {f}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <View style={[styles.toggleRow, { backgroundColor: c.paper, borderColor: c.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { color: c.ink }]}>Eggless</Text>
              <Text style={[styles.toggleSub, { color: c.muted }]}>
                {product.is_eggless ? "This product is eggless" : "Request eggless if available"}
              </Text>
            </View>
            <Switch
              value={eggless}
              onValueChange={setEggless}
              trackColor={{ false: c.border, true: c.blush }}
              thumbColor={eggless ? c.pink : c.muted}
            />
          </View>

          {ingredients ? (
            <Pressable style={[styles.infoRow, { borderBottomColor: c.border }]} onPress={() => setShowIng((v) => !v)}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoTitle, { color: c.ink }]}>Ingredients</Text>
                {showIng ? <Text style={[styles.infoBody, { color: c.muted }]}>{ingredients}</Text> : null}
              </View>
              <Icon name={showIng ? "chevron-down" : "chevron-forward"} size={18} color={c.muted} />
            </Pressable>
          ) : null}
          {allergens ? (
            <Pressable style={[styles.infoRow, { borderBottomColor: c.border }]} onPress={() => setShowAll((v) => !v)}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoTitle, { color: c.ink }]}>Allergens</Text>
                {showAll ? <Text style={[styles.infoBody, { color: c.muted }]}>{allergens}</Text> : null}
              </View>
              <Icon name={showAll ? "chevron-down" : "chevron-forward"} size={18} color={c.muted} />
            </Pressable>
          ) : null}

          {etaLabel ? (
            <View style={[styles.etaCard, { backgroundColor: c.blushSoft }]}>
              <Icon name="bicycle" size={22} color={c.pink} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.etaLabel, { color: c.muted }]}>Estimated Delivery</Text>
                <Text style={[styles.etaValue, { color: c.pink }]}>{etaLabel}</Text>
              </View>
              <Pressable onPress={() => router.push("/addresses")} style={styles.etaChangeRow}>
                <Text style={[styles.etaChange, { color: c.pink }]}>Change</Text>
                <Icon name="chevron-forward" size={14} color={c.pink} />
              </Pressable>
            </View>
          ) : null}

          <View style={[styles.supportWrap, { backgroundColor: c.blushSoft, borderColor: c.border }]}>
            <Pressable style={[styles.supportCard, { borderColor: c.border }]} onPress={() => router.push("/(tabs)/chat")}>
              <Icon name="chatbubbles-outline" size={22} color={c.pink} />
              <Text style={[styles.supportTitle, { color: c.ink }]}>Chat with Us</Text>
              <Text style={[styles.supportSub, { color: c.muted }]}>We're here to help</Text>
            </Pressable>
            {bakeryPhone ? (
              <Pressable
                style={[styles.supportCard, { borderColor: c.border }]}
                onPress={() => Linking.openURL(`tel:${bakeryPhone}`)}
              >
                <Icon name="call-outline" size={22} color={c.pink} />
                <Text style={[styles.supportTitle, { color: c.ink }]}>Call Us</Text>
                <Text style={[styles.supportSub, { color: c.muted }]}>{bakeryPhone}</Text>
              </Pressable>
            ) : null}
            <Pressable style={[styles.supportCard, { borderColor: c.border }]} onPress={() => router.push("/(tabs)/chat")}>
              <Icon name="sparkles" size={22} color={c.pink} />
              <Text style={[styles.supportTitle, { color: c.ink }]}>Ask AI</Text>
              <Text style={[styles.supportSub, { color: c.muted }]}>Get quick answers</Text>
            </Pressable>
          </View>

          {product.short_description || product.description ? (
            <>
              <Text style={styles.sectionLabel}>About</Text>
              {product.short_description ? <Text style={styles.lead}>{product.short_description}</Text> : null}
              {product.description ? <Text style={styles.body}>{product.description}</Text> : null}
            </>
          ) : null}

          <Text style={styles.sectionLabel}>Reviews</Text>
          {reviews.slice(0, 6).map((r) => (
            <View key={r.id} style={styles.review}>
              <Text style={styles.reviewStars}>{"★".repeat(r.rating)}</Text>
              {r.comment ? <Text style={styles.reviewBody}>{r.comment}</Text> : null}
            </View>
          ))}

          <Pressable
            style={styles.rateLink}
            onPress={() =>
              router.push({ pathname: "/rate-review", params: { product_id: String(productId) } })
            }
          >
            <Text style={styles.rateLinkText}>Write a full review ›</Text>
          </Pressable>

          <Text style={styles.sectionLabel}>Quick rating</Text>
          <TextInput
            style={[styles.input, { borderColor: c.border, backgroundColor: c.paper, color: c.ink }]}
            value={rating}
            onChangeText={setRating}
            keyboardType="number-pad"
            placeholder="Rating 1–5"
            placeholderTextColor={c.muted}
          />
          <TextInput
            style={[styles.input, { minHeight: 70, borderColor: c.border, backgroundColor: c.paper, color: c.ink }]}
            value={comment}
            onChangeText={setComment}
            placeholder="Comment (optional)"
            placeholderTextColor={c.muted}
            multiline
          />
          <FloatPress style={styles.secondary} onPress={submitReview}>
            <Text style={styles.secondaryText}>Submit review</Text>
          </FloatPress>

          {fbt.length ? (
            <>
              <Text style={styles.sectionLabel}>Frequently bought together</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                {fbt.slice(0, 8).map((p) => (
                  <ProductTile
                    key={`fbt-${p.id}`}
                    product={p}
                    width={148}
                    qty={cartQty.qtyOf(p.id)}
                    busy={cartQty.busyId === p.id}
                    onPress={() => router.push(`/product/${p.id}`)}
                    onAdd={() => cartQty.add(p).catch(() => undefined)}
                    onInc={() => cartQty.inc(p).catch(() => undefined)}
                    onDec={() => cartQty.dec(p).catch(() => undefined)}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}

          {similar.length ? (
            <>
              <Text style={styles.sectionLabel}>Similar products</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                {similar.slice(0, 8).map((p) => (
                  <ProductTile
                    key={`sim-${p.id}`}
                    product={p}
                    width={148}
                    qty={cartQty.qtyOf(p.id)}
                    busy={cartQty.busyId === p.id}
                    onPress={() => router.push(`/product/${p.id}`)}
                    onAdd={() => cartQty.add(p).catch(() => undefined)}
                    onInc={() => cartQty.inc(p).catch(() => undefined)}
                    onDec={() => cartQty.dec(p).catch(() => undefined)}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: c.cream, borderTopColor: c.border }]}>
        <FloatPress style={[styles.addBtn, { backgroundColor: c.chocolate }]} onPress={addToCart} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <View style={styles.addRow}>
              <Icon name="cart" size={18} color="#FFF" />
              <Text style={styles.addText}>Add to Cart</Text>
            </View>
          )}
        </FloatPress>
        <FloatPress style={[styles.buyBtn, { backgroundColor: c.coral }]} onPress={buyNow} disabled={busy}>
          <Text style={styles.buyText}>Buy Now</Text>
        </FloatPress>
        <Pressable style={[styles.wishBtn, { borderColor: c.border, backgroundColor: c.paper }]} onPress={toggleFav}>
          <Icon name={fav ? "heart" : "heart-outline"} size={22} color={c.pink} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.lg, gap: space.md, paddingBottom: 120 },
  content: { paddingBottom: 16 },
  topActions: { flexDirection: "row", gap: 14, alignItems: "center" },
  addRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  gallery: { width: W, height: 320, backgroundColor: fallbackColors.creamDeep },
  cover: { width: W, height: 320 },
  coverEmpty: { alignItems: "center", justifyContent: "center" },
  coverLetter: { fontFamily: fonts.display, fontSize: 64 },
  counter: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  counterText: { color: "#FFF", fontFamily: fonts.medium, fontSize: 12 },
  dots: {
    position: "absolute",
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.7)" },
  dotOn: { width: 18 },
  name: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  rating: { fontFamily: fonts.body, fontSize: 14 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  price: { fontFamily: fonts.bold, fontSize: 28 },
  offBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  offText: { fontFamily: fonts.bold, fontSize: 12 },
  mrp: {
    fontFamily: fonts.body,
    fontSize: 16,
    textDecorationLine: "line-through",
  },
  sectionLabel: {
    marginTop: space.sm,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  chipText: { fontFamily: fonts.medium },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.md,
  },
  toggleTitle: { fontFamily: fonts.bold },
  toggleSub: { fontFamily: fonts.body, fontSize: 12 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoTitle: { fontFamily: fonts.bold },
  infoBody: { marginTop: 4, fontFamily: fonts.body, lineHeight: 20 },
  etaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.md,
    padding: space.md,
  },
  etaLabel: { fontFamily: fonts.body, fontSize: 12 },
  etaValue: { fontFamily: fonts.bold, fontSize: 16 },
  etaChangeRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  etaChange: { fontFamily: fonts.bold },
  supportWrap: {
    flexDirection: "row",
    gap: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.sm,
  },
  supportCard: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.55)",
    padding: 10,
    alignItems: "center",
    gap: 4,
  },
  supportTitle: { fontFamily: fonts.bold, fontSize: 11, textAlign: "center" },
  supportSub: { fontFamily: fonts.body, fontSize: 9, textAlign: "center" },
  lead: { fontFamily: fonts.bold, fontSize: 15, color: fallbackColors.cocoa },
  body: { fontFamily: fonts.body, fontSize: 14, color: fallbackColors.muted, lineHeight: 21 },
  review: {
    backgroundColor: fallbackColors.paper,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: fallbackColors.border,
  },
  reviewStars: { color: "#FFB400", fontFamily: fonts.bold },
  reviewBody: { marginTop: 4, fontFamily: fonts.body, color: fallbackColors.muted },
  rateLink: { paddingVertical: 4 },
  rateLinkText: { fontFamily: fonts.bold, color: fallbackColors.pink },
  input: {
    borderWidth: 1,
    borderColor: fallbackColors.border,
    backgroundColor: fallbackColors.paper,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
    color: fallbackColors.ink,
  },
  secondary: {
    backgroundColor: fallbackColors.paper,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: fallbackColors.border,
  },
  secondaryText: { color: fallbackColors.ink, fontFamily: fonts.bold },
  rail: { gap: space.sm, paddingRight: space.sm },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 8,
    padding: space.md,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  addBtn: {
    flex: 1.2,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: { color: "#FFF", fontFamily: fonts.bold, fontSize: 14 },
  buyBtn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buyText: { color: "#FFF", fontFamily: fonts.bold, fontSize: 14 },
  wishBtn: {
    width: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

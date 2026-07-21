import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { Banner } from "@/components/ui/Banner";
import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useThemeColors } from "@/context/theme";
import { api } from "@/lib/api";
import { fonts, radius, space } from "@/lib/theme";
import type { Product } from "@/lib/types";

export default function RateReviewScreen() {
  const c = useThemeColors();
  const { product_id, order_id } = useLocalSearchParams<{ product_id?: string; order_id?: string }>();
  const productId = Number(product_id || 0);
  const orderId = Number(order_id || 0);
  const [product, setProduct] = useState<Product | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!productId) return;
    api.customer
      .product(productId)
      .then((d) => setProduct(d.product as Product))
      .catch(() => undefined);
  }, [productId]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (orderId && !productId) {
        await api.customer.rateOrder(orderId, { rating: stars, comment: comment.trim() || undefined });
      } else if (productId) {
        await api.customer.review(productId, { rating: stars, comment: comment.trim() || undefined });
      } else {
        throw new Error("Nothing to rate");
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit review");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BrandHeader left="back" right="none" />
      <TitleFlourish title="Rate & Review" subtitle="How was your treat?" />

      {error ? <Banner text={error} tone="danger" /> : null}
      {done ? <Banner text="Thanks! Your review helps others pick sweeter cakes." tone="ok" /> : null}

      {product ? (
        <View style={[styles.product, { backgroundColor: c.paper, borderColor: c.border }]}>
          {product.cover_image_url ? (
            <Image source={{ uri: product.cover_image_url }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: c.blushSoft }]}>
              <Icon name="cafe-outline" size={24} color={c.pink} />
            </View>
          )}
          <Text style={[styles.name, { color: c.ink }]}>{product.name}</Text>
        </View>
      ) : null}

      <Text style={[styles.label, { color: c.ink }]}>Your rating</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <FloatPress key={n} onPress={() => setStars(n)}>
            <Icon name={n <= stars ? "star" : "star-outline"} size={36} color={n <= stars ? "#FFB400" : c.border} />
          </FloatPress>
        ))}
      </View>

      <Text style={[styles.label, { color: c.ink }]}>Tell us more</Text>
      <TextInput
        style={[styles.input, { borderColor: c.border, backgroundColor: c.paper, color: c.ink }]}
        value={comment}
        onChangeText={setComment}
        placeholder="Taste, freshness, packing…"
        placeholderTextColor={c.muted}
        multiline
      />

      <FloatPress
        style={[styles.cta, { backgroundColor: c.pink }]}
        onPress={submit}
        disabled={busy || done}
      >
        {busy ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Icon name="heart-outline" size={18} color="#FFF" />
            <Text style={styles.ctaText}>Submit review</Text>
          </>
        )}
      </FloatPress>
    </Screen>
  );
}

const styles = StyleSheet.create({
  product: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.md,
    marginBottom: space.md,
  },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  name: { flex: 1, fontFamily: fonts.bold, fontSize: 15 },
  label: { fontFamily: fonts.bold, marginBottom: 8, marginTop: 4 },
  stars: { flexDirection: "row", gap: 8, marginBottom: space.md },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    fontFamily: fonts.body,
    textAlignVertical: "top",
    marginBottom: space.lg,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.md,
    paddingVertical: 16,
  },
  ctaText: { color: "#FFF", fontFamily: fonts.bold, fontSize: 16 },
});

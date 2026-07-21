import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FadeIn } from "@/components/FadeIn";
import { Banner } from "@/components/ui/Banner";
import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { TrustStrip } from "@/components/ui/TrustStrip";
import { useApp } from "@/context/app";
import { useThemeColors } from "@/context/theme";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { float, fonts, radius, space } from "@/lib/theme";
import { money, type CartItem, type CartSummary } from "@/lib/types";

export default function CartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useThemeColors();
  const footerPad = Math.max(insets.bottom, 12);
  const { t } = useI18n();
  const { cart, cartCount, refreshCart, setError, error } = useApp();
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [coupon, setCoupon] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLocalError(null);
    try {
      await refreshCart();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Could not load cart");
    } finally {
      setLoading(false);
    }
  }, [refreshCart]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function setQty(item: CartItem, quantity: number) {
    setBusyId(item.id);
    setLocalError(null);
    try {
      if (quantity < 1) await api.customer.removeCartItem(item.id);
      else await api.customer.updateCartItem(item.id, { quantity });
      await refreshCart();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  async function removeItem(item: CartItem) {
    setBusyId(item.id);
    setLocalError(null);
    try {
      await api.customer.removeCartItem(item.id);
      await refreshCart();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Remove failed");
    } finally {
      setBusyId(null);
    }
  }

  async function saveForLater(item: CartItem) {
    setBusyId(item.id);
    setLocalError(null);
    try {
      await api.customer.updateCartItem(item.id, { saved_for_later: true, quantity: item.quantity });
      await refreshCart();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Could not save for later");
    } finally {
      setBusyId(null);
    }
  }

  async function applyCoupon() {
    if (!coupon.trim()) return;
    setLocalError(null);
    try {
      await api.customer.applyCoupon(coupon.trim());
      await refreshCart();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Coupon failed");
    }
  }

  const items = cart?.items || [];
  const summary = cart as CartSummary;
  const itemCount = items.reduce((n, i) => n + i.quantity, 0);

  return (
    <Screen>
      <BrandHeader left="back" right="cart" cartCount={cartCount} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: footerPad + 24 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.pink} />}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn>
          {!items.length ? (
            <TitleFlourish title={t("emptyCart")} subtitle={t("emptyCartSub")} />
          ) : (
            <TitleFlourish
              title={`My Cart (${itemCount})`}
              subtitle={summary?.shop_name ? `From ${summary.shop_name}` : undefined}
            />
          )}
        </FadeIn>

        {(localError || error) ? <Banner text={localError || error || ""} tone="danger" /> : null}

        {!items.length ? (
          <View style={styles.emptyBox}>
            <View style={[styles.emptyIcon, { backgroundColor: c.blushSoft }]}>
              <Icon name="bag-handle-outline" size={40} color={c.pink} />
            </View>
            <FloatPress
              style={[styles.browseBtn, { backgroundColor: c.chocolate }]}
              onPress={() => router.push("/(tabs)/catalog")}
            >
              <Text style={styles.browseBtnText}>{t("browseProducts")}</Text>
            </FloatPress>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={[styles.card, float, { backgroundColor: c.paper, borderColor: c.border }]}>
              {item.product_image ? (
                <Image source={{ uri: item.product_image }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: c.stoneDeep }]}>
                  <Text style={[styles.thumbLetter, { color: c.pink }]}>{item.product_name.slice(0, 1)}</Text>
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={[styles.name, { color: c.ink }]} numberOfLines={2}>
                  {item.product_name}
                </Text>
                {item.variant || item.flavor ? (
                  <Text style={[styles.meta, { color: c.pink }]}>
                    {[item.variant, item.flavor].filter(Boolean).join(" • ")}
                  </Text>
                ) : null}
                <Text style={[styles.unitPrice, { color: c.ink }]}>{money(item.unit_price)}</Text>
                <View style={[styles.qtyPill, { backgroundColor: c.blushSoft }]}>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => setQty(item, item.quantity - 1)}
                    disabled={busyId === item.id}
                  >
                    <Text style={[styles.qtyBtnText, { color: c.ink }]}>−</Text>
                  </Pressable>
                  <Text style={[styles.qtyNum, { color: c.ink }]}>{item.quantity}</Text>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => setQty(item, item.quantity + 1)}
                    disabled={busyId === item.id}
                  >
                    <Text style={[styles.qtyBtnText, { color: c.ink }]}>+</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable style={styles.actionRow} onPress={() => removeItem(item)} disabled={busyId === item.id}>
                  <Icon name="trash-outline" size={16} color={c.pink} />
                  <Text style={[styles.removeText, { color: c.pink }]}>Remove</Text>
                </Pressable>
                <Pressable style={styles.actionRow} onPress={() => saveForLater(item)} disabled={busyId === item.id}>
                  <Icon name="bookmark-outline" size={16} color={c.ink} />
                  <Text style={[styles.saveText, { color: c.ink }]}>Save for later</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {(summary?.saved_for_later || []).length ? (
          <>
            <Text style={[styles.savedTitle, { color: c.caramel }]}>Saved for later</Text>
            {(summary.saved_for_later || []).map((s) => (
              <View
                key={s.id}
                style={[styles.savedRow, { backgroundColor: c.paper, borderColor: c.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: c.ink }]}>Item #{s.product_id}</Text>
                  <Text style={[styles.meta, { color: c.muted }]}>Qty {s.quantity}</Text>
                </View>
                <FloatPress
                  onPress={async () => {
                    setBusyId(s.id);
                    try {
                      await api.customer.updateCartItem(s.id, { saved_for_later: false, quantity: s.quantity || 1 });
                      await refreshCart();
                    } catch (e) {
                      setLocalError(e instanceof Error ? e.message : "Could not move to cart");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  <Text style={[styles.saveText, { color: c.pink }]}>Move to cart</Text>
                </FloatPress>
              </View>
            ))}
          </>
        ) : null}

        {items.length ? (
          <>
            <View style={[styles.couponRow, { borderColor: c.pink, backgroundColor: c.blushSoft }]}>
              <Icon name="pricetag-outline" size={18} color={c.pink} />
              <Text style={[styles.couponLabel, { color: c.ink }]}>Have a coupon?</Text>
              <TextInput
                style={[styles.couponInput, { borderColor: c.border, backgroundColor: c.paper, color: c.ink }]}
                value={coupon}
                onChangeText={setCoupon}
                placeholder="Code"
                placeholderTextColor={c.muted}
                autoCapitalize="characters"
              />
              <FloatPress style={[styles.couponBtn, { backgroundColor: c.coral }]} onPress={applyCoupon}>
                <Text style={styles.couponBtnText}>Apply</Text>
              </FloatPress>
            </View>
            {summary.coupon_code ? (
              <Text style={[styles.couponApplied, { color: c.success }]}>
                Applied: {summary.coupon_code}
              </Text>
            ) : null}

            <View style={[styles.totals, { backgroundColor: c.paper, borderColor: c.border }]}>
              <BillLine label="Subtotal" value={summary.subtotal} />
              <BillLine label="Delivery" value={summary.delivery_fee} />
              <BillLine label="GST" value={summary.gst} />
              {summary.discount > 0 ? (
                <BillLine
                  label={summary.coupon_code ? `Discount (${summary.coupon_code})` : "Discount"}
                  value={-summary.discount}
                  accent
                />
              ) : null}
              <View style={[styles.dashed, { borderColor: c.border }]} />
              <View style={styles.finalRow}>
                <Text style={[styles.finalLabel, { color: c.ink }]}>Final Total</Text>
                <Text style={[styles.finalValue, { color: c.ink }]}>{money(summary.final_total)}</Text>
              </View>
            </View>

            <View style={styles.dualCta}>
              <FloatPress
                style={[styles.ctaOutline, { borderColor: c.chocolate, backgroundColor: c.paper }]}
                onPress={() => router.push("/(tabs)/catalog")}
              >
                <Icon name="bag-handle-outline" size={18} color={c.chocolate} />
                <Text style={[styles.ctaOutlineText, { color: c.chocolate }]}>Continue Shopping</Text>
              </FloatPress>
              <FloatPress
                style={[styles.ctaFill, { backgroundColor: c.chocolate }]}
                onPress={() => {
                  setError(null);
                  router.push("/checkout");
                }}
              >
                <Icon name="lock-closed-outline" size={16} color="#FFF" />
                <Text style={styles.ctaFillText}>Proceed to Checkout</Text>
              </FloatPress>
            </View>

            <TrustStrip />
          </>
        ) : null}
      </ScrollView>

      {loading && !items.length ? (
        <View style={styles.centerOverlay}>
          <ActivityIndicator color={c.pink} />
        </View>
      ) : null}
    </Screen>
  );
}

function BillLine({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  const c = useThemeColors();
  return (
    <View style={styles.billLine}>
      <Text style={[styles.billLabel, { color: c.muted }]}>{label}</Text>
      <Text style={[styles.billValue, { color: accent ? c.pink : c.ink }]}>
        {accent && value < 0 ? `- ${money(Math.abs(value))}` : money(value)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: space.sm },
  emptyBox: { alignItems: "center", gap: space.lg, paddingVertical: space.xl },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  browseBtn: { borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 28 },
  browseBtnText: { color: "#FFF", fontFamily: fonts.bold, fontSize: 16 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
  },
  thumb: { width: 72, height: 72, borderRadius: radius.sm },
  thumbEmpty: { alignItems: "center", justifyContent: "center" },
  thumbLetter: { fontFamily: fonts.display, fontSize: 24 },
  cardBody: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.bold, fontSize: 15 },
  meta: { fontFamily: fonts.body, fontSize: 12 },
  unitPrice: { fontFamily: fonts.bold, fontSize: 16, marginTop: 2 },
  qtyPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    marginTop: 6,
    gap: 2,
  },
  qtyBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  qtyBtnText: { fontSize: 16, fontFamily: fonts.bold },
  qtyNum: { minWidth: 22, textAlign: "center", fontFamily: fonts.bold, fontSize: 14 },
  actions: { gap: 10, alignItems: "flex-end", justifyContent: "center", paddingTop: 4 },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  removeText: { fontFamily: fonts.bold, fontSize: 11 },
  saveText: { fontFamily: fonts.medium, fontSize: 11 },
  savedTitle: {
    marginTop: space.sm,
    fontFamily: fonts.bold,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: space.md,
  },
  couponRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: space.sm,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: radius.md,
    padding: space.sm,
  },
  couponLabel: { fontFamily: fonts.medium, fontSize: 12, flexShrink: 0 },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: fonts.body,
    fontSize: 13,
    minWidth: 60,
  },
  couponBtn: { borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 8 },
  couponBtnText: { color: "#FFF", fontFamily: fonts.bold, fontSize: 13 },
  couponApplied: { fontFamily: fonts.medium, fontSize: 13 },
  totals: {
    marginTop: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
    gap: 8,
  },
  billLine: { flexDirection: "row", justifyContent: "space-between" },
  billLabel: { fontFamily: fonts.body, fontSize: 14 },
  billValue: { fontFamily: fonts.medium, fontSize: 14 },
  dashed: {
    borderBottomWidth: 1,
    borderStyle: "dashed",
    marginVertical: 4,
  },
  finalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 4 },
  finalLabel: { fontFamily: fonts.bold, fontSize: 16 },
  finalValue: { fontFamily: fonts.display, fontSize: 28 },
  dualCta: { flexDirection: "row", gap: 10, marginTop: space.sm },
  ctaOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    paddingVertical: 14,
  },
  ctaOutlineText: { fontFamily: fonts.bold, fontSize: 12 },
  ctaFill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.lg,
    paddingVertical: 14,
  },
  ctaFillText: { color: "#FFF", fontFamily: fonts.bold, fontSize: 12 },
  centerOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
  },
});

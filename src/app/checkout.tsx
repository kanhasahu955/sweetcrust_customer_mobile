import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { FadeIn } from "@/components/FadeIn";
import { Banner } from "@/components/ui/Banner";
import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useApp } from "@/context/app";
import { useThemeColors } from "@/context/theme";
import type { AddressDetails } from "@/lib/address";
import { api, DEFAULT_DELIVERY_COORDS, getStoredUser, isRealMobile, normalizePhone } from "@/lib/api";
import type { AddressIn, CheckoutIn } from "@/lib/api-client";
import { waitForPaymentStatus } from "@/lib/payment";
import { fonts, radius, space } from "@/lib/theme";
import { money, type Address } from "@/lib/types";

type CheckoutSettings = {
  delivery_slots?: string[];
  latitude?: number | null;
  longitude?: number | null;
  upi_id?: string | null;
};

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function formatSlot(s: string) {
  return s.replace("-", " – ");
}

function payLabel(m: string, walletBalance: number) {
  const key = String(m).toLowerCase();
  if (key === "wallet") return `Wallet · ${money(walletBalance)}`;
  if (key === "cod") return "Cash on delivery";
  if (key === "razorpay") return "UPI / Card";
  return m.replace(/_/g, " ");
}

function normalizeAddresses(raw: unknown): Address[] {
  if (Array.isArray(raw)) return raw as Address[];
  if (raw && typeof raw === "object") {
    const o = raw as { addresses?: unknown; items?: unknown; data?: unknown };
    if (Array.isArray(o.addresses)) return o.addresses as Address[];
    if (Array.isArray(o.items)) return o.items as Address[];
    if (Array.isArray(o.data)) return o.data as Address[];
  }
  return [];
}

export default function CheckoutScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const { refreshCart } = useApp();
  const user = getStoredUser();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(tomorrowISO());
  const [phone, setPhone] = useState(() => (isRealMobile(user?.phone || "") ? String(user?.phone) : ""));
  const [instructions, setInstructions] = useState("");
  const [contactless, setContactless] = useState(false);
  const [methods, setMethods] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [cartTotal, setCartTotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [coords, setCoords] = useState(DEFAULT_DELIVERY_COORDS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [pickedAddr, setPickedAddr] = useState<AddressDetails | null>(null);
  const [newAddr, setNewAddr] = useState({
    full_name: user?.name || "",
    phone: user?.phone || "",
  });
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  selectedIdRef.current = selectedId;

  const applyAddresses = useCallback((raw: unknown, preferId?: number | null) => {
    const list = normalizeAddresses(raw).map((a) => ({ ...a, id: Number(a.id) }));
    setAddresses(list);
    if (!list.length) {
      setSelectedId(null);
      setShowNewAddress(true);
      return;
    }
    const keep =
      (preferId != null && list.find((a) => a.id === Number(preferId))) ||
      list.find((a) => a.is_default) ||
      list[0];
    setSelectedId(keep.id);
    setShowNewAddress(false);
    setPhone((prev) => (isRealMobile(prev) ? prev : isRealMobile(keep.phone || "") ? String(keep.phone) : ""));
  }, []);

  const loadCheckout = useCallback(async () => {
    setError(null);
    try {
      const [addrs, pay, cart, wallet, settingsRaw] = await Promise.all([
        api.customer.addresses(),
        api.payments.methods(),
        api.customer.cart(),
        api.customer.wallet().catch(() => ({ balance: 0 })),
        api.customer.settings().catch(() => ({ delivery_slots: [] }) as CheckoutSettings),
      ]);
      const settings = settingsRaw as CheckoutSettings;

      applyAddresses(addrs, selectedIdRef.current);

      const balance = Number((wallet as { balance?: number }).balance || 0);
      setWalletBalance(balance);

      const deliverySlots = Array.isArray(settings.delivery_slots)
        ? settings.delivery_slots.filter(Boolean)
        : [];
      setSlots(deliverySlots);
      setSlot((prev) => (prev && deliverySlots.includes(prev) ? prev : deliverySlots[0] || ""));
      if (settings.latitude != null && settings.longitude != null) {
        setCoords({ latitude: Number(settings.latitude), longitude: Number(settings.longitude) });
      }

      // Only real rails: Razorpay (covers UPI/cards), COD, wallet — no fake confirmPayment UPI
      const allowed = new Set(["razorpay", "cod", "wallet"]);
      const m = (pay.methods || []).filter((x) => allowed.has(String(x).toLowerCase()));
      if (!m.includes("razorpay")) m.unshift("razorpay");
      if (!m.includes("cod")) m.push("cod");
      const withWallet = balance > 0 && !m.includes("wallet") ? [...m, "wallet"] : m;
      if (withWallet.length) {
        setMethods(withWallet);
        setPaymentMethod((prev) =>
          prev && withWallet.includes(prev)
            ? prev
            : balance >= Number((cart as { final_total?: number }).final_total || 0) &&
                withWallet.includes("wallet")
              ? "wallet"
              : withWallet.includes("razorpay")
                ? "razorpay"
                : withWallet[0]
        );
      }

      const cartData = cart as {
        final_total?: number;
        items?: unknown[];
        coupon_code?: string | null;
      };
      setCartTotal(Number(cartData.final_total || 0));
      setItemCount((cartData.items || []).length);
      setCouponCode(cartData.coupon_code ? String(cartData.coupon_code) : null);
      if (!(cartData.items || []).length) setError("Cart is empty");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout load failed");
    } finally {
      setLoading(false);
    }
  }, [applyAddresses]);

  useFocusEffect(
    useCallback(() => {
      void loadCheckout();
    }, [loadCheckout])
  );

  const selectedAddr = addresses.find((a) => a.id === selectedId) || null;
  const newAddrReady =
    newAddr.full_name.trim().length > 0 &&
    Boolean(pickedAddr?.address_line?.trim()) &&
    Number(pickedAddr?.latitude) !== 0 &&
    Number(pickedAddr?.longitude) !== 0;

  const canPay = useMemo(
    () =>
      phone.trim().length >= 10 &&
      Boolean(slot) &&
      Boolean(paymentMethod) &&
      (showNewAddress ? newAddrReady : selectedId != null),
    [phone, slot, paymentMethod, showNewAddress, newAddrReady, selectedId]
  );

  async function onPickAddress(next: AddressDetails) {
    setPickedAddr(next);
    setCoords({ latitude: next.latitude, longitude: next.longitude });
  }

  async function createAddress(): Promise<number> {
    if (!pickedAddr) throw new Error("Pick an address from search");
    const body: AddressIn = {
      full_name: newAddr.full_name.trim(),
      phone: newAddr.phone.trim() || phone.trim(),
      line1: pickedAddr.address_line,
      city: pickedAddr.city || "",
      state: pickedAddr.state || "",
      pincode: pickedAddr.pincode || "",
      label: "Home",
      is_default: true,
      latitude: pickedAddr.latitude,
      longitude: pickedAddr.longitude,
    };
    const res = (await api.customer.addAddress(body)) as { address: Address };
    const addr = { ...res.address, id: Number(res.address.id) };
    setAddresses((prev) => {
      const rest = prev.filter((a) => a.id !== addr.id);
      return [...rest, addr];
    });
    setSelectedId(addr.id);
    setShowNewAddress(false);
    return addr.id;
  }

  async function placeOrder() {
    setBusy(true);
    setError(null);
    try {
      let addressId = selectedId;
      let checkLat: number | null = null;
      let checkLng: number | null = null;
      if (showNewAddress || !addressId) {
        if (!newAddrReady) {
          setError("Search and pick a delivery address with name");
          return;
        }
        checkLat = Number(pickedAddr?.latitude);
        checkLng = Number(pickedAddr?.longitude);
      } else if (selectedAddr?.latitude != null && selectedAddr?.longitude != null) {
        checkLat = Number(selectedAddr.latitude);
        checkLng = Number(selectedAddr.longitude);
        setCoords({
          latitude: checkLat,
          longitude: checkLng,
        });
      }

      if (checkLat != null && checkLng != null && Number.isFinite(checkLat) && Number.isFinite(checkLng)) {
        const zone = await api.customer.deliveryCheck(checkLat, checkLng);
        if (zone?.deliverable === false) {
          throw new Error(zone.detail || "Sorry, we don’t deliver to this location yet.");
        }
      }

      if (showNewAddress || !addressId) {
        addressId = await createAddress();
      }

      const method = String(paymentMethod || "").toLowerCase();
      if (!["razorpay", "cod", "wallet"].includes(method)) {
        throw new Error("Choose Razorpay, COD, or Wallet");
      }
      if (method === "wallet" && walletBalance < cartTotal) {
        throw new Error("Insufficient wallet balance");
      }
      if (!isRealMobile(phone)) {
        throw new Error("Enter a valid 10-digit mobile number");
      }
      const customerPhone = normalizePhone(phone.trim());

      const body: CheckoutIn = {
        address_id: addressId,
        delivery_date: deliveryDate,
        delivery_slot: slot,
        customer_phone: customerPhone,
        delivery_instructions: instructions.trim() || null,
        contactless,
        payment_method: paymentMethod,
        coupon_code: couponCode,
      };

      const { order } = await api.customer.checkout(body);
      const amount = String(
        (order as { final_amount?: number; total_amount?: number }).final_amount ??
          (order as { total_amount?: number }).total_amount ??
          cartTotal
      );

      if (method === "razorpay") {
        const rz = await api.payments.razorpayCreate(order.id);
        const url = rz.short_url || rz.payment_link?.short_url;
        if (!url) throw new Error("Payment link unavailable");
        await WebBrowser.openBrowserAsync(url);
        const status = await waitForPaymentStatus(order.id);
        await refreshCart();
        if (status === "paid") {
          router.replace({
            pathname: "/payment-success",
            params: { orderId: String(order.id), amount },
          });
          return;
        }
        if (status === "failed") {
          router.replace({
            pathname: "/payment-failed",
            params: { reason: "Payment failed or cancelled", amount, orderId: String(order.id) },
          });
          return;
        }
        // Webhook may still be catching up — send to order, not fake success.
        router.replace(`/orders/${order.id}`);
        return;
      }

      // COD / wallet — server marks method at checkout; no fake UPI confirm
      await refreshCart();
      router.replace({
        pathname: "/payment-success",
        params: { orderId: String(order.id), amount },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Checkout failed";
      setError(msg);
      router.push({ pathname: "/payment-failed", params: { reason: msg, amount: String(cartTotal) } });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={c.pink} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <BrandHeader left="back" right="none" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 96 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TitleFlourish title="Delivery & payment" />

        <FadeIn>
          <SectionCard icon="location-outline" title="Delivery Address" c={c}>
            {!addresses.length && !showNewAddress ? (
              <Text style={[styles.addrLine, { color: c.muted }]}>No saved addresses yet.</Text>
            ) : null}

            {addresses.map((a) => {
              const on = selectedId === a.id && !showNewAddress;
              return (
                <FloatPress
                  key={a.id}
                  style={[
                    styles.addrPick,
                    { borderColor: on ? c.pink : c.border, backgroundColor: on ? c.blushSoft : c.paper },
                  ]}
                  onPress={() => {
                    setSelectedId(a.id);
                    setShowNewAddress(false);
                    setError(null);
                    if (isRealMobile(a.phone || "") && !isRealMobile(phone)) {
                      setPhone(String(a.phone));
                    }
                  }}
                >
                  <View style={styles.addrPickRow}>
                    <Icon
                      name={on ? "radio-button-on" : "radio-button-off"}
                      size={18}
                      color={on ? c.pink : c.muted}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.addrName, { color: c.ink }]}>
                        {a.label ? `${a.label} · ` : ""}
                        {a.full_name}
                      </Text>
                      <Text style={[styles.addrLine, { color: c.muted }]} numberOfLines={3}>
                        {a.line1}
                        {a.line2 ? `, ${a.line2}` : ""}
                        {a.city ? `\n${a.city}` : ""}
                        {a.pincode ? ` ${a.pincode}` : ""}
                      </Text>
                    </View>
                    {on ? <Icon name="checkmark-circle" size={18} color={c.pink} /> : null}
                  </View>
                </FloatPress>
              );
            })}

            <FloatPress
              style={[
                styles.addrPick,
                {
                  borderColor: showNewAddress ? c.pink : c.border,
                  borderStyle: "dashed",
                  backgroundColor: showNewAddress ? c.blushSoft : c.paper,
                },
              ]}
              onPress={() => {
                setShowNewAddress(true);
                setSelectedId(null);
              }}
            >
              <Text style={[styles.changeLink, { color: c.pink, marginTop: 0 }]}>
                {showNewAddress ? "Adding new address below" : "+ Add New Address"}
              </Text>
            </FloatPress>

            <FloatPress onPress={() => router.push("/addresses")}>
              <Text style={[styles.changeLink, { color: c.muted }]}>
                {addresses.length ? "Manage addresses ›" : "Search & save address ›"}
              </Text>
            </FloatPress>

            {selectedAddr && !showNewAddress ? (
              <Text style={[styles.hint, { color: c.success }]}>
                Delivering to {selectedAddr.full_name}
              </Text>
            ) : null}
          </SectionCard>

          {showNewAddress ? (
            <View style={[styles.form, { backgroundColor: "#FFFFFF", borderColor: c.border }]}>
              <Text style={[styles.sectionTitle, { color: c.ink }]}>New address</Text>
              <Field label="Full name" value={newAddr.full_name} onChange={(v) => setNewAddr((s) => ({ ...s, full_name: v }))} />
              <Field label="Phone" value={newAddr.phone} onChange={(v) => setNewAddr((s) => ({ ...s, phone: v }))} keyboardType="phone-pad" />
              <AddressAutocomplete value={pickedAddr} onChange={onPickAddress} onError={setError} />
              {addresses.length ? (
                <FloatPress
                  onPress={() => {
                    const keep = addresses.find((a) => a.is_default) || addresses[0];
                    if (keep) {
                      setSelectedId(keep.id);
                      setShowNewAddress(false);
                    }
                  }}
                >
                  <Text style={[styles.changeLink, { color: c.muted }]}>Cancel — use saved address</Text>
                </FloatPress>
              ) : null}
            </View>
          ) : null}

          <SectionCard icon="calendar-outline" title="Delivery Date" c={c}>
            <Field label="Date (YYYY-MM-DD)" value={deliveryDate} onChange={setDeliveryDate} />
          </SectionCard>

          <SectionCard icon="time-outline" title="Delivery Time" c={c}>
            {slots.length ? (
              <View style={styles.slotGrid}>
                {slots.map((s) => {
                  const on = slot === s;
                  return (
                    <FloatPress
                      key={s}
                      style={[
                        styles.slotChip,
                        {
                          borderColor: on ? c.pink : c.border,
                          backgroundColor: on ? c.blushSoft : "#FFFFFF",
                        },
                      ]}
                      onPress={() => setSlot(s)}
                    >
                      <Text style={[styles.slotText, { color: on ? c.ink : c.cocoa }]}>
                        {formatSlot(s)}
                      </Text>
                      {on ? <Icon name="checkmark" size={14} color={c.pink} /> : null}
                    </FloatPress>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.addrLine, { color: c.muted }]}>No delivery slots configured yet.</Text>
            )}
          </SectionCard>

          <SectionCard icon="call-outline" title="Phone Number" c={c}>
            <Field label="Customer phone" value={phone} onChange={setPhone} keyboardType="phone-pad" />
          </SectionCard>

          <SectionCard icon="document-text-outline" title="Delivery Instructions (Optional)" c={c}>
            <TextInput
              style={[styles.textArea, { borderColor: c.border, color: c.ink }]}
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Add instructions for safe delivery…"
              placeholderTextColor={c.muted}
              multiline
            />
          </SectionCard>

          <View style={[styles.toggleCard, { borderColor: c.border }]}>
            <View style={[styles.sectionIcon, { backgroundColor: c.blushSoft }]}>
              <Icon name="shield-checkmark-outline" size={18} color={c.pink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: c.ink }]}>Contactless Delivery</Text>
              <Text style={[styles.toggleSub, { color: c.muted }]}>
                Our delivery partner will leave the order at your doorstep.
              </Text>
            </View>
            <Switch
              value={contactless}
              onValueChange={setContactless}
              trackColor={{ false: c.border, true: c.pink }}
              thumbColor="#FFF"
            />
          </View>

          <SectionCard icon="card-outline" title="Payment" c={c}>
            <View style={styles.payGrid}>
              {methods.map((m) => {
                const on = paymentMethod === m;
                const icon =
                  m === "wallet" ? "wallet-outline" : m === "cod" ? "cash-outline" : "card-outline";
                return (
                  <FloatPress
                    key={m}
                    style={[
                      styles.payChip,
                      { borderColor: on ? c.pink : c.border, backgroundColor: on ? c.blushSoft : "#FFFFFF" },
                    ]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <View style={[styles.payIcon, { backgroundColor: on ? c.pink : c.cream }]}>
                      <Icon name={icon} size={16} color={on ? "#FFF" : c.pink} />
                    </View>
                    <Text style={[styles.payChipText, { color: on ? c.ink : c.cocoa }]} numberOfLines={1}>
                      {payLabel(m, walletBalance)}
                    </Text>
                    {on ? <Icon name="checkmark-circle" size={16} color={c.pink} /> : null}
                  </FloatPress>
                );
              })}
            </View>
            {paymentMethod === "wallet" && walletBalance < cartTotal ? (
              <Text style={[styles.hint, { color: c.danger }]}>
                Insufficient wallet balance. Choose another method or top up.
              </Text>
            ) : null}
            {paymentMethod === "razorpay" ? (
              <Text style={[styles.hint, { color: c.muted }]}>
                Secure Razorpay page opens next — UPI, cards, and netbanking.
              </Text>
            ) : null}
            {paymentMethod === "cod" ? (
              <Text style={[styles.hint, { color: c.muted }]}>Pay in cash when your order arrives.</Text>
            ) : null}
            {couponCode ? (
              <Text style={[styles.hint, { color: c.success }]}>Coupon {couponCode} will be applied</Text>
            ) : null}
          </SectionCard>

          <LinearGradient
            colors={["#FFFFFF", "#FFF5F7", "#F3F7FB"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.summaryCard, { borderColor: "rgba(233,116,142,0.28)" }]}
          >
            <View style={styles.summaryHead}>
              <View style={[styles.sectionIcon, { backgroundColor: c.blushSoft }]}>
                <Icon name="bag-handle-outline" size={18} color={c.pink} />
              </View>
              <Text style={[styles.sectionTitle, { color: c.ink }]}>Order Summary</Text>
            </View>
            <SummaryLine label={`Subtotal (${itemCount} items)`} value={cartTotal} />
            <View style={[styles.dashed, { borderColor: c.border }]} />
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: c.ink }]}>Total Amount</Text>
              <Text style={[styles.totalValue, { color: c.pink }]}>{money(cartTotal)}</Text>
            </View>
          </LinearGradient>
        </FadeIn>

        {error ? <Banner text={error} tone="danger" /> : null}

        <FloatPress onPress={placeOrder} disabled={!canPay || busy || (paymentMethod === "wallet" && walletBalance < cartTotal)}>
          <LinearGradient
            colors={!canPay || busy ? ["#B8A4AE", "#9A8A94"] : [c.pink, "#D45A78"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cta}
          >
            {busy ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Icon name="lock-closed-outline" size={18} color="#FFF" />
                <Text style={styles.ctaText}>
                  {paymentMethod === "cod" ? "Place COD order" : "Continue to Payment"}
                </Text>
                <Icon name="chevron-forward" size={18} color="#FFF" />
              </>
            )}
          </LinearGradient>
        </FloatPress>

        <View style={styles.secureRow}>
          <Icon name="shield-checkmark" size={14} color={c.success} />
          <Text style={[styles.secureText, { color: c.muted }]}>Secure payments · 100% safe & trusted</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function SectionCard({
  icon,
  title,
  children,
  c,
}: {
  icon: string;
  title: string;
  children: ReactNode;
  c: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={[styles.sectionCard, { backgroundColor: "#FFFFFF", borderColor: c.border }]}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionIcon, { backgroundColor: c.blushSoft }]}>
          <Icon name={icon} size={18} color={c.pink} />
        </View>
        <Text style={[styles.sectionTitle, { color: c.ink }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function SummaryLine({ label, value }: { label: string; value: number }) {
  const c = useThemeColors();
  return (
    <View style={styles.summaryLine}>
      <Text style={[styles.summaryLabel, { color: c.muted }]}>{label}</Text>
      <Text style={[styles.summaryVal, { color: c.ink }]}>{money(value)}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: "default" | "phone-pad" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  const c = useThemeColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      <TextInput
        style={[styles.input, { borderColor: c.border, backgroundColor: c.cream, color: c.ink }]}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={c.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { gap: 14, flexGrow: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    shadowColor: "#6A849C",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15 },
  addrName: { fontFamily: fonts.bold, fontSize: 15 },
  addrLine: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, marginTop: 4 },
  changeLink: { fontFamily: fonts.bold, fontSize: 13, marginTop: 6 },
  addrPick: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 2,
  },
  addrPickRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  form: {
    borderRadius: 20,
    borderWidth: 1,
    padding: space.md,
    gap: space.sm,
    shadowColor: "#6A849C",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  label: { fontSize: 12, fontFamily: fonts.medium },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: space.md,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: fonts.body,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
    minHeight: 76,
    textAlignVertical: "top",
    backgroundColor: "#F3F6FA",
  },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    backgroundColor: "#FFFFFF",
    shadowColor: "#6A849C",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  toggleSub: { fontFamily: fonts.body, fontSize: 12, marginTop: 2, lineHeight: 17 },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "48%",
    flexGrow: 1,
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  slotText: { fontFamily: fonts.bold, fontSize: 12 },
  payGrid: { gap: 8 },
  payChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  payIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  payChipText: { flex: 1, fontFamily: fonts.bold, fontSize: 13 },
  hint: { fontSize: 12, fontFamily: fonts.body, lineHeight: 17 },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    shadowColor: "#6A849C",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  summaryHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  summaryLine: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontFamily: fonts.body, fontSize: 14 },
  summaryVal: { fontFamily: fonts.medium, fontSize: 14 },
  dashed: { borderBottomWidth: 1, borderStyle: "dashed", marginVertical: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontFamily: fonts.bold, fontSize: 16 },
  totalValue: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.5 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 18,
    paddingVertical: 16,
    shadowColor: "#E9748E",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  ctaText: { color: "#FFF", fontFamily: fonts.bold, fontSize: 16 },
  secureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  secureText: { fontFamily: fonts.body, fontSize: 12 },
});

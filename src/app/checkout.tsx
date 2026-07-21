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

import { FadeIn } from "@/components/FadeIn";
import { Banner } from "@/components/ui/Banner";
import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Icon } from "@/components/ui/Icon";
import { Screen } from "@/components/ui/Screen";
import { useApp } from "@/context/app";
import { useThemeColors } from "@/context/theme";
import { api, DEFAULT_DELIVERY_COORDS, getStoredUser } from "@/lib/api";
import type { AddressIn, CheckoutIn } from "@/lib/api-client";
import { float, fonts, radius, space } from "@/lib/theme";
import { money, type Address } from "@/lib/types";

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function formatSlot(s: string) {
  return s.replace("-", " – ");
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
  const { refreshCart } = useApp();
  const user = getStoredUser();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(tomorrowISO());
  const [phone, setPhone] = useState(user?.phone || "");
  const [instructions, setInstructions] = useState("");
  const [contactless, setContactless] = useState(false);
  const [methods, setMethods] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [walletBalance, setWalletBalance] = useState(0);
  const [upiId, setUpiId] = useState("");
  const [cartTotal, setCartTotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [coords, setCoords] = useState(DEFAULT_DELIVERY_COORDS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({
    full_name: user?.name || "",
    phone: user?.phone || "",
    line1: "",
    pincode: "",
    city: "",
    state: "",
  });
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
  }, []);

  const loadCheckout = useCallback(async () => {
    setError(null);
    try {
      const [addrs, pay, cart, wallet, settings] = await Promise.all([
        api.customer.addresses(),
        api.payments.methods(),
        api.customer.cart(),
        api.customer.wallet().catch(() => ({ balance: 0 })),
        api.customer.settings().catch(() => ({ delivery_slots: [] as string[] })),
      ]);

      applyAddresses(addrs, selectedIdRef.current);

      const balance = Number((wallet as { balance?: number }).balance || 0);
      setWalletBalance(balance);

      const deliverySlots = Array.isArray(settings?.delivery_slots)
        ? settings.delivery_slots.filter(Boolean)
        : [];
      setSlots(deliverySlots);
      setSlot((prev) => (prev && deliverySlots.includes(prev) ? prev : deliverySlots[0] || ""));
      if (settings?.latitude != null && settings?.longitude != null) {
        setCoords({ latitude: Number(settings.latitude), longitude: Number(settings.longitude) });
      }

      const m = (pay.methods || []).filter(Boolean);
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
                : withWallet.includes("upi")
                  ? "upi"
                  : withWallet[0]
        );
      }
      if (pay.upi_id) setUpiId(pay.upi_id);
      else if (settings?.upi_id) setUpiId(String(settings.upi_id));

      const cartData = cart as { final_total?: number; items?: unknown[] };
      setCartTotal(Number(cartData.final_total || 0));
      setItemCount((cartData.items || []).length);
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
    newAddr.line1.trim().length > 0 &&
    newAddr.pincode.trim().length >= 6;

  const canPay = useMemo(
    () =>
      phone.trim().length >= 10 &&
      Boolean(slot) &&
      Boolean(paymentMethod) &&
      (showNewAddress ? newAddrReady : selectedId != null),
    [phone, slot, paymentMethod, showNewAddress, newAddrReady, selectedId]
  );

  async function createAddress(): Promise<number> {
    const body: AddressIn = {
      ...newAddr,
      label: "Home",
      is_default: true,
      latitude: coords.latitude,
      longitude: coords.longitude,
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
      if (showNewAddress || !addressId) {
        if (!newAddrReady) {
          setError("Select a delivery address or fill name, line, and pincode");
          return;
        }
        addressId = await createAddress();
      }

      const body: CheckoutIn = {
        address_id: addressId,
        delivery_date: deliveryDate,
        delivery_slot: slot,
        customer_phone: phone.trim(),
        delivery_instructions: instructions.trim() || null,
        contactless,
        payment_method: paymentMethod,
      };

      const { order } = await api.customer.checkout(body);

      if (paymentMethod === "razorpay") {
        const rz = await api.payments.razorpayCreate(order.id);
        const url = rz.short_url || rz.payment_link?.short_url;
        if (url) await WebBrowser.openBrowserAsync(url);
      } else if (paymentMethod !== "cod" && paymentMethod !== "wallet") {
        await api.customer.confirmPayment({
          order_id: order.id,
          method: paymentMethod,
          upi_id: paymentMethod.includes("upi") ? upiId || undefined : undefined,
          simulate_failure: false,
        });
      }

      await refreshCart();
      const amount = String(
        (order as { final_amount?: number; total_amount?: number }).final_amount ??
          (order as { total_amount?: number }).total_amount ??
          ""
      );
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
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TitleFlourish title="Checkout" subtitle="Delivery & payment" />

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
              <Text style={[styles.changeLink, { color: c.coral, marginTop: 0 }]}>
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
            <View style={[styles.form, float, { backgroundColor: c.paper, borderColor: c.border }]}>
              <Text style={[styles.sectionTitle, { color: c.ink }]}>New address</Text>
              <Field label="Full name" value={newAddr.full_name} onChange={(v) => setNewAddr((s) => ({ ...s, full_name: v }))} />
              <Field label="Phone" value={newAddr.phone} onChange={(v) => setNewAddr((s) => ({ ...s, phone: v }))} keyboardType="phone-pad" />
              <Field label="Address line" value={newAddr.line1} onChange={(v) => setNewAddr((s) => ({ ...s, line1: v }))} />
              <Field label="Pincode" value={newAddr.pincode} onChange={(v) => setNewAddr((s) => ({ ...s, pincode: v }))} keyboardType="number-pad" />
              <Field label="City" value={newAddr.city} onChange={(v) => setNewAddr((s) => ({ ...s, city: v }))} />
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
              <View style={styles.chips}>
                {slots.map((s) => (
                  <FloatPress
                    key={s}
                    style={[
                      styles.chip,
                      { borderColor: c.border, backgroundColor: c.paper },
                      slot === s && { borderColor: c.coral, backgroundColor: c.blushSoft },
                    ]}
                    onPress={() => setSlot(s)}
                  >
                    <Text style={[styles.chipText, { color: c.cocoa }, slot === s && { color: c.ink }]}>
                      {formatSlot(s)}
                    </Text>
                    {slot === s ? <Icon name="checkmark" size={14} color={c.coral} /> : null}
                  </FloatPress>
                ))}
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
              style={[styles.textArea, { borderColor: c.border, backgroundColor: c.paper, color: c.ink }]}
              value={instructions}
              onChangeText={setInstructions}
              placeholder="Add instructions for safe delivery…"
              placeholderTextColor={c.muted}
              multiline
            />
          </SectionCard>

          <View style={[styles.toggleCard, float, { backgroundColor: c.paper, borderColor: c.border }]}>
            <View style={[styles.sectionIcon, { backgroundColor: c.blushSoft }]}>
              <Icon name="shield-checkmark-outline" size={18} color={c.coral} />
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
            <View style={styles.chips}>
              {methods.map((m) => (
                <FloatPress
                  key={m}
                  style={[
                    styles.chip,
                    { borderColor: c.border, backgroundColor: c.paper },
                    paymentMethod === m && { borderColor: c.chocolate, backgroundColor: c.chocolate },
                  ]}
                  onPress={() => setPaymentMethod(m)}
                >
                  {m === "wallet" ? <Icon name="wallet-outline" size={14} color={paymentMethod === m ? "#FFF" : c.ink} /> : null}
                  <Text
                    style={[
                      styles.chipText,
                      { color: c.cocoa },
                      paymentMethod === m && { color: "#FFF" },
                    ]}
                  >
                    {m === "wallet" ? `Wallet (${money(walletBalance)})` : m.replace(/_/g, " ")}
                  </Text>
                </FloatPress>
              ))}
            </View>
            {paymentMethod === "wallet" && walletBalance < cartTotal ? (
              <Text style={[styles.hint, { color: c.danger }]}>
                Insufficient wallet balance. Choose another method or top up.
              </Text>
            ) : null}
            {paymentMethod.includes("upi") && paymentMethod !== "razorpay" ? (
              <Field label="UPI ID" value={upiId} onChange={setUpiId} autoCapitalize="none" />
            ) : null}
            {paymentMethod === "razorpay" ? (
              <Text style={[styles.hint, { color: c.muted }]}>
                Razorpay opens a secure payment page after you place the order.
              </Text>
            ) : null}
          </SectionCard>

          <View style={[styles.summaryCard, float, { backgroundColor: c.paper, borderColor: c.border }]}>
            <View style={styles.summaryHead}>
              <View style={[styles.sectionIcon, { backgroundColor: c.blushSoft }]}>
                <Icon name="bag-handle-outline" size={18} color={c.coral} />
              </View>
              <Text style={[styles.sectionTitle, { color: c.ink }]}>Order Summary</Text>
            </View>
            <SummaryLine label={`Subtotal (${itemCount} items)`} value={cartTotal} />
            <View style={[styles.dashed, { borderColor: c.border }]} />
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: c.ink }]}>Total Amount</Text>
              <Text style={[styles.totalValue, { color: c.ink }]}>{money(cartTotal)}</Text>
            </View>
          </View>
        </FadeIn>

        {error ? <Banner text={error} tone="danger" /> : null}

        <FloatPress onPress={placeOrder} disabled={!canPay || busy || (paymentMethod === "wallet" && walletBalance < cartTotal)}>
          <LinearGradient
            colors={!canPay || busy ? [c.muted, c.cocoa] : [c.chocolate, c.inkSoft]}
            style={styles.cta}
          >
            {busy ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Icon name="lock-closed-outline" size={18} color="#FFF" />
                <Text style={styles.ctaText}>Continue to Payment</Text>
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
    <View style={[styles.sectionCard, float, { backgroundColor: c.paper, borderColor: c.border }]}>
      <View style={styles.sectionHead}>
        <View style={[styles.sectionIcon, { backgroundColor: c.blushSoft }]}>
          <Icon name={icon} size={18} color={c.coral} />
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
        style={[styles.input, { borderColor: c.border, backgroundColor: c.paper, color: c.ink }]}
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
  content: { gap: space.md, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
    gap: space.sm,
  },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 15 },
  addrName: { fontFamily: fonts.bold, fontSize: 15 },
  addrLine: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, marginTop: 4 },
  changeLink: { fontFamily: fonts.bold, fontSize: 13, marginTop: 6 },
  addrPick: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.sm,
    gap: 2,
  },
  addrPickRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  form: { borderRadius: radius.lg, borderWidth: 1, padding: space.md, gap: space.sm },
  label: { fontSize: 13, fontFamily: fonts.medium },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.body,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 12,
    fontFamily: fonts.body,
    minHeight: 72,
    textAlignVertical: "top",
  },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.md,
  },
  toggleSub: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipText: { fontFamily: fonts.bold, textTransform: "capitalize", fontSize: 12 },
  hint: { fontSize: 12, fontFamily: fonts.body },
  summaryCard: { borderRadius: radius.lg, borderWidth: 1, padding: space.md, gap: 8 },
  summaryHead: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  summaryLine: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontFamily: fonts.body, fontSize: 14 },
  summaryVal: { fontFamily: fonts.medium, fontSize: 14 },
  dashed: { borderBottomWidth: 1, borderStyle: "dashed", marginVertical: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { fontFamily: fonts.bold, fontSize: 16 },
  totalValue: { fontFamily: fonts.display, fontSize: 26 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: radius.lg,
    paddingVertical: 16,
  },
  ctaText: { color: "#FFF", fontFamily: fonts.bold, fontSize: 16 },
  secureRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  secureText: { fontFamily: fonts.body, fontSize: 12 },
});

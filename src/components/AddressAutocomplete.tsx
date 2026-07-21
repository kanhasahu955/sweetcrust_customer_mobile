import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";

import {
  hasCoords,
  lookupPincode,
  newSessionToken,
  resolvePlace,
  reverseGeocode,
  suggestAddresses,
  type AddressDetails,
  type AddressSuggestion,
} from "@/lib/address";
import { colors } from "@/lib/theme";

type Props = {
  value: AddressDetails | null;
  onChange: (next: AddressDetails) => void;
  onError?: (msg: string) => void;
};

export function AddressAutocomplete({ value, onChange, onError }: Props) {
  const [query, setQuery] = useState(value?.address_line || "");
  const [hits, setHits] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSuggest = useRef(false);
  const sessionToken = useRef(newSessionToken());

  const draft = {
    address_line: value?.address_line || "",
    village: value?.village || "",
    area: value?.area || "",
    city: value?.city || "",
    state: value?.state || "",
    pincode: value?.pincode || "",
    zone: value?.zone || "",
    latitude: value?.latitude,
    longitude: value?.longitude,
  };

  async function applySuggestion(s: AddressSuggestion) {
    if (!s.place_id) {
      onError?.("Invalid place — try another suggestion");
      return;
    }
    setResolving(true);
    try {
      const details = await resolvePlace(s.place_id, sessionToken.current);
      sessionToken.current = newSessionToken(); // end Google billing session
      if (!details) {
        onError?.("Could not load place details");
        return;
      }
      skipSuggest.current = true;
      setQuery(details.label || details.address_line || s.label);
      setHits([]);
      onChange(details);
    } catch {
      onError?.("Google place lookup failed");
    } finally {
      setResolving(false);
    }
  }

  function patchField(key: keyof AddressDetails, text: string) {
    const next = {
      latitude: value?.latitude ?? 0,
      longitude: value?.longitude ?? 0,
      address_line: draft.address_line,
      village: draft.village,
      area: draft.area,
      city: draft.city,
      state: draft.state,
      pincode: draft.pincode,
      zone: draft.zone,
      place_id: value?.place_id,
      [key]: text,
    } as AddressDetails;
    onChange(next);
    if (key === "pincode") {
      const digits = text.replace(/\D/g, "");
      if (digits.length === 6) void fillFromPincode(digits, next);
    }
  }

  async function fillFromPincode(pin: string, base: AddressDetails) {
    setPinBusy(true);
    try {
      const data = await lookupPincode(pin);
      if (!data) {
        onError?.("Pincode not found");
        return;
      }
      if (data.latitude == null || data.longitude == null) {
        onError?.("Pincode found — pick a suggestion or GPS for map pin");
        onChange({
          ...base,
          address_line: base.address_line || data.address_line || "",
          village: data.village || base.village,
          area: data.area || base.area,
          city: data.city || base.city,
          state: data.state || base.state,
          pincode: pin,
          zone: data.zone || base.zone,
        });
        return;
      }
      skipSuggest.current = true;
      setQuery(data.address_line || data.label || pin);
      onChange({
        latitude: data.latitude,
        longitude: data.longitude,
        address_line: base.address_line || data.address_line || "",
        village: data.village || base.village,
        area: data.area || base.area,
        city: data.city || base.city,
        state: data.state || base.state,
        pincode: pin,
        zone: data.zone || base.zone,
        place_id: data.place_id,
      });
    } catch {
      onError?.("Pincode lookup failed");
    } finally {
      setPinBusy(false);
    }
  }

  useEffect(() => {
    if (skipSuggest.current) {
      skipSuggest.current = false;
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        setHits(await suggestAddresses(q, sessionToken.current));
      } catch {
        setHits([]);
        onError?.("Address search failed — check API / Google Maps key");
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, onError]);

  async function useGps() {
    setGpsBusy(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        onError?.("Location permission needed");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const details = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
      if (!details) {
        onError?.("Google reverse geocode failed");
        return;
      }
      skipSuggest.current = true;
      setQuery(details.address_line || details.label || "");
      setHits([]);
      onChange(details);
    } catch {
      onError?.("Could not read GPS");
    } finally {
      setGpsBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Search address</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.input, styles.search]}
          value={query}
          onChangeText={setQuery}
          placeholder="Village, road, landmark…"
          placeholderTextColor={colors.muted}
          autoCorrect={false}
        />
        {(searching || pinBusy || resolving) && (
          <ActivityIndicator style={styles.spinner} color={colors.honey} />
        )}
      </View>

      {hits.length > 0 ? (
        <View style={styles.dropdown}>
          {hits.map((h) => (
            <Pressable key={h.place_id || h.label} style={styles.hit} onPress={() => applySuggestion(h)}>
              <Text style={styles.hitTitle} numberOfLines={2}>
                {h.label}
              </Text>
              <Text style={styles.hitMeta}>
                {[h.city, h.state].filter(Boolean).join(" · ") || "Tap to fill details"}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable style={styles.gpsBtn} onPress={useGps} disabled={gpsBusy || resolving}>
        {gpsBusy ? (
          <ActivityIndicator color={colors.chocolate} />
        ) : (
          <Text style={styles.gpsText}>Use current location</Text>
        )}
      </Pressable>

      <Text style={styles.hint}>Powered by Google — select a suggestion to fill city, pincode & pin</Text>

      <Field label="Street / line" value={draft.address_line} onChange={(t) => patchField("address_line", t)} />
      <View style={styles.row}>
        <View style={styles.half}>
          <Field label="Village / locality" value={draft.village} onChange={(t) => patchField("village", t)} />
        </View>
        <View style={styles.half}>
          <Field label="Area" value={draft.area} onChange={(t) => patchField("area", t)} />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <Field label="City" value={draft.city} onChange={(t) => patchField("city", t)} />
        </View>
        <View style={styles.half}>
          <Field
            label="Pincode"
            value={draft.pincode}
            onChange={(t) => patchField("pincode", t.replace(/\D/g, "").slice(0, 6))}
            keyboard="number-pad"
            maxLength={6}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <Field label="State" value={draft.state} onChange={(t) => patchField("state", t)} />
        </View>
        <View style={styles.half}>
          <Field label="Zone" value={draft.zone} onChange={(t) => patchField("zone", t)} />
        </View>
      </View>

      {hasCoords(value) ? (
        <Text style={styles.coords}>
          Pin {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
        </Text>
      ) : (
        <Text style={styles.warn}>Pick a suggestion or GPS so the map pin is set</Text>
      )}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboard,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  keyboard?: "default" | "number-pad";
  maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={colors.muted}
        keyboardType={keyboard || "default"}
        maxLength={maxLength}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  label: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: colors.cocoa,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  searchRow: { position: "relative" },
  search: { paddingRight: 36 },
  spinner: { position: "absolute", right: 12, top: 14 },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.paper,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.chocolate,
  },
  dropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.paper,
    overflow: "hidden",
  },
  hit: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  hitTitle: { fontSize: 14, fontWeight: "600", color: colors.chocolate },
  hitMeta: { marginTop: 2, fontSize: 12, color: colors.muted },
  gpsBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.honey,
    backgroundColor: colors.honeySoft,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  gpsText: { fontWeight: "700", color: colors.chocolate },
  hint: { marginTop: 6, fontSize: 12, color: colors.muted, lineHeight: 18 },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  field: {},
  coords: { marginTop: 8, fontSize: 12, color: colors.cocoa },
  warn: { marginTop: 8, fontSize: 12, color: colors.danger },
});

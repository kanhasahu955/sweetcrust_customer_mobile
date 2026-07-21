import { api } from "./api";

export type AddressDetails = {
  latitude: number;
  longitude: number;
  address_line: string;
  label?: string;
  village?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  zone?: string;
  place_id?: string;
};

export type AddressSuggestion = {
  place_id: string;
  label: string;
  address_line?: string;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  village?: string | null;
  area?: string | null;
  pincode?: string | null;
  zone?: string | null;
};

function newSessionToken() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function suggestAddresses(q: string, sessionToken?: string): Promise<AddressSuggestion[]> {
  const rows = await api.geo.suggest(q, 6, sessionToken);
  return Array.isArray(rows) ? (rows as AddressSuggestion[]) : [];
}

export async function resolvePlace(
  placeId: string,
  sessionToken?: string
): Promise<AddressDetails | null> {
  const data = (await api.geo.place(placeId, sessionToken)) as Partial<AddressDetails>;
  if (data.latitude == null || data.longitude == null) return null;
  return data as AddressDetails;
}

export async function reverseGeocode(lat: number, lng: number): Promise<AddressDetails | null> {
  const data = (await api.geo.reverse(lat, lng)) as Partial<AddressDetails>;
  if (data.latitude == null || data.longitude == null) return null;
  return data as AddressDetails;
}

export async function lookupPincode(pin: string): Promise<(AddressSuggestion & AddressDetails & { ok?: boolean }) | null> {
  const data = (await api.geo.pincode(pin)) as AddressDetails & { ok?: boolean; label?: string };
  if (!data?.ok) return null;
  return data as AddressSuggestion & AddressDetails & { ok?: boolean };
}

/** Ensure lat/lng present — required for retailer register. */
export function hasCoords(a: Partial<AddressDetails> | null | undefined): a is AddressDetails {
  return (
    !!a &&
    typeof a.latitude === "number" &&
    typeof a.longitude === "number" &&
    !Number.isNaN(a.latitude) &&
    !Number.isNaN(a.longitude)
  );
}

export { newSessionToken };

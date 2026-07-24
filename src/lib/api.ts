import AsyncStorage from "@react-native-async-storage/async-storage";

import { createApiClient, type TokenPair, type TokenStore } from "./api-client";
import type { AuthUser } from "./types";

const ACCESS_KEY = "sc_access_token";
const REFRESH_KEY = "sc_refresh_token";
const USER_KEY = "sc_user";

type StoredUser = AuthUser;

let memoryAccess: string | null = null;
let memoryRefresh: string | null = null;
let memoryUser: StoredUser | null = null;
let hydrated = false;

/** In-memory fallback when AsyncStorage native module is unavailable (Expo Go edge cases). */
const memStore = new Map<string, string>();

async function storageGet(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return memStore.get(key) ?? null;
  }
}

async function storageSet(key: string, value: string): Promise<void> {
  memStore.set(key, value);
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    /* memory only */
  }
}

async function storageRemove(key: string): Promise<void> {
  memStore.delete(key);
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

const tokenStore: TokenStore = {
  getAccess: () => memoryAccess,
  getRefresh: () => memoryRefresh,
  setTokens: async (access, refresh) => {
    memoryAccess = access;
    memoryRefresh = refresh;
    await Promise.all([storageSet(ACCESS_KEY, access), storageSet(REFRESH_KEY, refresh)]);
  },
  clear: async () => {
    memoryAccess = null;
    memoryRefresh = null;
    memoryUser = null;
    await Promise.all([storageRemove(ACCESS_KEY), storageRemove(REFRESH_KEY), storageRemove(USER_KEY)]);
  },
};

export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:8080",
  tokenStore,
});

export async function hydrateSession() {
  if (hydrated) return Boolean(memoryAccess);
  try {
    const [access, refresh, userRaw] = await Promise.all([
      storageGet(ACCESS_KEY),
      storageGet(REFRESH_KEY),
      storageGet(USER_KEY),
    ]);
    memoryAccess = access;
    memoryRefresh = refresh;
    if (userRaw) {
      try {
        memoryUser = JSON.parse(userRaw) as StoredUser;
      } catch {
        memoryUser = null;
      }
    }
  } catch {
    memoryAccess = null;
    memoryRefresh = null;
    memoryUser = null;
  }
  hydrated = true;
  return Boolean(memoryAccess);
}

/** Alias for AppProvider boot — same as hydrateSession. */
export async function restoreSession() {
  return hydrateSession();
}

export async function persistLogin(tokens: TokenPair) {
  await tokenStore.setTokens(tokens.access_token, tokens.refresh_token);
  if (tokens.user) {
    memoryUser = tokens.user as StoredUser;
    await storageSet(USER_KEY, JSON.stringify(tokens.user));
  }
}

export async function updateStoredUser(user: StoredUser) {
  memoryUser = user;
  await storageSet(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  try {
    await api.auth.logout(memoryRefresh || undefined);
  } catch {
    /* ignore */
  }
  await tokenStore.clear();
}

export function hasSession() {
  return Boolean(memoryAccess);
}

export function getStoredUser() {
  return memoryUser;
}

/** Normalize IN mobile → +91XXXXXXXXXX (matches backend). */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (phone.trim().startsWith("+")) return phone.trim();
  return digits ? `+${digits}` : phone.trim();
}

/** Real mobile (not guest +91GUEST… placeholders). Razorpay contact needs 8–14 digits. */
export function isRealMobile(phone: string): boolean {
  const raw = String(phone || "").trim();
  if (!raw || /GUEST/i.test(raw)) return false;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return true;
  if (digits.length === 12 && digits.startsWith("91")) return true;
  return digits.length >= 8 && digits.length <= 14;
}

/** Bakery-area default used when the app has no map picker yet. */
export const DEFAULT_DELIVERY_COORDS = {
  latitude: 19.1197,
  longitude: 72.8468,
};

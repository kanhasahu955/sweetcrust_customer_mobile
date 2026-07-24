import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as Location from "expo-location";

import { DEFAULT_DELIVERY_COORDS, api } from "@/lib/api";
import { climateFallback, loadClimate, type ClimateMood } from "@/lib/climate";

type Coords = { latitude: number; longitude: number };

type ClimateCtx = {
  mood: ClimateMood;
  coords: Coords;
  /** Re-fetch weather for the current coords. */
  refreshClimate: () => Promise<void>;
  /** Prefer default saved address coords, then GPS, then bakery default. */
  syncFromAddresses: () => Promise<void>;
  /** Point climate at an explicit pin (e.g. just-saved address). */
  setClimateCoords: (latitude: number, longitude: number) => Promise<void>;
};

const Ctx = createContext<ClimateCtx | null>(null);

function asAddressList(rows: unknown): {
  is_default?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}[] {
  if (Array.isArray(rows)) return rows;
  if (rows && typeof rows === "object") {
    const o = rows as { items?: unknown; addresses?: unknown };
    if (Array.isArray(o.items)) return o.items as never[];
    if (Array.isArray(o.addresses)) return o.addresses as never[];
  }
  return [];
}

export function ClimateProvider({ children }: { children: ReactNode }) {
  const [mood, setMood] = useState<ClimateMood>(() => climateFallback());
  const [coords, setCoords] = useState<Coords>(DEFAULT_DELIVERY_COORDS);
  const coordsRef = useRef(DEFAULT_DELIVERY_COORDS);

  const applyCoords = useCallback(async (next: Coords) => {
    coordsRef.current = next;
    setCoords(next);
    setMood(await loadClimate(next.latitude, next.longitude));
  }, []);

  const refreshClimate = useCallback(async () => {
    setMood(await loadClimate(coordsRef.current.latitude, coordsRef.current.longitude));
  }, []);

  const setClimateCoords = useCallback(
    async (latitude: number, longitude: number) => {
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
      await applyCoords({ latitude, longitude });
    },
    [applyCoords],
  );

  const syncFromAddresses = useCallback(async () => {
    try {
      const rows = await api.customer.addresses();
      const list = asAddressList(rows);
      const def = list.find((a) => a.is_default) || list[0];
      if (def?.latitude != null && def?.longitude != null) {
        await applyCoords({
          latitude: Number(def.latitude),
          longitude: Number(def.longitude),
        });
        return;
      }
    } catch {
      /* try GPS below */
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        await applyCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        return;
      }
    } catch {
      /* keep default */
    }

    await applyCoords(DEFAULT_DELIVERY_COORDS);
  }, [applyCoords]);

  useEffect(() => {
    void syncFromAddresses();
    const id = setInterval(() => {
      void refreshClimate();
    }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [syncFromAddresses, refreshClimate]);

  const value = useMemo(
    () => ({ mood, coords, refreshClimate, syncFromAddresses, setClimateCoords }),
    [mood, coords, refreshClimate, syncFromAddresses, setClimateCoords],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useClimate() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useClimate outside ClimateProvider");
  return ctx;
}

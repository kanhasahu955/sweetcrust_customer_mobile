import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { colors as lightColors, darkColors, type ThemeColors } from "@/lib/theme";

const KEY = "sc_dark";

type ThemeCtx = {
  dark: boolean;
  colors: ThemeColors;
  setDark: (v: boolean) => Promise<void>;
  toggleDark: () => Promise<void>;
};

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDarkState] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setDarkState(v === "1"))
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const setDark = useCallback(async (v: boolean) => {
    setDarkState(v);
    await AsyncStorage.setItem(KEY, v ? "1" : "0");
  }, []);

  const toggleDark = useCallback(async () => {
    await setDark(!dark);
  }, [dark, setDark]);

  const value = useMemo(
    () => ({
      dark,
      colors: (dark ? darkColors : lightColors) as ThemeColors,
      setDark,
      toggleDark,
    }),
    [dark, setDark, toggleDark]
  );

  // Always render; dark flips once storage loads
  void ready;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme outside ThemeProvider");
  return ctx;
}

/** Safe for components that may render before provider (returns light). */
export function useThemeColors(): ThemeColors {
  const ctx = useContext(Ctx);
  return ctx?.colors ?? lightColors;
}

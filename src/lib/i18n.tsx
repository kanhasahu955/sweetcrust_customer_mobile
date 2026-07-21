import { useCallback, useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { I18nextProvider, initReactI18next, useTranslation } from "react-i18next";

import { api } from "@/lib/api";
import en from "@/locales/en.json";
import hi from "@/locales/hi.json";
import or from "@/locales/or.json";

/** English · Hindi · Odia */
export type Lang = "en" | "hi" | "or";

const KEY = "sc_lang";
const SUPPORTED: Lang[] = ["en", "hi", "or"];

function normalizeLang(v: string | null | undefined): Lang | null {
  if (!v) return null;
  const base = v.toLowerCase().split("-")[0];
  if (base === "en" || base === "hi" || base === "or") return base;
  if (base === "od") return "or"; // ISO sometimes uses od
  if (base === "kn") return "or"; // legacy
  return null;
}

function deviceLang(): Lang {
  const tag = Localization.getLocales()?.[0]?.languageCode;
  return normalizeLang(tag) || "en";
}

let ready: Promise<void> | null = null;

export function initI18n() {
  if (!ready) {
    ready = (async () => {
      const stored = await AsyncStorage.getItem(KEY).catch(() => null);
      const lng = normalizeLang(stored) || deviceLang();

      if (!i18n.isInitialized) {
        await i18n.use(initReactI18next).init({
          compatibilityJSON: "v4",
          resources: {
            en: { translation: en },
            hi: { translation: hi },
            or: { translation: or },
          },
          lng,
          fallbackLng: "en",
          supportedLngs: SUPPORTED,
          interpolation: { escapeValue: false },
          returnNull: false,
        });
      } else {
        await i18n.changeLanguage(lng);
      }
    })();
  }
  return ready;
}

// Kick off ASAP for Expo Router
void initI18n();

export async function setAppLanguage(lang: Lang) {
  await initI18n();
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(KEY, lang).catch(() => undefined);
  api.auth.updateMe({ language: lang }).catch(() => undefined);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [booted, setBooted] = useState(i18n.isInitialized);

  useEffect(() => {
    void initI18n().finally(() => setBooted(true));
  }, []);

  if (!booted) return null;
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

/** App-wide hook — wraps react-i18next. */
export function useI18n() {
  const { t: tRaw, i18n: i18nInst } = useTranslation();
  const lang = (normalizeLang(i18nInst.language) || "en") as Lang;

  const t = useCallback((k: string) => String(tRaw(k)), [tRaw]);

  const setLang = useCallback((l: Lang) => {
    void setAppLanguage(l);
  }, []);

  return { lang, t, setLang, i18n: i18nInst };
}

export { i18n };

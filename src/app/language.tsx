import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { BrandHeader, TitleFlourish } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Screen } from "@/components/ui/Screen";
import { useThemeColors } from "@/context/theme";
import { useI18n, type Lang } from "@/lib/i18n";
import { fonts, radius, space } from "@/lib/theme";

const OPTIONS: { id: Lang; labelKey: "langEn" | "langHi" | "langOr"; native: string }[] = [
  { id: "en", labelKey: "langEn", native: "English" },
  { id: "hi", labelKey: "langHi", native: "हिन्दी" },
  { id: "or", labelKey: "langOr", native: "ଓଡ଼ିଆ" },
];

const PREVIEW: Record<Lang, string> = {
  en: "Freshly baked happiness, just for you!",
  hi: "ताज़ी बेकरी खुशियाँ, सिर्फ़ आपके लिए!",
  or: "ତାଜା ବେକରି ଖୁସି, କେବଳ ଆପଣଙ୍କ ପାଇଁ!",
};

export default function LanguageScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { lang, setLang, t } = useI18n();
  const [picked, setPicked] = useState<Lang>(lang);

  function apply() {
    setLang(picked);
    router.back();
  }

  return (
    <Screen>
      <BrandHeader left="back" right="none" />
      <TitleFlourish title={t("language")} subtitle={t("chooseLanguage")} />

      <View style={styles.list}>
        {OPTIONS.map((opt) => {
          const on = picked === opt.id;
          return (
            <FloatPress
              key={opt.id}
              style={[
                styles.row,
                { backgroundColor: c.paper, borderColor: c.border },
                on && { borderColor: c.pink, backgroundColor: c.blushSoft },
              ]}
              onPress={() => setPicked(opt.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.native, { color: c.ink }]}>{opt.native}</Text>
                <Text style={[styles.label, { color: c.muted }]}>{t(opt.labelKey)}</Text>
              </View>
              <View style={[styles.radio, { borderColor: c.border }, on && { borderColor: c.pink }]}>
                {on ? <View style={[styles.radioDot, { backgroundColor: c.pink }]} /> : null}
              </View>
            </FloatPress>
          );
        })}
      </View>

      <View style={[styles.preview, { backgroundColor: c.blushSoft, borderColor: c.blush }]}>
        <Text style={[styles.previewLabel, { color: c.pink }]}>{t("preview")}</Text>
        <Text style={[styles.previewText, { color: c.ink }]}>{PREVIEW[picked]}</Text>
      </View>

      <FloatPress style={[styles.cta, { backgroundColor: c.chocolate }]} onPress={apply}>
        <Text style={styles.ctaText}>{t("apply")}</Text>
      </FloatPress>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: space.sm, marginTop: space.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1.5,
  },
  native: { fontFamily: fonts.display, fontSize: 20 },
  label: { fontFamily: fonts.body, marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 12, height: 12, borderRadius: 6 },
  preview: {
    marginTop: space.xl,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
  },
  previewLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  previewText: {
    fontFamily: fonts.display,
    fontSize: 18,
    marginTop: 8,
    lineHeight: 26,
  },
  cta: {
    marginTop: "auto",
    marginBottom: space.lg,
    borderRadius: radius.lg,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaText: { fontFamily: fonts.bold, color: "#FFF", fontSize: 16 },
});

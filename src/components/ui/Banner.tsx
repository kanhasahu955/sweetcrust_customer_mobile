import { StyleSheet, Text, View } from "react-native";

import { colors, fonts, radius, space } from "@/lib/theme";

type Tone = "info" | "warn" | "danger" | "ok";

const tones: Record<Tone, { bg: string; fg: string; border: string }> = {
  info: { bg: colors.sugar, fg: colors.ink, border: colors.saffronSoft },
  warn: { bg: "#FFE4C8", fg: colors.ink, border: colors.ember },
  danger: { bg: "#FDE4E0", fg: colors.danger, border: "#F0A090" },
  ok: { bg: "#E8F5EC", fg: colors.success, border: "#B8DCC4" },
};

export function Banner({ text, tone = "info" }: { text: string; tone?: Tone }) {
  const t = tones[tone];
  return (
    <View style={[styles.box, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={[styles.text, { color: t.fg }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    padding: space.md,
    borderRadius: radius.md,
    marginBottom: space.sm,
    borderWidth: 1,
  },
  text: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
});

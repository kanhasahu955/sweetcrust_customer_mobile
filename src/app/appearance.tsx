import { StyleSheet, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { BrandHeader } from "@/components/ui/BrandHeader";
import { FloatPress } from "@/components/ui/FloatPress";
import { Screen } from "@/components/ui/Screen";
import { useTheme } from "@/context/theme";
import { fonts, radius, space } from "@/lib/theme";

export default function AppearanceScreen() {
  const router = useRouter();
  const { dark, colors: c, setDark } = useTheme();

  return (
    <Screen>
      <BrandHeader left="back" right="none" onLeft={() => router.back()} />
      <Text style={[styles.h1, { color: c.ink }]}>Appearance</Text>
      <Text style={[styles.sub, { color: c.muted }]}>Cream bakery by day, chocolate night</Text>

      <View style={[styles.card, { backgroundColor: c.paper, borderColor: c.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.ink }]}>Dark mode</Text>
          <Text style={[styles.cardSub, { color: c.muted }]}>Applies across the whole app</Text>
        </View>
        <Switch
          value={dark}
          onValueChange={(v) => void setDark(v)}
          trackColor={{ false: c.border, true: c.pink }}
          thumbColor={dark ? "#FFF" : c.muted}
        />
      </View>

      <FloatPress style={[styles.done, { backgroundColor: c.chocolate }]} onPress={() => router.back()}>
        <Text style={styles.doneText}>Done</Text>
      </FloatPress>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontFamily: fonts.display, fontSize: 28, marginTop: space.sm },
  sub: { fontFamily: fonts.body, fontSize: 13, marginBottom: space.lg },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: space.lg,
  },
  title: { fontFamily: fonts.bold, fontSize: 17 },
  cardSub: { fontFamily: fonts.body, fontSize: 13, marginTop: 4 },
  done: {
    marginTop: space.xl,
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneText: { fontFamily: fonts.bold, color: "#FFF", fontSize: 16 },
});

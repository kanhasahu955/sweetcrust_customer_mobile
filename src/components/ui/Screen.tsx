import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useThemeColors } from "@/context/theme";
import { useLayout } from "@/hooks/use-layout";

type Props = {
  children: ReactNode;
  pad?: boolean;
  style?: ViewStyle;
  edges?: ("top" | "right" | "bottom" | "left")[];
  /** @deprecated mockups use flat cream — kept for call-site compat */
  smoky?: boolean;
};

export function Screen({ children, pad = true, style, edges = ["top", "left", "right"] }: Props) {
  const { pagePad } = useLayout();
  const c = useThemeColors();
  return (
    <View style={[styles.root, { backgroundColor: c.cream }, style]}>
      <SafeAreaView style={styles.safe} edges={edges}>
        <View style={[pad && { paddingHorizontal: pagePad }, { flex: 1 }]}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
});

import { Children, isValidElement, type ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandHeader } from "@/components/ui/BrandHeader";
import { SmokeAtmosphere } from "@/components/ui/SmokeAtmosphere";
import { useThemeColors } from "@/context/theme";
import { useLayout } from "@/hooks/use-layout";

type Props = {
  children: ReactNode;
  pad?: boolean;
  style?: ViewStyle;
  edges?: ("top" | "right" | "bottom" | "left")[];
  /** Full-bleed layer behind padded content (overrides default smoke). */
  backdrop?: ReactNode;
  /** Ice-creamy smoky wash — on for every screen unless opted out. */
  smoky?: boolean;
};

function isBleedHeader(child: ReactNode): boolean {
  if (!isValidElement(child)) return false;
  const t = child.type as { bleed?: boolean } | string | number;
  if (t === BrandHeader) return true;
  // Survive Fast Refresh / duplicate module instances
  return typeof t === "function" && (t as { bleed?: boolean }).bleed === true;
}

/**
 * Default skips top inset — climate / BrandHeader own the status-bar pad.
 * BrandHeader sits outside SafeAreaView so the season strip is edge-to-edge;
 * the page body keeps pagePad.
 */
export function Screen({
  children,
  pad = true,
  style,
  edges = ["left", "right"],
  backdrop,
  smoky = true,
}: Props) {
  const { pagePad } = useLayout();
  const c = useThemeColors();

  const headers: ReactNode[] = [];
  const body: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (isBleedHeader(child)) headers.push(child);
    else body.push(child);
  });

  return (
    <View style={[styles.root, { backgroundColor: c.cream }, style]}>
      {backdrop ?? (smoky ? <SmokeAtmosphere /> : null)}
      {/* Outside SafeAreaView — no left/right inset on the climate strip */}
      {headers}
      <SafeAreaView style={styles.safe} edges={edges}>
        <View style={[styles.content, pad && { paddingHorizontal: pagePad }]}>{body}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, zIndex: 1 },
  content: { flex: 1 },
});

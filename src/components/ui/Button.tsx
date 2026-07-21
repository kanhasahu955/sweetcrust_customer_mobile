import { ActivityIndicator, StyleSheet, Text, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { FloatPress } from "@/components/ui/FloatPress";
import { colors, floatHot, fonts, radius } from "@/lib/theme";

type Props = {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  style?: ViewStyle;
};

export function Button({ label, onPress, busy, disabled, variant = "primary", style }: Props) {
  const off = busy || disabled;

  if (variant === "primary") {
    return (
      <FloatPress onPress={onPress} disabled={off} style={[styles.wrap, off && styles.off, style]}>
        <LinearGradient
          colors={off ? ["#8A6A55", "#6A4A38"] : [colors.ember, colors.chili, "#8B1A0A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.base, floatHot]}
        >
          {busy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.labelOn}>{label}</Text>
          )}
        </LinearGradient>
      </FloatPress>
    );
  }

  return (
    <FloatPress
      onPress={onPress}
      disabled={off}
      style={[
        styles.base,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        off && styles.off,
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <Text style={styles.labelOff}>{label}</Text>
      )}
    </FloatPress>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.pill, overflow: "visible" },
  base: {
    borderRadius: radius.pill,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  secondary: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  ghost: { backgroundColor: "transparent" },
  off: { opacity: 0.5 },
  labelOn: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
  labelOff: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
});

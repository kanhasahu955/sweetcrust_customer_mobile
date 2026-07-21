import type { ReactNode } from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";

import { float } from "@/lib/theme";

type Props = {
  children: ReactNode;
  onPress?: () => void | Promise<void>;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  hitSlop?: number | { top?: number; bottom?: number; left?: number; right?: number };
};

/**
 * Pressable with float shadow.
 * Plain Pressable (no Reanimated) — React Compiler freezes refs that break Animated.Pressable.
 */
export function FloatPress({ children, onPress, style, disabled, hitSlop }: Props) {
  return (
    <Pressable
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={() => {
        if (typeof onPress === "function") void onPress();
      }}
      style={({ pressed }) => [
        float,
        style,
        // Opacity only — scale transform on long lists looks like screen shake.
        { opacity: disabled ? 0.55 : pressed ? 0.88 : 1 },
      ]}
    >
      {children}
    </Pressable>
  );
}

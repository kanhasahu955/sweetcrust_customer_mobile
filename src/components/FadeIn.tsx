import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  children: ReactNode;
  delay?: number;
  fromY?: number;
  style?: StyleProp<ViewStyle>;
};

/** Lightweight wrapper (no Reanimated — avoids React Compiler / frozen-ref crashes). */
export function FadeIn({ children, style }: Props) {
  return <View style={style}>{children}</View>;
}

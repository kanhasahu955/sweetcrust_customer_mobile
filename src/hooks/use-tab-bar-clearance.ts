import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Visual height of the floating dock (icons + labels + padding), excluding safe-area. */
export const TAB_BAR_HEIGHT = 60;

/**
 * Space to keep clear above the floating tab bar.
 * Use for scroll paddingBottom and for absolute footer `bottom`.
 */
export function useTabBarClearance(extra = 8) {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + extra;
}

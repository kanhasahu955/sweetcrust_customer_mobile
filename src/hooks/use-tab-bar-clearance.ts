import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Dock content height (icons + labels), excluding home-indicator pad. */
export const TAB_BAR_HEIGHT = 56;

/** Visible wavy crest (fully in-bounds lobes). */
export const TAB_WAVE_HEIGHT = 22;

/**
 * Space to keep clear above the tab dock.
 * Dock is flush to the bottom — safe-area lives inside the bar.
 */
export function useTabBarClearance(extra = 8) {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + TAB_WAVE_HEIGHT + insets.bottom + extra;
}

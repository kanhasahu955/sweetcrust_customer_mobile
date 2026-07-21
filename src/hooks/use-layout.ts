import { useWindowDimensions } from "react-native";

/** Shared responsive layout tokens for phone / large phone. */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const narrow = width < 380;
  const short = height < 720;
  return {
    width,
    height,
    narrow,
    short,
    pagePad: narrow ? 12 : 16,
    bannerH: Math.min(148, Math.round(width * 0.38)),
    tileW: Math.min(narrow ? 148 : 168, width * 0.42),
    catSize: narrow ? 58 : 64,
    titleSize: narrow ? 24 : 28,
    sectionSize: narrow ? 18 : 22,
  };
}

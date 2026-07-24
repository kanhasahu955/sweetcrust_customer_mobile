import { useWindowDimensions } from "react-native";

/** Shared responsive layout tokens for phone / large phone. */
export function useLayout() {
  const { width, height } = useWindowDimensions();
  const narrow = width < 380;
  const short = height < 720;
  const pagePad = narrow ? 12 : 16;
  const tileGap = 8;
  const tileCols = 3;
  // Exactly 3 product cards fill the content row (page pad already applied by Screen/body)
  const contentW = width - pagePad * 2;
  const tileW = Math.floor((contentW - tileGap * (tileCols - 1)) / tileCols);

  return {
    width,
    height,
    narrow,
    short,
    pagePad,
    bannerH: Math.min(148, Math.round(width * 0.38)),
    tileCols,
    tileGap,
    tileW,
    shopW: Math.min(118, Math.max(100, Math.round(width * 0.28))),
    catSize: narrow ? 58 : 64,
    titleSize: narrow ? 24 : 28,
    sectionSize: narrow ? 18 : 22,
    fabClearance: 64,
  };
}

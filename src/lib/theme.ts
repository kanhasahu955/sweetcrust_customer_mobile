/**
 * SweetCrust customer UI — matches app_docs/customer mockups
 * Cream · blush pink · chocolate brown
 */
export const colors = {
  ink: "#4A2C2A",
  inkSoft: "#5C3D38",
  stone: "#FFF9F5",
  stoneDeep: "#F5E8DF",
  paper: "#FFFFFF",
  cream: "#FFF9F5",
  creamDeep: "#F8EDE6",
  blush: "#F2A7AD",
  blushDeep: "#E9748E",
  blushSoft: "#FFF0F2",
  pink: "#E9748E",
  coral: "#FF8A65",
  chocolate: "#4A2C2A",
  cocoa: "#6B4A42",
  muted: "#9A7B72",
  border: "#F0DDD4",
  inputBorder: "#E8D0C6",
  success: "#2E7D4F",
  successSoft: "#E8F5EE",
  danger: "#D64545",
  warning: "#E67E22",
  white: "#FFFFFF",
  mist: "rgba(233, 116, 142, 0.08)",

  // legacy aliases used across screens
  ember: "#E9748E",
  chili: "#D45A78",
  saffron: "#FF8A65",
  saffronSoft: "#FFD0C2",
  caramel: "#9A6B5A",
  sugar: "#FFF0F2",
  smoke: "rgba(74, 44, 42, 0.35)",
  honey: "#FF8A65",
  honeySoft: "#FFD0C2",
} as const;

/** Dark palette (customer-37) — same keys as light for ThemeColors. */
export const darkColors = {
  ...colors,
  ink: "#F5E8DF",
  inkSoft: "#E8D0C6",
  stone: "#1A100E",
  stoneDeep: "#241614",
  paper: "#2A1A18",
  cream: "#1A100E",
  creamDeep: "#241614",
  blushSoft: "#3A2220",
  chocolate: "#F5E8DF",
  cocoa: "#C4A59C",
  muted: "#A89088",
  border: "#3D2824",
  inputBorder: "#4A322E",
  white: "#2A1A18",
  mist: "rgba(233, 116, 142, 0.15)",
} as const;

export type ThemeColors = typeof colors;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 12, md: 16, lg: 20, xl: 28, pill: 999 } as const;

export const tabBarClearance = 100;

export const fonts = {
  display: "Fraunces_700Bold",
  displaySoft: "Fraunces_600SemiBold",
  body: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  bold: "DMSans_700Bold",
} as const;

export const float = {
  shadowColor: "#4A2C2A",
  shadowOpacity: 0.08,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3,
} as const;

export const floatHot = {
  shadowColor: "#E9748E",
  shadowOpacity: 0.25,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
} as const;

export const type = {
  brand: { fontFamily: fonts.display, fontSize: 36, letterSpacing: -0.8, color: colors.ink },
  brandSm: { fontFamily: fonts.display, fontSize: 22, letterSpacing: -0.4, color: colors.ink },
  h1: { fontFamily: fonts.display, fontSize: 28, letterSpacing: -0.5, color: colors.ink },
  h2: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15, color: colors.ink, lineHeight: 22 },
  muted: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, lineHeight: 18 },
  label: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.cocoa,
    textTransform: "uppercase" as const,
    letterSpacing: 0.7,
  },
  btn: { fontFamily: fonts.bold, fontSize: 16, color: colors.white },
};

export function money(n?: number | null) {
  const v = Number(n || 0);
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export const formatMoney = money;

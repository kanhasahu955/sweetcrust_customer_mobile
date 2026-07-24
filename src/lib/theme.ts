/**
 * SweetCrust customer UI — ice cream · soft smoke · spicy blush
 */
export const colors = {
  ink: "#3D2A32",
  inkSoft: "#5A3D48",
  stone: "#F3F6FA",
  stoneDeep: "#E6ECF4",
  paper: "#FFFFFF",
  cream: "#F3F6FA",
  creamDeep: "#E8EEF5",
  blush: "#F2A7AD",
  blushDeep: "#E9748E",
  blushSoft: "#F7EEF2",
  pink: "#E9748E",
  coral: "#FF8A65",
  chocolate: "#3D2A32",
  cocoa: "#6B4A56",
  muted: "#8A7A82",
  border: "#DCE4EE",
  inputBorder: "#D0DAE6",
  success: "#2E7D4F",
  successSoft: "#E8F5EE",
  danger: "#D64545",
  warning: "#E67E22",
  white: "#FFFFFF",
  mist: "rgba(170, 205, 230, 0.14)",

  // legacy aliases used across screens
  ember: "#E9748E",
  chili: "#D45A78",
  saffron: "#FF8A65",
  saffronSoft: "#FFD0C2",
  caramel: "#9A6B5A",
  sugar: "#F7EEF2",
  smoke: "rgba(90, 120, 150, 0.28)",
  honey: "#FF8A65",
  honeySoft: "#FFD0C2",
} as const;

/** Dark palette — cool ice night, same keys as light. */
export const darkColors = {
  ...colors,
  ink: "#F0E8EC",
  inkSoft: "#D8CCD2",
  stone: "#121820",
  stoneDeep: "#1A222C",
  paper: "#1E2834",
  cream: "#121820",
  creamDeep: "#1A222C",
  blushSoft: "#2A2230",
  chocolate: "#F0E8EC",
  cocoa: "#B8A4AE",
  muted: "#9A8A94",
  border: "#2A3544",
  inputBorder: "#354455",
  white: "#1E2834",
  mist: "rgba(170, 205, 230, 0.12)",
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

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { colors } from "@/lib/theme";

export type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  name: IconName | string;
  size?: number;
  color?: string;
};

/** Prefer Ionicons; fall back to MaterialCommunityIcons so glyphs never show as "?". */
const MCI_FALLBACK: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  sparkles: "shimmer",
  nutrition: "bread-slice",
  "ice-cream": "ice-cream",
  "bag-handle": "shopping",
  "bag-handle-outline": "shopping-outline",
  "storefront-outline": "storefront-outline",
  "color-palette": "palette",
  fitness: "dumbbell",
  "fast-food": "food",
  create: "pencil",
  cafe: "coffee",
  "cafe-outline": "coffee-outline",
  pizza: "food-croissant",
  ellipse: "circle-outline",
  ribbon: "trophy-award",
  headset: "headphones",
  "headset-outline": "headphones",
};

export function Icon({ name, size = 20, color = colors.ink }: Props) {
  const ion = name as keyof typeof Ionicons.glyphMap;
  if (Ionicons.glyphMap[ion] != null) {
    return <Ionicons name={ion} size={size} color={color} />;
  }
  const mci = MCI_FALLBACK[name] || "circle-outline";
  return <MaterialCommunityIcons name={mci} size={size} color={color} />;
}

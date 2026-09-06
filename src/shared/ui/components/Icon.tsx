import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Banknote,
  BarChart3,
  Calendar,
  Car,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock,
  Coffee,
  Copy,
  CreditCard,
  Delete,
  Dumbbell,
  Fingerprint,
  Gift,
  HeartPulse,
  House,
  LayoutGrid,
  Lock,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  PieChart,
  Plane,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingBasket,
  ShoppingCart,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Tag,
  Tags,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  UtensilsCrossed,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react-native";

import { tokens } from "@/shared/ui/theme/tokens";

/**
 * The app's only icon set.
 *
 * Lucide, stroke 2.2, round caps and joins - one family, one stroke weight,
 * everywhere. Nothing else may import an icon library directly.
 *
 * Names are kept in the Ionicons vocabulary the app already speaks because
 * category icons are **persisted data**: a category row stores
 * `icon: "fast-food-outline"` and comes back from the API that way. Renaming
 * them would be a data migration, not a redesign, so the map translates
 * instead. Unknown names fall back to the tag icon rather than rendering
 * nothing.
 */
const MAP = {
  // ---- Actions and chrome ----
  add: Plus,
  "add-circle-outline": Plus,
  "alert-circle-outline": AlertCircle,
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
  "backspace-outline": Delete,
  "book-outline": BookOpen,
  "calendar-outline": Calendar,
  "chatbubble-ellipses-outline": MessageSquare,
  checkmark: Check,
  "chevron-back": ChevronLeft,
  "chevron-down": ChevronDown,
  "chevron-up": ChevronUp,
  "chevron-forward": ChevronRight,
  close: X,
  "copy-outline": Copy,
  "create-outline": Pencil,
  "ellipsis-horizontal": MoreHorizontal,
  "finger-print": Fingerprint,
  happy: Smile,
  "lock-closed": Lock,
  "lock-closed-outline": Lock,
  "log-out-outline": LogOut,
  pencil: Pencil,
  search: Search,
  "settings-outline": SlidersHorizontal,
  "shield-checkmark": ShieldCheck,
  "sparkles-outline": Sparkles,
  "time-outline": Clock,
  "tips-and-updates": Sparkles,
  "trash-outline": Trash2,
  "trending-up": TrendingUp,
  "trending-down": TrendingDown,

  // ---- Navigation ----
  home: House,
  "home-outline": House,
  receipt: Receipt,
  "receipt-outline": Receipt,
  "stats-chart": PieChart,
  "stats-chart-outline": PieChart,
  "pie-chart-outline": PieChart,
  "bar-chart-outline": BarChart3,
  grid: LayoutGrid,
  "grid-outline": LayoutGrid,
  person: User,
  "person-outline": User,

  // ---- Category vocabulary (persisted values) ----
  "pricetag-outline": Tag,
  "pricetags-outline": Tags,
  "fast-food-outline": UtensilsCrossed,
  "basket-outline": ShoppingBasket,
  "car-outline": Car,
  "cart-outline": ShoppingCart,
  "cafe-outline": Coffee,
  "airplane-outline": Plane,
  "fitness-outline": Dumbbell,
  "medical-outline": HeartPulse,
  "gift-outline": Gift,
  "cash-outline": Banknote,
  "card-outline": CreditCard,
  "wallet-outline": Wallet,

  ellipse: Circle,
  "ellipse-outline": Circle,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof MAP;

/** Names offered by the category icon picker, in display order. */
export const CATEGORY_ICON_NAMES = [
  "pricetag-outline",
  "fast-food-outline",
  "basket-outline",
  "car-outline",
  "home-outline",
  "cart-outline",
  "cafe-outline",
  "airplane-outline",
  "fitness-outline",
  "medical-outline",
  "gift-outline",
  "cash-outline",
  "card-outline",
  "wallet-outline",
] as const satisfies readonly IconName[];

type Props = {
  name: IconName | (string & {});
  /** Defaults to the row size. Use `tokens.icon.*` rather than a literal. */
  size?: number;
  color?: string;
  /** Only override for a hairline icon inside a very small tile. */
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
};

export function Icon({
  name,
  size = tokens.icon.row,
  color = tokens.colors.text,
  strokeWidth = tokens.icon.strokeWidth,
  style,
}: Props) {
  const Glyph = (MAP as Record<string, LucideIcon>)[name] ?? Tag;

  return (
    <Glyph
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    />
  );
}

export default Icon;

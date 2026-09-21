import React, { type PropsWithChildren } from "react";
import {
  ScrollView,
  View,
  useWindowDimensions,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { tokens, type AmbientTone } from "@/shared/ui/theme/tokens";

type Props = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
  /** `tab` clears the floating bottom navigation. */
  bottom?: "tab" | "normal" | number;
  /**
   * Ambient wash at the top edge. Never above ~10% alpha, always fading to the
   * base background - it tints a screen to its mode (expense vs income) so the
   * mode reads even before the numbers do. `none` is the default.
   */
  ambient?: AmbientTone;
  /** Column cap. `content` (720) by default; see `tokens.layout.container`. */
  width?: ScreenWidth;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
  showsVerticalScrollIndicator?: boolean;
}>;

export type ScreenWidth = keyof typeof tokens.layout.container;
export type LayoutClass = "compact" | "medium" | "expanded";

/** Phone (< 600), tablet portrait (600-1023) or wide tablet / desktop web (>= 1024). */
export function useLayoutClass(): LayoutClass {
  const { width } = useWindowDimensions();
  if (width >= tokens.layout.breakpoints.expanded) return "expanded";
  if (width >= tokens.layout.breakpoints.medium) return "medium";
  return "compact";
}

/** Horizontal gutter: 20 on small handsets, 24 on phones, 32 from tablet width up. */
export function useScreenPaddingX() {
  const { width } = useWindowDimensions();
  if (width >= tokens.layout.breakpoints.medium) return tokens.layout.screenPaddingXMedium;
  return width < 360 ? tokens.layout.screenPaddingXCompact : tokens.layout.screenPaddingX;
}

/**
 * Caps a screen's column and centres it. The cap is the outer width, gutters
 * included, so `form` = 520 means the whole column - not just the text - is
 * 520. On a phone the cap is wider than the window and this is a no-op.
 * Pass `style={{ flex: 1 }}` for a screen whose body fills the height.
 */
export function Container({
  width = "content",
  className,
  style,
  children,
}: PropsWithChildren<{ width?: ScreenWidth; className?: string; style?: StyleProp<ViewStyle> }>) {
  return (
    <View className={className} style={[{ width: "100%", maxWidth: tokens.layout.container[width], alignSelf: "center" }, style]}>
      {children}
    </View>
  );
}

/** Space a scroll view must leave under its content for the floating tab bar. */
export function useTabBarClearance() {
  const insets = useSafeAreaInsets();
  return (insets.bottom || 0) + tokens.layout.tabBarHeight + tokens.space[3] + tokens.space[6];
}

/** The top wash. Sits behind content, never intercepts touches. */
function Ambient({ tone }: { tone: AmbientTone }) {
  if (tone === "none") return null;

  return (
    <LinearGradient
      pointerEvents="none"
      colors={tokens.ambient[tone] as unknown as [string, string]}
      style={{ position: "absolute", top: 0, left: 0, right: 0, height: 320 }}
    />
  );
}

/**
 * The app scaffold: safe-area top padding, the shared gutter, the ambient
 * wash, and the right amount of bottom clearance. Every screen starts here so
 * page margins and title positions cannot drift between tabs.
 */
export function Screen({
  children,
  scroll,
  padded = true,
  bottom = "normal",
  ambient = "none",
  width = "content",
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const paddingX = useScreenPaddingX();
  const tabClearance = useTabBarClearance();

  const horizontal = padded ? paddingX : 0;
  const bottomPad =
    typeof bottom === "number"
      ? bottom
      : bottom === "tab"
        ? tabClearance
        : (insets.bottom || 0) + tokens.layout.screenPadBottom;

  const base: ViewStyle = {
    flex: 1,
    backgroundColor: tokens.colors.app,
    paddingTop: insets.top + tokens.layout.screenPadTop,
  };

  if (scroll) {
    return (
      <View style={[base, style]}>
        <Ambient tone={ambient} />
        <ScrollView
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          contentContainerStyle={[
            {
              paddingHorizontal: horizontal,
              paddingBottom: bottomPad,
              width: "100%",
              maxWidth: tokens.layout.container[width],
              alignSelf: "center",
            },
            contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[base, style]}>
      <Ambient tone={ambient} />
      <Container width={width} style={{ flex: 1, paddingHorizontal: horizontal, paddingBottom: bottomPad }}>
        {children}
      </Container>
    </View>
  );
}

export default Screen;

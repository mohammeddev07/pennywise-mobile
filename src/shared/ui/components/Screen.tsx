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
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
  showsVerticalScrollIndicator?: boolean;
}>;

/** Horizontal gutter. 24 everywhere, tightened to 20 on small handsets. */
export function useScreenPaddingX() {
  const { width } = useWindowDimensions();
  return width < 360 ? tokens.layout.screenPaddingXCompact : tokens.layout.screenPaddingX;
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
            { paddingHorizontal: horizontal, paddingBottom: bottomPad },
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
      <View style={{ flex: 1, paddingHorizontal: horizontal, paddingBottom: bottomPad }}>
        {children}
      </View>
    </View>
  );
}

export default Screen;

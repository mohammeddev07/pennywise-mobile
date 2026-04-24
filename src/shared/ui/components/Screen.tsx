import React, { type PropsWithChildren } from "react";
import { ScrollView, View, type ScrollViewProps, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tokens } from "@/shared/ui/theme/tokens";

type Props = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
  bottom?: "tab" | "normal" | number;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
  showsVerticalScrollIndicator?: boolean;
}>;

export function Screen({
  children,
  scroll,
  padded = true,
  bottom = "normal",
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const horizontal = padded ? tokens.layout.screenPaddingX : 0;
  const bottomPad =
    typeof bottom === "number"
      ? bottom
      : bottom === "tab"
        ? (insets.bottom || 0) + 120
        : (insets.bottom || 0) + tokens.layout.screenPadBottom;

  const base = {
    flex: 1,
    backgroundColor: tokens.colors.app,
    paddingTop: insets.top + tokens.layout.screenPadTop,
  };

  if (scroll) {
    return (
      <View style={[base, style]}>
        <ScrollView
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          contentContainerStyle={[
            {
              paddingHorizontal: horizontal,
              paddingBottom: bottomPad,
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
    <View
      style={[
        base,
        {
          paddingHorizontal: horizontal,
          paddingBottom: bottomPad,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export default Screen;

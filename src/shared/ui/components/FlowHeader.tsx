import React, { type ReactNode } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";

type Props = {
  title: string;
  /** Sub-label under the title, e.g. "Amount · 1 of 2". */
  subtitle?: string;
  onBack: () => void;
  backIcon?: keyof typeof Ionicons.glyphMap;
  /** 1-based position in the flow. Omit for single-screen modals. */
  step?: number;
  totalSteps?: number;
  rightAction?: ReactNode;
};

/**
 * Header for multi-step modal flows.
 *
 * Progress is a single continuous track rather than one mark per step: at two
 * steps the segmented version read as decoration, and a filling bar says the
 * same thing with less furniture.
 */
export function FlowHeader({
  title,
  subtitle,
  onBack,
  backIcon = "chevron-back",
  step,
  totalSteps,
  rightAction,
}: Props) {
  const showProgress = typeof step === "number" && typeof totalSteps === "number" && totalSteps > 1;
  const ratio = showProgress ? (step as number) / (totalSteps as number) : 0;

  const progress = useDerivedValue(
    () => withTiming(ratio, { duration: tokens.motion.slow }),
    [ratio]
  );
  const fill = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <HapticPressable
          onPress={onBack}
          haptic="selection"
          pressScale={0.94}
          accessibilityRole="button"
          accessibilityLabel={backIcon === "close" ? "Close" : "Back"}
          android_ripple={{ color: tokens.colors.ripple, borderless: true }}
          style={{
            width: tokens.layout.iconTap,
            height: tokens.layout.iconTap,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: tokens.radii.pill,
            backgroundColor: tokens.colors.surface,
            borderWidth: 1,
            borderColor: tokens.colors.stroke,
          }}
        >
          <Ionicons name={backIcon} size={20} color={tokens.colors.text} />
        </HapticPressable>

        <View style={{ flex: 1, paddingHorizontal: tokens.space[3] }}>
          <AppText variant="lg" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="sm" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
              {subtitle}
            </AppText>
          ) : null}
        </View>

        <View
          style={{
            minWidth: tokens.layout.iconTap,
            height: tokens.layout.iconTap,
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          {rightAction}
        </View>
      </View>

      {showProgress ? (
        <View
          style={{
            marginTop: tokens.space[4],
            height: 3,
            borderRadius: tokens.radii.pill,
            backgroundColor: tokens.colors.neutralSoft,
            overflow: "hidden",
          }}
        >
          <Animated.View
            style={[
              { height: 3, borderRadius: tokens.radii.pill, backgroundColor: tokens.colors.accent },
              fill,
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

export default FlowHeader;

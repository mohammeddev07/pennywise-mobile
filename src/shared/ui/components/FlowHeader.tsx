import React, { type ReactNode } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";

type Props = {
  title: string;
  onBack: () => void;
  backIcon?: keyof typeof Ionicons.glyphMap;
  /** 1-based position in the flow. Omit for single-screen modals. */
  step?: number;
  totalSteps?: number;
  rightAction?: ReactNode;
};

/**
 * Header for multi-step modal flows. The progress track is the only thing that
 * tells the user how much is left, so it stays even when a step is skippable.
 */
export function FlowHeader({ title, onBack, backIcon = "chevron-back", step, totalSteps, rightAction }: Props) {
  const showProgress = typeof step === "number" && typeof totalSteps === "number" && totalSteps > 1;

  return (
    <View>
      <View className="flex-row items-center">
        <HapticPressable
          onPress={onBack}
          haptic="selection"
          pressScale={0.96}
          className="h-12 w-12 items-center justify-center rounded-full border border-stroke bg-surface"
          android_ripple={{ color: "#0B122012", borderless: true }}
        >
          <Ionicons name={backIcon} size={20} color={tokens.colors.text} />
        </HapticPressable>

        <View className="flex-1 px-3">
          <AppText variant="lg" numberOfLines={1}>
            {title}
          </AppText>
          {showProgress ? (
            <AppText variant="xs" tone="muted" className="mt-0.5">
              Step {step} of {totalSteps}
            </AppText>
          ) : null}
        </View>

        <View className="h-12 min-w-12 items-center justify-center">{rightAction}</View>
      </View>

      {showProgress ? (
        <View className="mt-4 flex-row" style={{ gap: tokens.space[2] }}>
          {Array.from({ length: totalSteps as number }).map((_, i) => (
            <View
              key={i}
              className="h-1 flex-1 rounded-full"
              style={{ backgroundColor: i < (step as number) ? tokens.semantic.primary : tokens.colors.stroke }}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default FlowHeader;

import React from "react";
import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";

type Props = {
  title: string;
  body: string;

  /** MaterialIcons name */
  icon?: React.ComponentProps<typeof MaterialIcons>["name"];

  /** Optional inline action */
  actionLabel?: string;
  onAction?: () => void;

  /** Optional close affordance */
  onClose?: () => void;
};

export function TipCard({ title, body, icon = "tips-and-updates", actionLabel, onAction, onClose }: Props) {
  return (
    <View
      style={{
        borderRadius: 18,
        padding: 16,
        backgroundColor: tokens.colors.surface,
        borderWidth: 1,
        borderColor: tokens.colors.stroke,
      }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-start" style={{ gap: 12, flex: 1 }}>
          <View
            style={{
              height: 40,
              width: 40,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#22C55E1A",
            }}
          >
            <MaterialIcons name={icon} size={20} color={tokens.colors.accent} />
          </View>

          <View style={{ flex: 1 }}>
            <Text className="text-text text-sm font-bold">{title}</Text>
            <Text className="text-muted mt-1 text-xs leading-5">{body}</Text>

            {actionLabel && onAction ? (
              <HapticPressable
                onPress={onAction}
                haptic="selection"
                pressScale={0.985}
                className="mt-4 self-start rounded-full px-4 py-2"
                style={{ backgroundColor: "#22C55E22" }}
                android_ripple={{ color: "#0B122012" }}
              >
                <Text style={{ color: tokens.colors.accent }} className="text-xs font-extrabold tracking-widest">
                  {actionLabel.toUpperCase()}
                </Text>
              </HapticPressable>
            ) : null}
          </View>
        </View>

        {onClose ? (
          <HapticPressable
            onPress={onClose}
            haptic="selection"
            className="h-9 w-9 items-center justify-center rounded-full"
            android_ripple={{ color: "#0B122012", borderless: true }}
            style={{ backgroundColor: tokens.colors.greenSoft }}
          >
            <MaterialIcons name="close" size={18} color={tokens.colors.muted} />
          </HapticPressable>
        ) : null}
      </View>
    </View>
  );
}

import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";

export type Key = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "back";

export function NumericKeypad({
  onKey,
  containerClassName,
  keyHeight = 64,
}: {
  onKey: (k: Key) => void;
  containerClassName?: string;
  keyHeight?: number;
}) {
  const press = (k: Key) => {
    onKey(k);
  };

  return (
    <View className={clsx("w-full px-8", containerClassName)}>
      <Row>
        <KeyBtn label="1" h={keyHeight} onPress={() => press("1")} />
        <KeyBtn label="2" h={keyHeight} onPress={() => press("2")} />
        <KeyBtn label="3" h={keyHeight} onPress={() => press("3")} />
      </Row>

      <Row className="mt-3">
        <KeyBtn label="4" h={keyHeight} onPress={() => press("4")} />
        <KeyBtn label="5" h={keyHeight} onPress={() => press("5")} />
        <KeyBtn label="6" h={keyHeight} onPress={() => press("6")} />
      </Row>

      <Row className="mt-3">
        <KeyBtn label="7" h={keyHeight} onPress={() => press("7")} />
        <KeyBtn label="8" h={keyHeight} onPress={() => press("8")} />
        <KeyBtn label="9" h={keyHeight} onPress={() => press("9")} />
      </Row>

      <Row className="mt-3">
        <KeyBtn label="." h={keyHeight} onPress={() => press(".")} />
        <KeyBtn label="0" h={keyHeight} onPress={() => press("0")} />
        <HapticPressable
          onPress={() => press("back")}
          haptic="selection"
          className="flex-1 items-center justify-center rounded-lg"
          style={{ height: keyHeight }}
          android_ripple={{ color: "#FFFFFF14", borderless: false }}
        >
          <Ionicons name="backspace" size={22} color={tokens.colors.accent} />
        </HapticPressable>
      </Row>
    </View>
  );
}

function Row({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <View className={clsx("flex-row items-center justify-between", className)}>{children}</View>;
}

function KeyBtn({ label, onPress, h }: { label: string; onPress: () => void; h: number }) {
  return (
    <HapticPressable
      onPress={onPress}
      haptic="selection"
      className="flex-1 items-center justify-center rounded-lg"
      style={{ height: h }}
      android_ripple={{ color: "#FFFFFF14", borderless: false }}
    >
      <AppText variant="2xl" style={{ color: tokens.colors.accent }}>
        {label}
      </AppText>
    </HapticPressable>
  );
}

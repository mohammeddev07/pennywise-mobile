import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import clsx from "clsx";

export type Key = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "back";

const EMERALD = "#00C805";

export function NumericKeypad({
  onKey,
  containerClassName,
  keyHeight = 64,
}: {
  onKey: (k: Key) => void;
  containerClassName?: string;
  keyHeight?: number; // tighter grid control
}) {
  const press = async (k: Key) => {
    await Haptics.selectionAsync();
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
        <Pressable
          onPress={() => press("back")}
          className="flex-1 items-center justify-center rounded-2xl"
          style={{ height: keyHeight }}
          android_ripple={{ color: "#FFFFFF14", borderless: false }}
        >
          <Ionicons name="backspace" size={22} color={EMERALD} />
        </Pressable>
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
    <Pressable
      onPress={onPress}
      className="flex-1 items-center justify-center rounded-2xl"
      style={{ height: h }}
      android_ripple={{ color: "#FFFFFF14", borderless: false }}
    >
      <Text style={{ color: EMERALD }} className="text-4xl font-semibold">
        {label}
      </Text>
    </Pressable>
  );
}

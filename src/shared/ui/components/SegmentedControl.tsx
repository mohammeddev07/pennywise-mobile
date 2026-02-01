import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { tokens } from "@/shared/ui/theme/tokens";

type Option<K extends string> = { key: K; label: string };

export function SegmentedControl<K extends string>({
  value,
  options,
  onChange,
}: {
  value: K;
  options: Option<K>[];
  onChange: (k: K) => void;
}) {
  const [w, setW] = useState(0);
  const pad = 4;
  const x = useSharedValue(pad);

  const idx = Math.max(0, options.findIndex((o) => o.key === value));
  const segW = w > 0 ? (w - pad * 2) / options.length : 0;

  useEffect(() => {
    x.value = withTiming(pad + idx * segW, { duration: 160 });
  }, [idx, segW, x]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    width: segW,
  }));

  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      className="rounded-full border border-stroke bg-surface"
      style={{ padding: pad, overflow: "hidden" }}
    >
      {w > 0 ? (
        <Animated.View
          style={[
            pillStyle,
            {
              position: "absolute",
              top: pad,
              bottom: pad,
              borderRadius: 999,
              backgroundColor: tokens.colors.card,
            },
          ]}
        />
      ) : null}

      <View className="flex-row">
        {options.map((opt) => {
          const active = opt.key === value;
          return (
            <Pressable
              key={opt.key}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange(opt.key);
              }}
              className="flex-1 items-center justify-center"
              style={{ paddingVertical: 10 }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: active ? tokens.colors.text : tokens.colors.muted }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

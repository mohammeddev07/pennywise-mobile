import { useEffect, useMemo } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";
import { useBooksStore } from "@/features/books/store";

function clamp(v: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, v));
}

export default function BookSwitcherModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();

  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const setSelectedBookId = useBooksStore((s) => s.setSelectedBookId);

  const SHEET_H = useMemo(() => {
    const target = Math.round(screenH * 0.62);
    return Math.min(560, Math.max(420, target));
  }, [screenH]);

  const translateY = useSharedValue(26);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.98);

  const close = () => {
    opacity.value = withTiming(0, { duration: 140 });
    scale.value = withTiming(0.985, { duration: 140 });
    translateY.value = withTiming(26, { duration: 160 }, (finished) => {
      if (!finished) return;
      runOnJS(router.back)();
    });
  };

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 170 });
    scale.value = withTiming(1, { duration: 170 });
    translateY.value = withTiming(0, { duration: 170 });
  }, [opacity, scale, translateY]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const y = clamp(e.translationY, 0, SHEET_H + 60);
      translateY.value = y;
      opacity.value = interpolate(y, [0, SHEET_H + 60], [1, 0.0], Extrapolate.CLAMP);
      scale.value = interpolate(y, [0, SHEET_H + 60], [1, 0.98], Extrapolate.CLAMP);
    })
    .onEnd((e) => {
      const shouldClose = translateY.value > SHEET_H * 0.28 || e.velocityY > 1000;
      if (shouldClose) {
        runOnJS(() => Haptics.selectionAsync().catch(() => {}))();
        runOnJS(close)();
        return;
      }
      translateY.value = withTiming(0, { duration: 180 });
      opacity.value = withTiming(1, { duration: 180 });
      scale.value = withTiming(1, { duration: 180 });
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View className="flex-1">
      {/* Backdrop */}
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            backgroundColor: "#000000AA",
          },
          backdropStyle,
        ]}
      >
        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            close();
          }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Sheet */}
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: SHEET_H + (insets.bottom || 0),
              paddingBottom: (insets.bottom || 0) + 12,
              backgroundColor: tokens.colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderWidth: 1,
              borderColor: tokens.colors.stroke,
              overflow: "hidden",
            },
            sheetStyle,
          ]}
        >
          {/* Grabber */}
          <View className="items-center pt-3">
            <View style={{ height: 4, width: 44, borderRadius: 2, backgroundColor: tokens.colors.stroke }} />
          </View>

          {/* Header */}
          <View className="px-6 pt-4 flex-row items-center justify-between">
            <Text className="text-text text-lg font-semibold">Switch books</Text>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                close();
              }}
              className="h-11 w-11 items-center justify-center rounded-full border border-stroke bg-card"
              android_ripple={{ color: "#FFFFFF12", borderless: true }}
            >
              <Ionicons name="close" size={18} color={tokens.colors.text} />
            </Pressable>
          </View>

          <View className="h-px bg-stroke mt-5" />

          {/* Books */}
          <View className="px-6 pt-4">
            {books.map((b) => {
              const active = b.id === selectedBookId;
              return (
                <Pressable
                  key={b.id}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setSelectedBookId(b.id);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                    close();
                  }}
                  className="rounded-3xl border px-5 py-4 mb-3"
                  style={{
                    borderColor: active ? tokens.colors.accent : tokens.colors.stroke,
                    backgroundColor: active ? "#00C80514" : tokens.colors.card,
                  }}
                  android_ripple={{ color: "#FFFFFF10" }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-text text-base font-semibold">{b.name}</Text>
                      <Text className="text-muted mt-1 text-xs">{b.subtitle ? b.subtitle : "CashBook Pro"}</Text>
                    </View>

                    {active ? <Ionicons name="checkmark" size={20} color={tokens.colors.accent} /> : null}
                  </View>
                </Pressable>
              );
            })}

            <View className="mt-2 rounded-3xl border border-stroke bg-card px-5 py-4">
              <Text className="text-text font-semibold">Add new book</Text>
              <Text className="text-muted mt-1 text-xs">Coming next: create books + filter transactions</Text>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

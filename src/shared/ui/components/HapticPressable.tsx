import { PropsWithChildren, useMemo } from "react";
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

type Props = PressableProps &
  PropsWithChildren<{
    className?: string;
    style?: StyleProp<ViewStyle>;
    haptic?: "selection" | "impactLight" | "impactMedium" | "impactHeavy" | "none";
    pressScale?: number; // default 0.98
    pressOpacity?: number; // default 0.9
  }>;

const APressable = Animated.createAnimatedComponent(Pressable);

export function HapticPressable({
  children,
  className,
  style,
  haptic = "selection",
  pressScale = 0.98,
  pressOpacity = 0.9,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: Props) {
  const s = useSharedValue(1);
  const o = useSharedValue(1);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
    opacity: o.value,
  }));

  const doHaptic = useMemo(() => {
    if (haptic === "none") return () => {};
    if (haptic === "selection") return () => Haptics.selectionAsync().catch(() => {});
    if (haptic === "impactLight") return () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (haptic === "impactMedium") return () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    return () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }, [haptic]);

  return (
    <APressable
      {...rest}
      onPressIn={(e) => {
        s.value = withTiming(pressScale, { duration: 90 });
        o.value = withTiming(pressOpacity, { duration: 90 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withTiming(1, { duration: 110 });
        o.value = withTiming(1, { duration: 110 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        doHaptic();
        onPress?.(e);
      }}
      className={className}
      style={[style as any, animated]}
    >
      {children}
    </APressable>
  );
}

export default HapticPressable;

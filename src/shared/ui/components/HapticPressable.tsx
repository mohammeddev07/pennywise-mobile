import { PropsWithChildren, useMemo } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
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
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: Props) {
  const s = useSharedValue(1);
  const o = useSharedValue(1);

  const isDisabled = !!disabled;

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: isDisabled ? 1 : s.value }],
    opacity: isDisabled ? 0.4 : o.value,
  }));

  const doHaptic = useMemo(() => {
    if (haptic === "none") return () => {};
    if (haptic === "selection") return () => Haptics.selectionAsync().catch(() => {});
    if (haptic === "impactLight")
      return () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (haptic === "impactMedium")
      return () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    return () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  }, [haptic]);

  return (
    <APressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (isDisabled) return;
        s.value = withTiming(pressScale, { duration: 80 });
        o.value = withTiming(pressOpacity, { duration: 80 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (isDisabled) return;
        s.value = withTiming(1, { duration: 120 });
        o.value = withTiming(1, { duration: 120 });
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (isDisabled) return;
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

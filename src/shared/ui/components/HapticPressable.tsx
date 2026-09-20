import { PropsWithChildren, useMemo, useState } from "react";
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { cssInterop } from "nativewind";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";

type Props = PressableProps &
  PropsWithChildren<{
    className?: string;
    style?: StyleProp<ViewStyle>;
    /**
     * Defaults to `none`.
     *
     * The product's policy is that **haptics confirm writes, never reads** -
     * so navigation, chevrons, filters, chart taps and back buttons stay
     * silent, and a control that commits something opts in explicitly. Making
     * silence the default means a new pressable cannot accidentally buzz.
     */
    haptic?:
      | "selection"
      | "impactLight"
      | "impactMedium"
      | "impactHeavy"
      | "notificationSuccess"
      | "notificationWarning"
      | "notificationError"
      | "none";
    pressScale?: number; // default 0.98
    pressOpacity?: number; // default 0.9
    /**
     * Opacity while `disabled`. Defaults to 0.4, which suits a bare icon or row.
     * A control that paints its own disabled surface (Button) passes 1 so its
     * label stays readable instead of being faded a second time.
     */
    disabledOpacity?: number;
  }>;

/**
 * Keyboard focus ring. Only drawn when the browser says the focus is
 * keyboard-driven (`:focus-visible`), so a mouse click does not leave a ring
 * behind. Native platforms have no pointer focus, so nothing is drawn there.
 */
const FOCUS_RING = {
  outlineStyle: "solid",
  outlineWidth: 2,
  // Inset, so a horizontal chip row (which clips its cross axis) never cuts it off.
  outlineOffset: -2,
  outlineColor: tokens.colors.accent,
} as const;

const APressable = Animated.createAnimatedComponent(Pressable);
// `createAnimatedComponent` returns a class NativeWind has never seen, so a
// `className` on it was silently dropped - a dozen back buttons rendered as a
// bare 20px chevron with no size, border or fill. Register it once, here.
cssInterop(APressable, { className: "style" });

export function HapticPressable({
  children,
  className,
  style,
  haptic = "none",
  pressScale = 0.98,
  pressOpacity = 0.9,
  disabledOpacity = 0.4,
  disabled,
  onPressIn,
  onFocus,
  onBlur,
  onPressOut,
  onPress,
  ...rest
}: Props) {
  const s = useSharedValue(1);
  const o = useSharedValue(1);

  const isDisabled = !!disabled;
  const [ring, setRing] = useState(false);
  // Reduced motion keeps the opacity cue but drops the scale movement.
  const scaleTo = useReducedMotion() ? 1 : pressScale;

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: isDisabled ? 1 : s.value }],
    opacity: isDisabled ? disabledOpacity : o.value,
  }));

  const doHaptic = useMemo(() => {
    if (haptic === "none") return () => {};
    if (haptic === "selection") return () => Haptics.selectionAsync().catch(() => {});
    if (haptic === "impactLight")
      return () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (haptic === "impactMedium")
      return () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (haptic === "impactHeavy")
      return () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    if (haptic === "notificationSuccess")
      return () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (haptic === "notificationWarning")
      return () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    return () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  }, [haptic]);

  return (
    <APressable
      {...rest}
      disabled={disabled}
      onFocus={(e) => {
        if (Platform.OS === "web") {
          setRing(Boolean((e.target as unknown as HTMLElement)?.matches?.(":focus-visible")));
        }
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setRing(false);
        onBlur?.(e);
      }}
      onPressIn={(e) => {
        if (isDisabled) return;
        s.value = withTiming(scaleTo, { duration: 80 });
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
      style={[style as any, ring ? FOCUS_RING : null, animated]}
    >
      {children}
    </APressable>
  );
}

export default HapticPressable;

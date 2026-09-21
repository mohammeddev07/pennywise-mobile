import { PropsWithChildren, useMemo, useState } from "react";
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";

type Props = PressableProps &
  PropsWithChildren<{
    /**
     * Styling is `style`-only, deliberately - there is no `className` prop.
     * See the note on `APressable` below before adding one back.
     */
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

/**
 * Do NOT call `cssInterop(APressable, { className: "style" })` on this.
 *
 * It looks like the fix for "className is dropped on an animated component",
 * but it silently breaks every *inline* style this component is given. In
 * react-native-css-interop, `getNormalizeConfig` derives `inlineProp = "style"`
 * from that mapping, which makes the runtime re-process the inline `style`
 * prop through `collectInlineRules` -> `specificityCompare` -> `applyRules`.
 * Our style array ends in a `useAnimatedStyle` result, and pushing that
 * Reanimated object through the rule pipeline discards the whole array - so
 * `flex`, `flexDirection`, `position`, `width` and `height` all vanish.
 *
 * The visible symptom is layout collapsing to the top-left: segmented-control
 * halves shrink to their text and stack their icon above the label, absolutely
 * positioned chart labels stack vertically, and keypad keys and buttons lose
 * their height and disappear entirely.
 *
 * A plain `Animated.View` is never registered by NativeWind, so it keeps its
 * style array intact - which is why the sliding indicator in SegmentedControl
 * kept working while the pressables beside it did not. Leaving this component
 * unregistered gives it that same safe behaviour. Style it with `style`.
 */
const APressable = Animated.createAnimatedComponent(Pressable);

export function HapticPressable({
  children,
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
      style={[style as any, ring ? FOCUS_RING : null, animated]}
    >
      {children}
    </APressable>
  );
}

export default HapticPressable;

import { PropsWithChildren, useEffect } from "react";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

export function ScreenTransition({ children }: PropsWithChildren) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withTiming(1, { duration: 180 });
    return () => {
      t.value = 0;
    };
  }, [t]);

  const style = useAnimatedStyle(() => {
    const opacity = t.value;
    const scale = interpolate(t.value, [0, 1], [0.985, 1]);
    return { opacity, transform: [{ scale }] };
  });

  return <Animated.View style={[{ flex: 1 }, style]}>{children}</Animated.View>;
}

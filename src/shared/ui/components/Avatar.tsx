import { useEffect } from "react";
import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";
import { withAlpha } from "@/shared/ui/theme/color";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";

const INK = "#14201A";
const MOUTHS = [
  "M36 60 Q50 72 64 60", // smile
  "M38 58 Q50 76 62 58 Z", // open grin
  "M42 62 Q50 67 58 62", // small smile
  "M40 61 Q45 57 50 61 Q55 65 60 61", // smirk wave
];

/** Deterministic traits from a seed (mulberry32), so a seed always draws the same face. */
export function avatarTraits(seed: number) {
  let t = seed >>> 0;
  const next = () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  const palette = Object.values(tokens.category).filter((c) => c !== tokens.category.other);
  return {
    color: palette[Math.floor(next() * palette.length)],
    mouth: MOUTHS[Math.floor(next() * MOUTHS.length)],
    roundEyes: next() > 0.5,
    cheeks: next() > 0.4,
    tilt: Math.round((next() - 0.5) * 16),
  };
}

/**
 * A generated, gently animated face in place of an initial. It blinks every few
 * seconds (never under reduced motion); `onShuffle` makes a tap draw a new face.
 */
export function Avatar({ seed, size = 48, onShuffle }: { seed: number; size?: number; onShuffle?: () => void }) {
  const traits = avatarTraits(seed);
  const reduceMotion = useReducedMotion();
  const blink = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    blink.value = withRepeat(
      withSequence(withDelay(3200, withTiming(0.1, { duration: 70 })), withTiming(1, { duration: 110 })),
      -1
    );
  }, [blink, reduceMotion, seed]);

  const eyeStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: blink.value }] }));
  const eyeW = size * (traits.roundEyes ? 0.12 : 0.1);
  const eyeH = size * (traits.roundEyes ? 0.12 : 0.16);
  const eye = {
    position: "absolute" as const,
    top: size * 0.36,
    width: eyeW,
    height: eyeH,
    borderRadius: eyeW,
    backgroundColor: INK,
  };

  const face = (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: traits.color,
        overflow: "hidden",
        borderWidth: 2,
        borderColor: withAlpha(tokens.colors.white, 0.5),
      }}
    >
      <View style={{ flex: 1, transform: [{ rotate: `${traits.tilt}deg` }] }}>
        <Animated.View style={[eye, { left: size * 0.33 - eyeW / 2 }, eyeStyle]} />
        <Animated.View style={[eye, { left: size * 0.67 - eyeW / 2 }, eyeStyle]} />
        <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: "absolute" }}>
          {traits.cheeks ? (
            <>
              <Path d="M20 58 a7 5 0 1 0 14 0 a7 5 0 1 0 -14 0" fill="rgba(255,90,120,0.35)" />
              <Path d="M66 58 a7 5 0 1 0 14 0 a7 5 0 1 0 -14 0" fill="rgba(255,90,120,0.35)" />
            </>
          ) : null}
          <Path
            d={traits.mouth}
            stroke={INK}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={traits.mouth.endsWith("Z") ? INK : "none"}
          />
        </Svg>
      </View>
    </View>
  );

  if (!onShuffle) return face;
  return (
    <HapticPressable
      onPress={onShuffle}
      haptic="selection"
      pressScale={0.9}
      accessibilityRole="button"
      accessibilityLabel="Profile picture"
      accessibilityHint="Draws a new random face"
      style={{ borderRadius: size / 2 }}
    >
      {face}
    </HapticPressable>
  );
}

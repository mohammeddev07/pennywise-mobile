import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import { tokens } from "@/shared/ui/theme/tokens";

export type CharacterState = "happy" | "thinking" | "waiting";

export function CharacterWidget({ state = "waiting", size = 44 }: { state?: CharacterState; size?: number }) {
  const stroke = tokens.colors.stroke;
  const face = "rgba(0,200,5,0.12)";
  const accent = tokens.colors.accent;
  const muted = tokens.colors.muted;

  return (
    <View
      style={{
        height: size,
        width: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: face,
        borderWidth: 1,
        borderColor: stroke,
      }}
    >
      <Svg width={size * 0.62} height={size * 0.62} viewBox="0 0 64 64">
        <Circle cx="32" cy="32" r="28" fill="rgba(0,0,0,0.15)" stroke={stroke} strokeWidth="2" />
        {/* eyes */}
        <Circle cx="24" cy="28" r="3" fill={muted} />
        <Circle cx="40" cy="28" r="3" fill={muted} />

        {state === "happy" ? (
          <Path d="M22 38c3 5 17 5 20 0" stroke={accent} strokeWidth="4" strokeLinecap="round" />
        ) : state === "thinking" ? (
          <>
            <Path d="M22 40c3-3 17-3 20 0" stroke={muted} strokeWidth="4" strokeLinecap="round" />
            <Circle cx="50" cy="18" r="3" fill={accent} opacity="0.9" />
            <Circle cx="54" cy="26" r="2" fill={accent} opacity="0.6" />
          </>
        ) : (
          <Path d="M24 40h16" stroke={muted} strokeWidth="4" strokeLinecap="round" />
        )}
      </Svg>
    </View>
  );
}

export default CharacterWidget;

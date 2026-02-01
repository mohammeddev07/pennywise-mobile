import React from "react";
import Svg, { Defs, LinearGradient, Stop, Path } from "react-native-svg";

export function Sparkline() {
  // Matches the screenshot path closely
  const d = "M0,45 C30,40 50,55 80,35 C110,15 140,40 170,30 C200,20 230,25 260,10 C280,0 290,5 300,15";
  const fillD = `${d} V60 H0 Z`;

  return (
    <Svg width="100%" height="100%" viewBox="0 0 300 60">
      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="rgba(255,255,255,0.5)" />
          <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </LinearGradient>
      </Defs>

      <Path d={d} fill="none" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      <Path d={fillD} fill="url(#grad)" opacity={0.3} />
    </Svg>
  );
}

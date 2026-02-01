import React from "react";
import { View, type ViewProps } from "react-native";

type Props = ViewProps & {
  padded?: boolean;
};

export function Screen({ padded = false, className, ...rest }: Props) {
  return (
    <View
      className={`flex-1 bg-backgroundLight dark:bg-backgroundDark ${padded ? "px-5" : ""} ${className ?? ""}`}
      {...rest}
    />
  );
}

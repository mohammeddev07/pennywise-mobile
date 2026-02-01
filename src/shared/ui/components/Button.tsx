import { Pressable, Text, View } from "react-native";

type Variant = "primary" | "ghost";
type Size = "lg" | "md";

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "lg",
  className = "",
  disabled
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  className?: string;
  disabled?: boolean;
}) {
  const base =
    "w-full items-center justify-center rounded-xl " +
    (size === "lg" ? "py-4" : "py-3") +
    (disabled ? " opacity-40" : "");

  const styles =
    variant === "primary"
      ? " bg-accent"
      : " bg-transparent border border-stroke";

  const textStyles =
    variant === "primary" ? " text-black" : " text-text";

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={base + styles + " " + className}
      android_ripple={{ color: "#00000022" }}
      style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}
    >
      <Text className={"text-base font-semibold" + textStyles}>{label}</Text>
    </Pressable>
  );
}

export function LinkButton({
  label,
  onPress
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: "#FFFFFF12" }}
      style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
    >
      <Text className="text-accent font-semibold">{label}</Text>
    </Pressable>
  );
}

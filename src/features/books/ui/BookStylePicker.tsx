import { View } from "react-native";
import {
  BOOK_COLORS,
  BOOK_ICONS,
  type BookColor,
  type BookIcon,
} from "../constants";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Icon } from "@/shared/ui/components/Icon";
import { AppText } from "@/shared/ui/components/AppText";
import { tokens } from "@/shared/ui/theme/tokens";
export function BookStylePicker({
  icon,
  color,
  onIcon,
  onColor,
  disabled,
}: {
  icon: BookIcon;
  color: BookColor;
  onIcon: (icon: BookIcon) => void;
  onColor: (color: BookColor) => void;
  disabled: boolean;
}) {
  return (
    <View style={{ gap: 12 }}>
      <AppText tone="muted">Color & icon</AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
        {(Object.keys(BOOK_COLORS) as BookColor[]).map((key) => (
          <HapticPressable
            key={key}
            accessibilityRole="radio"
            accessibilityLabel={`${key} book color`}
            accessibilityState={{
              selected: key === color,
              checked: key === color,
              disabled,
            }}
            disabled={disabled}
            onPress={() => onColor(key)}
            pressOpacity={1}
            disabledOpacity={1}
            style={{
              width: 48,
              height: 48,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 2,
                borderColor: color === key ? "#00C805" : "transparent",
                padding: 2,
                backgroundColor: "#0B0D0F",
              }}
            >
              <View
                style={{
                  flex: 1,
                  borderRadius: 18,
                  backgroundColor: BOOK_COLORS[key],
                }}
              />
            </View>
          </HapticPressable>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(Object.keys(BOOK_ICONS) as BookIcon[]).map((key) => (
          <HapticPressable
            key={key}
            accessibilityRole="radio"
            accessibilityLabel={`${key} book icon`}
            accessibilityState={{
              selected: key === icon,
              checked: key === icon,
              disabled,
            }}
            disabled={disabled}
            onPress={() => onIcon(key)}
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 2,
              borderColor: key === icon ? "#00C805" : tokens.colors.stroke,
              backgroundColor: tokens.colors.surface,
            }}
          >
            <Icon name={BOOK_ICONS[key]} size={24} color={tokens.colors.text} />
          </HapticPressable>
        ))}
      </View>
    </View>
  );
}

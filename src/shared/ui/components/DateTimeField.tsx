import { useState } from "react";
import { View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { format, isSameDay, setHours, setMinutes, setSeconds, subDays } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";
import { Button } from "@/shared/ui/components/Button";
import { Icon } from "@/shared/ui/components/Icon";
import { BottomSheetModal } from "@/shared/ui/components/BottomSheetModal";

function dateLabel(value: Date) {
  const now = new Date();
  if (isSameDay(value, now)) return "Today";
  if (isSameDay(value, subDays(now, 1))) return "Yesterday";
  return format(value, "MMM d");
}

function timeLabel(value: Date) {
  return format(value, "h:mm a");
}

/** Moves `value` onto today's calendar date, keeping its time of day. */
function withToday(value: Date) {
  const now = new Date();
  return setSeconds(setMinutes(setHours(now, value.getHours()), value.getMinutes()), value.getSeconds());
}

/** Moves `value` onto the current time, keeping its calendar date. */
function withNow(value: Date) {
  const now = new Date();
  return setSeconds(setMinutes(setHours(value, now.getHours()), now.getMinutes()), now.getSeconds());
}

type Props = {
  mode: "date" | "time";
  label: string;
  value: Date;
  onChange: (next: Date) => void;
  style?: object;
};

/**
 * One inline field - "Date" or "Time" - that opens its own bottom sheet
 * picker without leaving the screen. Replaces the old combined "Date & Time"
 * row that pushed a separate route.
 */
export function DateTimeField({ mode, label, value, onChange, style }: Props) {
  const [visible, setVisible] = useState(false);

  const onPickerChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    onChange(selected);
  };

  const isToday = mode === "date" && isSameDay(value, new Date());

  return (
    <View style={style}>
      <AppText variant="xs" tone="muted" style={{ marginBottom: tokens.space[2] }}>
        {label.toUpperCase()}
      </AppText>
      <HapticPressable
        onPress={() => setVisible(true)}
        haptic="none"
        pressScale={0.995}
        pressOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${mode === "date" ? dateLabel(value) : timeLabel(value)}`}
        android_ripple={{ color: tokens.colors.ripple }}
        style={{
          height: tokens.layout.controlHeight,
          flexDirection: "row",
          alignItems: "center",
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          borderColor: tokens.colors.stroke,
          backgroundColor: tokens.colors.surface,
          paddingHorizontal: tokens.space[4],
        }}
      >
        <Icon
          name={mode === "date" ? "calendar-outline" : "time-outline"}
          size={tokens.icon.row}
          color={tokens.colors.muted}
        />
        <AppText variant="base" numberOfLines={1} style={{ flex: 1, marginLeft: tokens.space[3] }}>
          {mode === "date" ? dateLabel(value) : timeLabel(value)}
        </AppText>
      </HapticPressable>

      <BottomSheetModal
        visible={visible}
        onClose={() => setVisible(false)}
        title={mode === "date" ? "Date" : "Time"}
        rightAction={
          <HapticPressable
            onPress={() => onChange(mode === "date" ? withToday(value) : withNow(value))}
            haptic="selection"
            pressScale={0.97}
            accessibilityRole="button"
            accessibilityLabel={mode === "date" ? "Set to today" : "Set to now"}
            style={{
              minHeight: tokens.layout.minTap,
              paddingHorizontal: tokens.space[3],
              justifyContent: "center",
              opacity: mode === "date" && isToday ? 0.4 : 1,
            }}
            disabled={mode === "date" && isToday}
          >
            <AppText variant="sm" weight="semibold" style={{ color: tokens.colors.accent }}>
              {mode === "date" ? "Today" : "Now"}
            </AppText>
          </HapticPressable>
        }
        footer={<Button label="Done" onPress={() => setVisible(false)} size="lg" />}
      >
        <DateTimePicker
          value={value}
          mode={mode}
          display="spinner"
          themeVariant="dark"
          textColor={tokens.colors.text}
          onChange={onPickerChange}
        />
      </BottomSheetModal>
    </View>
  );
}

export default DateTimeField;

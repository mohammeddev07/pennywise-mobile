import { useState } from "react";
import { Platform, View } from "react-native";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { format, isSameDay, setHours, setMinutes, setSeconds, subDays } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";
import { Button } from "@/shared/ui/components/Button";
import { Icon } from "@/shared/ui/components/Icon";
import { BottomSheetModal } from "@/shared/ui/components/BottomSheetModal";
import { WebDateInput } from "@/shared/ui/components/WebDateInput";

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
 * One inline field - "Date" or "Time" - that opens its own picker without
 * leaving the screen. Replaces the old combined "Date & Time" row that pushed
 * a separate route.
 *
 * Android renders through `DateTimePickerAndroid.open`, a one-shot imperative
 * call, rather than mounting the declarative `<DateTimePicker>` component.
 * The declarative Android component re-presents its native dialog from a
 * `useEffect` keyed on `onChange`'s identity - since that prop is a fresh
 * closure every render, any unrelated re-render of this screen while the
 * dialog was open reopened it, and it could reappear right after Cancel/OK.
 * The imperative API opens exactly once per tap and never re-fires on its
 * own, so this is a correctness fix, not a style choice.
 *
 * Web has no native `DateTimePicker` at all - the library's generic fallback
 * renders `null` and just warns. Tapping the field there used to open this
 * sheet with nothing inside it, which looked exactly like a dead button. The
 * sheet now renders `WebDateInput` (a real `<input type="date"|"time">`) on
 * web instead.
 */
export function DateTimeField({ mode, label, value, onChange, style }: Props) {
  const [visible, setVisible] = useState(false);

  const isToday = mode === "date" && isSameDay(value, new Date());

  const openPicker = () => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value,
        mode,
        onChange: (_event: DateTimePickerEvent, selected?: Date) => {
          if (selected) onChange(selected);
        },
      });
      return;
    }
    setVisible(true);
  };

  return (
    <View style={style}>
      <AppText variant="xs" tone="muted" style={{ marginBottom: tokens.space[2] }}>
        {label.toUpperCase()}
      </AppText>
      <HapticPressable
        onPress={openPicker}
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

      {Platform.OS === "ios" || Platform.OS === "web" ? (
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
          {Platform.OS === "web" ? (
            <WebDateInput mode={mode} value={value} onChange={onChange} />
          ) : (
            <DateTimePicker
              value={value}
              mode={mode}
              display="spinner"
              themeVariant="dark"
              textColor={tokens.colors.text}
              onChange={(_event, selected) => {
                if (selected) onChange(selected);
              }}
            />
          )}
        </BottomSheetModal>
      ) : null}
    </View>
  );
}

export default DateTimeField;

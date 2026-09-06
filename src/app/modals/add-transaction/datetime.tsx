import { useEffect, useMemo, useState } from "react";
import { Platform, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { format, parseISO } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Sheet } from "@/shared/ui/components/Sheet";
import { AppText } from "@/shared/ui/components/AppText";
import { SelectRow } from "@/shared/ui/components/SelectRow";
import { Button } from "@/shared/ui/components/Button";
import { Card } from "@/shared/ui/components/Card";
import { IconButton } from "@/shared/ui/components/IconButton";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";
import { Icon } from "@/shared/ui/components/Icon";

function parseWhen(iso: string) {
  try {
    const parsed = parseISO(iso);
    if (Number.isNaN(parsed.getTime())) {
      return { value: new Date(), isValid: false };
    }
    return { value: parsed, isValid: true };
  } catch {
    return { value: new Date(), isValid: false };
  }
}

export default function DateTimeModal() {
  const router = useRouter();

  const occurredAt = useAddTransactionDraftStore((s) => s.occurredAt);
  const setOccurredAt = useAddTransactionDraftStore((s) => s.setOccurredAt);

  const parsed = useMemo(() => parseWhen(occurredAt), [occurredAt]);
  const [value, setValue] = useState<Date>(parsed.value);
  const [showMode, setShowMode] = useState<"date" | "time" | null>(null);
  const [hasParseError, setHasParseError] = useState(!parsed.isValid);

  useEffect(() => {
    setOccurredAt(value.toISOString());
  }, [setOccurredAt, value]);

  const dateLabel = useMemo(() => format(value, "MMM d, yyyy"), [value]);
  const timeLabel = useMemo(() => format(value, "h:mm a"), [value]);

  const onChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowMode(null);
    if (!selected) return;
    setHasParseError(false);
    setValue(selected);
  };

  // "Now" is a real shortcut, not decoration - it is the fastest way back to
  // the present after scrolling the spinner, and it is the recovery path when
  // a stored timestamp cannot be parsed.
  const setNow = () => {
    setHasParseError(false);
    setValue(new Date());
  };

  return (
    <View style={{ flex: 1, backgroundColor: tokens.colors.app }}>
      <Sheet
        tone="app"
        className="flex-1"
        title="Date & time"
        leftAction={
          <IconButton icon="chevron-back" accessibilityLabel="Back" onPress={() => router.back()} />
        }
        rightAction={
          <HapticPressable
            onPress={setNow}
            haptic="selection"
            pressScale={0.97}
            accessibilityRole="button"
            accessibilityLabel="Set to now"
            android_ripple={{ color: tokens.colors.ripple, borderless: true }}
            style={{
              minHeight: tokens.layout.minTap,
              paddingHorizontal: tokens.space[3],
              justifyContent: "center",
            }}
          >
            <AppText variant="sm" weight="semibold" style={{ color: tokens.colors.accent }}>
              Now
            </AppText>
          </HapticPressable>
        }
        footer={<Button label="Done" onPress={() => router.back()} size="lg" />}
      >
        {hasParseError ? (
          <Card variant="surface" padding={16} style={{ marginBottom: tokens.space[4] }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.space[2] }}>
              <Icon name="alert-circle-outline" size={18} color={tokens.colors.danger} />
              <AppText variant="base" tone="danger">
                Stored timestamp was invalid.
              </AppText>
            </View>
            <AppText variant="sm" tone="muted" style={{ marginTop: tokens.space[2] }}>
              Reset to the current time and save again.
            </AppText>
            <Button
              label="Use now"
              variant="secondary"
              size="md"
              onPress={setNow}
              style={{ marginTop: tokens.space[4] }}
            />
          </Card>
        ) : null}

        <View style={{ gap: tokens.space[2] }}>
          <SelectRow label="Date" value={dateLabel} onPress={() => setShowMode("date")} />
          <SelectRow label="Time" value={timeLabel} onPress={() => setShowMode("time")} />
        </View>

        {Platform.OS === "ios" ? (
          <View style={{ marginTop: tokens.space[4], gap: tokens.space[3] }}>
            <Card variant="surface" padding={0} style={{ overflow: "hidden" }}>
              <DateTimePicker
                value={value}
                mode="date"
                display="spinner"
                themeVariant="dark"
                textColor={tokens.colors.text}
                onChange={onChange}
              />
            </Card>
            <Card variant="surface" padding={0} style={{ overflow: "hidden" }}>
              <DateTimePicker
                value={value}
                mode="time"
                display="spinner"
                themeVariant="dark"
                textColor={tokens.colors.text}
                onChange={onChange}
              />
            </Card>
          </View>
        ) : null}

        {Platform.OS === "android" && showMode ? (
          <DateTimePicker value={value} mode={showMode} onChange={onChange} />
        ) : null}
      </Sheet>
    </View>
  );
}

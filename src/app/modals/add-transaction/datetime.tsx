import { useEffect, useMemo, useState } from "react";
import { Platform, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";

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

  const setNow = () => {
    setHasParseError(false);
    setValue(new Date());
  };

  return (
    <View className="flex-1 bg-app">
      <Sheet
        tone="app"
        className="flex-1"
        title="Date & time"
        leftAction={
          <HapticPressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
          </HapticPressable>
        }
        rightAction={
          <HapticPressable
            onPress={setNow}
            haptic="selection"
            pressScale={0.98}
            className="h-12 min-w-12 px-3 items-center justify-center rounded-full bg-surface border border-stroke"
            android_ripple={{ color: "#FFFFFF12", borderless: true }}
          >
            <AppText variant="sm" className="text-accent">
              Now
            </AppText>
          </HapticPressable>
        }
        footer={<Button label="Done" onPress={() => router.back()} size="md" />}
      >
        {hasParseError ? (
          <Card variant="surface" className="mt-2">
            <AppText variant="base" tone="danger">
              Stored timestamp was invalid.
            </AppText>
            <AppText variant="sm" tone="muted" className="mt-2">
              Reset to the current time and save again.
            </AppText>
            <Button label="Use now" variant="ghost" size="md" onPress={setNow} className="mt-4" />
          </Card>
        ) : null}

        <SelectRow label="Date" value={dateLabel} onPress={() => setShowMode("date")} className="mt-2" />

        <SelectRow label="Time" value={timeLabel} onPress={() => setShowMode("time")} className="mt-2" />

        <Card variant="surface" className="mt-4">
          <AppText variant="xs" tone="muted">
            Preview
          </AppText>
          <AppText variant="lg" className="mt-2">
            {format(value, "MMM d, yyyy · h:mm a")}
          </AppText>
        </Card>

        {Platform.OS === "ios" ? (
          <View className="mt-6 gap-3">
            <Card variant="surface">
              <DateTimePicker value={value} mode="date" display="spinner" onChange={onChange} />
            </Card>
            <Card variant="surface">
              <DateTimePicker value={value} mode="time" display="spinner" onChange={onChange} />
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

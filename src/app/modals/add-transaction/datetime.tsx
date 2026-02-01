import { useEffect, useMemo, useState } from "react";
import { Platform, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { parseISO, format } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";

function safeParse(iso: string) {
  try {
    return parseISO(iso);
  } catch {
    return new Date();
  }
}

export default function DateTimeModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const occurredAt = useAddTransactionDraftStore((s) => s.occurredAt);
  const setOccurredAt = useAddTransactionDraftStore((s) => s.setOccurredAt);

  const [value, setValue] = useState<Date>(() => safeParse(occurredAt));
  const [showMode, setShowMode] = useState<"date" | "time" | null>(null);

  // ✅ auto-save as user changes
  useEffect(() => {
    setOccurredAt(value.toISOString());
  }, [setOccurredAt, value]);

  const dateLabel = useMemo(() => format(value, "MMM d, yyyy"), [value]);
  const timeLabel = useMemo(() => format(value, "h:mm a"), [value]);

  const onChange = (e: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowMode(null);
    if (!selected) return;
    setValue(selected);
  };

  const setNow = () => setValue(new Date());

  const close = () => router.back();

  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 18 }}>
      {/* Header */}
      <View className="px-6 flex-row items-center justify-between">
        <HapticPressable
          onPress={close}
          className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12", borderless: true }}
        >
          <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
        </HapticPressable>

        <Text className="text-text font-semibold">Date & time</Text>

        <HapticPressable
          onPress={setNow}
          haptic="selection"
          pressScale={0.97}
          className="h-12 px-5 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12" }}
        >
          <Text style={{ color: tokens.colors.accent }} className="font-semibold">
            Now
          </Text>
        </HapticPressable>
      </View>

      <View className="px-6 mt-10" style={{ gap: 14 }}>
        <HapticPressable
          onPress={() => setShowMode("date")}
          haptic="selection"
          pressScale={0.99}
          className="rounded-3xl border border-stroke bg-surface px-5 py-4"
          android_ripple={{ color: "#FFFFFF10" }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-muted text-xs">Date</Text>
              <Text className="text-text text-lg mt-1">{dateLabel}</Text>
            </View>
            <Ionicons name="calendar-outline" size={18} color={tokens.colors.muted} />
          </View>
        </HapticPressable>

        <HapticPressable
          onPress={() => setShowMode("time")}
          haptic="selection"
          pressScale={0.99}
          className="rounded-3xl border border-stroke bg-surface px-5 py-4"
          android_ripple={{ color: "#FFFFFF10" }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-muted text-xs">Time</Text>
              <Text className="text-text text-lg mt-1">{timeLabel}</Text>
            </View>
            <Ionicons name="time-outline" size={18} color={tokens.colors.muted} />
          </View>
        </HapticPressable>

        <View className="mt-2 rounded-3xl border border-stroke bg-surface px-5 py-4">
          <Text className="text-muted text-xs">Preview</Text>
          <Text className="text-text text-lg mt-1">{format(value, "MMM d, yyyy · h:mm a")}</Text>
        </View>
      </View>

      {/* iOS inline pickers */}
      {Platform.OS === "ios" ? (
        <View className="px-6 mt-8" style={{ gap: 16 }}>
          <View className="rounded-3xl border border-stroke bg-surface px-3 py-3">
            <DateTimePicker value={value} mode="date" display="spinner" onChange={onChange} />
          </View>
          <View className="rounded-3xl border border-stroke bg-surface px-3 py-3">
            <DateTimePicker value={value} mode="time" display="spinner" onChange={onChange} />
          </View>
        </View>
      ) : null}

      {/* Android popover picker */}
      {Platform.OS === "android" && showMode ? (
        <DateTimePicker value={value} mode={showMode} onChange={onChange} />
      ) : null}

      <View className="px-6 mt-auto">
        <HapticPressable
          onPress={close}
          haptic="impactLight"
          pressScale={0.99}
          className="h-12 items-center justify-center rounded-full bg-accent"
          android_ripple={{ color: "#00000022" }}
        >
          <Text className="text-black font-semibold">Done</Text>
        </HapticPressable>
      </View>
    </View>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { useAddTransactionDraftStore } from "@/features/transactions/addDraftStore";

function clampNote(s: string) {
  // keep it reasonable for storage + UI
  return s.slice(0, 400);
}

export default function NoteModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const existing = useAddTransactionDraftStore((s) => s.note);
  const setNote = useAddTransactionDraftStore((s) => s.setNote);

  const [value, setValue] = useState(existing ?? "");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  // ✅ Auto-save while typing
  useEffect(() => {
    setNote(clampNote(value));
  }, [setNote, value]);

  const quick = useMemo(
    () => ["Split bill", "Business expense", "Reimbursable", "Receipt saved", "Recurring"],
    []
  );

  const saveAndClose = () => {
    setNote(clampNote(value.trim()));
    Keyboard.dismiss();
    router.back();
  };

  const appendChip = (t: string) => {
    Haptics.selectionAsync().catch(() => {});
    setValue((prev) => {
      const p = (prev ?? "").trim();
      const next = p.length ? `${p}${p.endsWith(".") ? "" : "."} ${t}` : t;
      return clampNote(next);
    });
  };

  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 18 }}>
      {/* Header */}
      <View className="px-6 flex-row items-center justify-between">
        <HapticPressable
          onPress={() => router.back()}
          className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12", borderless: true }}
        >
          <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
        </HapticPressable>

        <Text className="text-text font-semibold">Note</Text>

        <HapticPressable
          onPress={saveAndClose}
          haptic="selection"
          pressScale={0.97}
          className="h-12 px-5 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12" }}
        >
          <Text style={{ color: tokens.colors.accent }} className="font-semibold">
            Save
          </Text>
        </HapticPressable>
      </View>

      <View className="px-6 mt-10 flex-1">
        <Text className="text-muted text-xs">Details (optional)</Text>

        <View className="mt-3 rounded-3xl border border-stroke bg-surface px-5 py-4">
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={(t) => setValue(clampNote(t))}
            placeholder="Add more context…"
            placeholderTextColor={tokens.colors.muted}
            className="text-text text-base"
            multiline
            textAlignVertical="top"
            style={{ minHeight: 160 }}
            returnKeyType="done"
            blurOnSubmit
          />

          <View className="flex-row items-center justify-between mt-4">
            <Text className="text-muted text-xs">Saved automatically</Text>
            <Text className="text-muted text-xs">{value.length}/400</Text>
          </View>
        </View>

        {/* Quick chips */}
        <View className="mt-6">
          <Text className="text-muted text-xs uppercase tracking-widest mb-3">Quick add</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {quick.map((t) => (
              <Pressable
                key={t}
                onPress={() => appendChip(t)}
                className="mr-3 rounded-full border border-stroke bg-surface px-4 py-2"
                android_ripple={{ color: "#FFFFFF10", borderless: true }}
              >
                <Text className="text-text font-semibold">{t}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Done */}
      <View className="px-6">
        <HapticPressable
          onPress={saveAndClose}
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

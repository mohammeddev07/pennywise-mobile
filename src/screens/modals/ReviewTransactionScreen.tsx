import React, { useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../app/navigation/navigationTypes";

type Props = NativeStackScreenProps<RootStackParamList, "ReviewTransaction">;

type RouteParams = {
  amountMinor?: number; // cents
  currencySymbol?: string; // "$"
  categoryLabel?: string; // "Food"
  categoryEmoji?: string; // "🍕"
  note?: string; // optional
};

function formatAmount(amountMinor?: number, currencySymbol = "$") {
  const minor = typeof amountMinor === "number" ? amountMinor : 5420;
  const major = (minor / 100).toFixed(2);
  return `${currencySymbol}${major}`;
}

export function ReviewTransactionScreen({ navigation, route }: Props) {


  const params: RouteParams = route?.params ?? {};
  const amountText = useMemo(
    () => formatAmount(params.amountMinor, params.currencySymbol ?? "$"),
    [params.amountMinor, params.currencySymbol]
  );

  const categoryText = `${params.categoryEmoji ?? ""} ${params.categoryLabel ?? "Food"}`.trim();
  const noteText = params.note?.trim();

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className="relative px-5 pt-8">
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.goBack()}
          className="absolute left-5 top-8 h-10 w-10 items-start justify-center"
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text className="text-3xl leading-none text-white">×</Text>
        </TouchableOpacity>

        <View className="h-10 items-center justify-center">
          <Text className="text-xs font-semibold tracking-[3px] text-white/45">
            REVIEW TRANSACTION
          </Text>
        </View>
      </View>

      {/* Content */}
      <View className="flex-1 px-5">
        {/* Hero amount */}
        <View className="mt-24 items-center">
          <Text className="text-[64px] font-extrabold tracking-[-1px] text-white">
            {amountText}
          </Text>
        </View>

        {/* Details card */}
        <View className="mt-16 rounded-3xl bg-zinc-900 px-5 py-2">
          {/* Row 1: Category */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              // UI-only for now. Later: navigate to category picker.
            }}
            className="flex-row items-center justify-between py-5"
            accessibilityRole="button"
            accessibilityLabel="Category"
          >
            <Text className="text-base font-medium text-white/55">Category</Text>

            <View className="flex-row items-center">
              <Text className="text-base font-semibold text-[#00C805]">
                {categoryText}
              </Text>
              <Text className="ml-3 text-xl text-white/35">›</Text>
            </View>
          </TouchableOpacity>

          <View className="h-px bg-white/10" />

          {/* Row 2: Note */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              // UI-only for now. Later: open note editor.
            }}
            className="flex-row items-center justify-between py-5"
            accessibilityRole="button"
            accessibilityLabel="Note"
          >
            <Text className="text-base font-medium text-white/55">Note</Text>

            <View className="flex-row items-center">
              <Text className={`text-base ${noteText ? "text-white" : "text-white/45 italic"}`}>
                {noteText ?? "Add optional note..."}
              </Text>
              <Text className="ml-3 text-xl text-white/35">›</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer: Swipe-to-submit (visual) */}
      <View className="absolute bottom-0 left-0 right-0 bg-[#00C805] px-5 pb-9 pt-4">
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            // UI-only. Later: replace with an actual swipe-up gesture (Reanimated/PanGesture).
            // For now, you can simulate "submit" by closing:
            navigation.goBack();
          }}
          className="items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Swipe up to submit"
        >
          <Text className="text-2xl font-black leading-none text-white">˄</Text>
          <Text className="mt-2 text-xs font-extrabold tracking-[4px] text-white">
            SWIPE UP TO SUBMIT
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

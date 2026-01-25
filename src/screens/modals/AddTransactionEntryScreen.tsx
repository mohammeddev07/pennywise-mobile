import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";

type TxType = "EXPENSE" | "INCOME";

const EMERALD = "#00C805";

function formatAmountFromInput(raw: string, currencySymbol = "$") {
  // raw is like "150.00" or "0" or "12.3"
  if (!raw) return `${currencySymbol}0.00`;

  // Ensure valid numeric string for display; clamp to 2 decimals visually
  const [intPart, decPart = ""] = raw.split(".");
  const safeInt = intPart.replace(/^0+(?=\d)/, "") || "0";
  const safeDec = decPart.slice(0, 2).padEnd(2, "0");
  return `${currencySymbol}${safeInt}.${safeDec}`;
}

function addChar(current: string, char: string) {
  // Allow digits and one decimal point, max 2 decimals.
  if (char === ".") {
    if (current.includes(".")) return current;
    return current.length === 0 ? "0." : `${current}.`;
  }

  // digit
  if (current === "0") return char; // replace leading zero
  const [_, decPart] = current.split(".");
  if (current.includes(".") && (decPart?.length ?? 0) >= 2) return current; // max 2 decimals
  return `${current}${char}`;
}

function backspace(current: string) {
  if (!current) return "";
  const next = current.slice(0, -1);
  return next === "0" ? "" : next;
}

type Key =
  | { kind: "num"; label: string }
  | { kind: "dot"; label: "." }
  | { kind: "back"; label: "⌫" };

const KEYS: Key[] = [
  { kind: "num", label: "1" },
  { kind: "num", label: "2" },
  { kind: "num", label: "3" },
  { kind: "num", label: "4" },
  { kind: "num", label: "5" },
  { kind: "num", label: "6" },
  { kind: "num", label: "7" },
  { kind: "num", label: "8" },
  { kind: "num", label: "9" },
  { kind: "dot", label: "." },
  { kind: "num", label: "0" },
  { kind: "back", label: "⌫" }
];

export function AddTransactionEntryScreen() {
  const navigation = useNavigation<any>();

  const [txType, setTxType] = useState<TxType>("EXPENSE");
  const [amountRaw, setAmountRaw] = useState<string>("150.00"); // seed like screenshot; set "" if you want empty
  const [categoryLabel] = useState<string>("Food & Dining");
  const [noteLabel] = useState<string>("Add Note (Optional)");

  const amountText = useMemo(() => formatAmountFromInput(amountRaw, "$"), [amountRaw]);

  const onPressKey = (k: Key) => {
    if (k.kind === "back") {
      setAmountRaw((s) => backspace(s));
      return;
    }
    if (k.kind === "dot") {
      setAmountRaw((s) => addChar(s, "."));
      return;
    }
    setAmountRaw((s) => addChar(s, k.label));
  };

  const headerLabel = txType === "EXPENSE" ? "Expense" : "Income";

  return (
    <View className="flex-1 bg-black">
      {/* Header */}
      <View className="px-5 pt-8">
        <View className="flex-row items-center justify-between">
          {/* Close */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
            className="h-10 w-10 items-start justify-center"
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text className="text-3xl leading-none text-white">×</Text>
          </TouchableOpacity>

          {/* Segmented control center */}
          <View className="flex-1 items-center">
            <View className="w-[220px] flex-row rounded-full bg-zinc-900 p-1">
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setTxType("EXPENSE")}
                className={`flex-1 items-center justify-center rounded-full py-2 ${
                  txType === "EXPENSE" ? "bg-[#00C805]" : ""
                }`}
                accessibilityRole="button"
                accessibilityLabel="Expense"
              >
                <Text
                  className={`text-xs font-semibold ${
                    txType === "EXPENSE" ? "text-black" : "text-white/70"
                  }`}
                >
                  Expense
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setTxType("INCOME")}
                className={`flex-1 items-center justify-center rounded-full py-2 ${
                  txType === "INCOME" ? "bg-[#00C805]" : ""
                }`}
                accessibilityRole="button"
                accessibilityLabel="Income"
              >
                <Text
                  className={`text-xs font-semibold ${
                    txType === "INCOME" ? "text-black" : "text-white/70"
                  }`}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Right spacer to keep center aligned */}
          <View className="h-10 w-10" />
        </View>
      </View>

      {/* Body */}
      <View className="flex-1 px-5">
        {/* Hero amount */}
        <View className="mt-16 items-center">
          <Text className="text-[72px] font-extrabold tracking-[-1.5px] text-white">
            {amountText}
          </Text>
          <Text className="mt-2 text-xs font-semibold tracking-[3px] text-white/35">
            {headerLabel.toUpperCase()}
          </Text>
        </View>

        {/* Details rows (subtle) */}
        <View className="mt-14">
          {/* Row: Category */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              // UI-only placeholder: later open category picker modal
            }}
            className="flex-row items-center justify-between py-5"
            accessibilityRole="button"
            accessibilityLabel="Category"
          >
            <Text className="text-base font-medium text-zinc-400">Category</Text>

            <View className="flex-row items-center">
              <Text className="text-base font-semibold text-zinc-200">🍕 {categoryLabel}</Text>
              <Text className="ml-3 text-xl text-zinc-500">›</Text>
            </View>
          </TouchableOpacity>

          <View className="h-px bg-white/10" />

          {/* Row: Note */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              // UI-only placeholder: later open note editor
            }}
            className="flex-row items-center justify-between py-5"
            accessibilityRole="button"
            accessibilityLabel="Note"
          >
            <Text className="text-base font-medium text-zinc-400">Note</Text>

            <View className="flex-row items-center">
              <Text className="text-base text-zinc-400 italic">{noteLabel}</Text>
              <Text className="ml-3 text-xl text-zinc-500">›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Spacer pushes keypad + footer to bottom */}
        <View className="flex-1" />

        {/* Custom keypad */}
        <View className="px-2 pb-28">
          <View className="flex-row flex-wrap">
            {KEYS.map((k, idx) => {
              const isBack = k.kind === "back";
              return (
                <TouchableOpacity
                  key={`${k.label}-${idx}`}
                  activeOpacity={0.7}
                  onPress={() => onPressKey(k)}
                  className="h-[74px] w-1/3 items-center justify-center"
                  accessibilityRole="button"
                  accessibilityLabel={isBack ? "Backspace" : `Key ${k.label}`}
                >
                  <Text
                    className={`text-[34px] font-semibold ${
                      isBack ? "text-[#00C805]" : "text-[#00C805]"
                    }`}
                    style={{ color: EMERALD }}
                  >
                    {k.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* Bottom action bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-[#00C805] px-5 pb-9 pt-4">
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => {
            // For now navigate to your Review screen if you created it.
            // Example: navigation.navigate("ReviewTransaction", { ... })
            navigation.navigate?.("ReviewTransaction", {
              amountMinor: Math.round(Number(amountRaw || "0") * 100),
              currencySymbol: "$",
              categoryLabel,
              categoryEmoji: "🍕",
              note: ""
            });
          }}
          className="items-center justify-center"
          accessibilityRole="button"
          accessibilityLabel="Review Order"
        >
          <Text className="text-2xl font-black leading-none text-white">˄</Text>
          <Text className="mt-2 text-xs font-extrabold tracking-[4px] text-white">
            REVIEW ORDER
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

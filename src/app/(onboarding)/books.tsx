import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useBooksStore } from "@/features/books/useBooksStore";

export default function BooksScreen() {
  const books = useBooksStore((s) => s.books);
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const selectBook = useBooksStore((s) => s.selectBook);

  return (
    <View className="flex-1 bg-app px-6 pt-14 pb-10">
      <View>
        <Text className="text-text text-2xl font-semibold">Your books</Text>
        <Text className="text-muted mt-2 text-base">
          Choose a book to start tracking.
        </Text>
      </View>

      <View className="mt-8 gap-3">
        {books.map((b) => {
          const active = b.id === selectedBookId;
          return (
            <Pressable
              key={b.id}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                selectBook(b.id);
                router.push("/(onboarding)/currency");
              }}
              className={[
                "rounded-2xl border px-4 py-4",
                active ? "border-accent bg-surface" : "border-stroke bg-surface",
              ].join(" ")}
              android_ripple={{ color: "#FFFFFF10" }}
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-text text-lg font-semibold">{b.name}</Text>
                  {!!b.subtitle && <Text className="text-muted mt-1">{b.subtitle}</Text>}
                </View>
                <Ionicons
                  name={active ? "checkmark-circle" : "chevron-forward"}
                  size={18}
                  color={active ? "#00C805" : "#93A4B7"}
                />
              </View>
            </Pressable>
          );
        })}
      </View>

      <View className="mt-auto">
        <Text className="text-muted text-xs text-center">
          Next: choose currency.
        </Text>
      </View>
    </View>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { tokens } from "@/shared/ui/theme/tokens";
import { Button } from "@/shared/ui/components/Button";
import { TextField } from "@/shared/ui/components/TextField";
import { useCategoriesStore } from "@/features/categories/store";

const ICONS = [
  "pricetag-outline",
  "fast-food-outline",
  "basket-outline",
  "car-outline",
  "home-outline",
  "cart-outline",
  "cafe-outline",
  "airplane-outline",
  "fitness-outline",
  "medical-outline",
  "gift-outline",
  "cash-outline",
  "card-outline",
  "wallet-outline"
] as const;

const COLORS = ["#00C805", "#60A5FA", "#A78BFA", "#F472B6", "#FFB020", "#34D399", "#F87171", "#94A3B8"];

export default function CategoryEditorModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();

  const categories = useCategoriesStore((s) => s.categories);
  const addCategory = useCategoriesStore((s) => s.addCategory);
  const updateCategory = useCategoriesStore((s) => s.updateCategory);

  const editing = useMemo(() => {
    const id = params.id;
    if (!id) return null;
    return categories.find((c) => c.id === id) ?? null;
  }, [categories, params.id]);

  const [name, setName] = useState("");
  const [icon, setIcon] = useState<(typeof ICONS)[number]>("pricetag-outline");
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (!editing) {
      setName("");
      setIcon("pricetag-outline");
      setColor(COLORS[0]);
      return;
    }
    setName(editing.name);
    setIcon((editing.icon as any) ?? "pricetag-outline");
    setColor(editing.color ?? COLORS[0]);
  }, [editing]);

  const title = editing ? "Edit category" : "New category";

  const onSave = () => {
    Haptics.selectionAsync().catch(() => {});
    if (editing) {
      updateCategory(editing.id, { name, icon, color });
    } else {
      addCategory({ name, icon, color });
    }
    router.back();
  };

  return (
    <View className="flex-1 bg-app px-6" style={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 18 }}>
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            router.back();
          }}
          className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12", borderless: true }}
        >
          <Ionicons name="close" size={20} color={tokens.colors.text} />
        </Pressable>

        <Text className="text-text text-base font-semibold">{title}</Text>
        <View className="h-12 w-12" />
      </View>

      {/* Form */}
      <View className="mt-8 gap-6">
        <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Groceries" />

        <View>
          <Text className="text-muted text-xs font-semibold tracking-widest">ICON</Text>
          <View className="mt-3 flex-row flex-wrap">
            {ICONS.map((n) => {
              const active = n === icon;
              return (
                <Pressable
                  key={n}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setIcon(n);
                  }}
                  className="h-12 w-12 items-center justify-center rounded-2xl border mr-3 mb-3"
                  style={{
                    borderColor: active ? tokens.colors.accent : tokens.colors.stroke,
                    backgroundColor: active ? "#00C80514" : tokens.colors.surface
                  }}
                  android_ripple={{ color: "#FFFFFF10", borderless: true }}
                >
                  <Ionicons name={n as any} size={20} color={active ? tokens.colors.accent : tokens.colors.text} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Text className="text-muted text-xs font-semibold tracking-widest">COLOR</Text>
          <View className="mt-3 flex-row flex-wrap">
            {COLORS.map((c) => {
              const active = c === color;
              return (
                <Pressable
                  key={c}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setColor(c);
                  }}
                  className="h-11 w-11 items-center justify-center rounded-full border mr-3 mb-3"
                  style={{
                    borderColor: active ? tokens.colors.text : tokens.colors.stroke,
                    backgroundColor: tokens.colors.surface
                  }}
                  android_ripple={{ color: "#FFFFFF10", borderless: true }}
                >
                  <View className="h-7 w-7 rounded-full" style={{ backgroundColor: c }} />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View className="mt-auto">
        <Button label={editing ? "Save changes" : "Create category"} onPress={onSave} />
      </View>
    </View>
  );
}

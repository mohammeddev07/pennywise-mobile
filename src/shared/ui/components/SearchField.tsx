import { TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "@/shared/ui/theme/tokens";

export function SearchField({
  value,
  onChangeText,
  placeholder = "Search transactions",
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View className="flex-row items-center rounded-2xl border border-stroke bg-surface px-4 py-3">
      <Ionicons name="search" size={18} color={tokens.colors.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.colors.muted}
        className="ml-3 flex-1 text-text"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
    </View>
  );
}

import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

export default function BookSwitcherModal() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-ink px-6 pt-16">
      <Text className="text-white text-2xl font-bold">Switch Books</Text>
      <Text className="text-zinc-400 mt-2">
        Step 3 will implement the bottom sheet + blur. For now this is a placeholder route.
      </Text>

      <View className="mt-8 gap-3">
        <Pressable
          className="rounded-2xl bg-zinc-950/70 border border-zinc-800 p-4"
          onPress={async () => {
            await Haptics.selectionAsync();
            router.replace("/(tabs)/home");
          }}
        >
          <Text className="text-white font-semibold">Personal</Text>
          <Text className="text-zinc-500 mt-1 text-xs">Main • Last synced 2m ago</Text>
        </Pressable>

        <Pressable className="rounded-2xl bg-zinc-950/40 border border-zinc-900 p-4" onPress={() => {}}>
          <Text className="text-white font-semibold">Business</Text>
          <Text className="text-zinc-500 mt-1 text-xs">LLC • 5 new transactions</Text>
        </Pressable>

        <Pressable className="rounded-2xl bg-zinc-950/40 border border-zinc-900 p-4" onPress={() => {}}>
          <Text className="text-white font-semibold">Vacation</Text>
          <Text className="text-zinc-500 mt-1 text-xs">Savings • Goal reached 45%</Text>
        </Pressable>
      </View>

      <Pressable className="mt-8 self-start px-5 py-3 rounded-full bg-zinc-900" onPress={() => router.back()}>
        <Text className="text-white font-semibold">Close</Text>
      </Pressable>
    </View>
  );
}

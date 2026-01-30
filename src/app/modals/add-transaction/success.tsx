import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import ConfettiCannon from "react-native-confetti-cannon";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AddTransactionSuccess() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  return (
    <View
      className="flex-1 bg-ink px-6 items-center justify-center"
      style={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 14 }}
    >
      <ConfettiCannon count={70} origin={{ x: 0, y: 0 }} fadeOut />

      <Text className="text-text text-2xl font-semibold">Transaction logged</Text>
      <Text className="text-muted mt-2 text-center">
        Optimistic insert into activity feed comes next.
      </Text>

      <Pressable
        onPress={() => router.replace("/(tabs)/home")}
        className="mt-10 h-12 w-full items-center justify-center rounded-full bg-accent"
        android_ripple={{ color: "#00000022", borderless: false }}
      >
        <Text className="text-black font-semibold">Back to Home</Text>
      </Pressable>
    </View>
  );
}

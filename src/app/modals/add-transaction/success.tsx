import { useEffect } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import ConfettiCannon from "react-native-confetti-cannon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AddTransactionSuccess() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get("window");

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  return (
    <View
      className="flex-1 bg-ink items-center justify-center px-6"
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}
    >
      <ConfettiCannon count={90} fadeOut origin={{ x: width / 2, y: 0 }} />

      <Text className="text-text text-2xl font-semibold">Transaction logged</Text>
      <Text className="text-muted mt-2 text-center">
        Added to your activity feed.
      </Text>

      <Pressable
        onPress={() => router.replace("/(tabs)/home")}
        className="mt-10 w-full rounded-full bg-accent py-4 items-center"
        android_ripple={{ color: "#00000022", borderless: false }}
      >
        <Text style={{ color: "#000000", fontWeight: "800", letterSpacing: 1 }}>
          DONE
        </Text>
      </Pressable>
    </View>
  );
}

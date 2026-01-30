import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button, LinkButton } from "@/shared/ui/components/Button";
import { TextField } from "@/shared/ui/components/TextField";
import * as Haptics from "expo-haptics";

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View className="flex-1 bg-app px-6 pt-14 pb-10">
      {/* Header */}
      <View className="flex-row items-center">
        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            const canGoBack =
              typeof (router as any).canGoBack === "function"
                ? (router as any).canGoBack()
                : false;

            if (canGoBack) router.back();
            else router.replace("/(auth)/welcome");
          }}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12", borderless: true }}
        >
          <Ionicons name="chevron-back" size={22} color="#E7EEF8" />
        </Pressable>
        <Text className="text-text text-xl font-semibold ml-4">Create account</Text>
      </View>

      <Text className="text-muted mt-3 text-base">
        Minimal setup now. We’ll personalize in onboarding.
      </Text>

      {/* Form */}
      <View className="mt-8 gap-5">
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="alex@email.com"
          keyboardType="email-address"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Create a password"
          secureTextEntry
        />
      </View>

      <View className="mt-auto gap-4">
        <Button label="Continue" onPress={() => router.push("/(auth)/pin")} />
        <View className="flex-row justify-center gap-2">
          <Text className="text-muted">Already have one?</Text>
          <LinkButton label="Log in" onPress={() => router.replace("/(auth)/login")} />
        </View>
      </View>
    </View>
  );
}

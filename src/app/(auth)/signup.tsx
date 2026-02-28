import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button, LinkButton } from "@/shared/ui/components/Button";
import { Input } from "@/shared/ui/components/Input";
import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { tokens } from "@/shared/ui/theme/tokens";

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleBack = () => {
    const canGoBack = typeof (router as any).canGoBack === "function" ? (router as any).canGoBack() : false;
    if (canGoBack) router.back();
    else router.replace("/(auth)/welcome");
  };

  return (
    <View className="flex-1 bg-app px-6 pt-14 pb-10">
      <View className="flex-row items-center">
        <HapticPressable
          onPress={handleBack}
          haptic="selection"
          className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12", borderless: true }}
        >
          <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
        </HapticPressable>

        <AppText variant="xl" className="ml-3">
          Create account
        </AppText>
      </View>

      <AppText variant="base" tone="muted" className="mt-3">
        Minimal setup now. We&apos;ll personalize in onboarding.
      </AppText>

      <View className="mt-8 gap-5">
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="alex@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Create a password"
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      <View className="mt-auto gap-4">
        <Button label="Continue" onPress={() => router.push("/(auth)/pin")} />

        <View className="flex-row justify-center gap-2 items-center">
          <AppText variant="sm" tone="muted">
            Already have one?
          </AppText>
          <LinkButton label="Log in" onPress={() => router.replace("/(auth)/login")} />
        </View>
      </View>
    </View>
  );
}

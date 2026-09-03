import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Button, LinkButton } from "@/shared/ui/components/Button";
import { Input } from "@/shared/ui/components/Input";
import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { tokens } from "@/shared/ui/theme/tokens";
import { useAuthStore } from "@/features/auth/store";
import { useBooksStore } from "@/features/books/store";
import { getAuthErrorMessage } from "@/shared/api/errors";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const login = useAuthStore((s) => s.login);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const loadBooks = useBooksStore((s) => s.loadBooks);

  const emailError = submitted && !isEmail(email) ? "Enter a valid email." : undefined;
  const passwordError = submitted && password.trim().length < 8 ? "Enter at least 8 characters." : undefined;

  const handleBack = () => {
    const canGoBack = typeof (router as any).canGoBack === "function" ? (router as any).canGoBack() : false;
    if (canGoBack) router.back();
    else router.replace("/(auth)/welcome");
  };

  const onContinue = async () => {
    setSubmitted(true);
    setApiError("");
    if (!isEmail(email) || password.trim().length < 8) return;
    setIsSubmitting(true);
    try {
      await login(email, password);
      const books = await loadBooks();
      if (books.length > 0) {
        completeOnboarding();
        router.replace("/(tabs)/home");
      } else {
        router.replace("/(onboarding)/currency");
      }
    } catch (err) {
      setApiError(getAuthErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-app px-5 pt-14 pb-10">
      <View className="flex-row items-center">
        <HapticPressable
          onPress={handleBack}
          haptic="selection"
          className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: tokens.colors.ripple, borderless: true }}
        >
          <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
        </HapticPressable>

        <AppText variant="xl" className="ml-3">
          Log in
        </AppText>
      </View>

      <AppText variant="base" tone="muted" className="mt-3">
        Welcome back. Sign in to continue.
      </AppText>

      <View className="mt-8 gap-5">
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="alex@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={320}
          error={emailError}
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          autoCapitalize="none"
          maxLength={128}
          error={passwordError}
        />

        {apiError ? (
          <AppText variant="sm" tone="danger">
            {apiError}
          </AppText>
        ) : null}
      </View>

      <View className="mt-auto gap-4">
        <Button label={isSubmitting ? "Signing in..." : "Continue"} onPress={onContinue} disabled={isSubmitting} />

        <View className="flex-row justify-center gap-2 items-center">
          <AppText variant="sm" tone="muted">
            No account?
          </AppText>
          <LinkButton label="Create one" onPress={() => router.replace("/(auth)/signup")} />
        </View>
      </View>
    </View>
  );
}

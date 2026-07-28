import { Redirect } from "expo-router";

import { useAuthStore } from "@/features/auth/store";

export default function Index() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const sessionStatus = useAuthStore((s) => s.sessionStatus);
  const onboardingCompleted = useAuthStore((s) => s.onboardingCompleted);

  if (sessionStatus === "resolving") return null;
  if (sessionStatus !== "authenticated" || !accessToken || !user) {
    return <Redirect href="/(auth)/welcome" />;
  }
  return <Redirect href={onboardingCompleted ? "/(tabs)/home" : "/(onboarding)/currency"} />;
}

import { useEffect, useState } from "react";
import { Redirect } from "expo-router";

import { useAuthStore } from "@/features/auth/store";

export default function Index() {
  const unlocked = useAuthStore((s) => s.unlocked);
  const onboardingCompleted = useAuthStore((s) => s.onboardingCompleted);

  const persist = (useAuthStore as any).persist;
  const [hydrated, setHydrated] = useState<boolean>(() => persist?.hasHydrated?.() ?? true);

  useEffect(() => {
    if (!persist?.onFinishHydration) return;
    const unsub = persist.onFinishHydration(() => setHydrated(true));
    if (persist?.hasHydrated && !persist.hasHydrated()) persist?.rehydrate?.();
    return () => unsub?.();
  }, [persist]);

  if (!hydrated) return null;

  if (unlocked && onboardingCompleted) return <Redirect href="/(tabs)/home" />;
  if (unlocked) return <Redirect href="/(onboarding)/books" />;
  return <Redirect href="/(auth)/welcome" />;
}

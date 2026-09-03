import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { tokens } from "@/shared/ui/theme/tokens";
import { NumericKeypad } from "@/shared/ui/NumericKeypad";
import { PinDots } from "@/shared/ui/components/PinDots";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";
import { useAuthStore } from "@/features/auth/store";

const LOCAL_UNLOCK_PIN = "1234";

export default function PinRoute() {
  return <Redirect href="/" />;
}

function LegacyPinScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const didNavigateRef = useRef(false);
  const setUnlocked = useAuthStore((s) => s.setUnlocked);
  const onboardingCompleted = useAuthStore((s) => s.onboardingCompleted);
  const user = useAuthStore((s) => s.user);

  const handleBack = () => {
    const canGoBack = typeof (router as any).canGoBack === "function" ? (router as any).canGoBack() : false;

    if (canGoBack) router.back();
    else router.replace("/(auth)/welcome");
  };

  const addDigit = (key: string) => {
    setError("");
    if (key === ".") return;
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      return prev + key;
    });
  };

  const deleteDigit = () => {
    setError("");
    setPin((prev) => prev.slice(0, -1));
  };

  useEffect(() => {
    if (pin.length !== 4) return;
    if (didNavigateRef.current) return;

    if (pin === LOCAL_UNLOCK_PIN && user) {
      didNavigateRef.current = true;
      setUnlocked(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace(onboardingCompleted ? "/(tabs)/home" : "/(onboarding)/currency");
      return;
    }

    setError("That PIN did not match.");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    const t = setTimeout(() => setPin(""), 250);
    return () => clearTimeout(t);
  }, [onboardingCompleted, pin, router, setUnlocked, user]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <HapticPressable
          onPress={handleBack}
          style={styles.backButton}
          android_ripple={{ color: tokens.colors.ripple, borderless: true }}
        >
          <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
        </HapticPressable>

        <View style={styles.headerCopy}>
          <AppText variant="xl">Secure your account</AppText>
          <AppText variant="sm" tone="muted" style={styles.headerSubtitle}>
            Enter your 4-digit PIN
          </AppText>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.heroIcon}>
          <Ionicons name="shield-checkmark" size={44} color={tokens.colors.accent} />
        </View>

        <View style={styles.pinCluster}>
          <PinDots length={4} filled={pin.length} />
          <AppText variant="xs" tone="muted" style={styles.demoText}>
            Local unlock PIN: 1234
          </AppText>

          {error ? (
            <AppText variant="sm" tone="danger" style={styles.errorText}>
              {error}
            </AppText>
          ) : null}
        </View>

        <View style={styles.keypadWrap}>
          <NumericKeypad onPress={addDigit} onDelete={deleteDigit} decimalAllowed={false} />
        </View>

        <View style={styles.biometricBlock}>
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <AppText variant="sm" tone="muted" style={{ marginHorizontal: tokens.space[4] }}>
              OR
            </AppText>
            <View style={styles.orLine} />
          </View>
          <HapticPressable
            onPress={() => setPin(LOCAL_UNLOCK_PIN)}
            haptic="selection"
            pressScale={0.98}
            style={styles.biometricButton}
            android_ripple={{ color: tokens.colors.ripple }}
          >
            <Ionicons name="finger-print" size={30} color={tokens.colors.accent} />
            <AppText variant="base" weight="semibold" style={{ marginLeft: 12, color: tokens.colors.accent }}>
              Use fingerprint to unlock
            </AppText>
          </HapticPressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: tokens.colors.app,
    paddingHorizontal: tokens.space[6],
    paddingTop: tokens.space[8],
    paddingBottom: tokens.space[7],
  },
  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: tokens.radii.pill,
    borderWidth: 1,
    borderColor: tokens.colors.stroke,
    backgroundColor: tokens.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
    marginLeft: tokens.space[3],
  },
  headerSubtitle: {
    marginTop: tokens.space[1],
  },
  body: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: tokens.space[6],
  },
  heroIcon: {
    width: 112,
    height: 112,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  pinCluster: {
    alignItems: "center",
    paddingTop: tokens.space[6],
  },
  demoText: {
    marginTop: tokens.space[4],
  },
  errorText: {
    ...tokens.typography.sm,
    marginTop: tokens.space[4],
    textAlign: "center",
  },
  keypadWrap: {
    alignItems: "center",
  },
  biometricBlock: {
    gap: tokens.space[5],
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: tokens.colors.stroke,
  },
  biometricButton: {
    minHeight: 56,
    borderRadius: tokens.radii.pill,
    backgroundColor: tokens.colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
});

import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { tokens } from "@/shared/ui/theme/tokens";
import { NumericKeypad } from "@/shared/ui/NumericKeypad";
import { PinDots } from "@/shared/ui/components/PinDots";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";
import { DEMO_PIN, useAuthStore } from "@/features/auth/store";

const COLORS = {
  bg: tokens.colors.app,
  surface: tokens.colors.surface,
  card: tokens.colors.card,
  stroke: tokens.colors.stroke,
  text: tokens.colors.text,
  muted: tokens.colors.muted,
  danger: tokens.colors.danger,
} as const;

const SPACING = {
  0: tokens.space[0],
  4: tokens.space[1],
  8: tokens.space[2],
  12: tokens.space[3],
  16: tokens.space[4],
  20: tokens.space[5],
  24: tokens.space[6],
  32: tokens.space[7],
  40: tokens.space[8],
} as const;

const RADIUS = {
  pill: tokens.radii.pill,
} as const;

const TYPOGRAPHY = tokens.typography;

export default function PinScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const didNavigateRef = useRef(false);
  const unlockDemo = useAuthStore((s) => s.unlockDemo);
  const onboardingCompleted = useAuthStore((s) => s.onboardingCompleted);

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

    if (pin === DEMO_PIN) {
      didNavigateRef.current = true;
      unlockDemo();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace(onboardingCompleted ? "/(tabs)/home" : "/(onboarding)/books");
      return;
    }

    setError("That PIN did not match. Try 1234 for this demo.");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    const t = setTimeout(() => setPin(""), 250);
    return () => clearTimeout(t);
  }, [onboardingCompleted, pin, router, unlockDemo]);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <HapticPressable
          onPress={handleBack}
          style={styles.backButton}
          android_ripple={{ color: "#0B122012", borderless: true }}
        >
          <Ionicons name="chevron-back" size={20} color={COLORS.text} />
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
            Demo access PIN: 1234
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
            <AppText variant="sm" tone="muted" style={{ marginHorizontal: SPACING[16] }}>
              OR
            </AppText>
            <View style={styles.orLine} />
          </View>
          <HapticPressable
            onPress={() => setPin(DEMO_PIN)}
            haptic="selection"
            pressScale={0.98}
            style={styles.biometricButton}
            android_ripple={{ color: "#0B122012" }}
          >
            <Ionicons name="finger-print" size={30} color={tokens.colors.accent} />
            <AppText variant="base" style={{ marginLeft: 12, color: tokens.colors.accent, fontFamily: "Inter_600SemiBold" }}>
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
    backgroundColor: COLORS.bg,
    paddingHorizontal: SPACING[24],
    paddingTop: SPACING[40],
    paddingBottom: SPACING[32],
  },
  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.stroke,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
    marginLeft: SPACING[12],
  },
  headerSubtitle: {
    marginTop: SPACING[4],
  },
  body: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: SPACING[24],
  },
  heroIcon: {
    width: 112,
    height: 112,
    borderRadius: RADIUS.pill,
    backgroundColor: tokens.colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  pinCluster: {
    alignItems: "center",
    paddingTop: SPACING[24],
  },
  demoText: {
    marginTop: SPACING[16],
  },
  errorText: {
    ...TYPOGRAPHY.sm,
    marginTop: SPACING[16],
    textAlign: "center",
  },
  keypadWrap: {
    alignItems: "center",
  },
  biometricBlock: {
    gap: SPACING[20],
  },
  orRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.stroke,
  },
  biometricButton: {
    minHeight: 56,
    borderRadius: RADIUS.pill,
    backgroundColor: tokens.colors.greenSoft,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
});

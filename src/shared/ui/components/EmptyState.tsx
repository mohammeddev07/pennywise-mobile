import React, { type ReactNode } from "react";
import { View } from "react-native";
import clsx from "clsx";

import { AppText } from "@/shared/ui/components/AppText";
import { Button } from "@/shared/ui/components/Button";
import { tokens } from "@/shared/ui/theme/tokens";
import { Icon, type IconName } from "./Icon";

type Props = {
  title: string;
  message?: string;
  /** Custom illustration. A muted glyph is used when omitted. */
  icon?: ReactNode;
  iconName?: IconName;
  /**
   * Empty states are one of the four places the product allows an emoji (the
   * others are the greeting, the success sub-line and the note placeholder).
   * When set it replaces the glyph tile entirely.
   */
  emoji?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Errors get a red glyph; ordinary emptiness stays neutral. */
  tone?: "neutral" | "danger";
  className?: string;
};

/**
 * The shared empty / error state. Loading is `Skeleton`, success is
 * `SuccessState` - between them every feature has the same four states.
 */
export function EmptyState({
  title,
  message,
  icon,
  iconName,
  emoji,
  actionLabel,
  onAction,
  tone = "neutral",
  className,
}: Props) {
  const glyphColor = tone === "danger" ? tokens.colors.danger : tokens.colors.subtle;

  return (
    <View className={clsx("w-full items-center justify-center", className)}>
      {icon ??
        (emoji ? (
          <AppText style={{ fontSize: 34, marginBottom: tokens.space[3] }}>{emoji}</AppText>
        ) : (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: tokens.radii.pill,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: tone === "danger" ? tokens.colors.redSoft : tokens.colors.neutralSoft,
            marginBottom: tokens.space[4],
          }}
        >
          <Icon
            name={iconName ?? (tone === "danger" ? "alert-circle-outline" : "sparkles-outline")}
            size={24}
            color={glyphColor}
          />
        </View>
        ))}

      <AppText variant="lg" style={{ textAlign: "center" }}>
        {title}
      </AppText>

      {message ? (
        <AppText
          variant="sm"
          tone="muted"
          style={{ textAlign: "center", marginTop: tokens.space[2], maxWidth: 320 }}
        >
          {message}
        </AppText>
      ) : null}

      {actionLabel && onAction ? (
        <View style={{ marginTop: tokens.space[6], width: "100%", maxWidth: 320 }}>
          <Button label={actionLabel} onPress={onAction} size="md" variant="secondary" />
        </View>
      ) : null}
    </View>
  );
}

export default EmptyState;

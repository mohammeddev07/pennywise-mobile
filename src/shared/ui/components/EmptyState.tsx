import React, { type ReactNode } from "react";
import { View } from "react-native";
import clsx from "clsx";

import { AppText } from "@/shared/ui/components/AppText";
import { Button } from "@/shared/ui/components/Button";

type Props = {
  title: string;
  message?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({ title, message, icon, actionLabel, onAction, className }: Props) {
  return (
    <View className={clsx("w-full items-center justify-center px-6", className)}>
      {icon ? <View className="mb-4">{icon}</View> : null}

      <AppText variant="lg" className="text-center">
        {title}
      </AppText>

      {message ? (
        <AppText variant="base" tone="muted" className="text-center mt-4">
          {message}
        </AppText>
      ) : null}

      {actionLabel && onAction ? (
        <View className="mt-6 w-full">
          <Button label={actionLabel} onPress={onAction} size="md" />
        </View>
      ) : null}
    </View>
  );
}

export default EmptyState;

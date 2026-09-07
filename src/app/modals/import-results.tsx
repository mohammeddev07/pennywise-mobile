import { useEffect } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { Button } from "@/shared/ui/components/Button";
import { Card } from "@/shared/ui/components/Card";
import { EmptyState } from "@/shared/ui/components/EmptyState";
import { useImportResultStore } from "@/features/imports/store";
import type { ImportRowError } from "@/shared/types/api";

function StatTile({ label, value, tone }: { label: string; value: number; tone?: "danger" | "muted" }) {
  return (
    <View className="flex-1">
      <AppText variant="xl" weight="bold" style={tone === "danger" ? { color: tokens.colors.danger } : undefined}>
        {value}
      </AppText>
      <AppText variant="xs" tone="muted" className="mt-0.5">
        {label}
      </AppText>
    </View>
  );
}

function ErrorRow({ item }: { item: ImportRowError }) {
  return (
    <Card variant="surface" className="flex-row items-start">
      <View
        className="h-8 w-8 items-center justify-center rounded-full mr-3"
        style={{ backgroundColor: tokens.colors.redSoft }}
      >
        <AppText variant="xs" weight="semibold" style={{ color: tokens.colors.danger }}>
          {item.rowNumber}
        </AppText>
      </View>
      <View className="flex-1">
        <AppText variant="sm" weight="semibold">
          {item.code}
        </AppText>
        <AppText variant="xs" tone="muted" className="mt-0.5">
          {item.message}
        </AppText>
      </View>
    </Card>
  );
}

export default function ImportResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const result = useImportResultStore((s) => s.result);
  const clearResult = useImportResultStore((s) => s.clear);

  useEffect(() => () => clearResult(), [clearResult]);

  if (!result) {
    return (
      <View className="flex-1 bg-app items-center justify-center px-6" style={{ paddingTop: insets.top }}>
        <EmptyState
          title="No import to show"
          message="Start a new import from Profile & Settings."
          actionLabel="Done"
          onAction={() => router.replace("/(tabs)/settings")}
        />
      </View>
    );
  }

  const hasFailures = result.failedCount > 0;

  return (
    <View
      className="flex-1 bg-app px-6"
      style={{ paddingTop: insets.top + tokens.space[6], paddingBottom: insets.bottom + tokens.space[4] }}
    >
      <View className="items-center">
        <View
          className="h-20 w-20 items-center justify-center rounded-full"
          style={{ backgroundColor: hasFailures ? tokens.colors.amberSoft : tokens.colors.greenSoft }}
        >
          <Ionicons
            name={hasFailures ? "alert-circle-outline" : "checkmark"}
            size={40}
            color={hasFailures ? tokens.colors.warning : tokens.semantic.primary}
          />
        </View>

        <AppText variant="2xl" className="mt-6 text-center">
          {hasFailures ? "Import finished with errors" : "Import complete"}
        </AppText>
        <AppText variant="sm" tone="muted" className="mt-2 text-center">
          {result.importedCount} of {result.totalRows} rows added to the current cash book.
        </AppText>
      </View>

      <Card variant="surface" className="mt-6 flex-row">
        <StatTile label="Imported" value={result.importedCount} />
        <StatTile label="Blank" value={result.skippedBlankCount} />
        <StatTile label="Duplicate" value={result.skippedDuplicateCount} />
        <StatTile label="Failed" value={result.failedCount} tone={hasFailures ? "danger" : undefined} />
      </Card>

      {result.categoriesCreated.length > 0 ? (
        <Card variant="surface" className="mt-3">
          <AppText variant="sm" tone="muted">
            New categories created
          </AppText>
          <AppText variant="sm" className="mt-1">
            {result.categoriesCreated.join(", ")}
          </AppText>
        </Card>
      ) : null}

      {result.errors.length > 0 ? (
        <View className="flex-1 mt-4">
          <AppText variant="sm" tone="muted" className="mb-2">
            Row errors ({result.errors.length})
          </AppText>
          <FlashList
            data={result.errors}
            keyExtractor={(item, index) => `${item.rowNumber}-${index}`}
            renderItem={({ item }) => <ErrorRow item={item} />}
            ItemSeparatorComponent={() => <View className="h-2" />}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <View className="flex-1" />
      )}

      <Button label="Done" size="lg" onPress={() => router.replace("/(tabs)/settings")} className="mt-4" />
    </View>
  );
}

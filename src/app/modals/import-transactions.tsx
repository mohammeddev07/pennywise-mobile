import { useState } from "react";
import { Alert, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import type { DocumentPickerAsset } from "expo-document-picker";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { Button } from "@/shared/ui/components/Button";
import { Card } from "@/shared/ui/components/Card";
import { Sheet } from "@/shared/ui/components/Sheet";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { useBooksStore } from "@/features/books/store";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";
import { useImportResultStore } from "@/features/imports/store";
import { importTransactions } from "@/shared/api/transactions";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function ImportTransactionsModal() {
  const router = useRouter();
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const showError = useUndoToastStore((s) => s.showError);
  const setImportResult = useImportResultStore((s) => s.setResult);

  const [file, setFile] = useState<DocumentPickerAsset | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: XLSX_MIME, copyToCacheDirectory: true });
    if (result.canceled) return;
    setFile(result.assets[0] ?? null);
  };

  const confirmImport = () => {
    if (!file || isImporting) return;
    Alert.alert(
      "Import transactions?",
      `This adds every valid row in "${file.name}" to the current cash book. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Import", onPress: runImport },
      ]
    );
  };

  const runImport = async () => {
    if (!file) return;
    setIsImporting(true);
    try {
      const response = await importTransactions(selectedBookId, {
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType ?? XLSX_MIME,
      });
      setImportResult(response);
      router.replace("/modals/import-results");
    } catch (error) {
      showError(error, "Couldn't import transactions.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <View className="flex-1 bg-app">
      <Sheet
        tone="app"
        className="flex-1"
        title="Import transactions"
        leftAction={
          <HapticPressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
            android_ripple={{ color: "#0B122012", borderless: true }}
          >
            <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
          </HapticPressable>
        }
        footer={
          <Button
            label={isImporting ? "Importing..." : "Import"}
            onPress={confirmImport}
            disabled={!file || isImporting}
            loading={isImporting}
            size="md"
          />
        }
      >
        <AppText variant="sm" tone="muted">
          Pick an .xlsx file exported from PennyWise (or matching its format) to add transactions to the
          current cash book.
        </AppText>

        <HapticPressable
          onPress={pickFile}
          haptic="selection"
          pressScale={0.99}
          className="mt-6"
          disabled={isImporting}
        >
          <Card variant="surface">
            <View className="flex-row items-center">
              <View
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: tokens.colors.greenSoft }}
              >
                <Ionicons name="document-outline" size={22} color={tokens.colors.accent} />
              </View>
              <View className="ml-4 flex-1">
                <AppText variant="base" numberOfLines={1}>
                  {file?.name ?? "Choose a file"}
                </AppText>
                <AppText variant="xs" tone="muted" className="mt-0.5">
                  {file ? "Tap to choose a different file" : "XLSX files only"}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tokens.colors.muted} />
            </View>
          </Card>
        </HapticPressable>
      </Sheet>
    </View>
  );
}

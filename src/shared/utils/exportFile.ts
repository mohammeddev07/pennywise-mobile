import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";

import { ACCESS_TOKEN_KEY, USE_MOCK_API } from "@/shared/api/client";
import { exportTransactionsUrl } from "@/shared/api/transactions";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export class ExportCancelledError extends Error {
  constructor() {
    super("Export cancelled.");
    this.name = "ExportCancelledError";
  }
}

export class MockModeUnsupportedError extends Error {
  constructor() {
    super("Export needs a real backend - not available while EXPO_PUBLIC_MOCK_API=true.");
    this.name = "MockModeUnsupportedError";
  }
}

/**
 * Downloads the book's transactions export and writes it to a location the
 * user can find outside the app: an SAF-picked folder (Android, permission
 * requested once per call) or the app's Documents dir (iOS - visible in the
 * Files app because ios.infoPlist enables UIFileSharingEnabled).
 */
export async function exportTransactionsToDevice(bookId: string): Promise<{ fileName: string }> {
  if (USE_MOCK_API) throw new MockModeUnsupportedError();

  const fileName = `pennywise-export-${bookId}-${Date.now()}.xlsx`;
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

  const cacheUri = `${FileSystem.cacheDirectory}${fileName}`;
  const { uri: downloadedUri } = await FileSystem.downloadAsync(exportTransactionsUrl(bookId), cacheUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (Platform.OS === "android") {
    const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permissions.granted) {
      await FileSystem.deleteAsync(downloadedUri, { idempotent: true });
      throw new ExportCancelledError();
    }

    const base64 = await FileSystem.readAsStringAsync(downloadedUri, { encoding: FileSystem.EncodingType.Base64 });
    const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      fileName,
      XLSX_MIME
    );
    await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
    await FileSystem.deleteAsync(downloadedUri, { idempotent: true });
    return { fileName };
  }

  const destUri = `${FileSystem.documentDirectory}${fileName}`;
  await FileSystem.moveAsync({ from: downloadedUri, to: destUri });
  return { fileName };
}

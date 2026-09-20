import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";

import { ACCESS_TOKEN_KEY, USE_MOCK_API } from "@/shared/api/client";
import { exportQuery, exportTransactionsUrl } from "@/shared/api/transactions";
import type { TransactionQuery } from "@/shared/types/transactionQuery";

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
 * Puts a file already in the cache where the user can find it: an SAF-picked folder
 * (Android, permission requested once per call) or the app's Documents dir (iOS -
 * visible in the Files app because ios.infoPlist enables UIFileSharingEnabled).
 */
async function saveCachedFile(downloadedUri: string, fileName: string): Promise<{ fileName: string }> {
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

/** Downloads the book's whole transactions export (the existing all-book flow). */
export async function exportTransactionsToDevice(bookId: string): Promise<{ fileName: string }> {
  if (USE_MOCK_API) throw new MockModeUnsupportedError();

  const fileName = `pennywise-export-${bookId}-${Date.now()}.xlsx`;
  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);

  const cacheUri = `${FileSystem.cacheDirectory}${fileName}`;
  const { uri: downloadedUri } = await FileSystem.downloadAsync(exportTransactionsUrl(bookId), cacheUri, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  return saveCachedFile(downloadedUri, fileName);
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

/**
 * Exports every row matching the exact applied filter + sort (P1.3), not the visible
 * page. The body is a POST, which the platform download APIs cannot make, so the bytes
 * come through the authenticated API client and are then saved like the all-book export.
 */
export async function exportQueryToDevice(bookId: string, query: TransactionQuery): Promise<{ fileName: string }> {
  if (USE_MOCK_API) throw new MockModeUnsupportedError();

  const fileName = `pennywise-export-filtered-${bookId}-${Date.now()}.xlsx`;
  const bytes = await exportQuery(bookId, query);

  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([bytes], { type: XLSX_MIME }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
    return { fileName };
  }

  const cacheUri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(cacheUri, arrayBufferToBase64(bytes), { encoding: FileSystem.EncodingType.Base64 });
  return saveCachedFile(cacheUri, fileName);
}

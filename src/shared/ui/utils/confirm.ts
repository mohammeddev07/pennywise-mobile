import { Alert, Platform } from "react-native";

/**
 * `Alert.alert` on web (`react-native-web`) is a complete no-op - it neither shows a
 * dialog nor ever invokes a button's `onPress` - so a delete confirmation silently
 * never ran there. `window.confirm` is the browser's native equivalent.
 */
export function confirmDestructive(title: string, message: string, onConfirm: () => void, confirmLabel = "Delete") {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}

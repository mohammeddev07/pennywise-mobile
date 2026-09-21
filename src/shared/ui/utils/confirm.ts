import { Alert, Platform, type AlertButton } from "react-native";

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

/**
 * Drop-in for `Alert.alert`, which is a silent no-op on web - so "Log out?", "Delete category?" and
 * "Import?" dialogs never appeared and their buttons were dead there. On web: one action button ->
 * `window.confirm` (OK runs it); no buttons -> `window.alert`; several actions (long-press menus) ->
 * nothing, because a browser confirm cannot express them.
 */
export function alertCompat(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }
  if (typeof window === "undefined") return;
  const text = message ? `${title}\n\n${message}` : title;
  const actions = (buttons ?? []).filter((b) => b.style !== "cancel");
  if (!buttons || buttons.length === 0) window.alert(text);
  else if (actions.length === 1 && window.confirm(text)) actions[0].onPress?.();
}

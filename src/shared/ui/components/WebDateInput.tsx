import React from "react";
import { format } from "date-fns";

import { tokens } from "@/shared/ui/theme/tokens";

/**
 * `@react-native-community/datetimepicker` has no web implementation - its
 * generic fallback renders `null` and just calls
 * `console.warn("DateTimePicker is not supported on: web")`. On web that made
 * every date/time field in this app look completely dead: the row was
 * tappable, but no picker of any kind ever appeared, so there was nothing to
 * interact with.
 *
 * This renders the one date/time control every browser implements natively -
 * `<input type="date">` / `<input type="time">` - styled to match the app's
 * dark surface. Only reachable when `Platform.OS === "web"`; iOS and Android
 * keep the native `DateTimePicker` / `DateTimePickerAndroid` paths.
 */
export function WebDateInput({
  mode,
  value,
  onChange,
}: {
  mode: "date" | "time";
  value: Date;
  onChange: (next: Date) => void;
}) {
  const inputValue = mode === "date" ? format(value, "yyyy-MM-dd") : format(value, "HH:mm");

  return React.createElement("input", {
    type: mode,
    value: inputValue,
    onChange: (event: { target: { value: string } }) => {
      const raw = event?.target?.value;
      if (!raw) return;

      const next = new Date(value);
      if (mode === "date") {
        const [year, month, day] = raw.split("-").map(Number);
        if (!year || !month || !day) return;
        next.setFullYear(year, month - 1, day);
      } else {
        const [hours, minutes] = raw.split(":").map(Number);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return;
        next.setHours(hours, minutes, 0, 0);
      }
      onChange(next);
    },
    style: {
      width: "100%",
      height: tokens.layout.controlHeight,
      borderRadius: tokens.radii.md,
      border: `1px solid ${tokens.colors.stroke}`,
      background: tokens.colors.surface,
      color: tokens.colors.text,
      padding: "0 16px",
      fontSize: 15,
      fontFamily: "inherit",
      colorScheme: "dark",
      boxSizing: "border-box",
    },
  });
}

export default WebDateInput;

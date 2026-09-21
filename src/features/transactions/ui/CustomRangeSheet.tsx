import { useEffect, useRef, useState } from "react";
import { Platform, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import Animated, { FadeIn } from "react-native-reanimated";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { Button } from "@/shared/ui/components/Button";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { BottomSheetModal, SheetCloseButton } from "@/shared/ui/components/BottomSheetModal";
import { WebDateInput } from "@/shared/ui/components/WebDateInput";
import {
  addMonthsYmd,
  compareYmd,
  formatYmd,
  localDateToYmd,
  ymdToLocalDate,
  type Ymd,
} from "@/shared/utils/ledgerDate";
import { ALL_WINDOW_YEARS_BACK } from "../filterModel";

export type YmdRange = { startDate: Ymd; endDate: Ymd };

type Field = "start" | "end";

/** A range the analyze endpoint accepts: at most 5 years. */
export function rangeError(start: Ymd, end: Ymd): string | null {
  const [lo, hi] = compareYmd(start, end) <= 0 ? [start, end] : [end, start];
  if (compareYmd(hi, addMonthsYmd(lo, 12 * ALL_WINDOW_YEARS_BACK)) > 0) return "Choose a range of at most 5 years.";
  return null;
}

/**
 * Custom date-range picker (draft -> Apply / Reset / Cancel), opened from the
 * "Custom" chip. It stays on Activity - a sheet, never a route.
 *
 * Lifecycle rules, each of which was once a bug here:
 *  - Visibility belongs to the caller's `visible`. Nothing in here ever flips it
 *    back to true: not an effect, not a prop identity change. Every exit (Cancel,
 *    backdrop, hardware back, Apply, Reset) calls `onClose` once.
 *  - The draft is seeded exactly once per open. `initial` is compared by value.
 *  - Exactly one picker exists at a time. iOS mounts one inline spinner for the
 *    field being edited; Android opens one imperative dialog per tap (guarded
 *    while it is up) and never mounts the declarative component, whose effect
 *    re-presented the dialog on every re-render; web renders a native date input.
 *  - Android never opens its dialog from inside this sheet's Modal: a native
 *    date dialog presented over an open RN Modal fails to appear, and the
 *    library swallows the failure. So the sheet steps aside while the dialog
 *    is up (the same thing DateTimeField does by never using a sheet on
 *    Android), and comes back in place - no second slide - with the draft kept.
 *  - A dismissed Android dialog changes nothing. Every way the dialog ends
 *    (set, dismiss, error) releases the guard, so a tile can never go dead.
 *  - Dates are book-local calendar days (`YYYY-MM-DD`) end to end: the pickers'
 *    device-local Dates are converted with local getters, never `toISOString()`.
 */
export function CustomRangeSheet({
  visible,
  onClose,
  initial,
  onApply,
  onReset,
}: {
  visible: boolean;
  onClose: () => void;
  initial: YmdRange;
  onApply: (range: YmdRange) => void;
  onReset: () => void;
}) {
  const [start, setStart] = useState<Ymd>(initial.startDate);
  const [end, setEnd] = useState<Ymd>(initial.endDate);
  const [editing, setEditing] = useState<Field>("start");
  // Android only: the field whose native dialog is up. While set, the sheet is
  // hidden and further taps are ignored - it is the one-dialog guard.
  const [picking, setPicking] = useState<Field | null>(null);
  // Once the sheet has stepped aside for a dialog, it returns without sliding.
  const [returning, setReturning] = useState(false);
  const dialogUp = useRef(false);

  // Seed once per open; depends on the range's values, not the object identity.
  useEffect(() => {
    if (!visible) return;
    setStart(initial.startDate);
    setEnd(initial.endDate);
    setEditing("start");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initial.startDate, initial.endDate]);

  // Closing the sheet with a native dialog still up must take the dialog with it.
  useEffect(() => {
    if (visible) return;
    setPicking(null);
    setReturning(false);
    if (Platform.OS === "android" && dialogUp.current) {
      dialogUp.current = false;
      // Resolves false (or rejects) when nothing is showing; either is fine.
      Promise.resolve(DateTimePickerAndroid.dismiss("date")).catch(() => {});
    }
  }, [visible]);

  const setField = (field: Field, ymd: Ymd) => (field === "start" ? setStart(ymd) : setEnd(ymd));

  // Present the dialog only after the render that hid the sheet has committed,
  // so the Modal is already gone when the native dialog asks for the screen.
  useEffect(() => {
    if (Platform.OS !== "android" || !visible || !picking) return;
    const field = picking;
    const done = () => {
      dialogUp.current = false;
      setPicking(null);
    };
    dialogUp.current = true;
    DateTimePickerAndroid.open({
      value: ymdToLocalDate(field === "start" ? start : end),
      mode: "date",
      onValueChange: (_event, selected) => {
        if (selected) setField(field, localDateToYmd(selected));
        done();
      },
      // Cancel, tap outside, back: the draft is left alone.
      onDismiss: done,
      // The library catches presentation failures and only reports them here;
      // without this the guard would stay up and both tiles would go dead.
      onError: done,
    });
    // `start`/`end` are read once, for the dialog's initial value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picking, visible]);

  const openField = (field: Field) => {
    setEditing(field);
    if (Platform.OS !== "android") return;
    setReturning(true);
    setPicking((current) => current ?? field);
  };

  const error = rangeError(start, end);
  const value = editing === "start" ? start : end;

  const tile = (field: Field, label: string, ymd: Ymd) => (
    <HapticPressable
      onPress={() => openField(field)}
      haptic="none"
      pressScale={0.99}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${formatYmd(ymd)}`}
      style={{
        flex: 1,
        height: tokens.layout.controlHeight,
        justifyContent: "center",
        paddingHorizontal: tokens.space[4],
        borderRadius: tokens.radii.md,
        borderWidth: 1.5,
        borderColor: editing === field ? tokens.colors.accent : tokens.colors.stroke,
        backgroundColor: tokens.colors.surface,
      }}
    >
      <AppText variant="xs" tone="muted">
        {label.toUpperCase()}
      </AppText>
      <AppText variant="base" weight="semibold" style={{ marginTop: 2 }}>
        {formatYmd(ymd)}
      </AppText>
    </HapticPressable>
  );

  return (
    <BottomSheetModal
      visible={visible && !picking}
      animateIn={!returning}
      onClose={onClose}
      title="Custom range"
      rightAction={<SheetCloseButton onPress={onClose} />}
    >
      <View style={{ flexDirection: "row", gap: tokens.space[3] }}>
        {tile("start", "Start date", start)}
        {tile("end", "End date", end)}
      </View>

      {Platform.OS === "ios" ? (
        <Animated.View key={editing} entering={FadeIn.duration(tokens.motion.fast)} style={{ marginTop: tokens.space[4] }}>
          <DateTimePicker
            value={ymdToLocalDate(value)}
            mode="date"
            display="spinner"
            themeVariant="dark"
            textColor={tokens.colors.text}
            onChange={(_event, selected) => {
              if (selected) setField(editing, localDateToYmd(selected));
            }}
          />
        </Animated.View>
      ) : Platform.OS === "web" ? (
        <View style={{ marginTop: tokens.space[4] }}>
          <WebDateInput mode="date" value={ymdToLocalDate(value)} onChange={(next) => setField(editing, localDateToYmd(next))} />
        </View>
      ) : null}

      {error ? (
        <AppText variant="sm" tone="danger" style={{ marginTop: tokens.space[3] }}>
          {error}
        </AppText>
      ) : null}

      <View style={{ flexDirection: "row", gap: tokens.space[3], marginTop: tokens.space[5] }}>
        <Button
          label="Reset"
          variant="ghost"
          size="md"
          style={{ flex: 1 }}
          onPress={() => {
            onReset();
            onClose();
          }}
        />
        <Button label="Cancel" variant="secondary" size="md" style={{ flex: 1 }} onPress={onClose} />
        <Button
          label="Apply"
          size="md"
          style={{ flex: 1 }}
          disabled={Boolean(error)}
          onPress={() => {
            const [lo, hi] = compareYmd(start, end) <= 0 ? [start, end] : [end, start];
            onApply({ startDate: lo, endDate: hi });
            onClose();
          }}
        />
      </View>
    </BottomSheetModal>
  );
}

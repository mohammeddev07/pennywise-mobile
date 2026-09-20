import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { Button } from "@/shared/ui/components/Button";
import { FilterChip } from "@/shared/ui/components/FilterChip";
import { FormField } from "@/shared/ui/components/FormField";
import { BottomSheetModal, SheetCloseButton } from "@/shared/ui/components/BottomSheetModal";
import { currencyMinorUnitDigits, currencySymbol, parseAmountToMinor } from "@/shared/utils/formatCurrency";
import type { PaymentMethod } from "@/shared/types/transactionQuery";
import { PAYMENT_OPTIONS, minorToDecimalText } from "../filterModel";

const amountText = (minor: number | null, currency: string) => (minor === null ? "" : minorToDecimalText(minor, currency));
import { TEXT_DEBOUNCE_MS } from "./useDebouncedText";

type CategoryOption = { id: string; name: string; type: "INCOME" | "EXPENSE"; icon: string; color: string };

/** Discrete choices apply the moment they are tapped; the sheet is just where they live. */
export function CategoryFilterSheet({
  visible,
  onClose,
  options,
  selected,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  options: CategoryOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const groups: Array<{ title: string; items: CategoryOption[] }> = [
    { title: "EXPENSE", items: options.filter((o) => o.type === "EXPENSE") },
    { title: "INCOME", items: options.filter((o) => o.type === "INCOME") },
  ];

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      scroll
      title="Categories"
      rightAction={<SheetCloseButton onPress={onClose} />}
      footer={
        <View style={{ flexDirection: "row", gap: tokens.space[3] }}>
          <Button label="Clear" variant="secondary" size="md" style={{ flex: 1 }} onPress={() => onChange([])} disabled={selected.length === 0} />
          <Button label="Done" size="md" style={{ flex: 1 }} onPress={onClose} />
        </View>
      }
    >
      {options.length === 0 ? (
        <AppText variant="sm" tone="muted">
          No categories in this book yet.
        </AppText>
      ) : null}
      {groups
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <View key={g.title} style={{ marginBottom: tokens.space[4] }}>
            <AppText variant="xs" tone="muted" style={{ marginBottom: tokens.space[2] }}>
              {g.title}
            </AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tokens.space[2] }}>
              {g.items.map((c) => (
                <FilterChip
                  key={c.id}
                  label={c.name}
                  icon={c.icon}
                  iconColor={c.color}
                  active={selected.includes(c.id)}
                  role="category"
                  onPress={() => toggle(c.id)}
                />
              ))}
            </View>
          </View>
        ))}
    </BottomSheetModal>
  );
}

export function PaymentFilterSheet({
  visible,
  onClose,
  methods,
  unspecified,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  methods: PaymentMethod[];
  unspecified: boolean;
  onChange: (methods: PaymentMethod[], unspecified: boolean) => void;
}) {
  const toggle = (m: PaymentMethod) =>
    onChange(methods.includes(m) ? methods.filter((x) => x !== m) : [...methods, m], unspecified);

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title="Payment method"
      rightAction={<SheetCloseButton onPress={onClose} />}
      footer={
        <View style={{ flexDirection: "row", gap: tokens.space[3] }}>
          <Button
            label="Clear"
            variant="secondary"
            size="md"
            style={{ flex: 1 }}
            disabled={methods.length === 0 && !unspecified}
            onPress={() => onChange([], false)}
          />
          <Button label="Done" size="md" style={{ flex: 1 }} onPress={onClose} />
        </View>
      }
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tokens.space[2] }}>
        {PAYMENT_OPTIONS.map((o) => (
          <FilterChip key={o.value} label={o.label} active={methods.includes(o.value)} onPress={() => toggle(o.value)} />
        ))}
        <FilterChip label="Not specified" active={unspecified} onPress={() => onChange(methods, !unspecified)} />
      </View>
    </BottomSheetModal>
  );
}

/**
 * Amount range. Text is parsed exactly into minor units (no floats, no rounding); an
 * invalid or reversed pair is explained and never applied. A valid pair applies 300ms
 * after typing stops.
 */
export function AmountFilterSheet({
  visible,
  onClose,
  currency,
  min,
  max,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  currency: string;
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const [minText, setMinText] = useState(amountText(min, currency));
  const [maxText, setMaxText] = useState(amountText(max, currency));
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const appliedRef = useRef({ min, max });
  appliedRef.current = { min, max };

  // Seed from the applied filter once per open. Not on later changes: our own commit would
  // otherwise rewrite "5." to "5.00" under the user's cursor.
  useEffect(() => {
    if (visible) {
      setMinText(amountText(appliedRef.current.min, currency));
      setMaxText(amountText(appliedRef.current.max, currency));
    }
  }, [visible, currency]);

  const parsed = useMemo(() => {
    const parse = (text: string) => (text.trim() === "" ? { ok: true as const, value: null } : (() => {
      const v = parseAmountToMinor(text, currency);
      return v === null ? { ok: false as const } : { ok: true as const, value: v };
    })());
    const a = parse(minText);
    const b = parse(maxText);
    let error: string | null = null;
    if (!a.ok || !b.ok) {
      const digits = currencyMinorUnitDigits(currency);
      error = `Enter a plain amount${digits > 0 ? ` with at most ${digits} decimals` : " without decimals"}.`;
    } else if (a.value !== null && b.value !== null && a.value > b.value) {
      error = "The minimum must not be more than the maximum.";
    }
    return { min: a.ok ? a.value : null, max: b.ok ? b.value : null, error };
  }, [minText, maxText, currency]);

  useEffect(() => {
    if (!visible || parsed.error) return;
    if (parsed.min === appliedRef.current.min && parsed.max === appliedRef.current.max) return;
    const t = setTimeout(() => onChangeRef.current(parsed.min, parsed.max), TEXT_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [visible, parsed]);

  const field = (label: string, value: string, set: (t: string) => void) => (
    <View style={{ flex: 1 }}>
      <FormField
        label={label}
        value={value}
        onChangeText={set}
        keyboardType="decimal-pad"
        placeholder="Any"
        autoCorrect={false}
        leftIcon={<AppText tone="muted">{currencySymbol(currency)}</AppText>}
      />
    </View>
  );

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title="Amount"
      rightAction={<SheetCloseButton onPress={onClose} />}
      footer={
        <View style={{ flexDirection: "row", gap: tokens.space[3] }}>
          <Button
            label="Clear"
            variant="secondary"
            size="md"
            style={{ flex: 1 }}
            disabled={min === null && max === null && !minText && !maxText}
            onPress={() => {
              setMinText("");
              setMaxText("");
              onChange(null, null);
            }}
          />
          <Button label="Done" size="md" style={{ flex: 1 }} onPress={onClose} />
        </View>
      }
    >
      <View style={{ flexDirection: "row", gap: tokens.space[3] }}>
        {field("Minimum", minText, setMinText)}
        {field("Maximum", maxText, setMaxText)}
      </View>
      {parsed.error ? (
        <AppText variant="sm" tone="danger" style={{ marginTop: tokens.space[3] }}>
          {parsed.error}
        </AppText>
      ) : (
        <AppText variant="sm" tone="muted" style={{ marginTop: tokens.space[3] }}>
          Both ends are inclusive. Leave one empty for no limit.
        </AppText>
      )}
    </BottomSheetModal>
  );
}

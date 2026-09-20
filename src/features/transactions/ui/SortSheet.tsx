import { useEffect, useState } from "react";
import { View } from "react-native";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { Button } from "@/shared/ui/components/Button";
import { FilterChip } from "@/shared/ui/components/FilterChip";
import { IconButton } from "@/shared/ui/components/IconButton";
import { SegmentedControl } from "@/shared/ui/components/SegmentedControl";
import { BottomSheetModal, SheetCloseButton } from "@/shared/ui/components/BottomSheetModal";
import { QUERY_LIMITS, type QueryField, type SortKey } from "@/shared/types/transactionQuery";
import { FIELDS, SORT_FIELD_LABELS, fieldMeta, sanitizeSort } from "../filterModel";
import { useFilterStore, type ScopeKey } from "../filterStore";

export function directionLabels(field: QueryField): { ASC: string; DESC: string } {
  const kind = fieldMeta(field).kind;
  if (kind === "DATE" || kind === "TIMESTAMP") return { ASC: "Oldest first", DESC: "Newest first" };
  if (kind === "NUMBER") return { ASC: "Lowest first", DESC: "Highest first" };
  return { ASC: "A to Z", DESC: "Z to A" };
}

/** "Date (newest first), then Amount (highest first)" - the server's order, in words. */
export function describeSort(sort: SortKey[]) {
  if (sort.length === 0) return "Date (newest first)";
  return sort.map((s) => `${SORT_FIELD_LABELS[s.field]} (${directionLabels(s.field)[s.direction].toLowerCase()})`).join(", then ");
}

/**
 * Up to three prioritised sort keys, edited as a draft and applied together. The order
 * is the server's: the list renders rows exactly as they arrive.
 */
export function SortSheet({ visible, onClose, scope }: { visible: boolean; onClose: () => void; scope: ScopeKey }) {
  const draft = useFilterStore((s) => s.drafts[scope]);
  const beginDraft = useFilterStore((s) => s.beginDraft);
  const setDraft = useFilterStore((s) => s.setDraft);
  const applyDraft = useFilterStore((s) => s.applyDraft);
  const cancelDraft = useFilterStore((s) => s.cancelDraft);
  const [openRow, setOpenRow] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      beginDraft(scope);
      setOpenRow(null);
    }
  }, [visible, scope, beginDraft]);

  const sort = draft?.sort ?? [];
  const set = (next: SortKey[]) => setDraft(scope, { sort: next });
  const cancel = () => {
    cancelDraft(scope);
    onClose();
  };
  const used = new Set(sort.map((s) => s.field));

  return (
    <BottomSheetModal
      visible={visible}
      onClose={cancel}
      scroll
      title="Sort"
      rightAction={<SheetCloseButton onPress={cancel} />}
      footer={
        <View style={{ flexDirection: "row", gap: tokens.space[3] }}>
          <Button label="Cancel" variant="secondary" size="md" style={{ flex: 1 }} onPress={cancel} />
          <Button
            label="Apply"
            size="md"
            style={{ flex: 1 }}
            onPress={() => {
              set(sanitizeSort(sort));
              if (applyDraft(scope, "sort")) onClose();
            }}
          />
        </View>
      }
    >
      {sort.length === 0 ? (
        <AppText variant="sm" tone="muted" style={{ marginBottom: tokens.space[3] }}>
          Default order: newest date first, then newest created.
        </AppText>
      ) : null}

      <View style={{ gap: tokens.space[3] }}>
        {sort.map((key, i) => (
          <View
            key={key.field}
            style={{
              borderRadius: tokens.radii.md,
              borderWidth: 1,
              borderColor: tokens.colors.stroke,
              backgroundColor: tokens.colors.surface,
              padding: tokens.space[3],
              gap: tokens.space[3],
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.space[2] }}>
              <AppText variant="xs" tone="muted">
                {i === 0 ? "SORT BY" : "THEN BY"}
              </AppText>
              <View style={{ flex: 1, alignItems: "flex-start" }}>
                <FilterChip label={SORT_FIELD_LABELS[key.field]} active={openRow === i} onPress={() => setOpenRow(openRow === i ? null : i)} />
              </View>
              <IconButton
                icon="chevron-up"
                size={tokens.layout.minTap}
                accessibilityLabel="Raise priority"
                disabled={i === 0}
                onPress={() => {
                  const next = [...sort];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  set(next);
                }}
              />
              <IconButton
                icon="trash-outline"
                tone="danger"
                size={tokens.layout.minTap}
                accessibilityLabel="Remove sort"
                onPress={() => set(sort.filter((_, j) => j !== i))}
              />
            </View>

            {openRow === i ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tokens.space[2] }}>
                {FIELDS.filter((f) => f.field === key.field || !used.has(f.field)).map((f) => (
                  <FilterChip
                    key={f.field}
                    label={SORT_FIELD_LABELS[f.field]}
                    active={f.field === key.field}
                    onPress={() => {
                      set(sort.map((s, j) => (j === i ? { ...s, field: f.field } : s)));
                      setOpenRow(null);
                    }}
                  />
                ))}
              </View>
            ) : null}

            <SegmentedControl
              items={[
                { label: directionLabels(key.field).DESC, value: "DESC" },
                { label: directionLabels(key.field).ASC, value: "ASC" },
              ]}
              value={key.direction}
              onChange={(direction) => set(sort.map((s, j) => (j === i ? { ...s, direction } : s)))}
            />
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", gap: tokens.space[3], marginTop: tokens.space[4] }}>
        <Button
          label="Add sort"
          variant="secondary"
          size="md"
          style={{ flex: 1 }}
          disabled={sort.length >= QUERY_LIMITS.maxSortKeys}
          onPress={() => {
            const next = FIELDS.find((f) => !used.has(f.field));
            if (next) set([...sort, { field: sort.length === 0 ? "occurredOn" : next.field, direction: "DESC" }]);
          }}
        />
        <Button label="Reset" variant="ghost" size="md" style={{ flex: 1 }} disabled={sort.length === 0} onPress={() => set([])} />
      </View>
    </BottomSheetModal>
  );
}

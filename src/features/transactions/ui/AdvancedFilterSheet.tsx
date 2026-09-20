import { useEffect, useMemo, useState } from "react";
import { Platform, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";
import { Button } from "@/shared/ui/components/Button";
import { FilterChip } from "@/shared/ui/components/FilterChip";
import { FormField } from "@/shared/ui/components/FormField";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { IconButton } from "@/shared/ui/components/IconButton";
import { Icon } from "@/shared/ui/components/Icon";
import { SegmentedControl } from "@/shared/ui/components/SegmentedControl";
import { BottomSheetModal, SheetCloseButton } from "@/shared/ui/components/BottomSheetModal";
import { WebDateInput } from "@/shared/ui/components/WebDateInput";
import { currencySymbol } from "@/shared/utils/formatCurrency";
import { formatYmd, localDateToYmd, ymdToLocalDate, isValidYmd } from "@/shared/utils/ledgerDate";
import { QUERY_LIMITS, type FilterOperator, type QueryField } from "@/shared/types/transactionQuery";
import {
  FIELDS,
  PAYMENT_OPTIONS,
  TYPE_OPTIONS,
  addChild,
  addGroup,
  blankCondition,
  changeField,
  changeOperator,
  clearAll,
  describeExpression,
  fieldMeta,
  groupLevel,
  inputCount,
  moveChild,
  nodeRaw,
  operatorIsList,
  operatorLabel,
  operatorTakesValue,
  readQuick,
  removeNode,
  setConditionInput,
  setConditionListText,
  setConditionValue,
  setGroupOp,
  countConditions,
  validateTree,
  type DescribeContext,
  type FilterConditionNode,
  type FilterGroupNode,
  type FilterRoot,
  type ModelContext,
} from "../filterModel";
import { useFilterStore, type ScopeKey } from "../filterStore";

type CategoryOption = { id: string; name: string; type: "INCOME" | "EXPENSE" };

type Ctx = {
  model: ModelContext;
  categories: CategoryOption[];
  errors: Record<string, string>;
  showErrors: boolean;
  /** Only one inline picker (field, operator or date) is open at a time. */
  openKey: string | null;
  setOpenKey: (key: string | null) => void;
  update: (next: FilterRoot) => void;
  root: FilterRoot;
};

const card = {
  borderRadius: tokens.radii.md,
  borderWidth: 1,
  borderColor: tokens.colors.stroke,
  backgroundColor: tokens.colors.surface,
  padding: tokens.space[3],
} as const;

// ------------------------------------------------------------------ date value

function DateValue({ node, index, ctx }: { node: FilterConditionNode; index: number; ctx: Ctx }) {
  const text = nodeRaw(node, ctx.model)[index] ?? "";
  const key = `${node.id}:date:${index}`;
  const open = ctx.openKey === key;
  const valid = isValidYmd(text);
  const date = ymdToLocalDate(valid ? text : localDateToYmd(new Date()));
  const set = (ymd: string) => ctx.update(setConditionInput(ctx.root, node.id, index, ymd, ctx.model));

  if (Platform.OS === "web") {
    return <WebDateInput mode="date" value={date} onChange={(next) => set(localDateToYmd(next))} />;
  }

  const press = () => {
    if (Platform.OS === "android") {
      // One imperative dialog per tap; it cannot re-open itself.
      DateTimePickerAndroid.open({
        value: date,
        mode: "date",
        onChange: (event, selected) => {
          if (event.type === "set" && selected) set(localDateToYmd(selected));
        },
      });
      return;
    }
    ctx.setOpenKey(open ? null : key);
  };

  return (
    <View>
      <HapticPressable
        onPress={press}
        haptic="none"
        accessibilityRole="button"
        accessibilityLabel={valid ? `Date ${formatYmd(text)}` : "Pick a date"}
        style={{
          minHeight: tokens.layout.minTap,
          justifyContent: "center",
          paddingHorizontal: tokens.space[4],
          borderRadius: tokens.radii.md,
          borderWidth: 1.5,
          borderColor: open ? tokens.colors.accent : tokens.colors.stroke,
          backgroundColor: tokens.colors.surfaceAlt,
        }}
      >
        <AppText variant="base" tone={valid ? undefined : "muted"}>
          {valid ? formatYmd(text) : "Pick a date"}
        </AppText>
      </HapticPressable>
      {Platform.OS === "ios" && open ? (
        <DateTimePicker
          value={date}
          mode="date"
          display="spinner"
          themeVariant="dark"
          textColor={tokens.colors.text}
          onChange={(_e, selected) => {
            if (selected) set(localDateToYmd(selected));
          }}
        />
      ) : null}
    </View>
  );
}

// ------------------------------------------------------------------ value editor

function Choices({
  options,
  selected,
  multi,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  selected: string[];
  multi: boolean;
  onChange: (next: string[]) => void;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tokens.space[2] }}>
      {options.map((o) => {
        const active = selected.includes(o.value);
        return (
          <FilterChip
            key={o.value}
            label={o.label}
            active={active}
            onPress={() =>
              onChange(multi ? (active ? selected.filter((x) => x !== o.value) : [...selected, o.value]) : [o.value])
            }
          />
        );
      })}
    </View>
  );
}

function ValueEditor({ node, ctx }: { node: FilterConditionNode; ctx: Ctx }) {
  const meta = fieldMeta(node.field);
  if (!operatorTakesValue(node.operator)) return null;
  const isList = operatorIsList(node.operator);
  const selected = (Array.isArray(node.value) ? node.value : node.value !== undefined ? [node.value] : []).map(String);
  const pick = (next: string[]) => ctx.update(setConditionValue(ctx.root, node.id, isList ? next : next[0]));
  const count = Math.max(1, inputCount(node.operator));
  const raws = nodeRaw(node, ctx.model);

  if (node.field === "type") {
    return <Choices options={TYPE_OPTIONS} selected={selected} multi={isList} onChange={pick} />;
  }
  if (node.field === "paymentMethod") {
    return <Choices options={PAYMENT_OPTIONS} selected={selected} multi={isList} onChange={pick} />;
  }
  if (node.field === "categoryId") {
    return (
      <Choices
        options={ctx.categories.map((c) => ({ value: c.id, label: c.name }))}
        selected={selected}
        multi={isList}
        onChange={pick}
      />
    );
  }
  if (meta.kind === "UUID") {
    return (
      <FormField
        value={node.raw?.[0] ?? selected.join(", ")}
        onChangeText={(t) =>
          ctx.update(isList ? setConditionListText(ctx.root, node.id, t) : setConditionInput(ctx.root, node.id, 0, t, ctx.model))
        }
        placeholder={isList ? "IDs separated by commas" : "Transaction ID"}
        autoCapitalize="none"
        autoCorrect={false}
      />
    );
  }
  if (meta.kind === "DATE") {
    return (
      <View style={{ gap: tokens.space[2] }}>
        {Array.from({ length: count }, (_, i) => (
          <DateValue key={i} node={node} index={i} ctx={ctx} />
        ))}
      </View>
    );
  }
  if (meta.kind === "TEXT") {
    return (
      <FormField
        value={typeof node.value === "string" ? node.value : ""}
        onChangeText={(t) => ctx.update(setConditionValue(ctx.root, node.id, t === "" ? undefined : t))}
        placeholder="Text (not case-sensitive)"
        maxLength={QUERY_LIMITS.maxTextChars}
        autoCapitalize="none"
        autoCorrect={false}
      />
    );
  }
  // NUMBER and TIMESTAMP: typed text, parsed exactly by the model.
  return (
    <View style={{ gap: tokens.space[2] }}>
      {Array.from({ length: count }, (_, i) => (
        <FormField
          key={i}
          value={raws[i] ?? ""}
          onChangeText={(t) => ctx.update(setConditionInput(ctx.root, node.id, i, t, ctx.model))}
          keyboardType={meta.kind === "NUMBER" ? "decimal-pad" : "default"}
          placeholder={
            meta.kind === "NUMBER"
              ? `${currencySymbol(ctx.model.currency)} amount`
              : `YYYY-MM-DD or YYYY-MM-DD HH:mm (${ctx.model.timezone})`
          }
          autoCapitalize="none"
          autoCorrect={false}
          leftIcon={meta.kind === "NUMBER" ? <AppText tone="muted">{currencySymbol(ctx.model.currency)}</AppText> : undefined}
        />
      ))}
    </View>
  );
}

// ------------------------------------------------------------------ condition + group

function ConditionEditor({
  node,
  index,
  siblings,
  parentId,
  ctx,
}: {
  node: FilterConditionNode;
  index: number;
  siblings: number;
  parentId: string;
  ctx: Ctx;
}) {
  const meta = fieldMeta(node.field);
  const fieldKey = `${node.id}:field`;
  const opKey = `${node.id}:op`;
  const error = ctx.showErrors ? ctx.errors[node.id] : undefined;

  const toggle = (key: string) => ctx.setOpenKey(ctx.openKey === key ? null : key);
  const mainFields = FIELDS.filter((f) => !f.metadata);
  const metaFields = FIELDS.filter((f) => f.metadata);

  return (
    <View style={{ ...card, borderColor: error ? tokens.colors.danger : tokens.colors.stroke }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.space[2] }}>
        <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: tokens.space[2] }}>
          <FilterChip label={meta.label} active={ctx.openKey === fieldKey} icon={undefined} onPress={() => toggle(fieldKey)} />
          <FilterChip
            label={operatorLabel(node.field, node.operator)}
            active={ctx.openKey === opKey}
            onPress={() => toggle(opKey)}
          />
        </View>
        <IconButton
          icon="chevron-up"
          size={tokens.layout.minTap}
          accessibilityLabel="Move condition up"
          disabled={index === 0}
          onPress={() => ctx.update(moveChild(ctx.root, parentId, index, index - 1))}
        />
        <IconButton
          icon="chevron-down"
          size={tokens.layout.minTap}
          accessibilityLabel="Move condition down"
          disabled={index === siblings - 1}
          onPress={() => ctx.update(moveChild(ctx.root, parentId, index, index + 1))}
        />
        <IconButton
          icon="trash-outline"
          tone="danger"
          size={tokens.layout.minTap}
          accessibilityLabel="Remove condition"
          onPress={() => ctx.update(removeNode(ctx.root, node.id))}
        />
      </View>

      {ctx.openKey === fieldKey ? (
        <View style={{ marginTop: tokens.space[3], gap: tokens.space[3] }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tokens.space[2] }}>
            {mainFields.map((f) => (
              <FilterChip
                key={f.field}
                label={f.label}
                active={f.field === node.field}
                onPress={() => {
                  if (f.field !== node.field) ctx.update(changeField(ctx.root, node.id, f.field as QueryField));
                  ctx.setOpenKey(null);
                }}
              />
            ))}
          </View>
          <AppText variant="xs" tone="muted">
            RECORD METADATA (READ-ONLY)
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: tokens.space[2] }}>
            {metaFields.map((f) => (
              <FilterChip
                key={f.field}
                label={f.label}
                active={f.field === node.field}
                onPress={() => {
                  if (f.field !== node.field) ctx.update(changeField(ctx.root, node.id, f.field as QueryField));
                  ctx.setOpenKey(null);
                }}
              />
            ))}
          </View>
        </View>
      ) : null}

      {ctx.openKey === opKey ? (
        <View style={{ marginTop: tokens.space[3], flexDirection: "row", flexWrap: "wrap", gap: tokens.space[2] }}>
          {meta.operators.map((op: FilterOperator) => (
            <FilterChip
              key={op}
              label={operatorLabel(node.field, op)}
              active={op === node.operator}
              onPress={() => {
                if (op !== node.operator) ctx.update(changeOperator(ctx.root, node.id, op, ctx.model));
                ctx.setOpenKey(null);
              }}
            />
          ))}
        </View>
      ) : null}

      {operatorTakesValue(node.operator) ? (
        <View style={{ marginTop: tokens.space[3] }}>
          <ValueEditor node={node} ctx={ctx} />
        </View>
      ) : null}

      {error ? (
        <AppText variant="sm" tone="danger" style={{ marginTop: tokens.space[2] }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

function GroupEditor({
  group,
  parent,
  index,
  siblings,
  ctx,
}: {
  group: FilterGroupNode;
  parent: FilterGroupNode | null;
  index: number;
  siblings: number;
  ctx: Ctx;
}) {
  const isRoot = parent === null;
  const level = groupLevel(ctx.root, group.id);
  const canNest = level < QUERY_LIMITS.maxDepth;
  const conditionsLeft = countConditions(ctx.root) < QUERY_LIMITS.maxConditions;
  const error = ctx.showErrors ? ctx.errors[group.id] : undefined;

  return (
    <View
      style={
        isRoot
          ? undefined
          : {
              borderLeftWidth: 2,
              borderLeftColor: tokens.colors.accent,
              paddingLeft: tokens.space[3],
              marginLeft: tokens.space[1],
            }
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.space[2], marginBottom: tokens.space[3] }}>
        <View style={{ flex: 1 }}>
          <SegmentedControl
            items={[
              { label: "AND · all match", value: "AND" },
              { label: "OR · any matches", value: "OR" },
            ]}
            value={group.op}
            onChange={(op) => ctx.update(setGroupOp(ctx.root, group.id, op))}
          />
        </View>
        {!isRoot ? (
          <>
            <IconButton
              icon="chevron-up"
              size={tokens.layout.minTap}
              accessibilityLabel="Move group up"
              disabled={index === 0}
              onPress={() => ctx.update(moveChild(ctx.root, parent.id, index, index - 1))}
            />
            <IconButton
              icon="chevron-down"
              size={tokens.layout.minTap}
              accessibilityLabel="Move group down"
              disabled={index === siblings - 1}
              onPress={() => ctx.update(moveChild(ctx.root, parent.id, index, index + 1))}
            />
            <IconButton
              icon="trash-outline"
              tone="danger"
              size={tokens.layout.minTap}
              accessibilityLabel="Remove group"
              onPress={() => ctx.update(removeNode(ctx.root, group.id))}
            />
          </>
        ) : null}
      </View>

      <View style={{ gap: tokens.space[3] }}>
        {group.children.length === 0 ? (
          <AppText variant="sm" tone="muted">
            {isRoot ? "No conditions: every transaction in the date range matches." : "Empty group."}
          </AppText>
        ) : null}
        {group.children.map((child, i) =>
          child.kind === "condition" ? (
            <ConditionEditor key={child.id} node={child} index={i} siblings={group.children.length} parentId={group.id} ctx={ctx} />
          ) : (
            <GroupEditor key={child.id} group={child} parent={group} index={i} siblings={group.children.length} ctx={ctx} />
          )
        )}
      </View>

      {error ? (
        <AppText variant="sm" tone="danger" style={{ marginTop: tokens.space[2] }}>
          {error}
        </AppText>
      ) : null}

      <View style={{ flexDirection: "row", gap: tokens.space[2], marginTop: tokens.space[3] }}>
        <Button
          label="Add condition"
          variant="secondary"
          size="md"
          style={{ flex: 1 }}
          disabled={!conditionsLeft}
          onPress={() => ctx.update(addChild(ctx.root, group.id, blankCondition()))}
        />
        <Button
          label="Add group"
          variant="secondary"
          size="md"
          style={{ flex: 1 }}
          disabled={!canNest || !conditionsLeft}
          onPress={() => ctx.update(addGroup(ctx.root, group.id, group.op === "AND" ? "OR" : "AND"))}
        />
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ sheet

/**
 * Advanced filter editor. Everything happens on a *draft* held in the filter store;
 * nothing reaches the list or the totals until Apply, which validates and applies the
 * whole tree at once. Cancel (button, backdrop, back) drops the draft.
 */
export function AdvancedFilterSheet({
  visible,
  onClose,
  scope,
  model,
  describeContext,
  categories,
}: {
  visible: boolean;
  onClose: () => void;
  scope: ScopeKey;
  model: ModelContext;
  describeContext: DescribeContext;
  categories: CategoryOption[];
}) {
  const draft = useFilterStore((s) => s.drafts[scope]);
  const beginDraft = useFilterStore((s) => s.beginDraft);
  const setDraft = useFilterStore((s) => s.setDraft);
  const applyDraft = useFilterStore((s) => s.applyDraft);
  const cancelDraft = useFilterStore((s) => s.cancelDraft);
  const [showErrors, setShowErrors] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      beginDraft(scope);
      setShowErrors(false);
      setOpenKey(null);
    }
  }, [visible, scope, beginDraft]);

  const root = draft?.root;
  const validation = useMemo(() => (root ? validateTree(root) : null), [root]);
  const hasDate = root ? readQuick(root).date !== null : true;

  const cancel = () => {
    cancelDraft(scope);
    onClose();
  };

  const apply = () => {
    if (!validation?.valid) {
      setShowErrors(true);
      return;
    }
    if (applyDraft(scope, "filter")) onClose();
  };

  if (!root || !validation) {
    return <BottomSheetModal visible={visible} onClose={cancel} scroll title="Advanced filters">{null}</BottomSheetModal>;
  }

  const ctx: Ctx = {
    model,
    categories,
    errors: validation.nodeErrors,
    showErrors,
    openKey,
    setOpenKey,
    root,
    update: (next) => setDraft(scope, { root: next }),
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={cancel}
      scroll
      title="Advanced filters"
      rightAction={<SheetCloseButton onPress={cancel} />}
      footer={
        <View style={{ flexDirection: "row", gap: tokens.space[3] }}>
          <Button label="Cancel" variant="secondary" size="md" style={{ flex: 1 }} onPress={cancel} />
          <Button label="Apply" size="md" style={{ flex: 1 }} onPress={apply} />
        </View>
      }
    >
      <View style={{ ...card, marginBottom: tokens.space[4] }}>
        <AppText variant="xs" tone="muted">
          SHOWING
        </AppText>
        <AppText variant="sm" style={{ marginTop: tokens.space[1] }} accessibilityLabel="Filter expression preview">
          {describeExpression(root, describeContext)}
          {hasDate ? "" : " · all dates"}
        </AppText>
      </View>

      {validation.treeErrors.map((message) => (
        <AppText key={message} variant="sm" tone="danger" style={{ marginBottom: tokens.space[2] }}>
          {message}
        </AppText>
      ))}
      {showErrors && !validation.valid && validation.treeErrors.length === 0 ? (
        <AppText variant="sm" tone="danger" style={{ marginBottom: tokens.space[2] }}>
          Fix the highlighted conditions to apply.
        </AppText>
      ) : null}

      <GroupEditor group={root} parent={null} index={0} siblings={1} ctx={ctx} />

      <View style={{ marginTop: tokens.space[4], alignItems: "flex-start" }}>
        <HapticPressable
          onPress={() => setDraft(scope, { root: clearAll() })}
          haptic="none"
          accessibilityRole="button"
          style={{ minHeight: tokens.layout.minTap, flexDirection: "row", alignItems: "center", gap: tokens.space[2] }}
        >
          <Icon name="close" size={tokens.icon.chip} color={tokens.colors.muted} />
          <AppText variant="sm" tone="muted" weight="semibold">
            Clear all conditions
          </AppText>
        </HapticPressable>
      </View>
    </BottomSheetModal>
  );
}

import { MoneyAmount } from "@/shared/ui/components/MoneyAmount";
import { useBookOperations } from "../operations";
import { useEffect } from "react";
import { AccessibilityInfo, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import type { Book } from "@/shared/types/models";
import { Card } from "@/shared/ui/components/Card";
import { AppText } from "@/shared/ui/components/AppText";
import { Icon } from "@/shared/ui/components/Icon";
import { IconButton } from "@/shared/ui/components/IconButton";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Button } from "@/shared/ui/components/Button";
import { SectionHeader } from "@/shared/ui/components/SectionHeader";
import { SettingsRow } from "@/shared/ui/components/SettingsRow";
import { tokens } from "@/shared/ui/theme/tokens";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";
import { useBooksStore } from "../store";
import { BOOK_LIMIT } from "../constants";
import { selectBook } from "../coordinator";
import { moveBook } from "../reorder";
import { useBookUIStore } from "./store";
import { BookTile } from "./BookTile";
type DragState = {
  from: SharedValue<number>;
  to: SharedValue<number>;
  y: SharedValue<number>;
  rowHeight: SharedValue<number>;
};
function BookRow({
  book,
  index,
  total,
  selected,
  disabled,
  drag,
  drop,
  onDrag,
}: {
  book: Book;
  index: number;
  total: number;
  selected: boolean;
  disabled: boolean;
  drag: DragState;
  drop: (id: string, to: number) => void;
  onDrag: (dragging: boolean) => void;
}) {
  const { from, to, y, rowHeight } = drag;
  // The held row follows the finger; rows between its origin and the hovered
  // slot slide one row over, so the list previews the drop before release.
  const style = useAnimatedStyle(() => {
    if (from.value === -1) return { transform: [{ translateY: 0 }], zIndex: 0 };
    if (from.value === index) return { transform: [{ translateY: y.value }], zIndex: 10 };
    const shift =
      from.value < to.value && index > from.value && index <= to.value
        ? -rowHeight.value
        : from.value > to.value && index < from.value && index >= to.value
          ? rowHeight.value
          : 0;
    return { transform: [{ translateY: withTiming(shift, { duration: 140 }) }], zIndex: 0 };
  }, [index]);
  const tick = () => void Haptics.selectionAsync().catch(() => {});
  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activateAfterLongPress(180)
    .onStart(() => {
      from.value = index;
      to.value = index;
      y.value = 0;
      runOnJS(onDrag)(true);
    })
    .onUpdate((e) => {
      y.value = e.translationY;
      const next = Math.min(total - 1, Math.max(0, Math.round(index + e.translationY / rowHeight.value)));
      if (next !== to.value) {
        to.value = next;
        runOnJS(tick)();
      }
    })
    .onEnd(() => {
      runOnJS(drop)(book.id, to.value);
    })
    .onFinalize(() => {
      runOnJS(onDrag)(false);
    });
  const open = () => useBookUIStore.getState().open("menu", book.id);
  const accessibleMove = (to: number) => {
    void moveBook(book.id, to)
      .then(() =>
        AccessibilityInfo.announceForAccessibility(
          `${book.name}, position ${to + 1} of ${total}`,
        ),
      )
      .catch((error) => useUndoToastStore.getState().showError(error));
  };
  return (
    <Animated.View
      onLayout={(e) => {
        rowHeight.value = e.nativeEvent.layout.height;
      }}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: tokens.colors.surface,
          paddingHorizontal: 12,
          borderBottomWidth: 1,
          borderBottomColor: tokens.colors.divider,
        },
        style,
      ]}
    >
      <HapticPressable
        accessibilityRole="button"
        accessibilityLabel={`Switch to ${book.name}`}
        accessibilityState={{ selected, disabled }}
        disabled={disabled}
        onPress={() => {
          void selectBook(book.id).catch((error) =>
            useUndoToastStore
              .getState()
              .showError(
                error,
                error instanceof Error ? error.message : undefined,
              ),
          );
        }}
        style={{
          flex: 1,
          minHeight: 76,
          paddingVertical: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <BookTile icon={book.icon} color={book.color} />
        <View style={{ flex: 1 }}>
          <AppText weight="semibold" numberOfLines={1}>
            {book.name}
          </AppText>
          <MoneyAmount
            size="sm"
            tone="neutral"
            value={
              book.balanceMinor === undefined
                ? "Balance unavailable"
                : formatCurrency(book.balanceMinor, book.currencyCode)
            }
          />
        </View>
      </HapticPressable>
      <GestureDetector gesture={pan}>
        <View collapsable={false}>
          <HapticPressable
            accessibilityRole="adjustable"
            accessibilityLabel={`Reorder ${book.name}`}
            accessibilityHint="Hold and drag, or use move up and move down actions."
            accessibilityValue={{ min: 1, max: total, now: index + 1 }}
            accessibilityState={{ disabled }}
            accessibilityActions={[
              ...(index > 0
                ? [{ name: "decrement" as const, label: "Move up" }]
                : []),
              ...(index < total - 1
                ? [{ name: "increment" as const, label: "Move down" }]
                : []),
            ]}
            onAccessibilityAction={(e) => {
              if (!disabled)
                accessibleMove(
                  index + (e.nativeEvent.actionName === "increment" ? 1 : -1),
                );
            }}
            disabled={disabled}
            onPress={open}
            style={{
              minWidth: 44,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="reorder-handle" size={18} color={tokens.colors.muted} />
          </HapticPressable>
        </View>
      </GestureDetector>
      <IconButton
        icon="ellipsis-vertical"
        accessibilityLabel={`Manage ${book.name}`}
        disabled={disabled}
        onPress={open}
      />
    </Animated.View>
  );
}
export function BookManagement({
  onDrag = () => {},
}: {
  onDrag?: (dragging: boolean) => void;
}) {
  const {
    books,
    selectedBookId,
    isManaging: managingBooks,
    ready,
    error,
    loadBooks,
  } = useBooksStore();
  const activeOperations = useBookOperations((s) => s.active);
  const isManaging = managingBooks || activeOperations > 0;
  const drag: DragState = {
    from: useSharedValue(-1),
    to: useSharedValue(-1),
    y: useSharedValue(0),
    rowHeight: useSharedValue(76),
  };
  const settle = () => {
    drag.from.value = -1;
    drag.to.value = -1;
    drag.y.value = 0;
  };
  // Hold the previewed layout until the reordered list renders, so rows don't
  // flash back to their old slots for a frame. The reorder is optimistic.
  const order = books.map((b) => b.id).join();
  useEffect(settle, [order]); // eslint-disable-line react-hooks/exhaustive-deps
  const drop = (id: string, destination: number) => {
    if (books.findIndex((b) => b.id === id) === destination) return settle();
    void moveBook(id, destination)
      .then(() =>
        AccessibilityInfo.announceForAccessibility(
          `Book moved to position ${destination + 1}`,
        ),
      )
      .catch((error) => {
        settle();
        useUndoToastStore.getState().showError(error);
      });
  };
  const selected = books.find((b) => b.id === selectedBookId);
  return (
    <View>
      <SectionHeader
        title="Cash books"
        style={{ marginTop: 28, marginBottom: 12 }}
      />
      {!ready ? (
        <Button
          label={error ? "Retry cash books" : "Loading cash books"}
          disabled={!error}
          onPress={() => {
            void loadBooks().catch(() => {});
          }}
        />
      ) : (
        <>
          <Card padding={0}>
            <View>
              {books.map((book, index) => (
                <BookRow
                  key={book.id}
                  book={book}
                  index={index}
                  total={books.length}
                  selected={book.id === selectedBookId}
                  disabled={isManaging}
                  drag={drag}
                  drop={drop}
                  onDrag={onDrag}
                />
              ))}
            </View>
            <View style={{ padding: 8 }}>
              <Button
                label="Add new book"
                variant="outline"
                disabled={isManaging || books.length >= BOOK_LIMIT}
                onPress={() => useBookUIStore.getState().open("create")}
                style={{ borderWidth: 1, borderColor: tokens.colors.accent }}
              />
            </View>
          </Card>
          {books.length >= BOOK_LIMIT && (
            <AppText tone="muted" style={{ marginTop: 8 }}>
              You can have up to 10 cash books.
            </AppText>
          )}
          <AppText variant="caption" tone="muted" style={{ marginTop: 10 }}>
            Hold the handle to reorder. Tap to switch. Deleting a book won't
            delete your account data.
          </AppText>
          {selected && (
            <Card padding={0} style={{ marginTop: 16 }}>
              <SettingsRow
                label="Opening balance"
                value={formatCurrency(
                  selected.openingBalanceMinor,
                  selected.currencyCode,
                )}
                valueIsMoney
                locked
              />
              <SettingsRow
                label="Currency"
                value={selected.currencyCode}
                locked
              />
              <SettingsRow label="Timezone" value={selected.timezone} locked />
            </Card>
          )}
        </>
      )}
    </View>
  );
}

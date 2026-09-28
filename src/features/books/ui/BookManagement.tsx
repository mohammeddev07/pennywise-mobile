import { MoneyAmount } from "@/shared/ui/components/MoneyAmount";
import { useBookOperations } from "../operations";
import { useRef } from "react";
import { AccessibilityInfo, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
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
function BookRow({
  book,
  index,
  total,
  selected,
  disabled,
  drop,
  onDrag,
  measure,
}: {
  book: Book;
  index: number;
  total: number;
  selected: boolean;
  disabled: boolean;
  drop: (id: string, dy: number) => void;
  onDrag: (dragging: boolean) => void;
  measure: (y: number, height: number) => void;
}) {
  const y = useSharedValue(0);
  const dragging = useSharedValue(false);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    zIndex: dragging.value ? 10 : 0,
  }));
  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activateAfterLongPress(180)
    .onStart(() => {
      dragging.value = true;
      runOnJS(onDrag)(true);
    })
    .onUpdate((e) => {
      y.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(drop)(book.id, e.translationY);
    })
    .onFinalize(() => {
      y.value = withTiming(0, { duration: 120 });
      dragging.value = false;
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
      onLayout={(e) =>
        measure(e.nativeEvent.layout.y, e.nativeEvent.layout.height)
      }
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
  const positions = useRef<Record<string, { y: number; height: number }>>({});
  const drop = (id: string, dy: number) => {
    const start = positions.current[id];
    if (!start) return;
    const target = start.y + start.height / 2 + dy;
    let destination = 0,
      distance = Infinity;
    books.forEach((b, i) => {
      const p = positions.current[b.id];
      if (p && Math.abs(p.y + p.height / 2 - target) < distance) {
        distance = Math.abs(p.y + p.height / 2 - target);
        destination = i;
      }
    });
    void moveBook(id, destination)
      .then(() =>
        AccessibilityInfo.announceForAccessibility(
          `Book moved to position ${destination + 1}`,
        ),
      )
      .catch((error) => useUndoToastStore.getState().showError(error));
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
                  drop={drop}
                  onDrag={onDrag}
                  measure={(y, height) => {
                    positions.current[book.id] = { y, height };
                  }}
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

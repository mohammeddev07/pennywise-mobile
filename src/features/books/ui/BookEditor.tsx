import { useBookOperations } from "../operations";
import type { Book } from "@/shared/types/models";
import { formatCurrency } from "@/shared/utils/formatCurrency";
import { useEffect, useState, type MutableRefObject } from "react";
import { View } from "react-native";
import {
  BottomSheetModal,
  SheetCloseButton,
} from "@/shared/ui/components/BottomSheetModal";
import { FormField } from "@/shared/ui/components/FormField";
import { Button } from "@/shared/ui/components/Button";
import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Icon } from "@/shared/ui/components/Icon";
import { tokens } from "@/shared/ui/theme/tokens";
import { confirmDestructive } from "@/shared/ui/utils/confirm";
import { getApiErrorMessage } from "@/shared/api/errors";
import { useUndoToastStore } from "@/shared/ui/state/useUndoToastStore";
import {
  BOOK_CURRENCIES,
  BOOK_NAME_MAX,
  BOOK_LIMIT,
  isBookColor,
  isBookIcon,
  type BookColor,
  type BookIcon,
} from "../constants";
import { useBooksStore, deviceTimezone } from "../store";
import { parseOpeningBalance } from "../openingBalance";
import { BookTile } from "./BookTile";
import { BookStylePicker } from "./BookStylePicker";
import { useBookUIStore } from "./store";
import {
  getAccountEpoch,
  isCurrentAccountEpoch,
} from "@/shared/session/accountEpoch";
export function BookEditor({
  book,
  embedded = false,
  closeRequest,
}: {
  book?: Book;
  embedded?: boolean;
  closeRequest?: MutableRefObject<() => void>;
}) {
  const [name, setName] = useState(book?.name ?? "");
  const [currency, setCurrency] = useState<string>("USD");
  const [opening, setOpening] = useState("");
  const [icon, setIcon] = useState<BookIcon>(
    isBookIcon(book?.icon) ? book.icon : "book",
  );
  const [color, setColor] = useState<BookColor>(
    isBookColor(book?.color) ? book.color : "green",
  );
  const [iconTouched, setIconTouched] = useState(false);
  const [colorTouched, setColorTouched] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [error, setError] = useState("");
  const [timezone] = useState(deviceTimezone);
  const {
    isManaging: managingBooks,
    addBook,
    updateBook,
    books,
  } = useBooksStore();
  const activeOperations = useBookOperations((s) => s.active);
  const isManaging = managingBooks || activeOperations > 0;
  const close = useBookUIStore((s) => s.close);
  const changed = {
    ...(name.trim() !== book?.name ? { name: name.trim() } : {}),
    ...(iconTouched && icon !== book?.icon ? { icon } : {}),
    ...(colorTouched && color !== book?.color ? { color } : {}),
  };
  const dirty = book
    ? Object.keys(changed).length > 0
    : Boolean(
        name ||
        opening ||
        currency !== "USD" ||
        icon !== "book" ||
        color !== "green",
      );
  // Never a dead X: a cold-starting backend can hold a write (isManaging) for a
  // minute. The write keeps going after close; its failure falls back to a toast.
  const closeEditor = () => {
    if (isManaging) return close();
    if (dirty)
      confirmDestructive(
        book ? "Discard book changes?" : "Discard new book?",
        "Your changes will be lost.",
        close,
        "Discard",
      );
    else close();
  };
  // The persistent native host must use the same discard guard as the X.
  useEffect(() => {
    if (!closeRequest) return;
    closeRequest.current = closeEditor;
    return () => {
      closeRequest.current = close;
    };
  }, [closeRequest, close, dirty, isManaging, book]);
  const nameValid = Boolean(name.trim()) && name.trim().length <= BOOK_NAME_MAX;
  const minor = parseOpeningBalance(opening, currency);
  const sheetKind = book ? "edit" : "create";
  const stillOpen = () => {
    const ui = useBookUIStore.getState();
    return ui.sheet === sheetKind && ui.bookId === (book?.id ?? null);
  };
  const save = async () => {
    if (!nameValid || minor === null || isManaging || (book && !dirty)) return;
    const epoch = getAccountEpoch();
    setError("");
    try {
      if (book) await updateBook(book.id, changed);
      else
        await addBook({
          name: name.trim(),
          currencyCode: currency,
          timezone,
          openingBalanceMinor: minor,
          icon,
          color,
        });
      if (isCurrentAccountEpoch(epoch) && stillOpen()) close();
    } catch (error) {
      if (!isCurrentAccountEpoch(epoch)) return;
      const message = getApiErrorMessage(
        error,
        book ? "Could not save book." : "Could not create book.",
      );
      if (stillOpen()) setError(message);
      else useUndoToastStore.getState().showError(error, message);
    }
  };
  return (
    <BottomSheetModal
      embedded={embedded}
      animateIn={!embedded}
      visible
      onClose={closeEditor}
      scroll
      title={book ? "Edit cash book" : "Create a new book"}
      rightAction={<SheetCloseButton onPress={closeEditor} />}
      footer={
        <Button
          label={book ? "Save changes" : "Create book"}
          loading={isManaging}
          disabled={
            !nameValid ||
            minor === null ||
            (!book && books.length >= BOOK_LIMIT) ||
            isManaging ||
            Boolean(book && !dirty)
          }
          onPress={() => {
            void save();
          }}
        />
      }
    >
      <View style={{ gap: 22, paddingBottom: 8 }}>
        <View style={{ alignItems: "center", paddingVertical: 8 }}>
          <BookTile icon={icon} color={color} size={80} />
        </View>
        <FormField
          label="Book name"
          accessibilityLabel="Book name"
          value={name}
          onChangeText={setName}
          editable={!isManaging}
          autoCapitalize="words"
          error={
            name.trim().length > BOOK_NAME_MAX
              ? `Use at most ${BOOK_NAME_MAX} characters.`
              : undefined
          }
        />
        {!book && (
          <>
            <View style={{ gap: 8 }}>
              <AppText tone="muted">Currency</AppText>
              <HapticPressable
                accessibilityRole="button"
                accessibilityLabel={`Currency ${currency}`}
                accessibilityState={{ expanded: currencyOpen }}
                disabled={isManaging}
                onPress={() => setCurrencyOpen(!currencyOpen)}
                style={{
                  minHeight: 56,
                  padding: 16,
                  backgroundColor: tokens.colors.surface,
                  borderRadius: 16,
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <AppText>{currency}</AppText>
                <Icon name="chevron-down" size={20} />
              </HapticPressable>
              {currencyOpen && (
                <View>
                  {BOOK_CURRENCIES.map((code) => (
                    <HapticPressable
                      key={code}
                      accessibilityRole="radio"
                      accessibilityLabel={`Use ${code}`}
                      accessibilityState={{
                        selected: code === currency,
                        checked: code === currency,
                      }}
                      onPress={() => {
                        setCurrency(code);
                        setCurrencyOpen(false);
                      }}
                      style={{
                        minHeight: 44,
                        justifyContent: "center",
                        paddingHorizontal: 16,
                      }}
                    >
                      <AppText>{code}</AppText>
                    </HapticPressable>
                  ))}
                </View>
              )}
              <AppText variant="caption" tone="muted">
                Currency can't be changed later.
              </AppText>
              <AppText variant="caption" tone="muted">
                Timezone: {timezone}. Fixed after creation.
              </AppText>
            </View>
            <View style={{ gap: 8 }}>
              <FormField
                label="Opening balance (optional)"
                accessibilityLabel="Opening balance"
                value={opening}
                onChangeText={setOpening}
                editable={!isManaging}
                keyboardType="decimal-pad"
                placeholder="0"
                error={
                  minor === null
                    ? "Enter a valid amount within the safe limit and currency precision."
                    : undefined
                }
              />
              <AppText variant="caption" tone="muted">
                Use a negative amount for an existing debt.
              </AppText>
              <HapticPressable
                accessibilityRole="button"
                accessibilityLabel="Toggle opening balance sign"
                disabled={isManaging}
                onPress={() =>
                  setOpening(
                    opening.startsWith("-")
                      ? opening.slice(1)
                      : `-${opening || "0"}`,
                  )
                }
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <AppText tone="muted">± Change sign</AppText>
              </HapticPressable>
            </View>
          </>
        )}
        {book && (
          <AppText tone="muted">
            {book.currencyCode} · {book.timezone} · Opening balance{" "}
            {formatCurrency(book.openingBalanceMinor, book.currencyCode)}. These
            values cannot be changed.
          </AppText>
        )}
        <BookStylePicker
          icon={icon}
          color={color}
          onIcon={(value) => {
            setIcon(value);
            setIconTouched(true);
          }}
          onColor={(value) => {
            setColor(value);
            setColorTouched(true);
          }}
          disabled={isManaging}
        />
        {!book && books.length >= BOOK_LIMIT && (
          <AppText tone="muted">You can have up to 10 cash books.</AppText>
        )}
        {error ? (
          <AppText
            accessibilityRole="alert"
            style={{ color: tokens.colors.danger }}
          >
            {error}
          </AppText>
        ) : null}
      </View>
    </BottomSheetModal>
  );
}

import { useBookOperations } from "../operations";
import { View } from "react-native";
import { useBooksStore } from "../store";
import { bookStyle } from "../constants";
import { useBookUIStore } from "./store";
import { Icon } from "@/shared/ui/components/Icon";
import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { Skeleton } from "@/shared/ui/components/Skeleton";
import { tokens } from "@/shared/ui/theme/tokens";
export function BookSwitcherPill() {
  const {
    books,
    selectedBookId,
    ready,
    error,
    isManaging: managingBooks,
    loadBooks,
  } = useBooksStore();
  const book = books.find((b) => b.id === selectedBookId);
  const activeOperations = useBookOperations((s) => s.active);
  const isManaging = managingBooks || activeOperations > 0;
  if (!ready && !error)
    return (
      <View accessibilityLabel="Loading cash books" style={{ marginTop: 12 }}>
        <Skeleton width={160} height={44} />
      </View>
    );
  if (!ready || !book)
    return (
      <HapticPressable
        accessibilityRole="button"
        accessibilityLabel="Retry loading cash books"
        onPress={() => {
          void loadBooks().catch(() => {});
        }}
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <AppText tone="muted">
          {error ? "Cash books unavailable · Retry" : "No cash book · Retry"}
        </AppText>
      </HapticPressable>
    );
  const style = bookStyle(book.icon, book.color);
  return (
    <HapticPressable
      accessibilityRole="button"
      accessibilityLabel={`Switch cash book, current book ${book.name}`}
      accessibilityState={{ disabled: isManaging }}
      disabled={isManaging}
      onPress={() => useBookUIStore.getState().open("switcher")}
      style={{
        alignSelf: "flex-start",
        maxWidth: "100%",
        marginTop: 12,
        minHeight: 44,
        paddingHorizontal: 12,
        gap: 10,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: tokens.radii.pill,
        backgroundColor: tokens.colors.surface,
        borderWidth: 1,
        borderColor: tokens.colors.stroke,
      }}
    >
      <Icon name={style.icon} color={style.color} size={20} />
      <AppText numberOfLines={1} style={{ flexShrink: 1 }} weight="semibold">
        {book.name}
      </AppText>
      <Icon name="chevron-down" size={16} color={tokens.colors.text} />
    </HapticPressable>
  );
}

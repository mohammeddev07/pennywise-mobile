import { moveBook } from '../reorder';
import { BookEditor } from './BookEditor';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { USE_MOCK_API } from '@/shared/api/client';
import { BottomSheetModal, SheetCloseButton } from '@/shared/ui/components/BottomSheetModal';
import { AppText } from '@/shared/ui/components/AppText';
import { HapticPressable } from '@/shared/ui/components/HapticPressable';
import { IconButton } from '@/shared/ui/components/IconButton';
import { Button } from '@/shared/ui/components/Button';
import { Icon } from '@/shared/ui/components/Icon';
import { tokens } from '@/shared/ui/theme/tokens';
import { formatCurrency } from '@/shared/utils/formatCurrency';
import { useUndoToastStore } from '@/shared/ui/state/useUndoToastStore';
import { useBooksStore } from '../store';
import { BOOK_LIMIT } from '../constants';
import { selectBook } from '../coordinator';
import { useBookUIStore } from './store';
import { BookTile } from './BookTile';
export function BookSheets() {
  const router = useRouter();
  const { sheet, bookId, close, open } = useBookUIStore();
  const { books, selectedBookId, isManaging } = useBooksStore();
  if (!USE_MOCK_API) return null;
  if (sheet === 'create') return <BookEditor />;
  const editing = books.find(b => b.id === bookId);
  if (sheet === 'edit' && editing) return <BookEditor key={editing.id} book={editing} />;
  if (sheet === 'menu' && editing) {
    const index = books.findIndex(b => b.id === bookId);
    const move = (to: number) => { void moveBook(editing.id, to).then(close).catch(error => useUndoToastStore.getState().showError(error)); };
    return <BottomSheetModal visible title={editing.name} onClose={close} rightAction={<SheetCloseButton onPress={close} />}><View style={{ gap: 12 }}>
      <Button label="Rename or change icon/color" disabled={isManaging} onPress={() => open('edit', editing.id)} />
      <Button label="Move up" variant="secondary" disabled={isManaging || index === 0} onPress={() => move(index - 1)} />
      <Button label="Move down" variant="secondary" disabled={isManaging || index === books.length - 1} onPress={() => move(index + 1)} />
    </View></BottomSheetModal>;
  }
  return <BottomSheetModal visible={sheet === 'switcher'} onClose={close} title="Cash books" scroll={books.length > 4} rightAction={<SheetCloseButton onPress={close} />}>
    <View style={{ borderRadius: 20, backgroundColor: tokens.colors.surface }}>
      {books.map(book => <View key={book.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: tokens.colors.divider }}>
        <HapticPressable disabled={isManaging} accessibilityRole="button" accessibilityState={{ selected: book.id === selectedBookId }} accessibilityLabel={`Switch to ${book.name}`} onPress={() => { void selectBook(book.id).catch(error => useUndoToastStore.getState().showError(error)); }} style={{ minHeight: 76, flex: 1, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <BookTile icon={book.icon} color={book.color} /><View style={{ flex: 1 }}><AppText weight="semibold" numberOfLines={1}>{book.name}</AppText><AppText tone="muted">{book.balanceMinor === undefined ? 'Balance unavailable' : formatCurrency(book.balanceMinor, book.currencyCode)}</AppText></View>
        </HapticPressable>
        {book.id === selectedBookId ? <Icon name="checkmark" color={tokens.colors.accent} size={22} /> : <IconButton icon="ellipsis-vertical" accessibilityLabel={`Manage ${book.name}`} disabled={isManaging} onPress={() => open('menu', book.id)} />}
      </View>)}
    </View>
    <View style={{ marginTop: 24, gap: 12 }}><Button label="Add new book" variant="outline" style={{ borderWidth: 1, borderColor: tokens.colors.accent }} disabled={isManaging || books.length >= BOOK_LIMIT} onPress={() => open('create')} />{books.length >= BOOK_LIMIT && <AppText tone="muted">You can have up to 10 cash books.</AppText>}
      <HapticPressable accessibilityRole="button" accessibilityLabel="Manage cash books in Profile" onPress={() => { close(); router.navigate({ pathname: '/(tabs)/settings', params: { section: 'books' } }); }} style={{ minHeight: 56, paddingHorizontal: 16, backgroundColor: tokens.colors.surface, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}><Icon name="settings-outline" size={20} /><AppText style={{ flex: 1 }}>Manage books</AppText><Icon name="chevron-forward" size={18} /></HapticPressable>
    </View>
  </BottomSheetModal>;
}

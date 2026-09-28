import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheetModal, SheetCloseButton } from '@/shared/ui/components/BottomSheetModal';
import { FormField } from '@/shared/ui/components/FormField';
import { Button } from '@/shared/ui/components/Button';
import { AppText } from '@/shared/ui/components/AppText';
import { HapticPressable } from '@/shared/ui/components/HapticPressable';
import { Icon } from '@/shared/ui/components/Icon';
import { tokens } from '@/shared/ui/theme/tokens';
import { confirmDestructive } from '@/shared/ui/utils/confirm';
import { getApiErrorMessage } from '@/shared/api/errors';
import { BOOK_CURRENCIES, BOOK_NAME_MAX, BOOK_LIMIT, type BookColor, type BookIcon } from '../constants';
import { useBooksStore, deviceTimezone } from '../store';
import { parseOpeningBalance } from '../openingBalance';
import { BookTile } from './BookTile';
import { BookStylePicker } from './BookStylePicker';
import { useBookUIStore } from './store';
import { getAccountEpoch, isCurrentAccountEpoch } from '@/shared/session/accountEpoch';
export function BookEditor() {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<string>('USD');
  const [opening, setOpening] = useState('');
  const [icon, setIcon] = useState<BookIcon>('book');
  const [color, setColor] = useState<BookColor>('green');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [error, setError] = useState('');
  const [timezone] = useState(deviceTimezone);
  const { isManaging, addBook, books } = useBooksStore();
  const close = useBookUIStore(s => s.close);
  const dirty = Boolean(name || opening || currency !== 'USD' || icon !== 'book' || color !== 'green');
  const closeEditor = () => { if (isManaging) return; if (dirty) confirmDestructive('Discard new book?', 'Your changes will be lost.', close, 'Discard'); else close(); };
  const nameValid = Boolean(name.trim()) && name.trim().length <= BOOK_NAME_MAX;
  const minor = parseOpeningBalance(opening, currency);
  const save = async () => {
    if (!nameValid || minor === null || isManaging) return;
    const epoch = getAccountEpoch();
    setError('');
    try {
      await addBook({ name: name.trim(), currencyCode: currency, timezone, openingBalanceMinor: minor, icon, color });
      if (isCurrentAccountEpoch(epoch)) close();
    } catch (error) { if (isCurrentAccountEpoch(epoch)) setError(getApiErrorMessage(error, 'Could not create book.')); }
  };
  return <BottomSheetModal visible onClose={closeEditor} scroll title="Create a new book" rightAction={<SheetCloseButton onPress={closeEditor} />} footer={<Button label="Create book" loading={isManaging} disabled={!nameValid || minor === null || books.length >= BOOK_LIMIT || isManaging} onPress={() => { void save(); }} />}>
    <View style={{ gap: 22, paddingBottom: 8 }}>
      <View style={{ alignItems: 'center', paddingVertical: 8 }}><BookTile icon={icon} color={color} size={80} /></View>
      <FormField label="Book name" accessibilityLabel="Book name" value={name} onChangeText={setName} editable={!isManaging} autoCapitalize="words" error={name.trim().length > BOOK_NAME_MAX ? `Use at most ${BOOK_NAME_MAX} characters.` : undefined} />
      <View style={{ gap: 8 }}><AppText tone="muted">Currency</AppText><HapticPressable accessibilityRole="button" accessibilityLabel={`Currency ${currency}`} accessibilityState={{ expanded: currencyOpen }} disabled={isManaging} onPress={() => setCurrencyOpen(!currencyOpen)} style={{ minHeight: 56, padding: 16, backgroundColor: tokens.colors.surface, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between' }}><AppText>{currency}</AppText><Icon name="chevron-down" size={20} /></HapticPressable>
        {currencyOpen && <View>{BOOK_CURRENCIES.map(code => <HapticPressable key={code} accessibilityRole="radio" accessibilityLabel={`Use ${code}`} accessibilityState={{ selected: code === currency }} onPress={() => { setCurrency(code); setCurrencyOpen(false); }} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 }}><AppText>{code}</AppText></HapticPressable>)}</View>}
        <AppText variant="caption" tone="muted">Currency can't be changed later.</AppText><AppText variant="caption" tone="muted">Timezone: {timezone}. Fixed after creation.</AppText>
      </View>
      <View style={{ gap: 8 }}><FormField label="Opening balance (optional)" accessibilityLabel="Opening balance" value={opening} onChangeText={setOpening} editable={!isManaging} keyboardType="decimal-pad" placeholder="0" error={minor === null ? 'Enter a valid amount within the safe limit and currency precision.' : undefined} />
        <AppText variant="caption" tone="muted">Use a negative amount for an existing debt.</AppText>
        <HapticPressable accessibilityRole="button" accessibilityLabel="Toggle opening balance sign" disabled={isManaging} onPress={() => setOpening(opening.startsWith('-') ? opening.slice(1) : `-${opening || '0'}`)} style={{ minHeight: 44, justifyContent: 'center' }}><AppText tone="muted">± Change sign</AppText></HapticPressable>
      </View>
      <BookStylePicker icon={icon} color={color} onIcon={setIcon} onColor={setColor} disabled={isManaging} />
      {books.length >= BOOK_LIMIT && <AppText tone="muted">You can have up to 10 cash books.</AppText>}
      {error ? <AppText accessibilityRole="alert" style={{ color: tokens.colors.danger }}>{error}</AppText> : null}
    </View>
  </BottomSheetModal>;
}

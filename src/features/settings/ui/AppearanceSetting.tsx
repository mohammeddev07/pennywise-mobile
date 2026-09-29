import { useState } from 'react';
import { View } from 'react-native';
import { useSettingsStore } from '../store';
import { useResolvedAppearance, type AppearancePreference } from '@/shared/ui/theme/appearance';
import { tokens } from '@/shared/ui/theme/tokens';
import { BottomSheetModal, SheetCloseButton } from '@/shared/ui/components/BottomSheetModal';
import { SettingsRow } from '@/shared/ui/components/SettingsRow';
import { HapticPressable } from '@/shared/ui/components/HapticPressable';
import { AppText } from '@/shared/ui/components/AppText';
import { Icon } from '@/shared/ui/components/Icon';
const options = [{ key: 'system', label: 'System', hint: 'Follow your device appearance' }, { key: 'light', label: 'Light', hint: 'Light surfaces and dark text' }, { key: 'dark', label: 'Dark', hint: 'Dark surfaces and light text' }] as const;
export function AppearanceSetting() {
  const [open, setOpen] = useState(false);
  const { appearance, setAppearance } = useSettingsStore();
  useResolvedAppearance();
  return <>
    <SettingsRow label="Appearance" icon="settings-outline" value={options.find(o => o.key === appearance)?.label ?? 'System'} onPress={() => setOpen(true)} />
    <BottomSheetModal visible={open} title="Appearance" onClose={() => setOpen(false)} rightAction={<SheetCloseButton onPress={() => setOpen(false)} />}>
      {options.map(option => <HapticPressable key={option.key} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: appearance === option.key, selected: appearance === option.key }} onPress={() => setAppearance(option.key as AppearancePreference)} style={{ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{flex: 1}}><AppText weight="semibold">{option.label}</AppText><AppText tone="muted" variant="caption">{option.hint}</AppText></View>
        {appearance === option.key && <Icon name="checkmark" color={tokens.colors.accent} />}
      </HapticPressable>)}
    </BottomSheetModal>
  </>;
}

import { Appearance, useColorScheme } from 'react-native';
import { useSettingsStore } from '@/features/settings/store';
export type AppearancePreference = 'system' | 'light' | 'dark';
export function resolveAppearance(preference: AppearancePreference, device: string | null | undefined): 'light' | 'dark' {
  return preference === 'system' ? (device === 'dark' ? 'dark' : 'light') : preference;
}
export function getResolvedAppearance() {
  return resolveAppearance(useSettingsStore.getState().appearance, Appearance.getColorScheme());
}
/** Subscribe at screen boundaries without remounting forms or discarding drafts. */
export function useResolvedAppearance() {
  const preference = useSettingsStore(s => s.appearance);
  return resolveAppearance(preference, useColorScheme());
}

import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { AppText } from './AppText';
import { tokens } from '../theme/tokens';

export type DonutEntry = { id: string; name: string; amount: number; color: string };
/** Normalize before summing so many individually safe amounts cannot overflow. */
export function donutShares(entries: DonutEntry[]) {
  const positive = entries.filter(e => Number.isFinite(e.amount) && e.amount > 0);
  const maximum = positive.reduce((max, e) => Math.max(max, e.amount), 0);
  const sum = positive.reduce((value, e) => value + e.amount / maximum, 0);
  return positive.map(e => ({ ...e, share: (e.amount / maximum) / sum }));
}
export function CategoryDonut({ entries, label }: { entries: DonutEntry[]; label: string }) {
  const shares = donutShares(entries);
  if (!shares.length) return null;
  const circumference = 2 * Math.PI * 68;
  let offset = 0;
  return <View style={{ alignItems: 'center', paddingVertical: 20, gap: 12 }}>
    <View accessible accessibilityRole="image" accessibilityLabel={`${label}. ${shares.map(e => `${e.name}: ${(e.share * 100).toFixed(1)} percent`).join(', ')}`} style={{ width: 176, height: 176 }}>
      <Svg width={176} height={176} viewBox="0 0 176 176" accessible={false}>
        {shares.map(entry => {
          const start = offset; offset += entry.share * circumference;
          return <Circle key={entry.id} cx={88} cy={88} r={68} fill="none" stroke={entry.color} strokeWidth={24}
            strokeDasharray={[entry.share * circumference, circumference]} strokeDashoffset={-start}
            rotation={-90} origin="88, 88" />;
        })}
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', inset: 40, alignItems: 'center', justifyContent: 'center' }}>
        <AppText variant="xl" weight="bold">{shares.length}</AppText>
        <AppText variant="caption" tone="muted">categories</AppText>
      </View>
    </View>
    <AppText variant="caption" tone="muted" style={{ textAlign: 'center' }}>Share of {label.toLowerCase()}. Exact amounts and categories below.</AppText>
  </View>;
}

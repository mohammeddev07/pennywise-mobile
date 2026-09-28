import { View } from 'react-native';
import { bookStyle } from '../constants';
import { Icon } from '@/shared/ui/components/Icon';
export function BookTile({ icon, color, size = 40 }: { icon?: string; color?: string; size?: number }) {
  const style = bookStyle(icon, color);
  return <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: style.color, alignItems: 'center', justifyContent: 'center' }}><Icon name={style.icon} color="#FFFFFF" size={size * .55} /></View>;
}

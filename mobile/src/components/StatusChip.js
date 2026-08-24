import { Chip } from 'react-native-paper';
import { statusColor } from '../theme/theme.js';

export default function StatusChip({ label }) {
  const color = statusColor(label);
  return (
    <Chip
      compact
      style={{ backgroundColor: color + '20' }}
      textStyle={{ color, fontWeight: '700', fontSize: 11 }}
    >
      {String(label).replace(/_/g, ' ')}
    </Chip>
  );
}

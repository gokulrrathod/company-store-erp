import { View } from 'react-native';
import { Text } from 'react-native-paper';

export default function EmptyState({ message }) {
  return (
    <View style={{ padding: 32, alignItems: 'center' }}>
      <Text variant="bodyMedium" style={{ color: '#64748B' }}>{message}</Text>
    </View>
  );
}

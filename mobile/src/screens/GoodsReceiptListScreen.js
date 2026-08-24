import { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Appbar, FAB, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import StatusChip from '../components/StatusChip.js';
import EmptyState from '../components/EmptyState.js';
import { api } from '../api/client.js';

function ReceiptCard({ receipt, onPress }) {
  const lines = receipt.lines || [];
  return (
    <Card mode="outlined" style={{ marginBottom: 12 }} onPress={onPress}>
      <Card.Content>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>{receipt.grn_number}</Text>
          <StatusChip label={receipt.status} />
        </View>
        <Text variant="bodySmall" style={{ color: '#64748B', marginTop: 4 }}>
          {receipt.supplier_name} · {new Date(receipt.created_at).toLocaleDateString()}
        </Text>
        {lines.slice(0, 2).map((l) => (
          <View key={l.id} style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            <Text variant="bodySmall">{l.item_name}</Text>
            <Text variant="bodySmall" style={{ fontWeight: '700' }}>{l.quantity_received} {l.unit}</Text>
          </View>
        ))}
        {lines.length > 2 && <Text variant="bodySmall" style={{ color: '#64748B', marginTop: 4 }}>+{lines.length - 2} more</Text>}
      </Card.Content>
    </Card>
  );
}

export default function GoodsReceiptListScreen({ navigation }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/material-receipts').then((res) => setReceipts(res.data)).catch(() => setReceipts([])).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Appbar.Header elevated>
        <Appbar.Content title="Goods Receipt" />
      </Appbar.Header>
      {loading && !receipts.length && <ActivityIndicator style={{ marginTop: 40 }} color="#4F46E5" />}
      <FlatList
        data={receipts}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => (
          <ReceiptCard receipt={item} onPress={() => navigation.navigate('GoodsReceiptDetail', { id: item.id })} />
        )}
        ListEmptyComponent={!loading ? <EmptyState message="No receipts recorded yet." /> : null}
      />
      <FAB
        icon="plus" label="New Receipt" style={{ position: 'absolute', right: 16, bottom: 16 }}
        onPress={() => navigation.navigate('GoodsReceiptForm')}
      />
    </View>
  );
}

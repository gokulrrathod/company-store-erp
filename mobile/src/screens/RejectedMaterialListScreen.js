import { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Appbar, FAB, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import StatusChip from '../components/StatusChip.js';
import EmptyState from '../components/EmptyState.js';
import { api } from '../api/client.js';

function RejectionCard({ r }) {
  return (
    <Card mode="outlined" style={{ marginBottom: 12 }}>
      <Card.Content>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>{r.rejection_number}</Text>
          <StatusChip label={r.action_taken} />
        </View>
        <Text variant="bodySmall" style={{ color: '#64748B', marginTop: 4 }}>
          {r.item_code} — {r.item_name} · Qty {r.quantity}
        </Text>
        <Text variant="bodySmall" style={{ color: '#64748B' }}>{r.supplier_name || '—'} · Batch {r.batch_number || '—'}</Text>
        <Text variant="bodyMedium" style={{ marginTop: 6 }}>{r.reason}</Text>
      </Card.Content>
    </Card>
  );
}

export default function RejectedMaterialListScreen({ navigation }) {
  const [rejections, setRejections] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/rejected-materials').then((res) => setRejections(res.data)).catch(() => setRejections([])).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Appbar.Header elevated>
        <Appbar.Content title="Rejected Material" />
      </Appbar.Header>
      {loading && !rejections.length && <ActivityIndicator style={{ marginTop: 40 }} color="#4F46E5" />}
      <FlatList
        data={rejections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => <RejectionCard r={item} />}
        ListEmptyComponent={!loading ? <EmptyState message="No rejections logged yet." /> : null}
      />
      <FAB
        icon="plus" label="Log Rejection" style={{ position: 'absolute', right: 16, bottom: 16 }}
        onPress={() => navigation.navigate('RejectedMaterialForm')}
      />
    </View>
  );
}

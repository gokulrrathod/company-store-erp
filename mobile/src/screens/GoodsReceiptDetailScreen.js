import { useCallback, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Card, Appbar, Button, ActivityIndicator, Banner, Divider } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import StatusChip from '../components/StatusChip.js';
import { api } from '../api/client.js';

export default function GoodsReceiptDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get(`/material-receipts/${id}`).then((res) => setDetail(res.data)).catch(() => setDetail(null));
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const inspect = async (lineId, inspection_status) => {
    setError(''); setBusy(true);
    try {
      await api.patch(`/material-receipts/${id}/lines/${lineId}/inspect`, { inspection_status });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update inspection status');
    } finally { setBusy(false); }
  };

  const approve = async () => {
    setError(''); setBusy(true);
    try {
      await api.post(`/material-receipts/${id}/approve`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve receipt');
    } finally { setBusy(false); }
  };

  if (!detail) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        <Appbar.Header elevated><Appbar.BackAction onPress={() => navigation.goBack()} /><Appbar.Content title="Receipt" /></Appbar.Header>
        <ActivityIndicator style={{ marginTop: 40 }} color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Appbar.Header elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={detail.grn_number} subtitle={detail.supplier_name} />
      </Appbar.Header>
      {!!error && (
        <Banner visible icon="alert-circle" actions={[{ label: 'Dismiss', onPress: () => setError('') }]}>{error}</Banner>
      )}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <StatusChip label={detail.status} />
          <Text variant="bodySmall" style={{ color: '#64748B' }}>{new Date(detail.created_at).toLocaleDateString()}</Text>
        </View>

        {(detail.lines || []).map((line) => (
          <Card key={line.id} mode="outlined" style={{ marginBottom: 12 }}>
            <Card.Content>
              <Text variant="titleSmall" style={{ fontWeight: '700' }}>{line.item_name}</Text>
              <Text variant="bodySmall" style={{ color: '#64748B' }}>{line.item_code} · Batch {line.batch_number || '—'}</Text>
              <Text variant="bodyMedium" style={{ marginTop: 6, fontWeight: '700' }}>{line.quantity_received} received</Text>
              <Divider style={{ marginVertical: 10 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <StatusChip label={line.inspection_status} />
                {line.inspection_status === 'PENDING' && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button compact mode="contained-tonal" onPress={() => inspect(line.id, 'ACCEPTED')} disabled={busy}>Accept</Button>
                    <Button compact mode="outlined" textColor="#E11D48" onPress={() => inspect(line.id, 'REJECTED')} disabled={busy}>Reject</Button>
                  </View>
                )}
              </View>
            </Card.Content>
          </Card>
        ))}

        {detail.status !== 'APPROVED' && (
          <Button mode="contained" onPress={approve} loading={busy} disabled={busy} style={{ marginTop: 8 }}>
            Approve Receipt
          </Button>
        )}
      </ScrollView>
    </View>
  );
}

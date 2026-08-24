import { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { Text, Card, Appbar, FAB, ActivityIndicator, IconButton, Banner } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import StatusChip from '../components/StatusChip.js';
import EmptyState from '../components/EmptyState.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.js';

function RequestCard({ request, canAction, onApprove, onReject, onForward, busy }) {
  return (
    <Card mode="outlined" style={{ marginBottom: 12 }}>
      <Card.Content>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>{request.requisition_number}</Text>
          <StatusChip label={request.priority} />
          <StatusChip label={request.status} />
        </View>
        <Text variant="bodySmall" style={{ color: '#64748B', marginTop: 4 }}>
          {request.item_code} — {request.item_name}
        </Text>
        <Text variant="bodySmall" style={{ color: '#64748B' }}>
          Req {request.quantity_requested} · Issued {request.quantity_issued ?? '—'} · Bal {request.balance_stock ?? '—'}
        </Text>
        <Text variant="bodySmall" style={{ color: '#64748B' }}>
          {request.requested_by} ({request.department})
        </Text>

        {canAction && (request.status === 'PENDING' || ['FORWARDED_TO_PURCHASE', 'PO_RAISED'].includes(request.status)) && (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <IconButton icon="check-circle" iconColor="#059669" mode="contained-tonal" onPress={onApprove} disabled={busy} />
            <IconButton icon="close-circle" iconColor="#E11D48" mode="contained-tonal" onPress={onReject} disabled={busy} />
            {request.status === 'PENDING' && (
              <IconButton icon="send" iconColor="#0EA5E9" mode="contained-tonal" onPress={onForward} disabled={busy} />
            )}
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

export default function MaterialRequestsListScreen({ navigation }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  const canAction = ['STORE_MANAGER', 'ADMIN'].includes(user?.role);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/material-requests').then((res) => setRequests(res.data)).catch(() => setRequests([])).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const act = async (id, fn) => {
    setError(''); setBusyId(id);
    try { await fn(); load(); }
    catch (err) { setError(err.response?.data?.error || 'Action failed'); }
    finally { setBusyId(null); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Appbar.Header elevated>
        <Appbar.Content title="Material Requests" />
      </Appbar.Header>
      {!!error && <Banner visible actions={[{ label: 'Dismiss', onPress: () => setError('') }]}>{error}</Banner>}
      {loading && !requests.length && <ActivityIndicator style={{ marginTop: 40 }} color="#4F46E5" />}
      <FlatList
        data={requests}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => (
          <RequestCard
            request={item} canAction={canAction} busy={busyId === item.id}
            onApprove={() => act(item.id, () => api.patch(`/material-requests/${item.id}/status`, { status: 'APPROVED' }))}
            onReject={() => act(item.id, () => api.patch(`/material-requests/${item.id}/status`, { status: 'REJECTED' }))}
            onForward={() => act(item.id, () => api.patch(`/material-requests/${item.id}/forward`))}
          />
        )}
        ListEmptyComponent={!loading ? <EmptyState message="No material requests yet." /> : null}
      />
      <FAB
        icon="plus" label="New Request" style={{ position: 'absolute', right: 16, bottom: 16 }}
        onPress={() => navigation.navigate('MaterialRequestForm')}
      />
    </View>
  );
}

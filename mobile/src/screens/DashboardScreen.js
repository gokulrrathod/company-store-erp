import { useCallback, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, ActivityIndicator, Appbar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.js';

const ROLE_ENDPOINT = {
  PURCHASE: '/dashboard/purchase-summary',
  SALES: '/dashboard/sales-summary',
  DISPATCH: '/dashboard/sales-summary',
};

function StatCard({ label, value, sub }) {
  return (
    <Card mode="outlined" style={{ flexBasis: '48%', marginBottom: 12 }}>
      <Card.Content>
        <Text variant="labelSmall" style={{ color: '#64748B', textTransform: 'uppercase', fontWeight: '700' }}>{label}</Text>
        <Text variant="titleLarge" style={{ fontWeight: '700', marginTop: 4 }}>{value}</Text>
        {!!sub && <Text variant="bodySmall" style={{ color: '#64748B' }}>{sub}</Text>}
      </Card.Content>
    </Card>
  );
}

export default function DashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const endpoint = ROLE_ENDPOINT[user?.role] || '/dashboard/summary';

  const load = useCallback(() => {
    setLoading(true);
    api.get(endpoint).then((res) => setSummary(res.data)).catch(() => setSummary(null)).finally(() => setLoading(false));
  }, [endpoint]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const cards = summary ? buildCards(endpoint, summary) : [];

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Appbar.Header elevated>
        <Appbar.Content title="Dashboard" subtitle={user?.name ? `${user.name} · ${user.role}` : ''} />
        <Appbar.Action icon="logout" onPress={logout} />
      </Appbar.Header>
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        {loading && !summary && <ActivityIndicator style={{ marginTop: 40 }} color="#4F46E5" />}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {cards.map((c) => <StatCard key={c.label} {...c} />)}
        </View>
      </ScrollView>
    </View>
  );
}

function buildCards(endpoint, s) {
  if (endpoint === '/dashboard/purchase-summary') {
    return [
      { label: 'Open Purchase Orders', value: s.open_po_count },
      { label: 'Open PO Value', value: `₹ ${Number(s.open_po_value).toLocaleString('en-IN')}` },
      { label: 'Pending Budget Approvals', value: s.pending_budget_approvals_count, sub: 'Awaiting Finance' },
      { label: 'Overdue Deliveries', value: s.overdue_deliveries_count, sub: 'Past expected date' },
    ];
  }
  if (endpoint === '/dashboard/sales-summary') {
    return [
      { label: 'Open Enquiries', value: s.open_enquiries_count },
      { label: 'Awaiting Quotation', value: s.pending_quotation_count },
      { label: 'Confirmed This Month', value: s.confirmed_orders_this_month },
      { label: 'Open Order Value', value: `₹ ${Number(s.open_so_value).toLocaleString('en-IN')}` },
    ];
  }
  return [
    { label: 'Total Stock Value', value: `₹ ${Number(s.total_stock_value).toLocaleString('en-IN')}` },
    { label: 'Total SKUs Tracked', value: `${s.total_skus} Items` },
    { label: 'Low Stock / Reorder', value: `${s.low_stock_count} SKUs`, sub: 'Trigger Requisition' },
    { label: 'Rejected Material', value: `${s.rejected_count} Lots`, sub: 'Awaiting Disposal' },
    { label: 'Pending QC Inspection', value: s.pending_inspection_count },
    { label: 'Pending Material Requests', value: s.pending_requests_count },
  ];
}

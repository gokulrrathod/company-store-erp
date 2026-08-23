import { useEffect, useState } from 'react';
import { Grid, Typography, Chip, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PaidIcon from '@mui/icons-material/Paid';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DataTable from '../../components/DataTable.jsx';
import LoadingState from '../../components/LoadingState.jsx';
import { StatCard, BarListChart, RatioBarChart, DonutChart, ApprovalsCard } from '../../components/dashboard/DashboardWidgets.jsx';
import { api } from '../../api/client.js';

const statusColor = { OPEN: 'default', PARTIALLY_RECEIVED: 'warning', CLOSED: 'success', AMENDED: 'error' };

export default function PurchaseDashboard() {
  const [summary, setSummary] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/purchase-summary').then((res) => setSummary(res.data)).catch(() => setSummary(null));
  }, []);

  if (!summary) return <LoadingState label="Loading dashboard..." />;

  const columnDefs = [
    { field: 'po_number', headerName: 'PO Number', minWidth: 150 },
    { field: 'supplier_name', headerName: 'Supplier', minWidth: 180 },
    { field: 'total_value', headerName: 'Value', minWidth: 120, valueFormatter: (p) => `₹ ${Number(p.value).toLocaleString('en-IN')}` },
    {
      field: 'status', headerName: 'Status', minWidth: 150,
      cellRenderer: (p) => <Chip size="small" label={p.value.replace(/_/g, ' ')} color={statusColor[p.value]} />,
    },
    { field: 'created_at', headerName: 'Date', minWidth: 120, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
  ];

  const poStatusLabels = { OPEN: 'Open', PARTIALLY_RECEIVED: 'Partially Received', CLOSED: 'Closed', AMENDED: 'Amended' };
  const poItems = (summary.po_status_breakdown || []).map((s) => ({ label: poStatusLabels[s.status] || s.status, value: s.count }));
  const poTotal = poItems.reduce((s, i) => s + i.value, 0);

  const supplierData = (summary.top_suppliers || []).map((s) => ({
    label: s.supplier_name, value: s.total_value, display: `₹ ${Number(s.total_value).toLocaleString('en-IN')}`,
  }));

  const budgetData = (summary.budget_utilization || []).map((b) => ({ label: b.department, used: b.utilized, total: b.allocated }));

  return (
    <>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Purchase Overview</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Cards and charts are clickable — they open the page that data comes from.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 1.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<ShoppingCartIcon />} color="primary" label="Open Purchase Orders" value={summary.open_po_count}
            onClick={() => navigate('/purchase-orders')} hint="Purchase Orders"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PaidIcon />} color="primary" label="Open PO Value" value={`₹ ${Number(summary.open_po_value).toLocaleString('en-IN')}`}
            onClick={() => navigate('/purchase-orders')} hint="Purchase Orders"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<AccountBalanceIcon />} color="warning" label="Pending Budget Approvals" value={summary.pending_budget_approvals_count} sub="Awaiting Finance"
            onClick={() => navigate('/purchase-orders')} hint="Purchase Orders"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<EventBusyIcon />} color="error" label="Overdue Deliveries" value={summary.overdue_deliveries_count} sub="Past expected date"
            onClick={() => navigate('/purchase-orders')} hint="Purchase Orders"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 1.5 }}>
        Where attention is needed
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <RatioBarChart heading="Budget Utilization by Department" data={budgetData} onClick={() => navigate('/budgets')} hint="Open Budgets" />
        </Grid>
        <Grid item xs={12} sm={6} md={3.5}>
          <BarListChart heading="Top Suppliers by Value" hint="Open Vendors" onClick={() => navigate('/vendors')} data={supplierData} barColor="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3.5}>
          <DonutChart
            heading="PO Status" hint="Open Purchase Orders" onClick={() => navigate('/purchase-orders')}
            items={poItems} centerValue={poTotal} centerLabel="Total"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 0.2 }}>
        <Grid item xs={12} md={6}>
          <ApprovalsCard
            rows={[
              { label: 'Purchase Orders pending budget approval', value: summary.pending_budget_approvals_count, icon: <AccountBalanceIcon fontSize="small" />, color: 'warning', onClick: () => navigate('/purchase-orders') },
              { label: 'Vendor registrations pending approval', value: summary.pending_vendor_approvals_count, icon: <StorefrontIcon fontSize="small" />, color: 'primary', onClick: () => navigate('/vendors') },
              { label: 'Deliveries overdue', value: summary.overdue_deliveries_count, icon: <EventBusyIcon fontSize="small" />, color: 'error', onClick: () => navigate('/purchase-orders') },
            ]}
          />
        </Grid>
      </Grid>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 3, mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700}>Recent Purchase Orders</Typography>
        <Typography
          variant="body2" fontWeight={700} color="primary" onClick={() => navigate('/purchase-orders')}
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.4, '&:hover': { textDecoration: 'underline' } }}
        >
          View all <ArrowForwardIcon sx={{ fontSize: 15 }} />
        </Typography>
      </Stack>
      <DataTable
        rowData={summary.recent_purchase_orders}
        columnDefs={columnDefs}
        pagination={false}
        minHeight={220}
        maxHeight={280}
        getRowId={(p) => p.data.po_number}
        emptyMessage="No purchase orders yet."
      />
    </>
  );
}

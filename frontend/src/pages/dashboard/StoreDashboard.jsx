import { useEffect, useState } from 'react';
import { Grid, Typography, Chip, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PaidIcon from '@mui/icons-material/Paid';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ShieldIcon from '@mui/icons-material/GppMaybe';
import HourglassIcon from '@mui/icons-material/HourglassTop';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DataTable from '../../components/DataTable.jsx';
import LoadingState from '../../components/LoadingState.jsx';
import { StatCard, BarListChart, DonutChart, TrendChart, ApprovalsCard } from '../../components/dashboard/DashboardWidgets.jsx';
import { api } from '../../api/client.js';

const statusColor = { PENDING_INSPECTION: 'warning', INSPECTED: 'default', APPROVED: 'success', REJECTED: 'error' };

export default function StoreDashboard() {
  const [summary, setSummary] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/summary').then((res) => setSummary(res.data)).catch(() => setSummary(null));
  }, []);

  if (!summary) return <LoadingState label="Loading dashboard..." />;

  const columnDefs = [
    { field: 'grn_number', headerName: 'GRN #', minWidth: 140 },
    { field: 'supplier_name', headerName: 'Supplier', minWidth: 180 },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 160,
      cellRenderer: (p) => <Chip size="small" label={p.value.replace(/_/g, ' ')} color={statusColor[p.value]} />,
    },
    { field: 'created_at', headerName: 'Date', minWidth: 120, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
  ];

  const grnLabels = { PENDING_INSPECTION: 'Pending Insp.', INSPECTED: 'Inspected', APPROVED: 'Approved', REJECTED: 'Rejected' };
  const grnItems = (summary.grn_status_breakdown || []).map((g) => ({ label: grnLabels[g.status] || g.status, value: g.count }));
  const grnTotal = grnItems.reduce((s, i) => s + i.value, 0);

  const valueItems = (summary.value_by_category || []).map((c) => ({ label: c.category_name, value: c.value }));
  const lowStockData = (summary.low_stock_by_category || []).map((d) => ({ label: d.category_name, value: d.count }));

  return (
    <>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Executive Store Overview</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Cards and charts are clickable — they open the page that data comes from.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 1.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PaidIcon />} color="primary" label="Total Stock Value"
            value={`₹ ${Number(summary.total_stock_value).toLocaleString('en-IN')}`}
            onClick={() => navigate('/inventory')} hint="Inventory"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<Inventory2Icon />} color="primary" label="Total SKUs Tracked" value={`${summary.total_skus} Items`}
            onClick={() => navigate('/inventory')} hint="Inventory"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<WarningAmberIcon />} color="warning" label="Low Stock / Reorder" value={`${summary.low_stock_count} SKUs`} sub="Trigger Requisition"
            onClick={() => navigate('/low-stock')} hint="Low Stock"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<ShieldIcon />} color="error" label="Rejected Material" value={`${summary.rejected_count} Lots`} sub="Awaiting Disposal"
            onClick={() => navigate('/rejected-material')} hint="Rejected Material"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 1.5 }}>
        Where attention is needed
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <BarListChart heading="Low Stock by Category" hint="Open Low Stock" onClick={() => navigate('/low-stock')} data={lowStockData} />
        </Grid>
        <Grid item xs={12} sm={6} md={3.5}>
          <DonutChart
            heading="Inventory Value by Category" hint="Open Inventory" onClick={() => navigate('/inventory')}
            items={valueItems} centerValue={summary.total_skus} centerLabel="SKUs"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3.5}>
          <DonutChart
            heading="GRN Status" hint="Open Goods Receipt" onClick={() => navigate('/goods-receipt')}
            items={grnItems} centerValue={grnTotal} centerLabel="Total"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 0.2 }}>
        <Grid item xs={12} md={6}>
          <TrendChart
            heading="Inward vs Outward — Last 7 Days" hint="Open Stock Movements" onClick={() => navigate('/stock-movements')}
            data={summary.seven_day_trend || []}
            seriesA={{ key: 'inward', label: 'Inward' }} seriesB={{ key: 'outward', label: 'Outward' }}
            valueLabel={(d) => `${d.inward} / ${d.outward} today, in units`}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <ApprovalsCard
            rows={[
              { label: 'Material Requests awaiting approval', value: summary.pending_requests_count, icon: <AssignmentIcon fontSize="small" />, color: 'primary', onClick: () => navigate('/material-requests') },
              { label: 'GRN lines awaiting QC inspection', value: summary.pending_inspection_count, icon: <HourglassIcon fontSize="small" />, color: 'warning', onClick: () => navigate('/goods-receipt') },
              { label: 'Rejected lots awaiting disposal', value: summary.rejected_count, icon: <ShieldIcon fontSize="small" />, color: 'error', onClick: () => navigate('/rejected-material') },
            ]}
          />
        </Grid>
      </Grid>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 3, mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700}>Recent Material Inward &amp; QC Status</Typography>
        <Typography
          variant="body2" fontWeight={700} color="primary" onClick={() => navigate('/goods-receipt')}
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.4, '&:hover': { textDecoration: 'underline' } }}
        >
          View all <ArrowForwardIcon sx={{ fontSize: 15 }} />
        </Typography>
      </Stack>
      <DataTable
        rowData={summary.recent_receipts}
        columnDefs={columnDefs}
        pagination={false}
        minHeight={220}
        maxHeight={280}
        getRowId={(p) => p.data.grn_number}
        emptyMessage="No receipts yet."
      />
    </>
  );
}

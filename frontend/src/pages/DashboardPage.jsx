import { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box, Chip } from '@mui/material';
import PaidIcon from '@mui/icons-material/Paid';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ShieldIcon from '@mui/icons-material/GppMaybe';
import HourglassIcon from '@mui/icons-material/HourglassTop';
import AssignmentIcon from '@mui/icons-material/Assignment';
import DataTable from '../components/DataTable.jsx';
import { api } from '../api/client.js';

const statusColor = { PENDING_INSPECTION: 'warning', INSPECTED: 'default', APPROVED: 'success', REJECTED: 'error' };

function StatCard({ icon, label, value, sub, color }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>{label}</Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>{value}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </Box>
      <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: `${color}.50`, color: `${color}.main`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </Box>
    </Paper>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get('/dashboard/summary').then((res) => setSummary(res.data)).catch(() => setSummary(null));
  }, []);

  if (!summary) return <Typography>Loading dashboard...</Typography>;

  const columnDefs = [
    { field: 'grn_number', headerName: 'GRN #', minWidth: 140 },
    { field: 'supplier_name', headerName: 'Supplier', minWidth: 180 },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 160,
      cellRenderer: (p) => <Chip size="small" label={p.value} color={statusColor[p.value]} />,
    },
    { field: 'created_at', headerName: 'Date', minWidth: 120, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
  ];

  return (
    <>
      <Typography variant="h5" gutterBottom>Executive Store Overview</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PaidIcon />}
            color="primary"
            label="Total Stock Value"
            value={`₹ ${Number(summary.total_stock_value).toLocaleString('en-IN')}`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<Inventory2Icon />} color="primary" label="Total SKUs Tracked" value={`${summary.total_skus} Items`} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<WarningAmberIcon />} color="warning" label="Low Stock / Reorder" value={`${summary.low_stock_count} SKUs`} sub="Trigger Requisition" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<ShieldIcon />} color="error" label="Rejected Material" value={`${summary.rejected_count} Lots`} sub="Awaiting Disposal" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<HourglassIcon />} color="warning" label="Pending QC Inspection" value={summary.pending_inspection_count} sub="GRN awaiting inspection" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<AssignmentIcon />} color="primary" label="Pending Material Requests" value={summary.pending_requests_count} sub="Awaiting approval" />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>Recent Material Inward &amp; QC Status</Typography>
      <DataTable
        rowData={summary.recent_receipts}
        columnDefs={columnDefs}
        pagination={false}
        height={280}
        getRowId={(p) => p.data.grn_number}
        emptyMessage="No receipts yet."
      />
    </>
  );
}

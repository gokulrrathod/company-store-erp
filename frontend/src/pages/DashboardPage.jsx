import { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box, Chip, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PaidIcon from '@mui/icons-material/Paid';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ShieldIcon from '@mui/icons-material/GppMaybe';
import HourglassIcon from '@mui/icons-material/HourglassTop';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DataTable from '../components/DataTable.jsx';
import { api } from '../api/client.js';

const statusColor = { PENDING_INSPECTION: 'warning', INSPECTED: 'default', APPROVED: 'success', REJECTED: 'error' };
const CHART_COLORS = ['#4F46E5', '#6366F1', '#0D9488', '#D97706', '#E11D48', '#0891B2', '#7C3AED'];

function buildConicGradient(items) {
  let cursor = 0;
  const stops = items.map((it, idx) => {
    const start = cursor;
    cursor += it.percent;
    return `${CHART_COLORS[idx % CHART_COLORS.length]} ${start}% ${cursor}%`;
  });
  return stops.length ? `conic-gradient(${stops.join(', ')})` : '#E2E8F0';
}

function ClickableCard({ onClick, hint, children, sx }) {
  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        p: 2.5, position: 'relative', cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow .15s ease, transform .15s ease, border-color .15s ease',
        '&:hover': onClick ? { boxShadow: '0 8px 24px rgba(79,70,229,0.14)', transform: 'translateY(-2px)', borderColor: 'primary.light', '& .hover-hint': { opacity: 1 } } : {},
        ...sx,
      }}
    >
      {onClick && hint && (
        <Typography className="hover-hint" variant="caption" sx={{ position: 'absolute', top: 12, right: 14, color: 'primary.main', fontWeight: 700, opacity: 0, transition: 'opacity .15s ease', display: 'flex', alignItems: 'center', gap: 0.3 }}>
          {hint} <ArrowForwardIcon sx={{ fontSize: 13 }} />
        </Typography>
      )}
      {children}
    </Paper>
  );
}

function StatCard({ icon, label, value, sub, color, onClick, hint }) {
  return (
    <ClickableCard onClick={onClick} hint={hint} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>{label}</Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>{value}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </Box>
      <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: `${color}.50`, color: `${color}.main`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </Box>
    </ClickableCard>
  );
}

function ChartHeading({ children }) {
  return (
    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: 'text.secondary' }}>
      {children}
    </Typography>
  );
}

function LowStockByCategoryChart({ data, onClick }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ClickableCard onClick={onClick} hint="Open Low Stock">
      <ChartHeading>Low Stock by Category</ChartHeading>
      <Stack spacing={1.2} sx={{ mt: 1.5 }}>
        {data.length === 0 && <Typography variant="body2" color="text.secondary">Nothing below reorder level.</Typography>}
        {data.map((d, idx) => (
          <Box key={d.category_name} sx={{ display: 'grid', gridTemplateColumns: '92px 1fr 28px', alignItems: 'center', gap: 1.2 }}>
            <Typography variant="body2" color="text.secondary" noWrap>{d.category_name}</Typography>
            <Box sx={{ height: 10, borderRadius: 1, bgcolor: 'background.default', overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${(d.count / max) * 100}%`, borderRadius: 1, bgcolor: idx === 0 ? 'warning.main' : 'warning.light' }} />
            </Box>
            <Typography variant="body2" fontWeight={700} textAlign="right">{d.count}</Typography>
          </Box>
        ))}
      </Stack>
    </ClickableCard>
  );
}

function DonutChart({ heading, hint, onClick, items, centerValue, centerLabel }) {
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const withPercent = items.map((i) => ({ ...i, percent: (i.value / total) * 100 }));
  return (
    <ClickableCard onClick={onClick} hint={hint}>
      <ChartHeading>{heading}</ChartHeading>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.2, mt: 1.5 }}>
        <Box sx={{
          width: 108, height: 108, borderRadius: '50%', flexShrink: 0, position: 'relative',
          background: buildConicGradient(withPercent),
        }}>
          <Box sx={{ position: 'absolute', inset: 16, borderRadius: '50%', bgcolor: 'background.paper', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1 }}>{centerValue}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>{centerLabel}</Typography>
          </Box>
        </Box>
        <Stack spacing={0.8} sx={{ minWidth: 0, flex: 1 }}>
          {withPercent.map((it, idx) => (
            <Box key={it.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <Box sx={{ width: 9, height: 9, borderRadius: 0.6, flexShrink: 0, bgcolor: CHART_COLORS[idx % CHART_COLORS.length] }} />
              <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1 }}>{it.label}</Typography>
              <Typography variant="body2" fontWeight={700}>{it.display ?? Math.round(it.percent) + '%'}</Typography>
            </Box>
          ))}
        </Stack>
      </Box>
    </ClickableCard>
  );
}

function TrendChart({ data, onClick }) {
  const w = 300, h = 70;
  const maxVal = Math.max(1, ...data.flatMap((d) => [d.inward, d.outward]));
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const toPoints = (key) => data.map((d, i) => `${i * step},${h - (d[key] / maxVal) * (h - 8) - 4}`).join(' ');
  const today = data[data.length - 1] || { inward: 0, outward: 0 };

  return (
    <ClickableCard onClick={onClick} hint="Open Stock Movements">
      <ChartHeading>Inward vs Outward — Last 7 Days</ChartHeading>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 1 }}>
        <Typography variant="h6" fontWeight={700}>{today.inward} / {today.outward}</Typography>
        <Typography variant="caption" color="text.secondary">today, in units</Typography>
      </Box>
      <Box component="svg" viewBox={`0 0 ${w} ${h}`} sx={{ width: '100%', height: 70, mt: 1 }} preserveAspectRatio="none">
        <polyline fill="none" stroke="#A5B4FC" strokeWidth="2" points={toPoints('inward')} />
        <polyline fill="none" stroke="#4F46E5" strokeWidth="2.5" points={toPoints('outward')} />
      </Box>
      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.7}>
          <Box sx={{ width: 10, height: 3, borderRadius: 1, bgcolor: '#A5B4FC' }} />
          <Typography variant="caption" color="text.secondary">Inward</Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.7}>
          <Box sx={{ width: 10, height: 3, borderRadius: 1, bgcolor: '#4F46E5' }} />
          <Typography variant="caption" color="text.secondary">Outward</Typography>
        </Stack>
      </Stack>
    </ClickableCard>
  );
}

function ApprovalsCard({ rows }) {
  return (
    <ClickableCard>
      <ChartHeading>Pending Approvals</ChartHeading>
      <Stack spacing={1.8} sx={{ mt: 1.5 }}>
        {rows.map((r) => (
          <Box key={r.label} onClick={r.onClick} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: r.onClick ? 'pointer' : 'default', '&:hover': r.onClick ? { '& .a-label': { color: 'primary.main' } } : {} }}>
            <Box sx={{ width: 30, height: 30, borderRadius: 1.5, bgcolor: `${r.color}.50`, color: `${r.color}.main`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {r.icon}
            </Box>
            <Typography className="a-label" variant="body2" color="text.secondary" sx={{ flex: 1, transition: 'color .15s ease' }}>{r.label}</Typography>
            <Typography variant="subtitle2" fontWeight={700}>{r.value}</Typography>
          </Box>
        ))}
      </Stack>
    </ClickableCard>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const navigate = useNavigate();

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
      cellRenderer: (p) => <Chip size="small" label={p.value.replace(/_/g, ' ')} color={statusColor[p.value]} />,
    },
    { field: 'created_at', headerName: 'Date', minWidth: 120, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
  ];

  const grnLabels = { PENDING_INSPECTION: 'Pending Insp.', INSPECTED: 'Inspected', APPROVED: 'Approved', REJECTED: 'Rejected' };
  const grnItems = (summary.grn_status_breakdown || []).map((g) => ({ label: grnLabels[g.status] || g.status, value: g.count }));
  const grnTotal = grnItems.reduce((s, i) => s + i.value, 0);

  const valueItems = (summary.value_by_category || []).map((c) => ({ label: c.category_name, value: c.value }));

  return (
    <>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
        <Typography variant="h5">Executive Store Overview</Typography>
      </Stack>
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
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<HourglassIcon />} color="warning" label="Pending QC Inspection" value={summary.pending_inspection_count} sub="GRN awaiting inspection"
            onClick={() => navigate('/goods-receipt')} hint="Goods Receipt"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<AssignmentIcon />} color="primary" label="Pending Material Requests" value={summary.pending_requests_count} sub="Awaiting approval"
            onClick={() => navigate('/material-requests')} hint="Material Requests"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<SwapVertIcon />} color="primary" label="Daily Inward / Outward"
            value={`${summary.daily_inward_qty} / ${summary.daily_outward_qty}`} sub="Today, in units"
            onClick={() => navigate('/stock-movements')} hint="Stock Movements"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<TrendingDownIcon />} color="primary" label="Monthly Consumption" value={summary.monthly_consumption_qty} sub="Units issued this month"
            onClick={() => navigate('/stock-movements')} hint="Stock Movements"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<EventBusyIcon />} color="warning" label="Expiring Materials" value={`${summary.expiring_materials_count} Batches`} sub="Within 30 days" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<FactCheckIcon />} color="success" label="Inventory Accuracy" value={`${summary.inventory_accuracy_percent}%`} sub="No negative-stock violations" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard icon={<WarehouseIcon />} color="primary" label="Warehouse Utilization" value={`${summary.warehouse_utilization_percent}%`} sub="Items with a location assigned" />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 1.5 }}>
        Where attention is needed
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <LowStockByCategoryChart data={summary.low_stock_by_category || []} onClick={() => navigate('/low-stock')} />
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
          <TrendChart data={summary.seven_day_trend || []} onClick={() => navigate('/stock-movements')} />
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

import { useEffect, useState } from 'react';
import { Grid, Typography, Chip, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import PaidIcon from '@mui/icons-material/Paid';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import DataTable from '../../components/DataTable.jsx';
import { StatCard, BarListChart, DonutChart, ApprovalsCard } from '../../components/dashboard/DashboardWidgets.jsx';
import { api } from '../../api/client.js';

const enquiryStatusColor = {
  NEW_ENQUIRY: 'default', QUOTATION_SENT: 'warning', WAITING_FOR_CUSTOMER: 'warning',
  UNDER_NEGOTIATION: 'warning', PRICE_APPROVED: 'success', ORDER_CONFIRMED: 'success',
};

export default function SalesDashboard() {
  const [summary, setSummary] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/sales-summary').then((res) => setSummary(res.data)).catch(() => setSummary(null));
  }, []);

  if (!summary) return <Typography>Loading dashboard...</Typography>;

  const columnDefs = [
    { field: 'enquiry_number', headerName: 'Enquiry No.', minWidth: 140 },
    { field: 'customer_name', headerName: 'Customer', minWidth: 180 },
    {
      field: 'status', headerName: 'Status', minWidth: 170,
      cellRenderer: (p) => <Chip size="small" label={p.value.replace(/_/g, ' ')} color={enquiryStatusColor[p.value]} />,
    },
    { field: 'created_at', headerName: 'Date', minWidth: 120, valueFormatter: (p) => new Date(p.value).toLocaleDateString() },
  ];

  const enquiryLabels = {
    NEW_ENQUIRY: 'New', QUOTATION_SENT: 'Quoted', WAITING_FOR_CUSTOMER: 'Awaiting Customer',
    UNDER_NEGOTIATION: 'Negotiating', PRICE_APPROVED: 'Price Approved', ORDER_CONFIRMED: 'Confirmed',
  };
  const enquiryItems = (summary.enquiry_pipeline || []).map((e) => ({ label: enquiryLabels[e.status] || e.status, value: e.count }));
  const enquiryTotal = enquiryItems.reduce((s, i) => s + i.value, 0);

  const soLabels = {
    ORDER_CONFIRMED: 'Confirmed', IN_PRODUCTION: 'In Production', PRODUCTION_COMPLETED: 'Production Done',
    READY_FOR_DISPATCH: 'Ready to Dispatch', DISPATCHED: 'Dispatched', DELIVERED: 'Delivered',
  };
  const soItems = (summary.so_status_breakdown || []).map((s) => ({ label: soLabels[s.status] || s.status, value: s.count }));
  const soTotal = soItems.reduce((s, i) => s + i.value, 0);

  const customerData = (summary.top_customers || []).map((c) => ({
    label: c.customer_name, value: c.total_value, display: `₹ ${Number(c.total_value).toLocaleString('en-IN')}`,
  }));

  return (
    <>
      <Typography variant="h5" sx={{ mb: 0.5 }}>Sales Overview</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Cards and charts are clickable — they open the page that data comes from.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 1.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<RequestQuoteIcon />} color="primary" label="Open Enquiries" value={summary.open_enquiries_count} sub="Not yet confirmed"
            onClick={() => navigate('/enquiries')} hint="Enquiries"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<RequestQuoteIcon />} color="warning" label="Awaiting Quotation" value={summary.pending_quotation_count} sub="New, no quote sent"
            onClick={() => navigate('/enquiries')} hint="Enquiries"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<ReceiptLongIcon />} color="success" label="Confirmed This Month" value={summary.confirmed_orders_this_month} sub="Sales Orders"
            onClick={() => navigate('/sales-orders')} hint="Sales Orders"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PaidIcon />} color="primary" label="Open Order Value" value={`₹ ${Number(summary.open_so_value).toLocaleString('en-IN')}`} sub="Balance outstanding"
            onClick={() => navigate('/sales-orders')} hint="Sales Orders"
          />
        </Grid>
      </Grid>

      <Typography variant="subtitle1" fontWeight={700} sx={{ mt: 3, mb: 1.5 }}>
        Where attention is needed
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <BarListChart heading="Top Customers by Value" hint="Open Sales Orders" onClick={() => navigate('/sales-orders')} data={customerData} barColor="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3.5}>
          <DonutChart
            heading="Enquiry Pipeline" hint="Open Enquiries" onClick={() => navigate('/enquiries')}
            items={enquiryItems} centerValue={enquiryTotal} centerLabel="Total"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3.5}>
          <DonutChart
            heading="Sales Order Status" hint="Open Sales Orders" onClick={() => navigate('/sales-orders')}
            items={soItems} centerValue={soTotal} centerLabel="Total"
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 0.2 }}>
        <Grid item xs={12} md={6}>
          <ApprovalsCard
            rows={[
              { label: 'Enquiries awaiting quotation', value: summary.pending_quotation_count, icon: <RequestQuoteIcon fontSize="small" />, color: 'warning', onClick: () => navigate('/enquiries') },
              { label: 'Sales Orders ready for dispatch', value: summary.awaiting_dispatch_count, icon: <LocalShippingIcon fontSize="small" />, color: 'primary', onClick: () => navigate('/sales-orders') },
            ]}
          />
        </Grid>
      </Grid>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 3, mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700}>Recent Enquiries</Typography>
        <Typography
          variant="body2" fontWeight={700} color="primary" onClick={() => navigate('/enquiries')}
          sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.4, '&:hover': { textDecoration: 'underline' } }}
        >
          View all <ArrowForwardIcon sx={{ fontSize: 15 }} />
        </Typography>
      </Stack>
      <DataTable
        rowData={summary.recent_enquiries}
        columnDefs={columnDefs}
        pagination={false}
        minHeight={220}
        maxHeight={280}
        getRowId={(p) => p.data.enquiry_number}
        emptyMessage="No enquiries yet."
      />
    </>
  );
}

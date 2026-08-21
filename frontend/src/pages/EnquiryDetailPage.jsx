import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box, Typography, Chip, Button, Stack, Alert, IconButton, Paper, Grid, Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RHFTextField from '../components/form/RHFTextField.jsx';
import RHFSelect from '../components/form/RHFSelect.jsx';
import { quotationSchema, negotiateSchema, confirmOrderSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const statusColor = {
  NEW_ENQUIRY: 'default', QUOTATION_SENT: 'warning', WAITING_FOR_CUSTOMER: 'warning',
  UNDER_NEGOTIATION: 'warning', PRICE_APPROVED: 'success', ORDER_CONFIRMED: 'success',
};

const PAYMENT_TERMS = [
  { value: 'ADVANCE_50', label: '50% Advance' },
  { value: 'FULL_100', label: '100% Full Payment' },
];

function Section({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mt: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>{title}</Typography>
      {children}
    </Paper>
  );
}

export default function EnquiryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enquiry, setEnquiry] = useState(null);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [actionError, setActionError] = useState('');

  const load = async () => {
    const { data } = await api.get(`/enquiries/${id}`);
    setEnquiry(data);
    if (data.status === 'ORDER_CONFIRMED') {
      const { data: orders } = await api.get('/sales-orders');
      setConfirmedOrder(orders.find((o) => o.enquiry_id === Number(id)) || null);
    }
  };

  useEffect(() => { load(); }, [id]);

  const quotationForm = useForm({ resolver: zodResolver(quotationSchema), defaultValues: { quotation_amount: '', quotation_date: '' } });
  const negotiateForm = useForm({ resolver: zodResolver(negotiateSchema), defaultValues: { negotiated_price: '', discount_percent: 0, discount_reason: '' } });
  const confirmForm = useForm({ resolver: zodResolver(confirmOrderSchema), defaultValues: { payment_terms: 'ADVANCE_50', advance_payment: '', expected_dispatch_date: '', customer_notes: '' } });

  const isSales = ['SALES', 'ADMIN'].includes(user?.role);
  const isManagement = ['MANAGEMENT', 'ADMIN'].includes(user?.role);

  const submitQuotation = async (values) => {
    setActionError('');
    try {
      await api.patch(`/enquiries/${id}/quotation`, values);
      load();
    } catch (err) {
      applyServerErrors(err, quotationForm.setError, setActionError);
    }
  };

  const submitNegotiate = async (values) => {
    setActionError('');
    try {
      await api.patch(`/enquiries/${id}/negotiate`, values);
      load();
    } catch (err) {
      applyServerErrors(err, negotiateForm.setError, setActionError);
    }
  };

  const approveDiscount = async (status) => {
    setActionError('');
    try {
      await api.patch(`/enquiries/${id}/approve-discount`, { status });
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to record decision');
    }
  };

  const submitConfirm = async (values) => {
    setActionError('');
    try {
      const { data } = await api.post(`/sales-orders/from-enquiry/${id}`, values);
      navigate(`/sales-orders/${data.id}`);
    } catch (err) {
      applyServerErrors(err, confirmForm.setError, setActionError);
    }
  };

  if (!enquiry) return <Typography>Loading...</Typography>;

  return (
    <Box sx={{ maxWidth: 800 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <IconButton size="small" onClick={() => navigate('/enquiries')}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>{enquiry.enquiry_number}</Typography>
        <Chip size="small" label={enquiry.status.replace(/_/g, ' ')} color={statusColor[enquiry.status]} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ ml: 5 }}>
        {enquiry.customer_name} · {enquiry.mobile_number} · {enquiry.company_name || 'No company'}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ ml: 5 }}>
        Requirement: {enquiry.product_requirement}
      </Typography>

      {actionError && <Alert severity="error" sx={{ mt: 2 }}>{actionError}</Alert>}

      {enquiry.status === 'NEW_ENQUIRY' && isSales && (
        <Section title="Send Quotation">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <RHFTextField name="quotation_amount" control={quotationForm.control} label="Quotation Amount (₹)" type="number" required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <RHFTextField name="quotation_date" control={quotationForm.control} label="Quotation Date" type="date" InputLabelProps={{ shrink: true }} required />
            </Grid>
          </Grid>
          <Button variant="contained" sx={{ mt: 2 }} onClick={quotationForm.handleSubmit(submitQuotation)}>Send Quotation</Button>
        </Section>
      )}

      {['QUOTATION_SENT', 'WAITING_FOR_CUSTOMER', 'UNDER_NEGOTIATION'].includes(enquiry.status) && isSales && enquiry.management_approval_status !== 'PENDING' && (
        <Section title="Negotiate Price">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <RHFTextField name="negotiated_price" control={negotiateForm.control} label="Negotiated Price (₹)" type="number" required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <RHFTextField name="discount_percent" control={negotiateForm.control} label="Discount %" type="number" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <RHFTextField name="discount_reason" control={negotiateForm.control} label="Discount Reason" />
            </Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Discounts above 2% route to Management for approval before the order can be confirmed.
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={negotiateForm.handleSubmit(submitNegotiate)}>Record Negotiation</Button>
        </Section>
      )}

      {enquiry.management_approval_status === 'PENDING' && (
        <Section title="Discount Approval Required">
          <Typography variant="body2">
            Requested discount: <strong>{enquiry.discount_percent}%</strong> — {enquiry.discount_reason}
          </Typography>
          {isManagement ? (
            <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
              <Button variant="contained" color="success" onClick={() => approveDiscount('APPROVED')}>Approve</Button>
              <Button variant="contained" color="error" onClick={() => approveDiscount('REJECTED')}>Reject</Button>
            </Stack>
          ) : (
            <Alert severity="warning" sx={{ mt: 2 }}>Awaiting Management approval.</Alert>
          )}
        </Section>
      )}

      {enquiry.status === 'PRICE_APPROVED' && isSales && (
        <Section title="Confirm Order">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <RHFSelect name="payment_terms" control={confirmForm.control} label="Payment Terms" required options={PAYMENT_TERMS} getLabel={(t) => t.label} getValue={(t) => t.value} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <RHFTextField name="advance_payment" control={confirmForm.control} label="Advance Payment (₹)" type="number" required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <RHFTextField name="expected_dispatch_date" control={confirmForm.control} label="Expected Dispatch Date" type="date" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <RHFTextField name="customer_notes" control={confirmForm.control} label="Customer Notes" multiline rows={2} />
            </Grid>
          </Grid>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Approved Price (locked): ₹ {Number(enquiry.negotiated_price).toLocaleString('en-IN')}
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={confirmForm.handleSubmit(submitConfirm)}>Confirm Order</Button>
        </Section>
      )}

      {enquiry.status === 'ORDER_CONFIRMED' && confirmedOrder && (
        <Section title="Order Confirmed">
          <Typography variant="body2">
            Sales Order <strong>{confirmedOrder.so_number}</strong> has been created.
          </Typography>
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate(`/sales-orders/${confirmedOrder.id}`)}>
            View Sales Order
          </Button>
        </Section>
      )}

      <Divider sx={{ my: 3 }} />
      <Typography variant="caption" color="text.secondary">
        Sales Representative: {enquiry.sales_representative} · Created {new Date(enquiry.created_at).toLocaleString()}
      </Typography>
    </Box>
  );
}

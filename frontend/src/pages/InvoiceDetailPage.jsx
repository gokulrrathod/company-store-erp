import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Typography, Chip, Button, Stack, Alert, Paper, Grid, Divider } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RHFTextField from '../components/form/RHFTextField.jsx';
import RHFSelect from '../components/form/RHFSelect.jsx';
import { invoicePaymentSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const statusColor = { PENDING: 'warning', PARTIAL: 'warning', PAID: 'success' };
const MODES = [
  { value: 'NEFT', label: 'NEFT' },
  { value: 'RTGS', label: 'RTGS' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
];

function Section({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mt: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>{title}</Typography>
      {children}
    </Paper>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [actionError, setActionError] = useState('');

  const load = () => {
    api.get(`/invoices/${id}`).then((res) => setInvoice(res.data)).catch(() => setInvoice(null));
  };

  useEffect(load, [id]);

  const { control, handleSubmit, reset, setError, formState: { isSubmitting } } = useForm({
    resolver: zodResolver(invoicePaymentSchema),
    defaultValues: { payment_date: '', mode: 'NEFT', reference_number: '', amount_paid: '' },
  });

  const canPay = ['ACCOUNTS', 'ADMIN'].includes(user?.role);

  const downloadVoucher = async (paymentId) => {
    setActionError('');
    try {
      const res = await api.get(`/invoices/${id}/payments/${paymentId}/voucher-pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PV-${String(paymentId).padStart(6, '0')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setActionError('Failed to download voucher');
    }
  };

  const submitPayment = async (values) => {
    setActionError('');
    try {
      await api.post(`/invoices/${id}/payments`, values);
      reset({ payment_date: '', mode: 'NEFT', reference_number: '', amount_paid: '' });
      load();
    } catch (err) {
      applyServerErrors(err, setError, setActionError);
    }
  };

  if (!invoice) return null;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/invoices')} sx={{ mb: 1 }}>Back to Invoices</Button>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">{invoice.invoice_number} — {invoice.party_name}</Typography>
        <Chip label={invoice.payment_status} color={statusColor[invoice.payment_status]} />
      </Stack>

      {actionError && <Alert severity="error" sx={{ mt: 2 }}>{actionError}</Alert>}

      <Section title="Invoice Details">
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Type</Typography><Typography>{invoice.invoice_type}</Typography></Grid>
          <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Reference</Typography><Typography>{invoice.po_number || invoice.so_number || '—'}</Typography></Grid>
          <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">GSTIN</Typography><Typography>{invoice.gstin || '—'}</Typography></Grid>
          <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Taxable Amount</Typography><Typography>₹ {Number(invoice.taxable_amount).toLocaleString('en-IN')}</Typography></Grid>
          <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">GST ({invoice.gst_percent}%)</Typography><Typography>₹ {Number(invoice.gst_amount).toLocaleString('en-IN')}</Typography></Grid>
          <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Total</Typography><Typography fontWeight={700}>₹ {Number(invoice.total_amount).toLocaleString('en-IN')}</Typography></Grid>
          <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Paid</Typography><Typography>₹ {Number(invoice.amount_paid).toLocaleString('en-IN')}</Typography></Grid>
          <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Balance</Typography><Typography fontWeight={700}>₹ {Number(invoice.balance).toLocaleString('en-IN')}</Typography></Grid>
        </Grid>
      </Section>

      <Section title="Line Items">
        <Grid container spacing={1} sx={{ fontWeight: 700, mb: 1 }}>
          <Grid item xs={3}><Typography variant="caption" color="text.secondary">Description</Typography></Grid>
          <Grid item xs={2}><Typography variant="caption" color="text.secondary">HSN/SAC</Typography></Grid>
          <Grid item xs={2}><Typography variant="caption" color="text.secondary">Qty</Typography></Grid>
          <Grid item xs={2}><Typography variant="caption" color="text.secondary">Rate</Typography></Grid>
          <Grid item xs={3}><Typography variant="caption" color="text.secondary">Amount</Typography></Grid>
        </Grid>
        {(invoice.lines || []).map((line) => (
          <Grid container spacing={1} key={line.id} sx={{ py: 0.5 }}>
            <Grid item xs={3}><Typography variant="body2">{line.item_code ? `${line.item_code} — ` : ''}{line.description}</Typography></Grid>
            <Grid item xs={2}><Typography variant="body2">{line.hsn_sac_code || '—'}</Typography></Grid>
            <Grid item xs={2}><Typography variant="body2">{Number(line.quantity)}</Typography></Grid>
            <Grid item xs={2}><Typography variant="body2">₹ {Number(line.rate).toLocaleString('en-IN')}</Typography></Grid>
            <Grid item xs={3}><Typography variant="body2">₹ {Number(line.amount).toLocaleString('en-IN')}</Typography></Grid>
          </Grid>
        ))}
      </Section>

      <Section title="Payment History">
        {!invoice.payments.length && <Typography variant="body2" color="text.secondary">No payments recorded yet.</Typography>}
        {invoice.payments.map((p, idx) => (
          <Box key={p.id}>
            {idx > 0 && <Divider sx={{ my: 1.5 }} />}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">{p.mode} {p.reference_number ? `· ${p.reference_number}` : ''} · {p.payment_date?.slice(0, 10)}</Typography>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="body2" fontWeight={600}>₹ {Number(p.amount_paid).toLocaleString('en-IN')}</Typography>
                <Button size="small" onClick={() => downloadVoucher(p.id)}>Voucher (PDF)</Button>
              </Stack>
            </Stack>
          </Box>
        ))}
      </Section>

      {canPay && invoice.payment_status !== 'PAID' && (
        <Section title="Record Payment">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
              <RHFSelect name="mode" control={control} label="Mode" required options={MODES} getLabel={(m) => m.label} getValue={(m) => m.value} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <RHFTextField name="reference_number" control={control} label="Reference / UTR" />
            </Grid>
            <Grid item xs={12} sm={3}>
              <RHFTextField name="payment_date" control={control} label="Payment Date" type="date" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <RHFTextField name="amount_paid" control={control} label="Amount (₹)" type="number" required />
            </Grid>
          </Grid>
          <Button variant="contained" sx={{ mt: 2 }} onClick={handleSubmit(submitPayment)} disabled={isSubmitting}>Record Payment</Button>
        </Section>
      )}
    </Box>
  );
}

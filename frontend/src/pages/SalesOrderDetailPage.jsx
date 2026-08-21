import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box, Typography, Chip, Button, Stack, Alert, IconButton, Paper, Grid, Divider, FormControlLabel, Checkbox,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Controller } from 'react-hook-form';
import RHFTextField from '../components/form/RHFTextField.jsx';
import RHFSelect from '../components/form/RHFSelect.jsx';
import { dispatchSchema, paymentSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const statusColor = {
  ORDER_CONFIRMED: 'default', IN_PRODUCTION: 'warning', PRODUCTION_COMPLETED: 'warning',
  READY_FOR_DISPATCH: 'warning', DISPATCHED: 'success', DELIVERED: 'success',
};

function Section({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mt: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>{title}</Typography>
      {children}
    </Paper>
  );
}

export default function SalesOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [actionError, setActionError] = useState('');
  const [vehicles, setVehicles] = useState([]);

  const load = () => {
    api.get(`/sales-orders/${id}`).then((res) => setOrder(res.data)).catch(() => setOrder(null));
  };

  useEffect(load, [id]);
  useEffect(() => {
    api.get('/vehicles').then((res) => setVehicles(res.data.filter((v) => v.status === 'ACTIVE'))).catch(() => setVehicles([]));
  }, []);

  const paymentForm = useForm({ resolver: zodResolver(paymentSchema), defaultValues: { amount: '' } });
  const dispatchForm = useForm({
    resolver: zodResolver(dispatchSchema),
    defaultValues: { vehicle_id: '', driver_name: '', loading_person: '', material_measured: false, quality_checked: false },
  });

  const isProduction = ['PRODUCTION', 'ADMIN'].includes(user?.role);
  const isSales = ['SALES', 'ADMIN'].includes(user?.role);
  const isAccounts = ['ACCOUNTS', 'ADMIN'].includes(user?.role);
  const isDispatch = ['DISPATCH', 'ADMIN'].includes(user?.role);

  const updateProduction = async (production_status) => {
    setActionError('');
    try {
      await api.patch(`/sales-orders/${id}/production-status`, { production_status });
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to update production status');
    }
  };

  const markReadyForDispatch = async () => {
    setActionError('');
    try {
      await api.patch(`/sales-orders/${id}/ready-for-dispatch`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to update');
    }
  };

  const submitPayment = async (values) => {
    setActionError('');
    try {
      await api.patch(`/sales-orders/${id}/payment`, values);
      paymentForm.reset({ amount: '' });
      load();
    } catch (err) {
      applyServerErrors(err, paymentForm.setError, setActionError);
    }
  };

  const submitDispatch = async (values) => {
    setActionError('');
    try {
      await api.post(`/sales-orders/${id}/dispatch`, values);
      load();
    } catch (err) {
      applyServerErrors(err, dispatchForm.setError, setActionError);
    }
  };

  const deliver = async () => {
    setActionError('');
    try {
      await api.patch(`/sales-orders/${id}/deliver`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to update');
    }
  };

  if (!order) return <Typography>Loading...</Typography>;

  return (
    <Box sx={{ maxWidth: 800 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <IconButton size="small" onClick={() => navigate('/sales-orders')}>
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Typography variant="h5" fontWeight={700}>{order.so_number}</Typography>
        <Chip size="small" label={order.status.replace(/_/g, ' ')} color={statusColor[order.status]} />
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ ml: 5 }}>
        {order.customer_name} · DC {order.dc_number} · Enquiry {order.enquiry_number}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ ml: 5 }}>
        Order Value: ₹ {Number(order.approved_price).toLocaleString('en-IN')} · Balance: ₹ {Number(order.balance_amount).toLocaleString('en-IN')}
      </Typography>

      {actionError && <Alert severity="error" sx={{ mt: 2 }}>{actionError}</Alert>}

      {['ORDER_CONFIRMED', 'IN_PRODUCTION'].includes(order.status) && isProduction && (
        <Section title="Production Status">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Current: {order.production_status.replace(/_/g, ' ')}</Typography>
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" onClick={() => updateProduction('STARTED')} disabled={order.production_status !== 'NOT_STARTED'}>Start</Button>
            <Button variant="outlined" onClick={() => updateProduction('IN_PROGRESS')} disabled={order.production_status === 'NOT_STARTED' || order.production_status === 'COMPLETED'}>In Progress</Button>
            <Button variant="contained" onClick={() => updateProduction('COMPLETED')} disabled={order.production_status === 'NOT_STARTED'}>Mark Completed</Button>
          </Stack>
        </Section>
      )}

      {order.status === 'PRODUCTION_COMPLETED' && isSales && (
        <Section title="Notify Customer">
          <Typography variant="body2" sx={{ mb: 1.5 }}>Material is ready. Notify the customer and mark ready for dispatch.</Typography>
          <Button variant="contained" onClick={markReadyForDispatch}>Ready for Dispatch</Button>
        </Section>
      )}

      {Number(order.balance_amount) > 0 && isAccounts && (
        <Section title="Record Payment">
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} sm={6}>
              <RHFTextField name="amount" control={paymentForm.control} label="Payment Amount (₹)" type="number" required />
            </Grid>
          </Grid>
          <Button variant="contained" sx={{ mt: 2 }} onClick={paymentForm.handleSubmit(submitPayment)}>Record Payment</Button>
        </Section>
      )}

      {order.status === 'READY_FOR_DISPATCH' && isDispatch && (
        <Section title="Dispatch Checklist">
          {Number(order.balance_amount) > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>Pending payment of ₹ {Number(order.balance_amount).toLocaleString('en-IN')} must be cleared before dispatch.</Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <RHFSelect
                name="vehicle_id"
                control={dispatchForm.control}
                label="Vehicle"
                required
                options={vehicles}
                getLabel={(v) => `${v.vehicle_name} (${v.vehicle_number})`}
                getValue={(v) => v.id}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <RHFTextField name="driver_name" control={dispatchForm.control} label="Driver Name" required />
            </Grid>
            <Grid item xs={12} sm={4}>
              <RHFTextField name="loading_person" control={dispatchForm.control} label="Loading Person" required />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="material_measured"
                control={dispatchForm.control}
                render={({ field, fieldState }) => (
                  <Stack>
                    <FormControlLabel control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />} label="Material Measured" />
                    {fieldState.error && <Typography variant="caption" color="error">{fieldState.error.message}</Typography>}
                  </Stack>
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="quality_checked"
                control={dispatchForm.control}
                render={({ field, fieldState }) => (
                  <Stack>
                    <FormControlLabel control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />} label="Quality Checked" />
                    {fieldState.error && <Typography variant="caption" color="error">{fieldState.error.message}</Typography>}
                  </Stack>
                )}
              />
            </Grid>
          </Grid>
          <Button variant="contained" sx={{ mt: 2 }} onClick={dispatchForm.handleSubmit(submitDispatch)} disabled={Number(order.balance_amount) > 0}>
            Dispatch
          </Button>
        </Section>
      )}

      {order.status === 'DISPATCHED' && isDispatch && (
        <Section title="Delivery">
          <Typography variant="body2" sx={{ mb: 1.5 }}>Vehicle {order.vehicle_number} · Driver {order.driver_name} · Dispatched {new Date(order.dispatched_at).toLocaleString()}</Typography>
          <Button variant="contained" onClick={deliver}>Mark Delivered</Button>
        </Section>
      )}

      {order.status === 'DELIVERED' && (
        <Alert severity="success" sx={{ mt: 2 }}>Delivered on {new Date(order.delivered_at).toLocaleString()}.</Alert>
      )}

      <Divider sx={{ my: 3 }} />
      <Typography variant="caption" color="text.secondary">
        Created {new Date(order.created_at).toLocaleString()}
      </Typography>
    </Box>
  );
}

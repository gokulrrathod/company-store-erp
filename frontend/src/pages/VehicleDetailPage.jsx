import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box, Typography, Chip, Button, Stack, Alert, IconButton, Paper, Grid, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import RHFTextField from '../components/form/RHFTextField.jsx';
import AttachmentsPanel from '../components/AttachmentsPanel.jsx';
import { insuranceRecordSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const renewalColor = { ACTIVE: 'success', EXPIRING: 'warning', EXPIRED: 'error' };

function Section({ title, children }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, mt: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>{title}</Typography>
      {children}
    </Paper>
  );
}

export default function VehicleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [actionError, setActionError] = useState('');
  const [open, setOpen] = useState(false);

  const load = () => {
    api.get(`/vehicles/${id}`).then((res) => setVehicle(res.data)).catch(() => setVehicle(null));
  };

  useEffect(load, [id]);

  const {
    control, handleSubmit, reset, setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(insuranceRecordSchema),
    defaultValues: { insurance_company_name: '', policy_number: '', start_date: '', expiry_date: '', premium_amount: '' },
  });

  const canManage = ['TRANSPORT', 'ADMIN'].includes(user?.role);

  const openDialog = () => {
    setActionError('');
    reset({ insurance_company_name: '', policy_number: '', start_date: '', expiry_date: '', premium_amount: '' });
    setOpen(true);
  };

  const onSubmit = async (values) => {
    setActionError('');
    try {
      await api.post(`/vehicles/${id}/insurance`, values);
      setOpen(false);
      load();
    } catch (err) {
      applyServerErrors(err, setError, setActionError);
    }
  };

  const toggleStatus = async () => {
    try {
      await api.patch(`/vehicles/${id}/status`, { status: vehicle.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to update status');
    }
  };

  if (!vehicle) return null;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/vehicles')} sx={{ mb: 1 }}>Back to Vehicles</Button>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5">{vehicle.vehicle_name} — {vehicle.vehicle_number}</Typography>
        <Chip label={vehicle.status} color={vehicle.status === 'ACTIVE' ? 'success' : 'default'} />
      </Stack>

      {actionError && <Alert severity="error" sx={{ mt: 2 }}>{actionError}</Alert>}

      <Section title="Vehicle Details">
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Type</Typography><Typography>{vehicle.vehicle_type.replace(/_/g, ' ')}</Typography></Grid>
          <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Number</Typography><Typography>{vehicle.vehicle_number}</Typography></Grid>
          <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Added By</Typography><Typography>{vehicle.created_by}</Typography></Grid>
        </Grid>
        {canManage && (
          <Button size="small" sx={{ mt: 2 }} onClick={toggleStatus}>
            Mark {vehicle.status === 'ACTIVE' ? 'Inactive' : 'Active'}
          </Button>
        )}
      </Section>

      <Section title="Insurance History">
        {canManage && (
          <Button size="small" startIcon={<AddIcon />} sx={{ mb: 2 }} onClick={openDialog}>Add Insurance Record</Button>
        )}
        {!vehicle.insurance_records.length && <Typography variant="body2" color="text.secondary">No insurance records yet.</Typography>}
        {vehicle.insurance_records.map((rec, idx) => (
          <Box key={rec.id}>
            {idx > 0 && <Divider sx={{ my: 1.5 }} />}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography fontWeight={600}>{rec.insurance_company_name} — {rec.policy_number}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {rec.start_date?.slice(0, 10)} to {rec.expiry_date?.slice(0, 10)} · ₹ {Number(rec.premium_amount).toLocaleString('en-IN')}
                </Typography>
              </Box>
              <Chip size="small" label={rec.renewal_status} color={renewalColor[rec.renewal_status]} />
            </Stack>
            <Box sx={{ mt: 1.5 }}>
              <AttachmentsPanel entityType="insurance_record" entityId={rec.id} canUpload={canManage} title="Policy Document" />
            </Box>
          </Box>
        ))}
      </Section>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Insurance Record</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <RHFTextField name="insurance_company_name" control={control} label="Insurance Company" required />
            <RHFTextField name="policy_number" control={control} label="Policy Number" required />
            <RHFTextField name="start_date" control={control} label="Start Date" type="date" required InputLabelProps={{ shrink: true }} />
            <RHFTextField name="expiry_date" control={control} label="Expiry Date" type="date" required InputLabelProps={{ shrink: true }} />
            <RHFTextField name="premium_amount" control={control} label="Premium Amount (₹)" type="number" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

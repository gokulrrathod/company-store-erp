import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Typography, Chip, Button, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Alert, IconButton, Grid, Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable.jsx';
import RHFTextField from '../components/form/RHFTextField.jsx';
import RHFSelect from '../components/form/RHFSelect.jsx';
import { vehicleSchema } from '../validation/schemas.js';
import { applyServerErrors } from '../utils/applyServerErrors.js';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';

const VEHICLE_TYPES = [
  { value: 'TATA', label: 'Tata' },
  { value: 'CARRY', label: 'Carry' },
  { value: 'TRAILER', label: 'Trailer' },
  { value: 'ASHOK_LEYLAND', label: 'Ashok Leyland' },
  { value: 'OTHER', label: 'Other' },
];

const insuranceColor = { ACTIVE: 'success', EXPIRING: 'warning', EXPIRED: 'error', MISSING: 'default' };

export default function VehiclesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');

  const {
    control, handleSubmit, reset, setError,
    formState: { isSubmitting },
  } = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { vehicle_name: '', vehicle_type: 'TATA', vehicle_number: '' },
  });

  const load = () => {
    api.get('/vehicles').then((res) => setVehicles(res.data)).catch(() => setVehicles([]));
    api.get('/vehicles/dashboard').then((res) => setDashboard(res.data)).catch(() => setDashboard(null));
  };

  useEffect(load, []);

  const openDialog = () => {
    setFormError('');
    reset({ vehicle_name: '', vehicle_type: 'TATA', vehicle_number: '' });
    setOpen(true);
  };

  const onSubmit = async (values) => {
    setFormError('');
    try {
      await api.post('/vehicles', values);
      setOpen(false);
      load();
    } catch (err) {
      applyServerErrors(err, setError, setFormError);
    }
  };

  const canCreate = ['TRANSPORT', 'ADMIN'].includes(user?.role);
  const readOnly = user?.role === 'MANAGEMENT';

  const columnDefs = [
    { field: 'vehicle_name', headerName: 'Vehicle Name', minWidth: 160 },
    { field: 'vehicle_type', headerName: 'Type', minWidth: 130, valueFormatter: (p) => p.value.replace(/_/g, ' ') },
    { field: 'vehicle_number', headerName: 'Number', minWidth: 140 },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 110,
      cellRenderer: (p) => <Chip size="small" label={p.value} color={p.value === 'ACTIVE' ? 'success' : 'default'} />,
    },
    {
      field: 'insurance_status',
      headerName: 'Insurance',
      minWidth: 130,
      cellRenderer: (p) => <Chip size="small" label={p.value} color={insuranceColor[p.value]} />,
    },
    {
      headerName: 'View',
      minWidth: 70,
      flex: 0,
      sortable: false,
      filter: false,
      cellRenderer: (p) => (
        <IconButton size="small" onClick={() => navigate(`/vehicles/${p.data.id}`)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      ),
    },
  ];

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Vehicle Master</Typography>
        {canCreate && (
          <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={openDialog}>
            New Vehicle
          </Button>
        )}
      </Stack>

      {dashboard && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            ['Total Vehicles', dashboard.total_vehicles],
            ['Active', dashboard.active_vehicles],
            ['Expiring ≤30d', dashboard.expiring_30],
            ['Expiring ≤60d', dashboard.expiring_60],
            ['Expiring ≤90d', dashboard.expiring_90],
            ['Expired', dashboard.expired],
            ['Missing Insurance', dashboard.missing_insurance],
          ].map(([label, value]) => (
            <Grid item xs={6} sm={4} md={12 / 7} key={label}>
              <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                <Typography variant="h6">{value}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {readOnly && <Alert severity="info" sx={{ mb: 2 }}>Management role has read-only access to Transport records.</Alert>}

      <DataTable rowData={vehicles} columnDefs={columnDefs} getRowId={(p) => String(p.data.id)} />

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Vehicle</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <RHFTextField name="vehicle_name" control={control} label="Vehicle Name" required />
            <RHFSelect name="vehicle_type" control={control} label="Vehicle Type" required options={VEHICLE_TYPES} getLabel={(t) => t.label} getValue={(t) => t.value} />
            <RHFTextField name="vehicle_number" control={control} label="Vehicle Number" required />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>Create</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
